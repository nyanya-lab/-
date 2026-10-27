/**
 * 욱진 실천 보드 ↔ 구글 캘린더 동기화 본체
 * 욱진이 Apps Script의 짧은 코드(Code.gs)가 5분마다 이 파일을 받아서 실행해요.
 * 여기를 고쳐서 main에 합치면, 다시 붙여넣지 않아도 늦어도 15분 안에 적용돼요.
 *   · 보드 할 일·반복하는 일·시험일 → 구글 캘린더 (📌 파랑 / 시간과 같이 끝내면 🔥 노랑 · 시간 없이 체크만 하면 ✅ 초록 / 🎯 D-DAY 빨강, 끝낸 돈 할 일은 ✅ 없이 🗓️·💰·💳 제목 그대로)
 *   · 주 ○번 반복 (최근 1년) → 한 주에 하나: 📌 이번 주 2/3 · 다 채우면 🔥/✅ · 못 채운 주 ❌
 *   · 실천한 일(최근 1년) → 🔥 노랑
 *   · 예전 '캘린더' 버튼으로 직접 넣었던 보드 일정 정리
 *   · 구글 캘린더 일정 → 보드 달력에 보이게 보내기
 *   · 캘린더 두 개로 나눔: 기본 캘린더 = 욱진 일정(한 번 하는 할 일·D-DAY) · 따로 만든 🔥 욱진 실천 = 루틴(반복하는 할 일)·실천 기록
 *     → 기본 캘린더를 공유받은 사람에게 루틴·실천 기록은 안 보임 (예전에 기본 캘린더에 넣은 루틴·실천은 옮김)
 */
const CORE_VERSION = "2026-10-27b";
const DB_URL = "https://ukjin-207a3-default-rtdb.firebaseio.com";
const TZ = "Asia/Seoul";
const DESC = "욱진 실천 보드에서 넣은 일정";
const CAL = "primary";       // 욱진이 기본 캘린더 = 욱진 일정 (한 번 하는 할 일·D-DAY + 직접 넣은 일정)
const LOG_CAL = { name: "욱진 실천", tag: "ukjin-board:log" };   // 루틴·실천 기록 캘린더: 없으면 만들고, 설명 글로 찾음 (이름은 욱진이가 바꿔도 됨)
const OLD_PLAN_TAG = "ukjin-board:plan";   // 10/27 잠깐 따로 만들었던 '욱진 일정' 캘린더 → 있으면 지움 (기본 캘린더로 돌아옴)
const COLOR = { plan: "9", done: "5", check: "2", dday: "11", log: "5", miss: "8" };   // 구글 일정 색: 파랑, 노랑(시간과 같이 끝낸 일 = 실천), 초록(시간 없이 체크만), 빨강, 노랑, 회색(못 한 일)
const DOW = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const MARK = { plan: "📌 ", done: "🔥 ", check: "✅ ", dday: "🎯 D-DAY ", log: "🔥 ", miss: "❌ " };   // 제목 앞 이모지. 시간과 같이 끝낸 할 일은 실천 🔥, 시간 없이 체크만 한 일은 ✅, 지난 날 못 한 일은 ❌

function ukjinSync(BOARD_PASSWORD) {
  const base = DB_URL + "/ukjin/" + roomOf_(BOARD_PASSWORD);
  if (!getJson_(base + "/settings.json")) {
    throw new Error("이 비밀번호로 만든 보드가 없어요. BOARD_PASSWORD를 확인해 주세요.");
  }
  const tasks = getJson_(base + "/tasks.json") || {};
  const goals = getJson_(base + "/goals.json") || {};
  const logs = getJson_(base + "/logs.json") || {};
  const res = pushToGoogle_(tasks, goals, logs);
  putJson_(base + "/gevents.json", pullFromGoogle_());
  putJson_(base + "/gsync.json", {
    at: Date.now(), email: Session.getEffectiveUser().getEmail(),
    added: res.added, updated: res.updated, deleted: res.deleted, cleaned: res.cleaned
  });
  Logger.log("동기화 코드 " + CORE_VERSION + " · 추가 " + res.added + " · 수정 " + res.updated + " · 삭제 " + res.deleted + " · 예전 일정 정리 " + res.cleaned);
}

// ---------- 보드 → 구글 ----------
function pushToGoogle_(tasks, goals, logs) {
  const items = {};
  const today = Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd");
  // 할 일을 체크하면서 기록한 시간: "✅ 제목 · 1시간"으로 할 일에 붙이고 🔥 일정은 따로 안 만듦
  const timed = {};
  Object.keys(logs || {}).forEach(function (id) {
    const l = logs[id];
    if (l && l.taskId && l.date && !(tasks[l.taskId] && tasks[l.taskId].noPractice)) timed[l.taskId + "|" + l.date] = (timed[l.taskId + "|" + l.date] || 0) + (Number(l.minutes) || 0);   // 돈 할 일(noPractice)에 붙은 시간은 안 침
  });
  const withTime = function (taskId, day, title) { const m = timed[taskId + "|" + day]; return m ? title + " · " + fmtMin_(m) : title; };
  // 끝낸 할 일: 시간이 기록돼 있으면 🔥 노랑(실천), 없으면 ✅ 초록(체크만) — 보드 달력과 같게
  const doneMark = function (taskId, day) { return timed[taskId + "|" + day] > 0 ? MARK.done : MARK.check; };
  const doneColor = function (taskId, day) { return timed[taskId + "|" + day] > 0 ? COLOR.done : COLOR.check; };
  // 아직 안 한 일: 정해 둔 '할 시간'이 있으면 "📌 제목 · 1시간"
  const withPlan = function (t) { return Number(t.minutes) > 0 ? t.title + " · " + fmtMin_(Number(t.minutes)) : t.title; };
  const nwFrom = sundayOf_(Utilities.formatDate(new Date(Date.now() - 365 * 864e5), TZ, "yyyy-MM-dd"));
  Object.keys(tasks).forEach(function (id) {
    const t = tasks[id];
    if (!t || !t.title) return;
    // 주 ○번 (아무 요일): 요일이 안 정해져 있어서 한 주(일~토)에 종일 일정 하나 — "📌 운동 (주 3번) 2/3"
    if (t.repeat === "nweek") {
      const need = Math.max(1, Number(t.times) || 1), dd = t.doneDates || {}, cur = sundayOf_(today);
      let ws = sundayOf_(t.start || today);
      if (ws < nwFrom) ws = nwFrom;
      for (let k = 0; k < 60 && ws <= cur; k++, ws = addDays_(ws, 7)) {
        if (t.end && ws > t.end) break;
        let n = 0, timedAny = false;
        for (let i = 0; i < 7; i++) { const d = addDays_(ws, i); if (dd[d]) { n++; if (timed[id + "|" + d] > 0) timedAny = true; } }
        const date = t.start && t.start > ws ? t.start : ws, label = t.title + " (주 " + need + "번) " + n + "/" + need;
        const full = n >= need, past = ws < cur;
        items["nw:" + id + ":" + ws] = {
          summary: (full ? (timedAny ? MARK.done : MARK.check) : past ? MARK.miss : MARK.plan) + label,
          colorId: full ? (timedAny ? COLOR.done : COLOR.check) : past ? COLOR.miss : COLOR.plan, date: date, cal: "log"
        };
      }
      return;
    }
    if (t.repeat === "daily" || t.repeat === "weekly") {
      const start = firstDay_(t);
      if (!start) return;
      let rule = t.repeat === "daily" ? "RRULE:FREQ=DAILY" : "RRULE:FREQ=WEEKLY;BYDAY=" + (t.days || []).map(function (n) { return DOW[n]; }).join(",");
      if (t.end) rule += ";UNTIL=" + t.end.replace(/-/g, "");
      items["rep:" + id] = { summary: MARK.plan + withPlan(t), colorId: COLOR.plan, date: start, recurrence: [rule], title: t.title, plan: withPlan(t), doneDates: t.doneDates || {}, taskId: id, cal: "log" };
      return;
    }
    if (!t.date) return;
    const missed = !t.done && t.date < today;   // 날짜가 지났는데 못 한 일
    // 늦게 한 일: 원래 날짜에는 ❌ 흔적, 한 날에는 🔥
    if (t.done && t.lateFrom) items["late:" + id] = { summary: MARK.miss + withPlan(t), colorId: COLOR.miss, date: t.lateFrom };
    // 끝낸 돈 할 일(예산 🗓️ · 수입 💰 · 카드값 💳)은 ✅ 없이 제목의 아이콘 그대로: "🗓️ 10월 예산 760,000원"
    const money = t.noPractice && (/^(mt|cp)-/.test(id) || t.mt || t.cardPay);
    items["task:" + id] = {
      summary: t.done ? (money ? t.title : doneMark(id, t.doneDate) + withTime(id, t.doneDate, t.title)) : (missed ? MARK.miss : MARK.plan) + withPlan(t),
      colorId: t.done ? doneColor(id, t.doneDate) : missed ? COLOR.miss : COLOR.plan, date: t.date
    };
  });
  Object.keys(goals).forEach(function (id) {
    const g = goals[id];
    if (g && g.due) items["goal:" + id] = { summary: MARK.dday + g.title, colorId: COLOR.dday, date: g.due };
  });
  // 실천한 일 (최근 1년): "🔥 1시간 30분 · 메모"
  const yearAgo = Utilities.formatDate(new Date(Date.now() - 365 * 864e5), TZ, "yyyy-MM-dd");
  Object.keys(logs || {}).forEach(function (id) {
    const l = logs[id];
    if (!l || !l.date || l.date < yearAgo || l.taskId) return;
    const parts = [];
    if (Number(l.minutes) > 0) parts.push(fmtMin_(Number(l.minutes)));
    if (l.text) parts.push(l.text);
    items["log:" + id] = { summary: MARK.log + (parts.join(" · ") || "기록"), colorId: COLOR.log, date: l.date, cal: "log" };
  });

  const res = { added: 0, updated: 0, deleted: 0, cleaned: 0 };
  const old = findCal_(OLD_PLAN_TAG);
  if (old) { try { Calendar.Calendars.remove(old); res.deleted++; } catch (e) { /* 다음에 다시 */ } }
  const cals = { plan: CAL, log: findCal_(LOG_CAL.tag) || newCal_(LOG_CAL) };
  const ids = {}, calOf = function (ref) { return cals[items[ref].cal || "plan"]; };
  // 캘린더마다 보드가 넣은 일정 맞추기 (다른 캘린더에 있어야 할 건 지우고 아래에서 그쪽에 새로 넣음)
  Object.keys(cals).forEach(function (key) {
    const cal = cals[key];
    listAll_(cal, { privateExtendedProperty: "ukjinApp=1", singleEvents: false }).forEach(function (ev) {
      // 반복 일정에서 ✅로 바꾼 날(예외 일정)도 같은 표시를 달고 따로 나옴 → 중복으로 보고 지우면 그 날이 사라짐. 아래 반복 칸에서 따로 다룸
      if (ev.recurringEventId || ev.status === "cancelled") return;
      const p = ev.extendedProperties && ev.extendedProperties.private;
      const ref = p && p.ukjinRef, it = ref && items[ref];
      if (!it || ids[ref] || (it.cal || "plan") !== key) { remove_(cal, ev.id); res.deleted++; return; }   // 보드에서 지웠거나 중복이거나 다른 캘린더 것
      ids[ref] = ev.id;
      const sameRule = String((ev.recurrence || []).join("|")) === String((it.recurrence || []).join("|"));
      if (ev.summary !== it.summary || (ev.colorId || "") !== it.colorId || !ev.start || ev.start.date !== it.date || !sameRule) {
        const body = { summary: it.summary, colorId: it.colorId, start: { date: it.date }, end: { date: nextDay_(it.date) } };
        if (it.recurrence) body.recurrence = it.recurrence;
        Calendar.Events.patch(body, cal, ev.id);
        res.updated++;
      }
    });
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
    ids[ref] = Calendar.Events.insert(body, calOf(ref)).id;
    res.added++;
  });

  // 반복하는 일: 한 날은 🔥(시간 있음)·✅(체크만), 지난 날 못 한 날은 ❌ (최근 45일~오늘, 오늘은 아직 📌)
  const since = Utilities.formatDate(new Date(Date.now() - 45 * 864e5), TZ, "yyyy-MM-dd");
  Object.keys(items).forEach(function (ref) {
    const it = items[ref];
    if (!it.recurrence || it.date > today) return;
    const from = it.date > since ? it.date : since;
    const r = Calendar.Events.instances(calOf(ref), ids[ref], {
      timeMin: new Date(from + "T00:00:00+09:00").toISOString(),
      timeMax: new Date(nextDay_(today) + "T00:00:00+09:00").toISOString(), maxResults: 100, showDeleted: true
    });
    (r.items || []).forEach(function (inst) {
      const d = inst.originalStartTime && inst.originalStartTime.date;
      if (!d) return;
      const done = !!it.doneDates[d];
      const missed = !done && d < today;
      const summary = done ? doneMark(it.taskId, d) + withTime(it.taskId, d, it.title) : (missed ? MARK.miss : MARK.plan) + it.plan;
      const colorId = done ? doneColor(it.taskId, d) : missed ? COLOR.miss : COLOR.plan;
      const gone = inst.status === "cancelled";   // 예전 코드가 잘못 지운 날은 되살림
      if (gone || inst.summary !== summary || (inst.colorId || "") !== colorId) {
        const body = { summary: summary, colorId: colorId };
        if (gone) body.status = "confirmed";
        Calendar.Events.patch(body, calOf(ref), inst.id);
        res.updated++;
      }
    });
  });

  // 예전 '캘린더' 버튼으로 넣은 일정: 설명이 "○○ 실천 보드"로 끝나고 동기화 표시가 없는 것 (반복이면 묶음째)
  listAll_(CAL, { q: "실천 보드", singleEvents: false }).forEach(function (ev) {
    const p = ev.extendedProperties && ev.extendedProperties.private;
    if (p && p.ukjinApp === "1") return;
    if (/실천 보드$/.test(String(ev.description || "").trim())) { remove_(CAL, ev.id); res.cleaned++; }
  });
  return res;
}

// 보드 화면과 같은 짧은 시간: 1h 30m
function fmtMin_(m) {
  const h = Math.floor(m / 60), r = m % 60;
  return h ? h + "h" + (r ? " " + r + "m" : "") : r + "m";
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
  listAll_(CAL, { timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: true, orderBy: "startTime" }).forEach(function (ev) {
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
// 보드 캘린더 찾기 (설명 글에 표시). 없으면 null → 루틴·실천 캘린더는 새로 만듦 (욱진이가 지우면 다음에 다시 만들어짐)
function findCal_(tag) {
  let pageToken, found = null;
  do {
    const r = Calendar.CalendarList.list({ maxResults: 250, pageToken: pageToken });
    (r.items || []).forEach(function (x) { if (!found && String(x.description || "").indexOf(tag) >= 0) found = x.id; });
    pageToken = r.nextPageToken;
  } while (!found && pageToken);
  return found;
}
function newCal_(c) {
  return Calendar.Calendars.insert({ summary: c.name, timeZone: TZ, description: "욱진 실천 보드가 자동으로 맞추는 캘린더예요. 반복하는 할 일(루틴)·실천 기록 (" + c.tag + ")" }).id;
}
function listAll_(cal, opts) {
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
    const r = Calendar.Events.list(cal, base);
    (r.items || []).forEach(function (x) { all.push(x); });
    pageToken = r.nextPageToken;
  } while (pageToken && all.length < 2000);
  return all;
}
function remove_(cal, id) { try { Calendar.Events.remove(cal, id); } catch (e) { /* 이미 없음 */ } }
function addDays_(ymd, n) {
  const p = ymd.split("-");
  return Utilities.formatDate(new Date(+p[0], +p[1] - 1, +p[2] + n, 12), TZ, "yyyy-MM-dd");
}
// 그 주 일요일 (보드 달력·주 ○번과 같은 일~토)
function sundayOf_(ymd) {
  const p = ymd.split("-"), dow = new Date(+p[0], +p[1] - 1, +p[2], 12).getDay();
  return addDays_(ymd, -dow);
}
function nextDay_(ymd) {
  const p = ymd.split("-");
  return Utilities.formatDate(new Date(+p[0], +p[1] - 1, +p[2] + 1, 12), TZ, "yyyy-MM-dd");
}
// 보드와 같은 방식: 비밀번호 → SHA-256 → 64자 방 이름
function roomOf_(pw) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, "ukjin-board:" + pw, Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return ("0" + (b & 0xff).toString(16)).slice(-2); }).join("");
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
