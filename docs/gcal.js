// 구글 캘린더 연결 (욱진이 구글 캘린더 하나)
// ① 구글 일정을 보드 달력에 보여 주기  ② 보드 할 일·시험일을 구글 캘린더에 넣기
// 연결(토큰)은 기기마다 따로. 보드가 처음 연결된 구글 계정을 기억해 두고, 다른 계정이면 ②를 막아 중복을 막는다.
import { GOOGLE_CLIENT_ID } from "./firebase-config.js?v=20261009j";

const SCOPE = "https://www.googleapis.com/auth/calendar.events";
const API = "https://www.googleapis.com/calendar/v3/calendars/primary";
const LS = "ukjin-gcal";

let ctx = null;          // app.js가 넘겨주는 것들: tasks(), goals(), linkedEmail(), setLinkedEmail(), update(), rerender(), toast()
let st = { on: false, show: true, push: true, email: "", token: "", exp: 0 };
try { st = { ...st, ...JSON.parse(localStorage.getItem(LS) || "{}") }; } catch (e) { /* 저장소 막힘 */ }
const save = () => { try { localStorage.setItem(LS, JSON.stringify(st)); } catch (e) { /* 무시 */ } };

let tokenClient = null, lastError = "";
const monthCache = new Map();  // "2026-10-01~2026-11-08" -> 그 범위 이벤트 목록
const pending = new Set();

export const gcalEnabled = () => !!GOOGLE_CLIENT_ID;
const tokenOk = () => st.token && Date.now() < st.exp;
const keyOf = (email) => email.replace(/\./g, ",");   // Realtime Database 키에는 '.'를 못 씀

export function gcalStatus() {
  if (!gcalEnabled()) return { state: "none" };
  if (!st.on) return { state: "off" };
  if (!tokenOk()) return { state: "expired", email: st.email };
  const linked = ctx && ctx.linkedEmail();
  return { state: "ok", email: st.email, other: !!(linked && st.email && linked !== st.email), linked };
}
export const gcalPrefs = () => ({ show: st.show, push: st.push });
// 이 기기가 보드 할 일을 구글로 넣고 있는가 (그렇다면 항목별 '캘린더' 버튼은 숨김)
export const gcalPushing = () => { const s = gcalStatus(); return (s.state === "ok" || s.state === "expired") && st.push && !s.other; };

export function initGcal(c) {
  ctx = c;
  if (!gcalEnabled()) return;
  // 팝업이 막히지 않게 구글 로그인 스크립트는 미리 받아 둔다 (버튼 누를 때 바로 열리도록)
  const s = document.createElement("script");
  s.src = "https://accounts.google.com/gsi/client"; s.async = true;
  s.onload = () => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID, scope: SCOPE, callback: onToken,
      error_callback: (e) => { lastError = e && e.type === "popup_closed" ? "" : "구글 연결 창을 열지 못했어요. 팝업 차단을 풀어 주세요."; if (lastError) ctx.toast(lastError); }
    });
    if (st.on && st.email) { if (tokenOk()) watchExpiry(); else armReconnect(); }
  };
  document.head.appendChild(s);
}

async function onToken(r) {
  if (!r || r.error) { ctx.toast(r && r.error === "access_denied" ? "구글 캘린더 권한을 허락하지 않았어요." : "구글 캘린더에 연결하지 못했어요."); return; }
  st.token = r.access_token; st.exp = Date.now() + (Number(r.expires_in || 3600) - 60) * 1000; st.on = true;
  try {
    const cal = await api("GET", "");                  // primary 캘린더 id = 계정 이메일
    st.email = cal.id || "";
  } catch (e) { /* 아래에서 다시 시도됨 */ }
  save();
  const linked = ctx.linkedEmail();
  if (!linked && st.email) await ctx.setLinkedEmail(st.email);
  else if (linked && st.email && linked !== st.email) ctx.toast(`보드는 ${linked} 캘린더에 연결돼 있어요. 이 계정으로는 일정만 보여 줄게요.`);
  else ctx.toast("구글 캘린더에 연결했어요.");
  monthCache.clear(); lastPushFp = ""; ctx.rerender(); schedulePush(); watchExpiry();
}

// 구글 연결은 1시간마다 풀린다. 풀린 뒤 화면을 처음 누를 때 알아서 다시 붙인다
// (구글 규칙상 사용자가 한 번 눌러야 창을 열 수 있어서 '아무 데나 누르기'를 기다림)
let armed = false, expiryTimer = null;
function watchExpiry() {
  clearTimeout(expiryTimer);
  expiryTimer = setTimeout(() => { ctx.rerender(); armReconnect(); }, Math.max(0, st.exp - Date.now()) + 500);
}
function armReconnect() {
  if (armed || !st.on || !st.email || tokenOk()) return;
  armed = true;
  document.addEventListener("click", onGesture, { capture: true });
}
function onGesture(ev) {
  const t = ev.target && ev.target.closest ? ev.target : null;
  if (t && t.closest('[data-act="gConnect"], [data-act="gDisconnect"]')) return; // 그 버튼은 스스로 처리
  document.removeEventListener("click", onGesture, { capture: true });
  armed = false;
  if (!tokenOk() && st.on && tokenClient) tokenClient.requestAccessToken({ prompt: "", login_hint: st.email });
}

export function gcalConnect() {
  if (!tokenClient) { ctx.toast("구글 연결 준비 중이에요. 잠시 뒤 다시 눌러 주세요."); return; }
  tokenClient.requestAccessToken(st.email ? { prompt: "", login_hint: st.email } : { prompt: "consent" });
}
export function gcalDisconnect() {
  if (st.token && window.google && window.google.accounts) { try { window.google.accounts.oauth2.revoke(st.token, () => {}); } catch (e) { /* 무시 */ } }
  st = { ...st, on: false, token: "", exp: 0, email: "" }; save(); monthCache.clear(); clearTimeout(expiryTimer);
  if (armed) { document.removeEventListener("click", onGesture, { capture: true }); armed = false; }
  ctx.rerender();
}
export function gcalSetPref(k, v) { st[k] = v; save(); if (k === "push" && v) { lastPushFp = ""; schedulePush(); } ctx.rerender(); }

async function api(method, path, body, query) {
  if (!tokenOk()) throw Object.assign(new Error("expired"), { status: 401 });
  const qs = query ? "?" + new URLSearchParams(query).toString() : "";
  const res = await fetch(API + path + qs, {
    method, headers: { Authorization: "Bearer " + st.token, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 401) { st.exp = 0; save(); ctx.rerender(); armReconnect(); }
  if (!res.ok) throw Object.assign(new Error("gcal " + res.status), { status: res.status });
  return res.status === 204 ? null : res.json();
}

// ---------- ① 구글 일정 보여 주기 ----------
function addDaysStr(s, n) { const p = s.split("-"); const d = new Date(+p[0], +p[1] - 1, +p[2] + n); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function localYmd(iso) { const d = new Date(iso); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

export function gcalEnsureRange(from, to) {
  if (!st.show || gcalStatus().state !== "ok") return;
  const k = from + "~" + to;
  if (monthCache.has(k) || pending.has(k)) return;
  pending.add(k);
  const items = [];
  const load = async (pageToken) => {
    const r = await api("GET", "/events", null, {
      timeMin: new Date(from + "T00:00:00").toISOString(), timeMax: new Date(addDaysStr(to, 1) + "T00:00:00").toISOString(),
      singleEvents: "true", orderBy: "startTime", maxResults: "250", ...(pageToken ? { pageToken } : {})
    });
    items.push(...(r.items || []));
    if (r.nextPageToken && items.length < 1000) await load(r.nextPageToken);
  };
  load().then(() => {
    monthCache.set(k, items.filter((e) => e.status !== "cancelled" && !(e.extendedProperties && e.extendedProperties.private && e.extendedProperties.private.ukjinApp === "1")));
    ctx.rerender();
  }).catch(() => { /* 토큰 만료 등은 상태 표시로 안내 */ }).finally(() => pending.delete(k));
}

// 그 날짜의 구글 일정 [{title, time}]
export function gcalEventsOn(day) {
  if (!st.show || !st.on) return [];
  const out = [];
  for (const [k, list] of monthCache) {
    const [a, b] = k.split("~"); if (day < a || day > b) continue;
    for (const e of list) {
      if (e.start && e.start.date) {             // 종일 일정 (끝 날짜는 포함 안 됨)
        if (e.start.date <= day && day < e.end.date) out.push({ title: e.summary || "(제목 없음)", time: "", link: e.htmlLink });
      } else if (e.start && e.start.dateTime && localYmd(e.start.dateTime) === day) {
        const d = new Date(e.start.dateTime);
        out.push({ title: e.summary || "(제목 없음)", time: String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"), link: e.htmlLink });
      }
    }
    break;
  }
  return out.sort((x, y) => (x.time || "").localeCompare(y.time || ""));
}

// ---------- ② 보드 할 일·시험일 → 구글 캘린더 ----------
let pushTimer = null, pushing = false, again = false, lastPushFp = "";
export function schedulePush() {
  if (!gcalPushing() || gcalStatus().state !== "ok") return;
  clearTimeout(pushTimer); pushTimer = setTimeout(() => { pushTimer = null; runPush(); }, 2500);
}

function boardItems() {
  const out = [];
  ctx.tasks().forEach((t) => {
    if (t.repeat === "daily" || t.repeat === "weekly" || !t.date) return;   // 반복하는 일은 넣지 않음 (캘린더가 너무 복잡해짐)
    const summary = (t.done ? "✓ " : "") + t.title;
    out.push({ col: "tasks", id: t.id, ref: "task:" + t.id, summary, date: t.date, gcal: t.gcal, sig: t.date + "|" + summary });
  });
  ctx.goals().forEach((g) => {
    if (!g.due) return;
    const summary = "[D-DAY] " + g.title;
    out.push({ col: "goals", id: g.id, ref: "goal:" + g.id, summary, date: g.due, gcal: g.gcal, sig: g.due + "|" + summary });
  });
  return out;
}

async function runPush() {
  if (pushing) { again = true; return null; }
  const s = gcalStatus();
  if (s.state !== "ok" || !gcalPushing()) return null;
  const key = keyOf(st.email);
  const items = boardItems();
  const fp = items.map((x) => x.ref + "=" + x.sig + "@" + ((x.gcal && x.gcal[key] && x.gcal[key].sig) || "")).sort().join(";");
  if (fp === lastPushFp) return null;                // 바뀐 게 없으면 구글에 묻지도 않음
  pushing = true;
  const res = { added: 0, updated: 0, deleted: 0, error: "" };
  try {
    for (const x of items) {
      const m = x.gcal && x.gcal[key];
      if (m && m.sig === x.sig) continue;
      const body = {
        summary: x.summary, description: "욱진 실천 보드에서 넣은 일정",
        start: { date: x.date }, end: { date: addDaysStr(x.date, 1) },
        extendedProperties: { private: { ukjinApp: "1", ukjinRef: x.ref } }
      };
      let id = m && m.id;
      if (!id) {                                     // 다른 기기가 이미 넣었는지 먼저 확인 (중복 방지)
        const found = await api("GET", "/events", null, { privateExtendedProperty: "ukjinRef=" + x.ref, maxResults: "5" });
        id = found.items && found.items[0] && found.items[0].id;
      }
      let ev = null;
      if (id) { try { ev = await api("PATCH", "/events/" + encodeURIComponent(id), body); res.updated++; } catch (e) { if (e.status !== 404 && e.status !== 410) throw e; } }
      if (!ev) { ev = await api("POST", "/events", body); res.added++; }
      await ctx.update(x.col, x.id, { gcal: { [key]: { id: ev.id, sig: x.sig } } });
    }
    // 보드에서 지웠거나 날짜를 뺀 항목의 일정은 구글에서도 지움
    const alive = new Set(items.map((x) => x.ref));
    const today = new Date();
    const r = await api("GET", "/events", null, {
      privateExtendedProperty: "ukjinApp=1", singleEvents: "true", maxResults: "500",
      timeMin: new Date(today.getFullYear() - 1, today.getMonth(), 1).toISOString(),
      timeMax: new Date(today.getFullYear() + 2, today.getMonth(), 1).toISOString()
    });
    for (const e of r.items || []) {
      const ref = e.extendedProperties && e.extendedProperties.private && e.extendedProperties.private.ukjinRef;
      if (ref && !alive.has(ref) && e.status !== "cancelled") { try { await api("DELETE", "/events/" + encodeURIComponent(e.id)); res.deleted++; } catch (err) { /* 이미 없음 */ } }
    }
    lastPushFp = boardItems().map((x) => x.ref + "=" + x.sig + "@" + ((x.gcal && x.gcal[key] && x.gcal[key].sig) || "")).sort().join(";");
  } catch (e) {
    res.error = e.status === 401 ? "연결이 풀렸어요" : "구글 캘린더와 맞추다가 멈췄어요";
    if (e.status !== 401) ctx.toast(res.error + ". 잠시 뒤 다시 시도해요.");
  } finally {
    pushing = false;
    st.last = { at: Date.now(), ...res }; save();
    if (again) { again = false; schedulePush(); }
  }
  return res;
}

// 설정 창의 '지금 구글과 맞추기' — 바뀐 게 없어 보여도 구글을 다시 확인
export async function gcalSyncNow() {
  const s = gcalStatus();
  if (s.state !== "ok") return { error: s.state === "expired" ? "연결이 풀렸어요. 다시 연결한 뒤 눌러 주세요" : "구글 캘린더가 연결돼 있지 않아요" };
  if (s.other) return { error: `이 기기는 ${s.email} 계정이라 보드 일정(${s.linked})을 넣거나 지울 수 없어요` };
  if (!st.push) return { error: "'보드 할 일·시험일을 구글 캘린더에 넣기'가 꺼져 있어요" };
  clearTimeout(pushTimer);
  while (pushing) await new Promise((r) => setTimeout(r, 200));
  lastPushFp = "";
  return (await runPush()) || { added: 0, updated: 0, deleted: 0, error: "" };
}
export const gcalLastSync = () => st.last || null;

// 창을 닫거나 다른 앱으로 넘어갈 때, 기다리던 동기화가 있으면 바로 보냄
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && pushTimer) { clearTimeout(pushTimer); pushTimer = null; runPush(); }
});
