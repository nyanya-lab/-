import { firebaseConfig } from "./firebase-config.js?v=20261009k";
import { initGcal, gcalEnabled, gcalStatus, gcalPrefs, gcalPushing, gcalConnect, gcalDisconnect, gcalSetPref, gcalEnsureRange, gcalEventsOn, schedulePush, gcalSyncNow, gcalLastSync, gcalFindManual, gcalDeleteEvents } from "./gcal.js?v=20261009k";

const FB_VER = "10.12.2";
const COLS = ["goals", "tasks", "logs", "money"];
const GOAL_CATS = ["자격증", "타일", "현장", "공부", "생활", "기타"];
// 목표마다 색 하나씩 (만든 순서대로 돌아가며). 달력에서 어느 목표 일인지 한눈에 보이게
const GOAL_COLORS = ["c-blue", "c-coral", "c-mint", "c-sun", "c-grape"];
let goalColorMap = new Map();
function refreshGoalColors() {
  goalColorMap = new Map(rows(S.goals).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).map((g, i) => [g.id, GOAL_COLORS[i % GOAL_COLORS.length]]));
}
const catCls = (g) => (g && goalColorMap.get(typeof g === "string" ? g : g.id)) || "c-gray"; // 목표 객체나 목표 id
const MONEY_CATS = {
  income: ["월급", "현장 수당", "부업·알바", "기타 수입"],
  transfer: ["생활비", "용돈", "데이트 통장", "저축", "기타"],
  expense: ["식비", "장보기", "주거·관리비", "교통·차량", "통신", "데이트", "생필품", "경조사", "공구·작업", "기타"]
};
const DEFAULTS = { name: "욱진", partner: "여자친구", budget: 0 };

// 자격증 목록 (국가기술자격 · Q-Net 기준). 할 일 꾸러미는 '목표로 추가'할 때 같이 들어가요.
const CERTS = [
  { name: "전산응용건축제도기능사", grade: "기능사", tag: "도면·CAD",
    desc: "CAD로 건축 도면을 그리는 자격. 주방 실측도·설치 도면을 읽고 그리는 힘이 바로 늘어요.",
    tasks: [
      { t: "필기 기출 20문제 풀기", daily: true },
      { t: "Q-Net에서 시험 일정 확인하고 목표일 정하기", day: 0 },
      { t: "CAD 프로그램 설치하고 기본 명령어 10개 익히기", day: 1 },
      { t: "필기 원서 접수", day: 3 },
      { t: "평면도 1장 따라 그리기", day: 5 },
      { t: "단면도 1장 따라 그리기", day: 8 },
      { t: "실기 기출 도면 시간 재고 그려보기", day: 14 }
    ] },
  { name: "실내건축기능사", grade: "기능사", tag: "인테리어",
    desc: "실내 공간 도면과 투시도를 다루는 자격. 주방 디자인 쪽으로 넓혀갈 때 좋아요.",
    tasks: [
      { t: "필기 기출 20문제 풀기", daily: true },
      { t: "Q-Net에서 시험 일정 확인하고 목표일 정하기", day: 0 },
      { t: "평면도·입면도 그리는 순서 정리", day: 2 },
      { t: "투시도 스케치 1장", day: 5 },
      { t: "실기 기출 도면 1세트 풀어보기", day: 12 }
    ] },
  { name: "실내건축산업기사", grade: "산업기사", tag: "인테리어",
    desc: "실내건축기능사 다음 단계. 응시자격(경력·학력)이 있으니 먼저 확인하세요." },
  { name: "실내건축기사", grade: "기사", tag: "인테리어",
    desc: "실내건축 상위 자격. 응시자격 확인 필요." },
  { name: "타일기능사", grade: "기능사", tag: "타일·마감",
    desc: "지금 하는 타일 일을 자격으로 인정받는 길. 현장 경험이 그대로 실기 연습이 돼요.",
    tasks: [
      { t: "필기 기출 20문제 풀기", daily: true },
      { t: "Q-Net에서 시험 일정·실기 과제 확인", day: 0 },
      { t: "실기 과제 도면 보고 재료·도구 목록 만들기", day: 4 },
      { t: "줄눈·레벨 맞추기 연습 1회", day: 7 }
    ] },
  { name: "방수기능사", grade: "기능사", tag: "타일·마감", desc: "욕실·주방 방수 시공. 타일 작업 바로 앞 공정이라 같이 알면 좋아요." },
  { name: "도배기능사", grade: "기능사", tag: "타일·마감", desc: "벽지 시공 자격. 인테리어 마감 공정 이해에 도움." },
  { name: "미장기능사", grade: "기능사", tag: "타일·마감", desc: "벽·바닥 바탕 만들기. 타일 붙이기 전 바탕 상태를 보는 눈이 생겨요." },
  { name: "건축도장기능사", grade: "기능사", tag: "타일·마감", desc: "도장(페인트) 시공 자격." },
  { name: "가구제작기능사", grade: "기능사", tag: "목공·가구", desc: "가구 제작 원리. 싱크대·수납장 구조를 깊게 이해할 수 있어요." },
  { name: "건축목공기능사", grade: "기능사", tag: "목공·가구", desc: "목공 시공 자격. 현장 목공 작업과 연결돼요." },
  { name: "건축일반시공산업기사", grade: "산업기사", tag: "시공·관리", desc: "시공 관리 쪽으로 커리어를 키울 때. 응시자격 확인 필요." },
  { name: "건축기사", grade: "기사", tag: "시공·관리", desc: "건축 분야 대표 상위 자격. 장기 목표로." }
];
const CERT_TAGS = ["전체", "도면·CAD", "인테리어", "타일·마감", "목공·가구", "시공·관리"];

// ---------- 상태 ----------
const S = { goals: new Map(), tasks: new Map(), logs: new Map(), money: new Map(), settings: { ...DEFAULTS }, loaded: false };
const ui = { page: "calendar", calMonth: today().slice(0, 7), selDay: today(), month: today().slice(0, 7), kind: "income", certTag: "전체", certQ: "" };
let backend = null;

// 저장 상태: 서버에 아직 안 올라간 쓰기 수 + 연결 여부. 옆 메뉴 점과 설정 창에 표시
const sync = { pending: 0, connected: true };
function setSync() {
  let state, text;
  if (!backend || backend.mode === "local") { state = ""; text = "이 브라우저에만 저장 중"; }
  else if (!sync.connected) { state = "off"; text = sync.pending ? `연결 끊김 · 저장 대기 ${sync.pending}개 (연결되면 자동으로 올라가요. 창을 닫지 마세요)` : "연결 끊김 · 다시 연결되면 최신 내용으로 맞춰요"; }
  else if (sync.pending) { state = "wait"; text = "저장 중…"; }
  else { state = "ok"; text = "서버에 저장됨"; }
  document.querySelectorAll("[data-sync]").forEach((d) => { d.dataset.state = state; d.title = text; });
  const t = $("syncText"); if (t) t.textContent = text;
}
function tracked(fn) {
  return (...args) => {
    sync.pending++; setSync();
    return Promise.resolve().then(() => fn(...args)).finally(() => { sync.pending--; setSync(); });
  };
}
window.addEventListener("beforeunload", (e) => { if (sync.pending > 0) { e.preventDefault(); e.returnValue = ""; } });

// ---------- 유틸 ----------
const $ = (id) => document.getElementById(id);
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function pad(n) { return (n < 10 ? "0" : "") + n; }
function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function parseYmd(s) { const p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
function addDays(s, n) { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); }
function diffDays(a, b) { return Math.round((parseYmd(a) - parseYmd(b)) / 86400000); }
function today() { return ymd(new Date()); }
function mondayOf(s) { const d = parseYmd(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); }
const WD = ["일", "월", "화", "수", "목", "금", "토"];
function prettyDate(s) { const d = parseYmd(s); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WD[d.getDay()]}요일`; }
function shortDate(s) { const d = parseYmd(s); return `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]})`; }
function rows(map) { return [...map].map(([id, v]) => ({ id, ...v })); }
function rid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
// 반복: "daily"(매일) / "weekly"(매주 고른 요일, days = [0(일)..6(토)]), start~end 사이에만
const isRep = (x) => x.repeat === "daily" || x.repeat === "weekly";
function activeOn(x, d) {
  if (!isRep(x)) return x.date === d;
  if ((x.start && d < x.start) || (x.end && d > x.end)) return false;
  return x.repeat === "daily" || (x.days || []).includes(parseYmd(d).getDay());
}
const DOW = ["일", "월", "화", "수", "목", "금", "토"];
function repeatLabel(x) {
  let l = x.repeat === "daily" ? "매일" : "매주 " + [1, 2, 3, 4, 5, 6, 0].filter((n) => (x.days || []).includes(n)).map((n) => DOW[n]).join("·");
  if (x.end) l += ` ~${shortDate(x.end).replace(/\(.\)/, "")}`;
  return l;
}
function rrule(x) {
  if (!isRep(x)) return "";
  const BY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  let r = x.repeat === "daily" ? "RRULE:FREQ=DAILY" : "RRULE:FREQ=WEEKLY;BYDAY=" + (x.days || []).map((n) => BY[n]).join(",");
  if (x.end) r += ";UNTIL=" + x.end.replace(/-/g, "");
  return r;
}
function isDone(t, day) { return isRep(t) ? !!(t.doneDates && t.doneDates[day]) : !!t.done; }
function fmtMin(m) { if (!m) return "0분"; if (m < 60) return m + "분"; const h = Math.floor(m / 60), r = m % 60; return h + "시간" + (r ? " " + r + "분" : ""); }
function won(n) { return Math.round(Number(n) || 0).toLocaleString("ko-KR") + "원"; }
function monthLabel(m) { return m.replace("-", "."); }
function shiftMonth(m, d) { const p = m.split("-"); const dt = new Date(+p[0], +p[1] - 1 + d, 1); return dt.getFullYear() + "-" + pad(dt.getMonth() + 1); }
function me() { return S.settings.name || DEFAULTS.name; }
function partner() { return DEFAULTS.partner; }
function deepMerge(base, patch) {
  for (const k of Object.keys(patch)) {
    const v = patch[k];
    if (v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object") deepMerge(base[k], v);
    else base[k] = v;
  }
  return base;
}

let toastTimer;
function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

// ---------- 저장소 ----------
// 1) Firebase 설정이 있으면: 구글 로그인 + Firestore (어느 기기에서든 같은 데이터)
// 2) 없으면: 이 브라우저(localStorage)에만 저장
function localBackend() {
  const KEY = "ukjin-board-v1";
  let data = null;
  try { data = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { /* 저장소 막힘 */ }
  data = data || {};
  COLS.forEach((c) => { data[c] = data[c] || {}; });
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 무시 */ } };
  const load = () => {
    COLS.forEach((c) => { S[c] = new Map(Object.entries(data[c])); });
    S.settings = { ...DEFAULTS, ...(data.settings || {}) };
    S.loaded = true; render();
  };
  load();
  return {
    mode: "local",
    async add(c, obj) { const id = rid(); data[c][id] = obj; persist(); load(); return id; },
    async update(c, id, patch) { if (data[c][id]) { data[c][id] = deepMerge(clone(data[c][id]), patch); persist(); load(); } },
    async remove(c, id) { delete data[c][id]; persist(); load(); },
    async saveSettings(patch) { data.settings = { ...(data.settings || {}), ...patch }; persist(); load(); }
  };
}

// 비밀번호 → 방 이름(해시). watch-log처럼 비밀번호를 모르면 데이터 위치도 모름.
// 비밀번호 원문은 서버에 안 가고, 이 기기에만 기억해요.
const LS_PW = "ukjin-board-pw";
async function roomOf(pw) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("ukjin-board:" + pw));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// RTDB update()는 중첩 객체를 통째로 바꾸므로 "doneDates/2026-10-09" 같은 경로로 펼쳐서 합친다
function flattenPaths(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? prefix + "/" + k : k;
    if (v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length) flattenPaths(v, key, out);
    else out[key] = v;
  }
  return out;
}

async function firebaseStart() {
  const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
  const [{ initializeApp }, rt] = await Promise.all([import(base + "firebase-app.js"), import(base + "firebase-database.js")]);
  const db = rt.getDatabase(initializeApp(firebaseConfig));
  let unsubs = [], pendingPw = null;
  const path = (room, ...p) => rt.ref(db, ["ukjin", room, ...p].join("/"));
  rt.onValue(rt.ref(db, ".info/connected"), (snap) => { sync.connected = snap.val() === true; setSync(); });
  const isDenied = (e) => e && (e.code === "PERMISSION_DENIED" || /permission/i.test(e.message || ""));

  const lockScreen = (msg) => {
    unsubs.forEach((u) => u()); unsubs = []; clearInterval(bakTimer);
    backend = null; S.loaded = false;
    $("loginView").hidden = false; $("mainView").hidden = true; $("lockRow").hidden = true;
    $("newBoard").hidden = true; $("loginMsg").textContent = msg || "";
    $("loginPw").focus();
  };
  const denied = () => "Realtime Database 규칙이 아직 안 들어갔어요. README의 규칙을 Firebase 콘솔에 넣어 주세요.";

  const BAK_KINDS = { prev: 60 * 60 * 1000, daily: 24 * 60 * 60 * 1000 };
  let bakTimer = null;
  async function rotateBackups(room) {
    try {
      const all = (await rt.get(path(room))).val() || {};
      const bak = all._backup || {}; delete all._backup;
      if (!COLS.some((c) => all[c] && Object.keys(all[c]).length)) return; // 빈 보드는 백업으로 덮지 않음
      const now = Date.now();
      for (const [kind, ms] of Object.entries(BAK_KINDS)) {
        if (bak[kind] && now - (bak[kind].savedAt || 0) < ms) continue;    // 아직 주기가 안 됨
        await rt.set(path(room, "_backup", kind), { ...all, savedAt: now });
      }
    } catch (e) { /* 백업 실패가 사용을 막지는 않음 */ }
  }

  function open(room) {
    backend = {
      mode: "firebase",
      add: tracked(async (c, obj) => { const r = rt.push(path(room, c)); await rt.set(r, obj); return r.key; }),
      update: tracked((c, id, patch) => rt.update(path(room, c, id), flattenPaths(patch))),
      remove: tracked((c, id) => rt.remove(path(room, c, id))),
      saveSettings: tracked((patch) => rt.update(path(room, "settings"), patch)), // 바뀐 칸만
      // 서버 백업 (watch-log 방식): 1시간짜리 prev, 하루짜리 daily. 실수로 지운 걸 어느 기기에서든 되돌릴 수 있게
      async backups() { return (await rt.get(path(room, "_backup"))).val() || {}; },
      restore: tracked(async (kind) => {
        const all = (await rt.get(path(room))).val() || {};
        const bak = (all._backup || {})[kind]; if (!bak) throw new Error("no backup");
        delete all._backup;
        await rt.set(path(room, "_backup", "undo"), { ...all, savedAt: Date.now() }); // 되돌리기 직전 상태도 남겨 둠
        const patch = {};
        COLS.forEach((c) => { patch[c] = bak[c] || null; });
        patch.settings = bak.settings || null;
        await rt.update(path(room), patch);
      })
    };
    rotateBackups(room);
    clearInterval(bakTimer); bakTimer = setInterval(() => rotateBackups(room), 10 * 60 * 1000);
    const onErr = (e) => showNote(isDenied(e) ? denied() : "데이터를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.", true);
    $("loginView").hidden = true; $("mainView").hidden = false;
    $("lockRow").hidden = false;
    lockAction = () => { try { localStorage.removeItem(LS_PW); } catch (e) { /* 무시 */ } closeSettings(); lockScreen("잠갔어요. 다시 열려면 비밀번호를 넣어 주세요."); };
    setSync();
    const got = {};
    COLS.forEach((c) => {
      unsubs.push(rt.onValue(path(room, c), (snap) => {
        S[c] = new Map(Object.entries(snap.val() || {})); got[c] = true;
        S.loaded = COLS.every((k) => got[k]); render();
      }, onErr));
    });
    unsubs.push(rt.onValue(path(room, "settings"), (snap) => { S.settings = { ...DEFAULTS, ...(snap.val() || {}) }; render(); }, onErr));
    render();
  }

  async function tryPassword(pw, remember) {
    const room = await roomOf(pw);
    const snap = await rt.get(path(room, "settings"));
    if (!snap.exists()) return { room, exists: false };
    if (remember) { try { localStorage.setItem(LS_PW, pw); } catch (e) { /* 무시 */ } }
    open(room);
    return { room, exists: true };
  }

  $("loginForm").onsubmit = async (ev) => {
    ev.preventDefault();
    const pw = $("loginPw").value;
    $("loginMsg").textContent = ""; $("newBoard").hidden = true;
    if (pw.length < 6) { $("loginMsg").textContent = "비밀번호는 6자 이상으로 해 주세요."; return; }
    try {
      const r = await tryPassword(pw, true);
      if (r.exists) { $("loginPw").value = ""; return; }
      pendingPw = pw; $("newBoard").hidden = false; // 오타로 빈 보드가 생기지 않게 한 번 더 확인
    } catch (e) {
      $("loginMsg").textContent = isDenied(e) ? denied() : "열지 못했어요. 인터넷 연결을 확인해 주세요.";
    }
  };
  $("newBoardYes").onclick = async () => {
    if (!pendingPw) return;
    try {
      const room = await roomOf(pendingPw);
      await rt.set(path(room, "settings"), { ...DEFAULTS, createdAt: Date.now() });
      try { localStorage.setItem(LS_PW, pendingPw); } catch (e) { /* 무시 */ }
      pendingPw = null; $("loginPw").value = "";
      open(room); toast("새 보드를 만들었어요. 다른 기기에서도 같은 비밀번호로 열면 돼요.");
    } catch (e) {
      $("loginMsg").textContent = isDenied(e) ? denied() : "만들지 못했어요. 인터넷 연결을 확인해 주세요.";
    }
  };
  $("newBoardNo").onclick = () => { pendingPw = null; lockScreen(""); };

  let saved = null;
  try { saved = localStorage.getItem(LS_PW); } catch (e) { /* 무시 */ }
  if (!saved) { lockScreen(""); return; }
  try {
    const r = await tryPassword(saved, false);
    if (!r.exists) lockScreen("저장된 비밀번호로 보드를 찾지 못했어요. 다시 넣어 주세요.");
  } catch (e) {
    lockScreen(isDenied(e) ? denied() : "연결하지 못했어요. 인터넷 연결을 확인해 주세요.");
  }
}

function act(promise, okMsg) {
  return Promise.resolve(promise).then((r) => { if (okMsg) toast(okMsg); return r; }, (e) => {
    toast(e && (e.code === "PERMISSION_DENIED" || /permission/i.test(e.message || "")) ? "저장 권한이 없어요. Realtime Database 규칙을 확인해 주세요." : "저장하지 못했어요. 잠시 뒤 다시 해 주세요.");
    throw e;
  });
}
function ready() { if (!backend) { toast("아직 불러오는 중이에요."); return false; } return true; }

function showNote(msg, warn) { const n = $("modeNote"); n.hidden = !msg; n.textContent = msg || ""; n.classList.toggle("warn", !!warn); }
function showMode() {
  if (!backend) return;
  if (backend.mode === "local") {
    showNote("지금은 이 브라우저에만 저장돼요. firebase-config.js에 Realtime Database 주소(databaseURL)를 넣으면 폰·PC 어디서든 같은 데이터를 써요.");
    $("modeInfo").textContent = "Firebase에 연결되지 않아 이 브라우저에만 저장돼요.";
  } else {
    $("modeInfo").textContent = "할 일·기록·돈 항목은 하나씩 따로 저장돼서 폰과 PC가 서로 덮어쓰지 않아요. 같은 비밀번호로 열면 어디서든 같은 보드예요.";
  }
}

// ---------- 구글 캘린더 표시 ----------
function renderGcalChip() {
  const c = $("gcalChip"), s = gcalStatus();
  if (s.state === "none") { c.hidden = true; return; }
  c.hidden = false;
  c.dataset.act = s.state === "ok" ? "openSettings" : "gConnect";
  c.textContent = s.state === "off" ? "구글 캘린더 연결" : s.state === "expired" ? "구글 캘린더 다시 연결" : "구글 캘린더 연결됨";
  c.classList.toggle("warn", s.state === "expired");
}
function renderGcalBox() {
  const box = $("gcalBox"), s = gcalStatus(), pr = gcalPrefs();
  if (s.state === "none") { box.innerHTML = '<p class="small muted">구글 캘린더 연결이 설정되지 않았어요.</p>'; return; }
  const linked = S.settings.gcalEmail || "";
  let html = "";
  if (s.state === "off") {
    html += `<p class="small muted">욱진이 구글 계정으로 연결하면 보드 할 일·시험일이 구글 캘린더에 자동으로 들어가고, 구글 일정도 달력에 같이 보여요.${linked ? ` 이 보드는 <b>${esc(linked)}</b> 캘린더에 연결돼 있어요.` : ""}</p>` +
      '<div><button class="btn small" type="button" data-act="gConnect">구글 캘린더 연결</button></div>';
  } else {
    html += `<p class="sync-line"><span class="sync-dot" data-state="${s.state === "ok" ? "ok" : "wait"}"></span><span>이 기기: ${esc(s.email || "연결됨")}${s.state === "expired" ? " · 잠깐 풀림 (화면을 누르면 알아서 다시 연결돼요)" : ""}</span></p>` +
      `<p class="small muted">보드가 일정을 넣는 계정: <b>${esc(linked || s.email || "-")}</b></p>`;
    const ls = gcalLastSync();
    if (ls && ls.at) html += `<p class="small muted">마지막으로 맞춘 때: ${fmtTime(ls.at)} · 추가 ${ls.added || 0} · 수정 ${ls.updated || 0} · 삭제 ${ls.deleted || 0}${ls.error ? ` · <span style="color:var(--danger)">${esc(ls.error)}</span>` : ""}</p>`;
    if (s.other) html += `<p class="small" style="color:var(--danger)">보드는 ${esc(linked)} 캘린더에 연결돼 있어서, 이 계정으로는 일정만 보여 줘요.</p>`;
    html += `<label class="inline-check"><input type="checkbox" id="gShow" ${pr.show ? "checked" : ""}> 구글 일정을 보드 달력에 보여 주기</label>` +
      `<label class="inline-check"><input type="checkbox" id="gPush" ${pr.push ? "checked" : ""} ${s.other ? "disabled" : ""}> 보드 할 일·시험일을 구글 캘린더에 넣기</label>` +
      '<p class="small muted">매일 하는 일은 넣지 않아요. 보드에서 고치거나 지우면 구글 캘린더에서도 바뀌어요.</p>' +
      '<div class="row" style="flex:0 0 auto">' + (s.state === "expired" ? '<button class="btn small" type="button" data-act="gConnect">다시 연결</button>' : '<button class="btn small" type="button" data-act="gSyncNow">지금 구글과 맞추기</button>') +
      '<button class="btn ghost small" type="button" data-act="gDisconnect">이 기기에서 연결 해제</button>' +
      (s.state === "ok" ? '<button class="btn ghost small" type="button" data-act="gFindManual">예전 \'캘린더\' 버튼으로 넣은 일정 찾기</button>' : "") +
      (s.other ? '<button class="btn ghost small" type="button" data-act="gRelink">이 계정으로 보드 연결 바꾸기</button>' : "") + "</div>";
  }
  box.innerHTML = html + '<div id="gManual" style="display:grid;gap:8px"></div>';
  renderManualList();
}
let manualFound = null;   // 찾은 예전 일정 목록 (설정 창이 다시 그려져도 유지)
function renderManualList() {
  const box = $("gManual"); if (!box || !manualFound) return;
  if (!manualFound.length) { box.innerHTML = '<p class="small muted">예전 버튼으로 넣은 일정이 없어요. 구글에 남은 일정은 보드에 아직 있는 할 일이거나, 직접 만든 일정이에요.</p>'; return; }
  box.innerHTML = `<p class="small">예전 '캘린더' 버튼으로 넣은 일정 <b>${manualFound.length}개</b>를 찾았어요.</p>` +
    '<div class="list">' + manualFound.map((x) => `<div class="item"><span class="mono small muted" style="padding-top:2px">${x.date ? shortDate(x.date) : ""}</span><div class="body"><div class="title">${esc(x.title)}</div>${x.repeat ? '<div class="meta"><span class="tag daily">반복 일정 전체</span></div>' : ""}</div></div>`).join("") + "</div>" +
    `<div><button class="btn small" type="button" data-act="gDelManual">구글에서 ${manualFound.length}개 모두 지우기</button></div>`;
}

// ---------- 설정 작은 창 ----------
let lockAction = null;
function openSettings() {
  closeMenu();
  $("bakPanel").hidden = !(backend && backend.backups);
  setSync(); renderGcalBox();
  openDlg($("settingsDlg"));
  if (backend && backend.backups) loadBackups();
}
function openDlg(d) { if (d.open) return; if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", ""); }
function closeDlg(d) { if (d.open) { if (typeof d.close === "function") d.close(); else d.removeAttribute("open"); } }
function closeSettings() { closeDlg($("settingsDlg")); }
// 바깥(어두운 부분) 누르면 닫힘
["settingsDlg", "dayDlg", "goalDlg"].forEach((id) => $(id).addEventListener("click", (ev) => { if (ev.target === ev.currentTarget) closeDlg(ev.currentTarget); }));
function openMenu() { $("side").classList.add("open"); document.querySelector(".scrim").hidden = false; }
function closeMenu() { $("side").classList.remove("open"); document.querySelector(".scrim").hidden = true; }

// ---------- 구글 캘린더 ----------
function gcalUrl(title, date, rule) {
  let u = "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    "&text=" + encodeURIComponent(title) +
    "&dates=" + date.replace(/-/g, "") + "/" + addDays(date, 1).replace(/-/g, "") +
    "&details=" + encodeURIComponent(me() + " 실천 보드");
  if (rule) u += "&recur=" + encodeURIComponent(rule);
  return u;
}
function gcalLink(title, date, rule, label) {
  if (gcalPushing()) return ""; // 구글 캘린더에 자동으로 들어가는 중이면 버튼 필요 없음
  return `<a class="icon-btn" href="${esc(gcalUrl(title, date, rule))}" target="_blank" rel="noopener" title="구글 캘린더에 추가">${label || "캘린더"}</a>`;
}

// ---------- 계산 ----------
function practiceMinutes() {
  // 날짜별 실천량. 기록 시간 + 완료한 할 일 1개당 15분으로 쳐서 타일 진하기에 씀
  const m = {};
  const add = (d, v) => { m[d] = (m[d] || 0) + v; };
  S.logs.forEach((l) => { if (l.date) add(l.date, Math.max(Number(l.minutes) || 0, 1)); });
  S.tasks.forEach((t) => {
    if (isRep(t)) Object.entries(t.doneDates || {}).forEach(([d, v]) => { if (v) add(d, 15); });
    else if (t.done && t.doneDate) add(t.doneDate, 15);
  });
  return m;
}
function streak(days) {
  const t = today(); let d = days[t] ? t : addDays(t, -1), n = 0;
  while (days[d]) { n++; d = addDays(d, -1); }
  return n;
}
function logMinutes(from, to) { let m = 0; S.logs.forEach((l) => { if (l.date >= from && l.date <= to) m += Number(l.minutes) || 0; }); return m; }
function todayTasks() {
  const t = today();
  return rows(S.tasks).filter((x) => {
    if (isRep(x)) return activeOn(x, t);
    if (!x.date || x.date > t) return false;
    return !x.done || x.doneDate === t;
  });
}

// ---------- 렌더 ----------
const CHECK = '<svg viewBox="0 0 16 16"><path d="M3 8.5l3.2 3L13 4.5"/></svg>';
function taskItem(x, day, upcoming) {
  const done = isDone(x, day), g = x.goalId ? S.goals.get(x.goalId) : null, meta = [];
  if (isRep(x)) meta.push(`<span class="tag daily">${esc(repeatLabel(x))}</span>`);
  if (g) meta.push(`<span class="tag cat ${catCls(x.goalId)}">${esc(g.title)}</span>`);
  if (upcoming) meta.push(`<span class="mono">${shortDate(x.date)}</span>`);
  else if (!isRep(x) && x.date < day && !done) meta.push(`<span class="tag late">${diffDays(day, x.date)}일 밀림</span>`);
  return `<div class="item${done ? " done" : ""}">` +
    (isRep(x) && (!activeOn(x, day) || day > today())
      ? `<button class="check" type="button" disabled title="${activeOn(x, day) ? "그 날이 되면 체크할 수 있어요" : "이 날은 쉬는 날"}" aria-label="아직 체크할 수 없음" style="opacity:.35">${CHECK}</button>`
      : `<button class="check${done ? " on" : ""}" type="button" data-act="toggle" data-id="${esc(x.id)}" data-day="${day}" aria-pressed="${done}" aria-label="완료 표시">${CHECK}</button>`) +
    `<div class="body"><div class="title">${esc(x.title)}</div>${meta.length ? `<div class="meta">${meta.join("")}</div>` : ""}</div>` +
    `<div class="actions">${gcalLink(x.title, isRep(x) ? (x.start || day) : x.date, rrule(x))}` +
    `<button class="icon-btn" type="button" data-act="del" data-col="tasks" data-id="${esc(x.id)}">삭제</button></div></div>`;
}
function statTile(label, value, sub, cls, act) {
  const tag = act ? "button" : "div", attrs = act ? ` type="button" data-act="${act}"` : "";
  return `<${tag} class="stat ${cls || ""}"${attrs}><span>${label}</span><b>${value}</b>${sub ? `<small>${sub}</small>` : ""}</${tag}>`;
}

function renderHeader() {
  const t = today();
  $("todayMono").textContent = t.replace(/-/g, ".");
  $("brandName").textContent = me() + " 실천 보드";
  document.title = me() + " 실천 보드";
  document.querySelectorAll(".nav a").forEach((a) => {
    if (a.getAttribute("href") === "#" + ui.page) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  document.querySelectorAll(".page").forEach((p) => { p.hidden = p.dataset.page !== ui.page; });
}

function moneyShort(n) {
  const v = Math.round(Number(n) || 0);
  return v >= 10000 ? (Math.round(v / 1000) / 10).toLocaleString("ko-KR") + "만" : v.toLocaleString("ko-KR");
}
function tasksOn(d) {
  return rows(S.tasks).filter((x) => activeOn(x, d))
    .sort((a, b) => isRep(a) - isRep(b) || (a.createdAt || 0) - (b.createdAt || 0));
}
function renderCalendar() {
  const t = today(), m = ui.calMonth, p = m.split("-");
  const first = new Date(+p[0], +p[1] - 1, 1);
  const start = addDays(ymd(first), -first.getDay());
  const lastDay = new Date(+p[0], +p[1], 0).getDate();
  const weeks = Math.ceil((first.getDay() + lastDay) / 7);
  $("calTitle").textContent = `${p[0]}년 ${+p[1]}월`;
  const prac = practiceMinutes();
  const exams = {}; S.goals.forEach((g) => { if (g.due) (exams[g.due] ||= []).push(g); });
  const income = {}; S.money.forEach((x) => { if (x.kind === "income" && x.date) income[x.date] = (income[x.date] || 0) + (Number(x.amount) || 0); });
  const habits = rows(S.tasks).filter(isRep);
  let html = "";
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(start, i), dt = parseYmd(d), evs = [];
    (exams[d] || []).forEach((g) => evs.push(`<div class="ev exam" title="${esc(g.title)}">D-DAY ${esc(g.title)}</div>`));
    if (income[d]) evs.push(`<div class="ev money">+${moneyShort(income[d])}</div>`);
    gcalEventsOn(d).forEach((g) => evs.push(`<div class="ev gev" title="${esc(g.title)}">${g.time ? `<b>${g.time}</b> ` : ""}${esc(g.title)}</div>`));
    rows(S.tasks).filter((x) => !isRep(x) && x.date === d).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).forEach((x) => {
      const g = x.goalId ? S.goals.get(x.goalId) : null;
      evs.push(`<div class="ev ${g ? catCls(x.goalId) : "c-blue"}${x.done ? " done" : ""}" title="${esc(x.title)}">${esc(x.title)}</div>`);
    });
    const hs = d <= t ? habits.filter((h) => activeOn(h, d)) : [];
    const shown = evs.slice(0, 3), more = evs.length - shown.length;
    if (more > 0) shown.push(`<div class="ev more">+${more}개 더</div>`);
    if (hs.length) shown.push(`<div class="ev habit">반복 ${hs.filter((h) => h.doneDates && h.doneDates[d]).length}/${hs.length}</div>`);
    const mm = prac[d] || 0, lv = mm >= 120 ? 4 : mm >= 60 ? 3 : mm >= 30 ? 2 : mm > 0 ? 1 : 0;
    const cls = ["day", d.slice(0, 7) !== m ? "out" : "", d === t ? "today" : "", d === ui.selDay ? "sel" : "", dt.getDay() === 0 ? "sun" : "", dt.getDay() === 6 ? "sat" : ""].filter(Boolean).join(" ");
    html += `<button type="button" class="${cls}" data-act="selDay" data-day="${d}" aria-label="${esc(prettyDate(d))}">` +
      `<span class="top"><span class="num">${dt.getDate()}</span>${lv ? `<span class="prac l${lv}" title="실천 ${fmtMin(mm)}"></span>` : ""}</span>${shown.join("")}</button>`;
  }
  $("calGrid").innerHTML = html;
  gcalEnsureRange(start, addDays(start, weeks * 7 - 1));
  renderGcalChip();
  renderDaySide();
}
// 날짜 작은 창: [할 일] [실천한 일] 두 버튼, 할 일 추가는 한 번/매일/매주 요일
const dt = { tab: "tasks", rep: "none", days: new Set() };
function openDay(d) {
  ui.selDay = d; if (d.slice(0, 7) !== ui.calMonth) ui.calMonth = d.slice(0, 7);
  dt.tab = "tasks"; dt.rep = "none"; dt.days = new Set([parseYmd(d).getDay()]);
  $("dayTaskTitle").value = ""; $("dtGoal").value = "";
  renderCalendar(); openDlg($("dayDlg"));
}
function renderDayForm() {
  $("dayPaneTasks").hidden = dt.tab !== "tasks"; $("dayPaneLogs").hidden = dt.tab !== "logs";
  $("dayTabBtnTasks").setAttribute("aria-pressed", String(dt.tab === "tasks"));
  $("dayTabBtnLogs").setAttribute("aria-pressed", String(dt.tab === "logs"));
  document.querySelectorAll("#dtRepSeg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === dt.rep)));
  $("dtDays").hidden = dt.rep !== "weekly";
  $("dtDays").innerHTML = [1, 2, 3, 4, 5, 6, 0].map((n) => `<button class="chip" type="button" data-act="dtDay" data-d="${n}" aria-pressed="${dt.days.has(n)}">${DOW[n]}</button>`).join("");
  $("dtHint").textContent = dt.rep === "none" ? "" : `${shortDate(ui.selDay)}부터 ${dt.rep === "daily" ? "매일" : "고른 요일마다"} 반복해요. 목표에 시험일이 있으면 그날까지만 반복해요.`;
  const sel = $("dtGoal"), cur = sel.value;
  sel.innerHTML = '<option value="">없음</option>' + rows(S.goals).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).map((g) => `<option value="${esc(g.id)}">${esc(g.title)}</option>`).join("");
  if (cur && S.goals.has(cur)) sel.value = cur;
}
function renderDaySide() {
  renderDayForm();
  const d = ui.selDay, t = today(), n = diffDays(d, t);
  $("dayTitle").textContent = prettyDate(d);
  $("daySub").textContent = n === 0 ? "오늘" : n > 0 ? `${n}일 뒤` : `${-n}일 전`;
  const exams = rows(S.goals).filter((g) => g.due === d);
  const ts = tasksOn(d);
  $("dayTasks").innerHTML = exams.map((g) => `<div class="item"><span class="tag cat c-coral">D-DAY</span><div class="body"><div class="title">${esc(g.title)}</div></div><div class="actions">${gcalLink("[D-DAY] " + g.title, g.due, false)}</div></div>`).join("") +
    (ts.length ? ts.map((x) => taskItem(x, d)).join("") : (exams.length ? "" : '<div class="empty">이 날 할 일이 없어요.</div>'));
  const ls = rows(S.logs).filter((l) => l.date === d).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  $("dayLogs").innerHTML = ls.length ? ls.map((l) => `<div class="item"><span class="tag mono">${l.minutes ? fmtMin(Number(l.minutes)) : "기록"}</span><div class="body"><div class="title">${l.text ? esc(l.text) : '<span class="muted">메모 없음</span>'}</div></div>` +
    `<div class="actions"><button class="icon-btn" type="button" data-act="del" data-col="logs" data-id="${esc(l.id)}">삭제</button></div></div>`).join("") : '<div class="empty">아직 기록이 없어요.</div>';
  const gs = gcalEventsOn(d);
  $("dayGcalSec").hidden = !gs.length;
  $("dayGcal").innerHTML = gs.map((g) => `<div class="item"><span class="tag mono">${g.time || "종일"}</span><div class="body"><div class="title">${esc(g.title)}</div></div>${g.link ? `<div class="actions"><a class="icon-btn" href="${esc(g.link)}" target="_blank" rel="noopener">열기</a></div>` : ""}</div>`).join("");
  const ms = rows(S.money).filter((x) => x.date === d);
  $("dayMoneySec").hidden = !ms.length;
  const KIND = { income: "수입", transfer: partner() + "에게", expense: "지출" };
  $("dayMoney").innerHTML = ms.map((x) => `<div class="item"><span class="tag">${esc(KIND[x.kind] || "")}</span><div class="body"><div class="title">${esc(x.memo || x.cat || "")}</div></div><span class="won ${x.kind === "income" ? "plus" : "minus"}">${x.kind === "income" ? "+" : "-"}${won(x.amount)}</span></div>`).join("");
}

const STAT_ICON = {
  task: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12.5l3 3 5-6"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4.5l3 2"/></svg>',
  week: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 14h2M12 14h2M16 14h2"/></svg>',
  fire: '<svg viewBox="0 0 24 24"><path d="M12 21c-3.9 0-6.5-2.6-6.5-6 0-3.7 3.2-5.6 3.6-9.5 2.4 1.5 3.6 3.6 3.4 6 1.1-.6 1.8-1.8 1.9-3.2 2.4 1.9 4.1 4.2 4.1 6.9 0 3.3-2.6 5.8-6.5 5.8z"/></svg>'
};
function renderToday() {
  // 달력 위 요약 4칸 + 달력 아래 다가오는 할 일
  const t = today(), wk = mondayOf(t), list = todayTasks(), days = practiceMinutes();
  const dn = list.filter((x) => isDone(x, t)).length;
  $("todayStats").innerHTML =
    statTile(STAT_ICON.task + "오늘 할 일", `${dn}/${list.length}`, list.length ? (dn === list.length ? "다 끝냈어요!" : "누르면 체크하러 가요") : "아직 없음", "click", "openToday") +
    statTile(STAT_ICON.clock + "오늘 실천", fmtMin(logMinutes(t, t))) +
    statTile(STAT_ICON.week + "이번 주 실천", fmtMin(logMinutes(wk, addDays(wk, 6)))) +
    statTile(STAT_ICON.fire + "연속 실천", streak(days) + "일", "기록이나 완료가 있는 날");
  const end = addDays(t, 14);
  const up = rows(S.tasks).filter((x) => !isRep(x) && x.date > t && x.date <= end && !x.done).sort((a, b) => a.date.localeCompare(b.date));
  $("upcomingList").innerHTML = up.length ? up.map((x) => taskItem(x, t, true)).join("") : '<div class="empty">앞으로 2주 안에 잡힌 할 일이 없어요.</div>';
}

function renderGoals() {
  const t = today(), weekAgo = addDays(t, -6), allTasks = rows(S.tasks);
  const gs = rows(S.goals).sort((a, b) => {
    if (!!a.due !== !!b.due) return a.due ? -1 : 1;
    if (a.due && b.due && a.due !== b.due) return a.due.localeCompare(b.due);
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
  $("goalList").innerHTML = !S.loaded ? '<div class="panel muted">불러오는 중…</div>'
    : !gs.length ? '<div class="panel muted">아직 목표가 없어요. <a href="#certs">자격증 찾기</a>에서 하나 골라 보세요.</div>'
    : gs.map((g) => {
      const ts = allTasks.filter((x) => x.goalId === g.id);
      const once = ts.filter((x) => !isRep(x)), onceDone = once.filter((x) => x.done).length;
      const habits = ts.filter(isRep);
      let hits = 0; habits.forEach((h) => Object.entries(h.doneDates || {}).forEach(([d, v]) => { if (v && d >= weekAgo && d <= t) hits++; }));
      let mins = 0; S.logs.forEach((l) => { if (l.goalId === g.id) mins += Number(l.minutes) || 0; });
      const pct = once.length ? Math.round(onceDone / once.length * 100) : 0;
      let dd;
      if (g.due) {
        const n = diffDays(g.due, t);
        dd = `<div class="dday${n >= 0 && n <= 14 ? " soon" : ""}">${n > 0 ? "D-" + n : n === 0 ? "D-DAY" : "D+" + (-n)}<small>${shortDate(g.due)}</small></div>`;
      } else dd = '<div class="dday muted" style="font-size:13px">날짜 미정</div>';
      return `<article class="goal ${catCls(g)}" data-act="openGoal" data-id="${esc(g.id)}" role="button" tabindex="0" aria-label="${esc(g.title)} 자세히"><div class="goal-head"><div style="display:grid;gap:6px;min-width:0">` +
        `<div><span class="tag">${esc(g.cat || "기타")}</span></div><div class="goal-title">${esc(g.title)}</div></div>${dd}</div>` +
        `<div style="display:grid;gap:4px"><div class="bar"><i style="width:${pct}%"></i></div>` +
        `<div class="small muted">할 일 <span class="mono">${onceDone}/${once.length}</span> 완료` +
        (habits.length ? ` · 반복하는 일 ${habits.length}개, 최근 7일 <span class="mono">${hits}</span>회` : "") +
        ` · 누적 <span class="mono">${fmtMin(mins)}</span></div></div>` +
        `<div class="goal-foot"><span>누르면 할 일·반복 설정</span><span aria-hidden="true">›</span></div></article>`;
    }).join("");
  const gc = $("goalCat"), v = gc.value || "자격증";
  gc.innerHTML = GOAL_CATS.map((c) => `<option>${c}</option>`).join(""); gc.value = v;
}

// 지운 목표에 딸려 있던 할 일 (예전 버전은 목표를 지워도 할 일이 남았음)
function orphanTasks() { return rows(S.tasks).filter((x) => x.goalId && !S.goals.has(x.goalId)); }
function renderOrphanNote() {
  const n = S.loaded ? orphanTasks().length : 0;
  document.querySelectorAll("[data-orphans]").forEach((box) => {
    box.hidden = !n;
    if (n) box.innerHTML = `<span>지운 목표에 딸려 있던 할 일이 <b>${n}개</b> 남아 있어요.</span><button class="btn small" type="button" data-act="cleanOrphans">모두 지우기</button>`;
  });
}

// ---------- 목표 작은 창 ----------
const gt = { rep: "none", days: new Set([1, 3, 5]) };   // 할 일 추가 폼 상태
function openGoal(id) {
  ui.goalId = id;
  const g = S.goals.get(id); if (!g) return;
  $("geTitle").value = g.title || ""; $("geDue").value = g.due || "";
  $("geCat").innerHTML = GOAL_CATS.map((c) => `<option>${c}</option>`).join(""); $("geCat").value = g.cat || "기타";
  $("gtTitle").value = ""; $("gtDate").value = today();
  renderGoalDlg(); openDlg($("goalDlg"));
}
function renderGoalDlg() {
  const d = $("goalDlg"); if (!d.open && !ui.goalId) return;
  const g = ui.goalId && S.goals.get(ui.goalId);
  if (!g) { closeDlg(d); ui.goalId = null; return; }
  const t = today();
  $("gTitle").textContent = g.title;
  const n = g.due ? diffDays(g.due, t) : null;
  $("gSub").textContent = (g.cat || "기타") + (g.due ? ` · ${n > 0 ? "D-" + n : n === 0 ? "D-DAY" : "D+" + (-n)} (${shortDate(g.due)})` : " · 날짜 미정");
  $("gDlgHead").className = "dlg-head goal-band " + catCls(ui.goalId);
  $("geCal").innerHTML = g.due ? gcalLink("[D-DAY] " + g.title, g.due, "", "구글 캘린더에 추가") : "";
  const ts = rows(S.tasks).filter((x) => x.goalId === ui.goalId);
  const reps = ts.filter(isRep).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const once = ts.filter((x) => !isRep(x)).sort((a, b) => (a.done - b.done) || (a.date || "").localeCompare(b.date || ""));
  $("gRepeats").innerHTML = reps.length ? reps.map((x) => taskItem(x, t)).join("") : '<div class="empty">아직 없어요. 아래에서 "매일"이나 "매주"로 추가해요.</div>';
  $("gTasks").innerHTML = once.length ? once.map((x) => taskItem(x, t, !x.done && x.date > t)).join("") : '<div class="empty">아직 없어요.</div>';
  // 추가 폼
  document.querySelectorAll("#gtRepSeg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === gt.rep)));
  $("gtDays").hidden = gt.rep !== "weekly";
  $("gtDays").innerHTML = [1, 2, 3, 4, 5, 6, 0].map((n) => `<button class="chip" type="button" data-act="gtDay" data-d="${n}" aria-pressed="${gt.days.has(n)}">${DOW[n]}</button>`).join("");
  $("gtDateLabel").firstChild.textContent = gt.rep === "none" ? "날짜" : "시작일";
  $("gtUntilWrap").hidden = gt.rep === "none" || !g.due;
  $("gtUntilText").textContent = g.due ? `목표일 ${shortDate(g.due)}까지만 반복` : "";
  $("gDelBtn").dataset.id = ui.goalId;
  const c = g.cert && CERTS.find((z) => z.name === g.cert);
  $("gTemplate").hidden = !(c && c.tasks);
  if (c && c.tasks) $("gTemplate").innerHTML = `<button class="btn ghost small" type="button" data-act="addTemplate">추천 할 일 ${c.tasks.length}개 넣기</button><span class="small muted">${esc(c.tasks.map((z) => z.t).slice(0, 3).join(", "))} 등</span>`;
}

function renderLog() {
  const t = today(), days = practiceMinutes(), WEEKS = 26;
  const start = addDays(mondayOf(t), -7 * (WEEKS - 1));
  let html = "";
  for (let i = 0; i < WEEKS * 7; i++) {
    const d = addDays(start, i), m = days[d] || 0;
    let cls = "tile";
    if (d > t) cls += " future";
    else if (m >= 120) cls += " l4"; else if (m >= 60) cls += " l3"; else if (m >= 30) cls += " l2"; else if (m > 0) cls += " l1";
    if (d === t) cls += " today";
    html += `<div class="${cls}" title="${esc(shortDate(d) + (m ? " · " + fmtMin(m) : ""))}"></div>`;
  }
  $("wall").innerHTML = html;

  const wk = mondayOf(t); let cnt = 0, total = 0;
  for (let i = 0; i < 7; i++) if (days[addDays(wk, i)]) cnt++;
  Object.keys(days).forEach((d) => { if (d >= start && d <= t) total++; });
  $("logStats").innerHTML =
    statTile("연속 실천", streak(days) + "일") +
    statTile("이번 주 실천한 날", cnt + "/7") +
    statTile("이번 주 기록 시간", fmtMin(logMinutes(wk, addDays(wk, 6)))) +
    statTile("최근 26주 실천한 날", total + "일");

  const ls = rows(S.logs).sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 50);
  $("logList").innerHTML = !S.loaded ? '<div class="empty">불러오는 중…</div>' : ls.length ? ls.map((l) => {
    const g = l.goalId ? S.goals.get(l.goalId) : null;
    return `<div class="item"><span class="mono small muted" style="padding-top:2px">${shortDate(l.date)}</span>` +
      `<div class="body"><div class="title">${l.text ? esc(l.text) : '<span class="muted">메모 없음</span>'}</div>` +
      `<div class="meta">${l.minutes ? `<span class="tag mono">${fmtMin(Number(l.minutes))}</span>` : ""}${g ? `<span class="tag">${esc(g.title)}</span>` : ""}</div></div>` +
      `<div class="actions"><button class="icon-btn" type="button" data-act="del" data-col="logs" data-id="${esc(l.id)}">삭제</button></div></div>`;
  }).join("") : '<div class="empty">아직 기록이 없어요. <a href="#calendar">달력</a>에서 날짜를 누르고 실천 기록을 남기면 첫 타일이 붙어요.</div>';
}

function monthTotals(m) {
  const r = { inc: 0, out: 0, exp: 0, byCat: {}, items: [] };
  S.money.forEach((x, id) => {
    if (!x.date || x.date.slice(0, 7) !== m) return;
    const a = Number(x.amount) || 0;
    r.items.push({ id, ...x });
    if (x.kind === "income") r.inc += a;
    else if (x.kind === "transfer") r.out += a;
    else { r.exp += a; r.byCat[x.cat || "기타"] = (r.byCat[x.cat || "기타"] || 0) + a; }
  });
  r.left = r.inc - r.out - r.exp;
  return r;
}

function renderMoney() {
  const m = ui.month, r = monthTotals(m);
  $("monthLabel").textContent = monthLabel(m);
  $("kindTransfer").textContent = partner() + "에게";
  $("moneyStats").innerHTML =
    statTile("월급·수입", won(r.inc)) +
    statTile(partner() + "에게 보낸 돈", won(r.out), r.inc ? `수입의 ${Math.round(r.out / r.inc * 100)}%` : "") +
    statTile("생활비 지출", won(r.exp), r.inc ? `수입의 ${Math.round(r.exp / r.inc * 100)}%` : "") +
    statTile("남은 돈", won(r.left), r.inc ? `수입의 ${Math.round(r.left / r.inc * 100)}%` : "", r.left < 0 ? "minus" : "plus");

  const budget = Number(S.settings.budget) || 0;
  const bar = $("budgetBar");
  bar.classList.toggle("over", budget > 0 && r.exp > budget);
  bar.firstElementChild.style.width = (budget ? Math.min(100, Math.round(r.exp / budget * 100)) : 0) + "%";
  $("budgetLeft").innerHTML = budget
    ? `예산 ${won(budget)} 중 <span class="won">${won(r.exp)}</span> 씀 · ` + (r.exp > budget ? `<span class="won minus">${won(r.exp - budget)} 초과</span>` : `<span class="won plus">${won(budget - r.exp)} 남음</span>`)
    : "예산을 넣으면 남은 금액이 보여요";
  if (document.activeElement !== $("budgetIn")) $("budgetIn").value = budget || "";
  const cats = Object.keys(r.byCat).sort((a, b) => r.byCat[b] - r.byCat[a]);
  const max = cats.length ? r.byCat[cats[0]] : 0;
  $("catBars").innerHTML = cats.length ? cats.map((c) =>
    `<div class="catbar"><span>${esc(c)}</span><div class="bar"><i style="width:${Math.max(2, Math.round(r.byCat[c] / max * 100))}%"></i></div><span class="won">${won(r.byCat[c])}</span></div>`
  ).join("") : '<div class="muted small">이번 달 생활비 지출 기록이 아직 없어요.</div>';

  // 최근 6개월 표
  let trs = "";
  for (let i = 5; i >= 0; i--) {
    const mm = shiftMonth(m, -i), x = monthTotals(mm);
    trs += `<tr class="${mm === m ? "cur" : ""}"><td class="mono">${monthLabel(mm)}</td><td class="num won">${won(x.inc)}</td><td class="num won">${won(x.out)}</td><td class="num won">${won(x.exp)}</td><td class="num won ${x.left < 0 ? "minus" : x.left > 0 ? "plus" : ""}">${won(x.left)}</td></tr>`;
  }
  $("monthTable").innerHTML = `<thead><tr><th>월</th><th class="num">수입</th><th class="num">보낸 돈</th><th class="num">생활비</th><th class="num">남은 돈</th></tr></thead><tbody>${trs}</tbody>`;

  // 입력 폼
  document.querySelectorAll("#kindSeg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === ui.kind)));
  const mc = $("mCat"), mcv = mc.value;
  mc.innerHTML = MONEY_CATS[ui.kind].map((c) => `<option>${c}</option>`).join("");
  if (MONEY_CATS[ui.kind].includes(mcv)) mc.value = mcv;
  $("mHint").textContent = ui.kind === "income" ? "월급날 한 번 적으면 이번 달 계산이 시작돼요."
    : ui.kind === "transfer" ? `${partner()}에게 보낸 돈이에요. 남은 돈에서 빠져요.` : "같이 쓰는 생활비, 내가 쓴 돈 모두 여기에.";
  $("mSubmit").textContent = ui.kind === "income" ? "수입 기록" : ui.kind === "transfer" ? "보낸 돈 기록" : "지출 기록";
  if (!$("mDate").value) $("mDate").value = today();

  // 이번 달 내역
  const KIND = { income: "수입", transfer: partner() + "에게", expense: "지출" };
  const items = r.items.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
  $("moneyCount").textContent = items.length ? items.length + "건" : "";
  $("moneyTable").innerHTML = !S.loaded ? '<tbody><tr><td class="muted">불러오는 중…</td></tr></tbody>'
    : !items.length ? `<tbody><tr><td class="muted">${monthLabel(m)} 기록이 없어요. 월급날이면 <b>월급·수입</b>부터 적어 보세요.</td></tr></tbody>`
    : `<thead><tr><th>날짜</th><th>구분</th><th>분류</th><th>메모</th><th class="num">금액</th><th></th></tr></thead><tbody>` +
      items.map((x) => `<tr><td class="mono">${shortDate(x.date)}</td><td>${esc(KIND[x.kind] || "")}</td><td>${esc(x.cat || "")}</td><td>${esc(x.memo || "")}</td>` +
        `<td class="num won ${x.kind === "income" ? "plus" : "minus"}">${x.kind === "income" ? "+" : "-"}${won(x.amount)}</td>` +
        `<td class="num"><button class="icon-btn" type="button" data-act="del" data-col="money" data-id="${esc(x.id)}">삭제</button></td></tr>`).join("") + "</tbody>";
}

function searchLinks(q) {
  const enc = encodeURIComponent;
  return [
    ["Q-Net에서 보기", "https://www.google.com/search?q=" + enc(q + " site:q-net.or.kr")],
    ["시험 일정", "https://www.google.com/search?q=" + enc(q + " " + new Date().getFullYear() + " 시험일정")],
    ["응시자격·과목", "https://www.google.com/search?q=" + enc(q + " 응시자격 시험과목")],
    ["기출문제", "https://www.google.com/search?q=" + enc(q + " 기출문제")],
    ["유튜브 강의", "https://www.youtube.com/results?search_query=" + enc(q + " 강의")],
    ["민간자격 검색", "https://www.google.com/search?q=" + enc(q + " site:pqi.or.kr")]
  ];
}

function renderCerts() {
  const q = ui.certQ.trim();
  $("certTags").innerHTML = CERT_TAGS.map((t) => `<button class="chip" type="button" data-act="certTag" data-t="${t}" aria-pressed="${ui.certTag === t}">${t}</button>`).join("");
  $("certExt").innerHTML = q
    ? `<span class="small muted">"${esc(q)}" 한 번에 찾기:</span>` + searchLinks(q).map(([l, u]) => `<a class="chip" href="${esc(u)}" target="_blank" rel="noopener">${l}</a>`).join("")
    : '<span class="small muted">찾고 싶은 자격증 이름을 넣으면 Q-Net·시험 일정·기출·강의 링크가 한 번에 떠요. 목록에 없는 자격증도 돼요.</span>';
  const owned = new Set(rows(S.goals).map((g) => g.cert).filter(Boolean));
  const list = CERTS.filter((c) => (ui.certTag === "전체" || c.tag === ui.certTag) && (!q || c.name.includes(q.replace(/\s/g, "")) || c.desc.includes(q) || c.tag.includes(q)));
  $("certList").innerHTML = list.length ? list.map((c) => {
    const has = owned.has(c.name);
    return `<article class="cert${has ? " mine" : ""}"><div class="meta"><span class="grade">${c.grade}</span><span class="tag">${c.tag}</span>${has ? '<span class="tag daily">내 목표</span>' : ""}</div>` +
      `<h3>${esc(c.name)}</h3><p>${esc(c.desc)}</p>` +
      (c.tasks ? `<p class="small">목표로 넣은 뒤 원하면 추천 할 일 ${c.tasks.length}개를 넣을 수 있어요.</p>` : "") +
      `<div class="ext">${searchLinks(c.name).slice(0, 4).map(([l, u]) => `<a class="chip" href="${esc(u)}" target="_blank" rel="noopener">${l}</a>`).join("")}</div>` +
      `<div><button class="btn${has ? " ghost" : ""} small" type="button" data-act="addCert" data-name="${esc(c.name)}">${has ? "목표에 있어요 · 한 번 더 넣기" : "목표로 추가"}</button></div></article>`;
  }).join("") : `<div class="panel muted">목록에 "${esc(q)}"가 없어요. 위의 링크로 바로 찾아보고, <a href="#goals">목표</a>에서 직접 추가하면 돼요.</div>`;
}

const BAK_LABEL = { prev: "1시간 단위 백업", daily: "하루 단위 백업", undo: "되돌리기 직전 상태" };
function fmtTime(ms) { const d = new Date(ms); return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; }
async function loadBackups() {
  const box = $("bakList");
  if (!backend || !backend.backups) return;
  box.innerHTML = '<div class="empty">불러오는 중…</div>';
  try {
    const b = await backend.backups();
    const kinds = ["prev", "daily", "undo"].filter((k) => b[k]);
    box.innerHTML = kinds.length ? kinds.map((k) => {
      const x = b[k], n = (c) => Object.keys(x[c] || {}).length;
      return `<div class="item"><span class="mono small muted" style="padding-top:2px">${fmtTime(x.savedAt)}</span>` +
        `<div class="body"><div class="title">${BAK_LABEL[k]}</div><div class="meta">목표 ${n("goals")} · 할 일 ${n("tasks")} · 기록 ${n("logs")} · 돈 ${n("money")}</div></div>` +
        `<div class="actions"><button class="icon-btn" type="button" data-act="restore" data-k="${k}">이걸로 되돌리기</button></div></div>`;
    }).join("") : '<div class="empty">아직 백업이 없어요. 기록이 생기면 1시간·하루마다 자동으로 만들어져요.</div>';
  } catch (e) { box.innerHTML = '<div class="empty">백업을 불러오지 못했어요.</div>'; }
}

function render() {
  refreshGoalColors(); renderHeader(); renderCalendar(); renderToday(); renderGoals(); renderLog(); renderMoney(); renderCerts(); renderGoalDlg(); renderOrphanNote(); showMode(); setSync();
  if ($("settingsDlg").open) renderGcalBox();
  if (backend) schedulePush();
}

// ---------- 동작 ----------
const PAGES = ["calendar", "goals", "log", "money", "certs"];
function route() { const h = location.hash.slice(1); ui.page = PAGES.includes(h) ? h : "calendar"; renderHeader(); window.scrollTo(0, 0); }
window.addEventListener("hashchange", () => { closeMenu(); route(); });

let armed = null, armTimer;
document.addEventListener("click", (ev) => {
  const el = ev.target.closest("[data-act]");
  if (!el) return;
  const a = el.dataset.act, id = el.dataset.id, t = today();

  if (a === "menu") { openMenu(); return; }
  if (a === "menuClose") { closeMenu(); return; }
  if (a === "openSettings") { openSettings(); return; }
  if (a === "closeSettings") { closeSettings(); return; }
  if (a === "gConnect") { gcalConnect(); return; }
  if (a === "gFindManual") {
    el.disabled = true; el.textContent = "찾는 중…";
    gcalFindManual().then((r) => { if (r.error) { toast(r.error); manualFound = null; } else manualFound = r.items; renderGcalBox(); })
      .catch(() => { toast("구글 캘린더를 읽지 못했어요."); renderGcalBox(); });
    return;
  }
  if (a === "gDelManual") {
    if (!manualFound || !manualFound.length) return;
    if (el.dataset.armed !== "1") { el.dataset.armed = "1"; el.classList.add("armed"); el.textContent = "정말 지울까요? 되돌릴 수 없어요"; return; }
    el.disabled = true; el.textContent = "지우는 중…";
    gcalDeleteEvents(manualFound.map((x) => x.id)).then((n) => { toast(`구글 캘린더에서 ${n}개 지웠어요.`); manualFound = null; renderGcalBox(); });
    return;
  }
  if (a === "gSyncNow") {
    el.disabled = true; el.textContent = "맞추는 중…";
    gcalSyncNow().then((r) => {
      toast(r.error ? r.error : `구글 캘린더와 맞췄어요 · 추가 ${r.added} · 수정 ${r.updated} · 삭제 ${r.deleted}`);
      renderGcalBox();
    });
    return;
  }
  if (a === "gDisconnect") { gcalDisconnect(); renderGcalBox(); return; }
  if (a === "gRelink") { const s2 = gcalStatus(); if (ready() && s2.email) act(backend.saveSettings({ gcalEmail: s2.email }), "보드를 이 계정 캘린더에 연결했어요.").then(() => { renderGcalBox(); schedulePush(); }).catch(() => {}); return; }
  if (a === "lock") { if (lockAction) lockAction(); return; }
  if (a === "selDay") { openDay(el.dataset.day); return; }
  if (a === "dayTab") { dt.tab = el.dataset.k; renderDayForm(); return; }
  if (a === "dtRep") { dt.rep = el.dataset.k; renderDayForm(); return; }
  if (a === "dtDay") { const n = +el.dataset.d; if (dt.days.has(n)) dt.days.delete(n); else dt.days.add(n); renderDayForm(); return; }
  if (a === "dayMin") { $("dayLogMin").value = el.dataset.m; return; }
  if (a === "closeDay") { closeDlg($("dayDlg")); return; }
  if (a === "openGoal") { if (ev.target.closest("a, button, input, select") && ev.target.closest("[data-act]") !== el) return; openGoal(el.dataset.id); return; }
  if (a === "closeGoal") { closeDlg($("goalDlg")); ui.goalId = null; return; }
  if (a === "gtRep") { gt.rep = el.dataset.k; renderGoalDlg(); return; }
  if (a === "gtDay") { const n = +el.dataset.d; if (gt.days.has(n)) gt.days.delete(n); else gt.days.add(n); renderGoalDlg(); return; }
  if (a === "calMonth") { ui.calMonth = shiftMonth(ui.calMonth, +el.dataset.d); renderCalendar(); return; }
  if (a === "calToday") { ui.calMonth = today().slice(0, 7); ui.selDay = today(); renderCalendar(); return; }
  if (a === "month") { ui.month = shiftMonth(ui.month, +el.dataset.d); renderMoney(); return; }
  if (a === "kind") { ui.kind = el.dataset.k; renderMoney(); return; }
  if (a === "openToday") { openDay(today()); return; }
  if (a === "certTag") { ui.certTag = el.dataset.t; renderCerts(); return; }

  if (a === "toggle") {
    if (!ready()) return;
    const x = S.tasks.get(id); if (!x) return;
    const day = el.dataset.day && el.dataset.day <= t ? el.dataset.day : t; // 지난 날짜에서 체크하면 그 날 한 걸로
    if (isRep(x)) act(backend.update("tasks", id, { doneDates: { [day]: !isDone(x, day) } })).catch(() => {});
    else { const nd = !x.done; act(backend.update("tasks", id, { done: nd, doneDate: nd ? day : null })).catch(() => {}); }
    return;
  }
  if (a === "del") {
    if (!ready()) return;
    const key = el.dataset.col + "/" + id;
    if (armed !== key) {
      armed = key; el.classList.add("armed"); el.dataset.label = el.textContent; el.textContent = "정말 삭제?";
      clearTimeout(armTimer); armTimer = setTimeout(() => { armed = null; render(); }, 3000);
      return;
    }
    armed = null; clearTimeout(armTimer);
    if (el.dataset.col === "goals") {
      // 목표를 지우면 그 목표의 할 일도 같이 지움 (구글 캘린더에 넣은 일정도 다음 동기화 때 지워짐)
      const mine = rows(S.tasks).filter((x) => x.goalId === id);
      act((async () => { for (const x of mine) await backend.remove("tasks", x.id); await backend.remove("goals", id); })(),
        mine.length ? `목표와 할 일 ${mine.length}개를 지웠어요.` : "목표를 지웠어요.").then(() => { closeDlg($("goalDlg")); }).catch(() => {});
      return;
    }
    act(backend.remove(el.dataset.col, id), "삭제했어요.").catch(() => {});
    return;
  }
  if (a === "cleanOrphans") {
    if (!ready()) return;
    if (el.dataset.armed !== "1") { el.dataset.armed = "1"; el.classList.add("armed"); el.textContent = "정말 지울까요?"; return; }
    const orphans = orphanTasks(); el.disabled = true;
    act((async () => { for (const x of orphans) await backend.remove("tasks", x.id); })(), `할 일 ${orphans.length}개를 지웠어요.`).catch(() => {});
    return;
  }
  if (a === "addTemplate") {
    if (!ready() || !ui.goalId) return;
    const g = S.goals.get(ui.goalId); const c = g && CERTS.find((z) => z.name === g.cert); if (!c || !c.tasks) return;
    const now = Date.now(); el.disabled = true;
    act((async () => {
      let i = 0;
      for (const z of c.tasks) {
        i++;
        const doc = { title: z.t, goalId: ui.goalId, createdAt: now + i };
        if (z.daily) Object.assign(doc, { repeat: "daily", start: t, doneDates: {} });
        else Object.assign(doc, { repeat: "none", date: addDays(t, z.day || 0), done: false, doneDate: null });
        await backend.add("tasks", doc);
      }
    })(), `추천 할 일 ${c.tasks.length}개를 넣었어요.`).catch(() => {}).finally(() => { el.disabled = false; });
    return;
  }
  if (a === "loadBak") { loadBackups(); return; }
  if (a === "restore") {
    if (!ready() || !backend.restore) return;
    if (el.dataset.armed !== "1") { el.dataset.armed = "1"; el.classList.add("armed"); el.textContent = "정말 되돌릴까요?"; return; }
    el.disabled = true;
    act(backend.restore(el.dataset.k), "되돌렸어요. 바로 전 상태는 '되돌리기 직전 상태'로 남겨 뒀어요.").then(loadBackups).catch(() => {});
    return;
  }
  if (a === "addCert") {
    if (!ready()) return;
    const c = CERTS.find((z) => z.name === el.dataset.name); if (!c) return;
    const now = Date.now(); el.disabled = true;
    // 목표만 넣고, 할 일은 목표 창에서 직접 정하거나 '추천 할 일 넣기'로
    act(backend.add("goals", { title: c.name, cert: c.name, cat: "자격증", due: null, createdAt: now }))
      .then((gid) => { toast(`'${c.name}'을(를) 목표에 넣었어요. 목표를 눌러 할 일을 정해요.`); location.hash = "#goals"; setTimeout(() => openGoal(gid), 50); })
      .catch(() => {}).finally(() => { el.disabled = false; });
  }
});

document.addEventListener("change", (ev) => {
  const el = ev.target;
  if (el.id === "gShow" || el.id === "gPush") { gcalSetPref(el.id === "gShow" ? "show" : "push", el.checked); renderGcalBox(); return; }
  if (el.dataset && el.dataset.act === "due") {
    if (!ready()) return;
    act(backend.update("goals", el.dataset.id, { due: el.value || null }), "목표일을 바꿨어요.").catch(() => {});
  }
});

$("goalForm").addEventListener("submit", (ev) => {
  ev.preventDefault();
  if (!ready()) return;
  const title = $("goalTitle").value.trim(); if (!title) return;
  act(backend.add("goals", { title, cat: $("goalCat").value, due: $("goalDue").value || null, createdAt: Date.now() }), "목표를 추가했어요.")
    .then(() => { $("goalTitle").value = ""; $("goalDue").value = ""; }).catch(() => {});
});

$("moneyForm").addEventListener("submit", (ev) => {
  ev.preventDefault();
  if (!ready()) return;
  const amount = parseInt($("mAmount").value, 10);
  if (!(amount > 0)) { toast("금액을 적어 주세요."); return; }
  const date = $("mDate").value || today();
  act(backend.add("money", { kind: ui.kind, amount, date, cat: $("mCat").value, memo: $("mMemo").value.trim(), createdAt: Date.now() }), "기록했어요.")
    .then(() => { $("mAmount").value = ""; $("mMemo").value = ""; if (date.slice(0, 7) !== ui.month) { ui.month = date.slice(0, 7); renderMoney(); } }).catch(() => {});
});

$("budgetForm").addEventListener("submit", (ev) => {
  ev.preventDefault();
  if (!ready()) return;
  act(backend.saveSettings({ budget: parseInt($("budgetIn").value, 10) || 0 }), "예산을 저장했어요.").catch(() => {});
});

$("goalEditForm").addEventListener("submit", (ev) => {
  ev.preventDefault();
  if (!ready() || !ui.goalId) return;
  const title = $("geTitle").value.trim(); if (!title) { toast("목표 이름을 적어 주세요."); return; }
  act(backend.update("goals", ui.goalId, { title, cat: $("geCat").value, due: $("geDue").value || null }), "목표를 저장했어요.").catch(() => {});
});
$("goalTaskForm").addEventListener("submit", (ev) => {
  ev.preventDefault();
  if (!ready() || !ui.goalId) return;
  const g = S.goals.get(ui.goalId); if (!g) return;
  const title = $("gtTitle").value.trim(); if (!title) { toast("할 일을 적어 주세요."); return; }
  const date = $("gtDate").value || today();
  const doc = { title, goalId: ui.goalId, createdAt: Date.now() };
  if (gt.rep === "none") Object.assign(doc, { repeat: "none", date, done: false, doneDate: null });
  else {
    if (gt.rep === "weekly" && !gt.days.size) { toast("반복할 요일을 하나 이상 골라 주세요."); return; }
    Object.assign(doc, { repeat: gt.rep, start: date, doneDates: {} });
    if (gt.rep === "weekly") doc.days = [...gt.days].sort();
    if (g.due && $("gtUntil").checked) doc.end = g.due;
  }
  act(backend.add("tasks", doc), gt.rep === "none" ? "할 일을 추가했어요." : "반복하는 일을 추가했어요.").then(() => { $("gtTitle").value = ""; }).catch(() => {});
});

$("dayTaskForm").addEventListener("submit", (ev) => {
  ev.preventDefault();
  if (!ready()) return;
  const title = $("dayTaskTitle").value.trim(); if (!title) { toast("할 일을 적어 주세요."); return; }
  const goalId = $("dtGoal").value || null, g = goalId && S.goals.get(goalId);
  const doc = { title, goalId, createdAt: Date.now() };
  if (dt.rep === "none") Object.assign(doc, { repeat: "none", date: ui.selDay, done: false, doneDate: null });
  else {
    if (dt.rep === "weekly" && !dt.days.size) { toast("반복할 요일을 하나 이상 골라 주세요."); return; }
    Object.assign(doc, { repeat: dt.rep, start: ui.selDay, doneDates: {} });
    if (dt.rep === "weekly") doc.days = [...dt.days].sort();
    if (g && g.due && g.due >= ui.selDay) doc.end = g.due;
  }
  act(backend.add("tasks", doc), dt.rep === "none" ? "할 일을 추가했어요." : "반복하는 일을 추가했어요.")
    .then(() => { $("dayTaskTitle").value = ""; }).catch(() => {});
});
$("dayMinQuick").innerHTML = [30, 60, 90, 120].map((m) => `<button class="chip" type="button" data-act="dayMin" data-m="${m}">${fmtMin(m)}</button>`).join("");
$("dayLogForm").addEventListener("submit", (ev) => {
  ev.preventDefault();
  if (!ready()) return;
  const min = parseInt($("dayLogMin").value, 10) || 0, text = $("dayLogText").value.trim();
  if (!min && !text) { toast("시간이나 메모 중 하나는 적어 주세요."); return; }
  act(backend.add("logs", { date: ui.selDay, minutes: min, text, goalId: null, createdAt: Date.now() }), "기록했어요.")
    .then(() => { $("dayLogMin").value = ""; $("dayLogText").value = ""; }).catch(() => {});
});

document.addEventListener("keydown", (ev) => {
  const el = ev.target;
  if ((ev.key === "Enter" || ev.key === " ") && el.dataset && el.dataset.act === "openGoal") { ev.preventDefault(); openGoal(el.dataset.id); }
});
$("goalDlg").addEventListener("close", () => { ui.goalId = null; });

$("certSearch").addEventListener("submit", (ev) => { ev.preventDefault(); ui.certQ = $("certQ").value; ui.certTag = "전체"; renderCerts(); });
$("certQ").addEventListener("input", () => { ui.certQ = $("certQ").value; renderCerts(); });


// ---------- 시작 ----------
initGcal({
  tasks: () => rows(S.tasks), goals: () => rows(S.goals),
  linkedEmail: () => S.settings.gcalEmail || "",
  setLinkedEmail: (email) => (backend ? backend.saveSettings({ gcalEmail: email }) : Promise.resolve()),
  update: (c, id, patch) => (backend ? backend.update(c, id, patch) : Promise.resolve()),
  rerender: () => render(), toast
});
route();
render();
if (firebaseConfig && firebaseConfig.databaseURL) {
  $("mainView").hidden = true;
  firebaseStart().catch(() => {
    showNote("Firebase에 연결하지 못했어요. 인터넷 연결과 firebase-config.js 값을 확인해 주세요.", true);
  });
} else {
  backend = localBackend();
  render();
  if (firebaseConfig) showNote("firebase-config.js에 Realtime Database 주소(databaseURL)를 넣으면 비밀번호로 여는 공유 보드가 돼요. 지금은 이 브라우저에만 저장돼요.");
}

// 자정이 지나면 날짜 갱신
let lastDay = today();
setInterval(() => { if (today() !== lastDay) { lastDay = today(); $("mDate").value = lastDay; render(); } }, 60000);
