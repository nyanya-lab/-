/**
 * 욱진 실천 보드 ↔ 구글 캘린더 자동 동기화
 * 욱진이 구글 계정의 Apps Script(script.google.com)에서 돌아가요. 5분마다 자동으로:
 *   · 보드 할 일(날짜 있는 것)·시험일 → 구글 캘린더에 넣기/고치기/지우기
 *   · 예전 '캘린더' 버튼으로 직접 넣었던 보드 일정 정리
 *   · 구글 캘린더 일정 → 보드 달력에 보이게 보내기
 *
 * 처음 한 번만:
 *   1) 아래 BOARD_PASSWORD 에 보드 비밀번호 넣고 저장
 *   2) 왼쪽 '서비스' + → Google Calendar API 추가
 *   3) 위쪽 함수 고르는 칸에서 setup 고르고 ▶ 실행 → 권한 허락
 */

const BOARD_PASSWORD = "";   // ← 여기에 보드 비밀번호 (따옴표 안에)

const DB_URL = "https://ukjin-207a3-default-rtdb.firebaseio.com";
const TZ = "Asia/Seoul";
const DESC = "욱진 실천 보드에서 넣은 일정";
const CAL = "primary";       // 욱진이 기본 캘린더

// 처음 한 번 실행: 5분마다 sync가 돌게 예약하고 바로 한 번 맞춰요
function setup() {
  checkPassword_();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "sync") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("sync").timeBased().everyMinutes(5).create();
  sync();
  Logger.log("설정 끝! 이제 5분마다 자동으로 맞춰요.");
}

// 자동 동기화를 멈추고 싶을 때 실행
function stop() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  Logger.log("자동 동기화를 멈췄어요.");
}

function sync() {
  checkPassword_();
  const base = DB_URL + "/ukjin/" + roomOf_(BOARD_PASSWORD);
  if (!getJson_(base + "/settings.json")) {
    throw new Error("이 비밀번호로 만든 보드가 없어요. BOARD_PASSWORD를 확인해 주세요.");
  }
  const tasks = getJson_(base + "/tasks.json") || {};
  const goals = getJson_(base + "/goals.json") || {};
  const res = pushToGoogle_(tasks, goals);
  putJson_(base + "/gevents.json", pullFromGoogle_());
  putJson_(base + "/gsync.json", {
    at: Date.now(), email: Session.getEffectiveUser().getEmail(),
    added: res.added, updated: res.updated, deleted: res.deleted, cleaned: res.cleaned
  });
  Logger.log("추가 %s · 수정 %s · 삭제 %s · 예전 일정 정리 %s", res.added, res.updated, res.deleted, res.cleaned);
}

// ---------- 보드 → 구글 ----------
function pushToGoogle_(tasks, goals) {
  const items = {};
  Object.keys(tasks).forEach(function (id) {
    const t = tasks[id];
    if (!t || !t.date || t.repeat === "daily" || t.repeat === "weekly") return;   // 반복하는 일은 넣지 않음
    items["task:" + id] = { summary: (t.done ? "✓ " : "") + t.title, date: t.date };
  });
  Object.keys(goals).forEach(function (id) {
    const g = goals[id];
    if (g && g.due) items["goal:" + id] = { summary: "[D-DAY] " + g.title, date: g.due };
  });

  const res = { added: 0, updated: 0, deleted: 0, cleaned: 0 };
  const seen = {};
  listAll_({ privateExtendedProperty: "ukjinApp=1", singleEvents: false }).forEach(function (ev) {
    const p = ev.extendedProperties && ev.extendedProperties.private;
    const ref = p && p.ukjinRef, it = ref && items[ref];
    if (!it || seen[ref]) { remove_(ev.id); res.deleted++; return; }   // 보드에서 지웠거나 중복
    seen[ref] = true;
    if (ev.summary !== it.summary || !ev.start || ev.start.date !== it.date) {
      Calendar.Events.patch({ summary: it.summary, start: { date: it.date }, end: { date: nextDay_(it.date) } }, CAL, ev.id);
      res.updated++;
    }
  });
  Object.keys(items).forEach(function (ref) {
    if (seen[ref]) return;
    const it = items[ref];
    Calendar.Events.insert({
      summary: it.summary, description: DESC,
      start: { date: it.date }, end: { date: nextDay_(it.date) },
      extendedProperties: { private: { ukjinApp: "1", ukjinRef: ref } }
    }, CAL);
    res.added++;
  });

  // 예전 '캘린더' 버튼으로 넣은 일정: 설명이 "○○ 실천 보드"로 끝나고 동기화 표시가 없는 것 (반복이면 묶음째)
  listAll_({ q: "실천 보드", singleEvents: false }).forEach(function (ev) {
    const p = ev.extendedProperties && ev.extendedProperties.private;
    if (p && p.ukjinApp === "1") return;
    if (/실천 보드$/.test(String(ev.description || "").trim())) { remove_(ev.id); res.cleaned++; }
  });
  return res;
}

// ---------- 구글 → 보드 (지난달~석 달 뒤) ----------
function pullFromGoogle_() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 4, 1);
  const out = {};
  let i = 0;
  listAll_({ timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: true, orderBy: "startTime" }).forEach(function (ev) {
    const p = ev.extendedProperties && ev.extendedProperties.private;
    if (ev.status === "cancelled" || (p && p.ukjinApp === "1")) return;      // 보드가 넣은 건 보드에 이미 있음
    if (/실천 보드$/.test(String(ev.description || "").trim())) return;
    const e = { title: ev.summary || "(제목 없음)", link: ev.htmlLink || "" };
    if (ev.start.date) { e.date = ev.start.date; e.end = ev.end.date; }
    else {
      const s = new Date(ev.start.dateTime);
      e.date = Utilities.formatDate(s, TZ, "yyyy-MM-dd");
      e.time = Utilities.formatDate(s, TZ, "HH:mm");
    }
    out["e" + (i++)] = e;
  });
  return out;
}

// ---------- 도우미 ----------
function listAll_(opts) {
  const now = new Date();
  const base = {
    timeMin: new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString(),
    timeMax: new Date(now.getFullYear() + 3, now.getMonth(), 1).toISOString(),
    maxResults: 250
  };
  Object.keys(opts).forEach(function (k) { base[k] = opts[k]; });
  const all = [];
  let pageToken;
  do {
    if (pageToken) base.pageToken = pageToken;
    const r = Calendar.Events.list(CAL, base);
    (r.items || []).forEach(function (x) { all.push(x); });
    pageToken = r.nextPageToken;
  } while (pageToken && all.length < 2000);
  return all;
}
function remove_(id) { try { Calendar.Events.remove(CAL, id); } catch (e) { /* 이미 없음 */ } }
function nextDay_(ymd) {
  const p = ymd.split("-");
  return Utilities.formatDate(new Date(+p[0], +p[1] - 1, +p[2] + 1, 12), TZ, "yyyy-MM-dd");
}
// 보드와 같은 방식: 비밀번호 → SHA-256 → 64자 방 이름
function roomOf_(pw) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, "ukjin-board:" + pw, Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return ("0" + (b & 0xff).toString(16)).slice(-2); }).join("");
}
function checkPassword_() {
  if (!BOARD_PASSWORD) throw new Error("맨 위 BOARD_PASSWORD에 보드 비밀번호를 넣고 저장해 주세요.");
}
function getJson_(url) {
  const r = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error("보드를 읽지 못했어요 (" + r.getResponseCode() + ")");
  return JSON.parse(r.getContentText());
}
function putJson_(url, data) {
  const r = UrlFetchApp.fetch(url, { method: "put", contentType: "application/json", payload: JSON.stringify(data), muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error("보드에 쓰지 못했어요 (" + r.getResponseCode() + ")");
}
