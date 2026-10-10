/**
 * 욱진 실천 보드 ↔ 구글 캘린더 자동 동기화
 * 욱진이 구글 계정의 Apps Script(script.google.com)에서 돌아가요. 5분마다 자동으로:
 *   · 보드 할 일·반복하는 일·시험일 → 구글 캘린더에 넣기/고치기/지우기
 *     (예) 할 일 = 파랑, (완) 끝낸 일 = 초록, (반복) 반복하는 일 = 보라, [D-DAY] 시험일 = 빨강
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
const COLOR = { plan: "9", done: "10", repeat: "3", dday: "11" };   // 구글 일정 색: 파랑, 초록, 보라, 빨강
const DOW = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

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
  Logger.log("추가 " + res.added + " · 수정 " + res.updated + " · 삭제 " + res.deleted + " · 예전 일정 정리 " + res.cleaned);
}

// ---------- 보드 → 구글 ----------
function pushToGoogle_(tasks, goals) {
  const items = {};
  Object.keys(tasks).forEach(function (id) {
    const t = tasks[id];
    if (!t || !t.title) return;
    if (t.repeat === "daily" || t.repeat === "weekly") {
      const start = firstDay_(t);
      if (!start) return;
      let rule = t.repeat === "daily" ? "RRULE:FREQ=DAILY" : "RRULE:FREQ=WEEKLY;BYDAY=" + (t.days || []).map(function (n) { return DOW[n]; }).join(",");
      if (t.end) rule += ";UNTIL=" + t.end.replace(/-/g, "");
      items["rep:" + id] = { summary: "(반복) " + t.title, colorId: COLOR.repeat, date: start, recurrence: [rule], title: t.title, doneDates: t.doneDates || {} };
      return;
    }
    if (!t.date) return;
    items["task:" + id] = { summary: (t.done ? "(완) " : "(예) ") + t.title, colorId: t.done ? COLOR.done : COLOR.plan, date: t.date };
  });
  Object.keys(goals).forEach(function (id) {
    const g = goals[id];
    if (g && g.due) items["goal:" + id] = { summary: "[D-DAY] " + g.title, colorId: COLOR.dday, date: g.due };
  });

  const res = { added: 0, updated: 0, deleted: 0, cleaned: 0 };
  const ids = {};
  listAll_({ privateExtendedProperty: "ukjinApp=1", singleEvents: false }).forEach(function (ev) {
    const p = ev.extendedProperties && ev.extendedProperties.private;
    const ref = p && p.ukjinRef, it = ref && items[ref];
    if (!it || ids[ref]) { remove_(ev.id); res.deleted++; return; }   // 보드에서 지웠거나 중복
    ids[ref] = ev.id;
    const sameRule = String((ev.recurrence || []).join("|")) === String((it.recurrence || []).join("|"));
    if (ev.summary !== it.summary || (ev.colorId || "") !== it.colorId || !ev.start || ev.start.date !== it.date || !sameRule) {
      const body = { summary: it.summary, colorId: it.colorId, start: { date: it.date }, end: { date: nextDay_(it.date) } };
      if (it.recurrence) body.recurrence = it.recurrence;
      Calendar.Events.patch(body, CAL, ev.id);
      res.updated++;
    }
  });
  Object.keys(items).forEach(function (ref) {
    if (ids[ref]) return;
    const it = items[ref];
    const body = {
      summary: it.summary, colorId: it.colorId, description: DESC,
      start: { date: it.date }, end: { date: nextDay_(it.date) },
      extendedProperties: { private: { ukjinApp: "1", ukjinRef: ref } }
    };
    if (it.recurrence) body.recurrence = it.recurrence;
    ids[ref] = Calendar.Events.insert(body, CAL).id;
    res.added++;
  });

  // 반복하는 일: 한 날은 그 날 칸만 (완) 초록으로 (최근 45일~오늘)
  const today = Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd");
  const since = Utilities.formatDate(new Date(Date.now() - 45 * 864e5), TZ, "yyyy-MM-dd");
  Object.keys(items).forEach(function (ref) {
    const it = items[ref];
    if (!it.recurrence || it.date > today) return;
    const from = it.date > since ? it.date : since;
    const r = Calendar.Events.instances(CAL, ids[ref], {
      timeMin: new Date(from + "T00:00:00+09:00").toISOString(),
      timeMax: new Date(nextDay_(today) + "T00:00:00+09:00").toISOString(), maxResults: 100
    });
    (r.items || []).forEach(function (inst) {
      const d = inst.originalStartTime && inst.originalStartTime.date;
      if (!d) return;
      const done = !!it.doneDates[d];
      const summary = (done ? "(완) " : "(반복) ") + it.title, colorId = done ? COLOR.done : COLOR.repeat;
      if (inst.summary !== summary || (inst.colorId || "") !== colorId) {
        Calendar.Events.patch({ summary: summary, colorId: colorId }, CAL, inst.id);
        res.updated++;
      }
    });
  });

  // 예전 '캘린더' 버튼으로 넣은 일정: 설명이 "○○ 실천 보드"로 끝나고 동기화 표시가 없는 것 (반복이면 묶음째)
  listAll_({ q: "실천 보드", singleEvents: false }).forEach(function (ev) {
    const p = ev.extendedProperties && ev.extendedProperties.private;
    if (p && p.ukjinApp === "1") return;
    if (/실천 보드$/.test(String(ev.description || "").trim())) { remove_(ev.id); res.cleaned++; }
  });
  return res;
}

// 반복 일정의 첫 날: 시작일부터 처음으로 요일이 맞는 날 (끝날 넘으면 없음)
function firstDay_(t) {
  let d = t.start || Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd");
  for (let i = 0; i < 7; i++) {
    const p = d.split("-"), dow = new Date(+p[0], +p[1] - 1, +p[2], 12).getDay();
    if (t.repeat === "daily" || (t.days || []).indexOf(dow) >= 0) return t.end && d > t.end ? null : d;
    d = nextDay_(d);
  }
  return null;
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
