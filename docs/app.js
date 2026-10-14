import { PRESET_COUPONS, PRESET_PENS, PRESET_RENAMES } from "./lotto-presets.js?v=20261014x";
import { CHANGES } from "./changes.js?v=20261014x";
import { firebaseConfig } from "./firebase-config.js?v=20261014x";

const FB_VER = "10.12.2";
const COLS = ["goals", "tasks", "logs", "money", "accounts", "requests", "wins"];   // wins = 긁은 복권 결과
const GOAL_CATS = ["자격증", "타일", "현장", "공부", "생활", "기타"];
// 목표마다 색 하나씩 (만든 순서대로 돌아가며). 달력에서 어느 목표 일인지 한눈에 보이게
const GOAL_COLORS = ["c-blue", "c-coral", "c-mint", "c-sun", "c-grape"];
let goalColorMap = new Map();
function refreshGoalColors() {
  goalColorMap = new Map(rows(S.goals).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).map((g, i) => [g.id, GOAL_COLORS[i % GOAL_COLORS.length]]));
}
const catCls = (g) => (g && goalColorMap.get(typeof g === "string" ? g : g.id)) || "c-gray"; // 목표 객체나 목표 id
const MONEY_CATS = {
  income: ["월급", "현장 수당", "부업·알바", "이자·환급", "기타 수입"],
  transfer: ["생활비", "용돈", "데이트 통장", "저축", "기타"],
  expense: ["식비", "카페·간식", "장보기", "주거·관리비", "교통·차량", "통신", "데이트", "생필품", "쇼핑", "병원·약", "경조사", "공구·작업", "자기계발", "기타"]
};
const ACCT_TYPES = { bank: "통장", card: "카드", cash: "현금", save: "저축" };
const KIND_LABEL = { income: "수입", expense: "지출", transfer: "보낸 돈", move: "이체" };
// 분류는 설정에서 바꿀 수 있음 (없으면 기본)
const moneyCats = (kind) => ((S.settings.moneyCats && S.settings.moneyCats[kind]) || MONEY_CATS[kind] || []).slice();
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
const S = { wins: new Map(), goals: new Map(), tasks: new Map(), logs: new Map(), money: new Map(), accounts: new Map(), requests: new Map(), settings: { ...DEFAULTS }, loaded: false, gevents: {}, gsync: null, history: [] };
const ui = { reqArea: "달력", reqFilter: "open", mEdit: null, acctFilter: "all", page: "calendar", calMonth: today().slice(0, 7), selDay: today(), month: today().slice(0, 7), kind: "expense", certTag: "전체", certQ: "" };
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
function isDone(t, day) { return isRep(t) ? !!(t.doneDates && t.doneDates[day]) : !!t.done; }
// 화면에 보이는 시간은 짧게 "1h 30m" (입력 칸·버튼·알림 글은 fmtMin의 "1시간 30분")
function fmtHM(m) { m = Math.round(Number(m) || 0); const h = Math.floor(m / 60), r = m % 60; return h ? h + "h" + (r ? " " + r + "m" : "") : r + "m"; }
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
// 알림 + [되돌리기] (실수로 체크를 풀거나 지웠을 때 8초 안에 원래대로)
function toastUndo(msg, undo) {
  const t = $("toast"); t.textContent = ""; t.hidden = false;
  const span = document.createElement("span"); span.textContent = msg;
  const b = document.createElement("button"); b.type = "button"; b.className = "toast-undo"; b.textContent = "되돌리기";
  b.addEventListener("click", () => { t.hidden = true; clearTimeout(toastTimer); act(Promise.resolve().then(undo), "되돌렸어요.").catch(() => {}); });
  t.append(span, b);
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 8000);
}
// 지울 실천 기록을 다시 넣을 수 있게 복사 (id 빼고)
function logCopies(ls) { return ls.map((l) => { const c = { ...l }; delete c.id; return c; }); }

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
    S.history = data.history || [];
    S.settings = { ...DEFAULTS, ...(data.settings || {}) };
    S.loaded = true; render();
  };
  load();
  return {
    mode: "local",
    async add(c, obj) { const id = rid(); data[c][id] = obj; persist(); load(); return id; },
    async update(c, id, patch) { if (data[c][id]) { data[c][id] = deepMerge(clone(data[c][id]), patch); persist(); load(); } },
    async remove(c, id) { delete data[c][id]; persist(); load(); },
    async set(c, id, obj) { data[c][id] = clone(obj); persist(); load(); },
    async saveHistory(list) { data.history = list; persist(); },
    async saveSettings(patch) { data.settings = { ...(data.settings || {}), ...patch }; persist(); load(); },
    async saveSettingsDeep(patch) { data.settings = deepMerge(clone(data.settings || {}), patch); persist(); load(); }
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
      set: tracked((c, id, obj) => rt.set(path(room, c, id), obj)),
      saveHistory: tracked((list) => rt.set(path(room, "history"), list)),   // 되돌리기 기록 (모든 기기가 같이 씀)
      saveSettings: tracked((patch) => rt.update(path(room, "settings"), patch)), // 바뀐 칸만
      saveSettingsDeep: tracked((patch) => rt.update(path(room, "settings"), flattenPaths(patch))), // 깊은 칸 하나만 (예: 예산 항목)
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
    wrapHistory(backend);
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
        if (testMode) return;
        S[c] = new Map(Object.entries(snap.val() || {})); got[c] = true;
        S.loaded = COLS.every((k) => got[k]); render();
      }, onErr));
    });
    unsubs.push(rt.onValue(path(room, "settings"), (snap) => { if (testMode) return; S.settings = { ...DEFAULTS, ...(snap.val() || {}) }; render(); }, onErr));
    // 욱진이 구글 계정의 Apps Script가 5분마다 넣어 주는 구글 일정과 동기화 상태
    unsubs.push(rt.onValue(path(room, "gevents"), (snap) => { S.gevents = snap.val() || {}; render(); }, onErr));
    unsubs.push(rt.onValue(path(room, "gsync"), (snap) => { S.gsync = snap.val() || null; render(); }, onErr));
    unsubs.push(rt.onValue(path(room, "history"), (snap) => { if (testMode) return; const v = snap.val(); S.history = Array.isArray(v) ? v : v ? Object.values(v) : []; renderHist(); }, onErr));
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
// 구글 캘린더: 욱진이 구글 계정의 Apps Script(docs/apps-script/Code.gs)가 동기화. 사이트는 보여 주기만
function gcalEventsOn(d) {
  return Object.values(S.gevents || {}).filter((e) => e && e.date && (e.end ? e.date <= d && d < e.end : e.date === d))
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
}
function gsyncState() {
  const g = S.gsync;
  if (!g || !g.at) return "none";
  return Date.now() - g.at > 20 * 60 * 1000 ? "stale" : "ok";   // 5분마다 돌아야 하는데 20분 넘게 소식이 없으면 멈춘 것
}
function renderGcalChip() {
  const c = $("gcalChip"), st = gsyncState();
  c.hidden = !backend || backend.mode !== "firebase";
  c.dataset.act = "openSettings";
  c.textContent = st === "ok" ? `구글 동기화 ${fmtTime(S.gsync.at).split(" ")[1]}` : st === "stale" ? "구글 동기화 멈춤" : "구글 캘린더 연결";
  c.classList.toggle("warn", st !== "ok");
}
function renderGcalBox() {
  const box = $("gcalBox"), st = gsyncState(), g = S.gsync;
  if (st === "none") {
    box.innerHTML = '<p class="small muted">욱진이 구글 계정에서 한 번만 설정하면, 5분마다 자동으로 보드 할 일·반복하는 일·시험일이 구글 캘린더에 들어가고 구글 일정도 달력에 보여요. 사이트에서 구글 로그인은 필요 없어요.</p>' +
      '<div><a class="btn small" href="google-sync.html" target="_blank" rel="noopener">설정 방법 보기</a></div>';
    return;
  }
  box.innerHTML = `<p class="sync-line"><span class="sync-dot" data-state="${st === "ok" ? "ok" : "off"}"></span><span>${esc(g.email || "구글 계정")} 캘린더와 자동 동기화${st === "ok" ? " 중" : ""}</span></p>` +
    `<p class="small muted">마지막으로 맞춘 때: ${fmtTime(g.at)} · 추가 ${g.added || 0} · 수정 ${g.updated || 0} · 삭제 ${g.deleted || 0}${g.cleaned ? ` · 예전 일정 정리 ${g.cleaned}` : ""}</p>` +
    (st === "stale" ? '<p class="small" style="color:var(--danger)">20분 넘게 소식이 없어요. 스크립트가 멈췄을 수 있어요. 설정 방법 페이지의 \'문제 해결\'을 봐 주세요.</p>' : "") +
    '<p class="small muted">보드에서 바꾸면 5분 안에 구글 캘린더에 반영돼요. 구글에서는 📌 할 일 · 🔥 끝낸 일·실천 · 🎯 D-DAY로 보여요.</p>' +
    '<div><a class="btn ghost small" href="google-sync.html" target="_blank" rel="noopener">설정 방법 다시 보기</a></div>';
}

// ---------- 설정 작은 창 ----------
let lockAction = null;
function openSettings() {
  closeMenu();
  $("bakPanel").hidden = !(backend && backend.backups);
  setSync(); renderGcalBox(); renderAdminBox(); renderAdminN();
  openDlg($("settingsDlg"));
  if (backend && backend.backups) loadBackups();
}
function openDlg(d) { if (d.open) return; if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", ""); }
function closeDlg(d) { if (d.open) { if (typeof d.close === "function") d.close(); else d.removeAttribute("open"); } }
function closeSettings() { closeDlg($("settingsDlg")); }
// 바깥(어두운 부분) 누르면 닫힘
["settingsDlg", "dayDlg", "goalDlg", "taskDlg", "acctDlg", "catDlg", "moveDlg", "logDlg", "newsDlg", "pointsDlg", "lottoIntroDlg"].forEach((id) => $(id).addEventListener("click", (ev) => { if (ev.target === ev.currentTarget) closeDlg(ev.currentTarget); }));
function openMenu() { $("side").classList.add("open"); document.querySelector(".scrim").hidden = false; }
function closeMenu() { $("side").classList.remove("open"); document.querySelector(".scrim").hidden = true; }

// ---------- 계산 ----------
function practiceMinutes() {
  // 날짜별 실천량. 기록 시간 + 완료한 할 일 1개당 15분으로 쳐서 타일 진하기에 씀
  const m = {};
  const add = (d, v) => { m[d] = (m[d] || 0) + v; };
  const timed = new Set();   // 시간을 같이 기록한 할 일 (그 시간이 이미 기록으로 들어감)
  S.logs.forEach((l) => { if (l.date) add(l.date, Math.max(Number(l.minutes) || 0, 1)); if (l.taskId) timed.add(l.taskId + "|" + l.date); });
  S.tasks.forEach((t, id) => {
    if (isRep(t)) Object.entries(t.doneDates || {}).forEach(([d, v]) => { if (v && !timed.has(id + "|" + d)) add(d, 15); });
    else if (t.done && t.doneDate && !timed.has(id + "|" + t.doneDate)) add(t.doneDate, 15);
  });
  Object.keys(fillDays()).forEach((d) => { if (!m[d]) m[d] = 1; });   // 🛡️ 연속일 채우기 쿠폰으로 채운 날 = 실천한 날 (실천 시간 점수는 없음)
  return m;
}
// 🛡️ 쿠폰으로 채운 날 {날짜: 쿠폰 id}
function fillDays() { const o = {}; S.wins.forEach((w, id) => { if (w && w.effect === "streak" && w.usedAt && w.fillDate) o[w.fillDate] = id; }); return o; }
// 🎟️ 그 날이 마감인 안 쓴 쿠폰 (지난 마감은 안 보임, 공개 전엔 관리자 기기만)
function couponsDueOn(d) { return lottoVisible() && d >= today() ? rows(S.wins).filter((w) => w.kind === "coupon" && !w.usedAt && w.expires === d) : []; }
// 할 일을 체크할 때 같이 기록한 시간 (실천 기록에 taskId로 연결)
function taskLogs(taskId, day) { return rows(S.logs).filter((l) => l.taskId === taskId && (!day || l.date === day)); }
function taskMinutes(taskId, day) { return taskLogs(taskId, day).reduce((s, l) => s + (Number(l.minutes) || 0), 0); }
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
function taskItem(x, day, upcoming, hideGoal) {
  const done = isDone(x, day), g = x.goalId && !hideGoal ? S.goals.get(x.goalId) : null, meta = [];
  if (isRep(x)) meta.push(`<span class="tag daily">${esc(repeatLabel(x))}</span>`);
  if (g) meta.push(`<span class="tag cat ${catCls(x.goalId)}">${esc(g.title)}</span>`);
  const tm = done ? taskMinutes(x.id, isRep(x) ? day : x.doneDate) : 0;
  if (tm) meta.push(`<span class="tag mono">⏱ ${fmtHM(tm)}</span>`);
  else if (!done && x.minutes > 0) meta.push(`<span class="tag mono" title="체크하면 이 시간으로 기록돼요">⏱ ${fmtHM(x.minutes)}</span>`);
  if (upcoming) meta.push(`<span class="mono">${shortDate(x.date)}</span>`);
  else if (!isRep(x) && x.date < day && !done) meta.push(`<span class="tag late">${diffDays(day, x.date)}일 밀림</span>`);
  return `<div class="item${done ? " done" : ""}">` +
    (isRep(x) && (!activeOn(x, day) || day > today())
      ? `<button class="check" type="button" disabled title="${activeOn(x, day) ? "그 날이 되면 체크할 수 있어요" : "이 날은 쉬는 날"}" aria-label="아직 체크할 수 없음" style="opacity:.35">${CHECK}</button>`
      : `<button class="check${done ? " on" : ""}" type="button" data-act="toggle" data-id="${esc(x.id)}" data-day="${day}" aria-pressed="${done}" aria-label="완료 표시">${CHECK}</button>`) +
    `<div class="body" data-act="editTask" data-id="${esc(x.id)}" style="cursor:pointer" title="눌러서 편집"><div class="title">${esc(x.title)}</div>${meta.length ? `<div class="meta">${meta.join("")}</div>` : ""}</div>` +
    `<div class="actions">` +
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
function boardStart() {
  const c = S.settings && S.settings.createdAt;
  let first = c ? ymd(new Date(c)) : "";
  const consider = (d) => { if (d && (!first || d < first)) first = d; };
  S.logs.forEach((l) => consider(l.date));
  S.tasks.forEach((x) => { if (x.done) consider(x.doneDate); Object.keys(x.doneDates || {}).forEach((d) => { if (x.doneDates[d]) consider(d); }); });
  return first;
}
function calTask(x, d, repeat) {
  const done = isDone(x, d), color = x.goalId && S.goals.has(x.goalId) ? catCls(x.goalId) : "c-blue";
  // 시간: 끝냈으면 기록한 시간, 아니면 정해 둔 '할 시간'
  const min = (done && taskMinutes(x.id, repeat ? d : x.doneDate)) || (Number(x.minutes) || 0);
  const later = repeat && d > today();   // 반복하는 일의 앞으로의 날은 그 날이 되면 체크
  const missed = !done && d < today();     // 지난 날 못 한 일 ❌
  return `<div class="ev task ${color}${done ? " done" : missed ? " miss" : ""}" data-act="editTask" data-id="${esc(x.id)}" title="${esc(x.title)}${repeat ? " (반복)" : ""} · 눌러서 편집">` +
    (later
      ? `<button type="button" class="mini-check" disabled aria-label="그 날이 되면 체크할 수 있어요" style="opacity:.35">${CHECK}</button>`
      : done   // 끝낸 일은 네모 대신 🔥, 누르면 체크가 풀려서 다시 네모로
      ? `<button type="button" class="mini-fire" data-act="toggle" data-id="${esc(x.id)}" data-day="${d}" aria-pressed="true" aria-label="${esc(x.title)} 체크 풀기" title="누르면 체크가 풀려요">🔥</button>`
      : `<button type="button" class="mini-check" data-act="toggle" data-id="${esc(x.id)}" data-day="${d}" aria-pressed="false" aria-label="${esc(x.title)} 완료 표시">${CHECK}</button>`) +
    `<span>${missed ? '<span class="ev-long">❌ </span>' : ""}${min ? `<b class="ev-short">${fmtShort(min)}</b>` : ""}${esc(x.title)}${min ? `<span class="ev-long"> · ${fmtHM(min)}</span>` : ""}</span></div>`;
}
function renderCalendar() {
  const t = today(), m = ui.calMonth, p = m.split("-");
  const first = new Date(+p[0], +p[1] - 1, 1);
  const start = addDays(ymd(first), -first.getDay());
  const lastDay = new Date(+p[0], +p[1], 0).getDate();
  const weeks = Math.ceil((first.getDay() + lastDay) / 7);
  $("calTitle").textContent = `${p[0]}년 ${+p[1]}월`;
  const prac = practiceMinutes();
  const exams = {}; rows(S.goals).forEach((g) => { if (g.due) (exams[g.due] ||= []).push(g); });
  const income = {}; S.money.forEach((x) => { if (x.kind === "income" && x.date) income[x.date] = (income[x.date] || 0) + (Number(x.amount) || 0); });
  const habits = rows(S.tasks).filter(isRep);
  // 보드를 쓰기 시작한 날 (그 전 날짜는 '안 한 날'로 칠하지 않음)
  const startedAt = boardStart();
  const ptsDay = lottoVisible() && ptsShown() ? pointsLedger().day : null;   // 칸 오른쪽 아래 +포인트
  const fills = fillDays();
  const logsByDay = {}; rows(S.logs).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).forEach((l) => { if (l.date && !l.taskId) (logsByDay[l.date] ||= []).push(l); });   // 할 일에 붙은 시간은 그 할 일 옆에 보임
  let html = "";
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(start, i), dt = parseYmd(d), evs = [];
    (exams[d] || []).forEach((g) => evs.push(`<div class="ev exam" data-act="openGoal" data-id="${esc(g.id)}" title="${esc(g.title)} · 눌러서 목표 보기">D-DAY ${esc(g.title)}</div>`));
    const cpDue = couponsDueOn(d);
    cpDue.forEach((w) => evs.push(`<div class="ev cpexp" data-act="goCoupons" title="${esc(w.title)} 쿠폰 마감 · 눌러서 쿠폰함">🎟️ ${esc(w.title)} 마감</div>`));
    if (fills[d]) evs.push(`<div class="ev fill" data-act="goCoupons" title="🛡️ 연속일 채우기 쿠폰으로 실천한 날로 채웠어요">🛡️ 채운 날</div>`);
    // 할 일은 칸 안에서 바로 체크 (반복하는 일도 날마다 하나씩, 앞으로의 날은 체크만 막음)
    rows(S.tasks).filter((x) => !isRep(x) && x.date === d).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).forEach((x) => evs.push(calTask(x, d, false)));
    // 늦게 한 할 일: 원래 날짜에는 ❌ 흔적만 (실천은 한 날로 옮김)
    rows(S.tasks).filter((x) => !isRep(x) && x.lateFrom === d && x.title).forEach((x) => evs.push(`<div class="ev missed" data-act="editTask" data-id="${esc(x.id)}" title="${esc(x.title)} · ${shortDate(x.date)}에 했어요">❌ ${esc(x.title)}</div>`));
    const hs = habits.filter((h) => activeOn(h, d));
    hs.forEach((h) => evs.push(calTask(h, d, true)));
    (logsByDay[d] || []).forEach((l) => evs.push(`<div class="ev log" data-act="editLog" data-id="${esc(l.id)}" title="실천한 일 · 글자를 누르면 편집">` +
      `<button type="button" class="log-fire" data-act="logFire" data-id="${esc(l.id)}" aria-label="실천한 일 편집·삭제">🔥</button>` +
      `<span>${esc([l.minutes ? fmtHM(l.minutes) : "", l.text || ""].filter(Boolean).join(" · ") || "기록")}</span></div>`));
    gcalEventsOn(d).forEach((g) => evs.push(`<div class="ev gev" title="${esc(g.title)}">${g.time ? `<b>${g.time}</b> ` : ""}${esc(g.title)}</div>`));
    if (income[d]) evs.push(`<div class="ev money">+${moneyShort(income[d])}</div>`);
    const shown = evs.slice(0, 4), more = evs.length - shown.length;
    if (more > 0) shown.push(`<div class="ev more">+${more}개 더</div>`);
    const mm = prac[d] || 0, lv = mm >= 120 ? 4 : mm >= 60 ? 3 : mm >= 30 ? 2 : mm > 0 ? 1 : 0;
    const missed = !lv && d < t && startedAt && d >= startedAt;   // 지난 날인데 실천이 없음
    const cls = ["day", lv ? "p" + lv : missed ? "miss" : "", d.slice(0, 7) !== m ? "out" : "", d === t ? "today" : "", d === ui.selDay ? "sel" : "", dt.getDay() === 0 ? "sun" : "", dt.getDay() === 6 ? "sat" : ""].filter(Boolean).join(" ");
    // 칸 안에 체크 버튼이 들어가서 칸 자체는 button 대신 role=button
    const pts = ptsDay && ptsDay[d] && ptsDay[d].sum;
    // 폰 칸: 대표 아이콘 두 개까지 (🎯 > 🔥 > ❌ > 📌 > 📅 > 💰) + 남은 할 일 수
    const dayTs = rows(S.tasks).filter((x) => x.title && activeOn(x, d)), doneN = dayTs.filter((x) => isDone(x, d)).length, openN = dayTs.length - doneN;
    const ics = [];
    if ((exams[d] || []).length) ics.push("🎯");
    if (cpDue.length) ics.push("🎟️");
    if (doneN || (logsByDay[d] || []).length) ics.push("🔥"); else if (fills[d]) ics.push("🛡️");
    if (openN) ics.push(d < t ? "❌" : "📌");
    if (gcalEventsOn(d).length) ics.push("📅");
    if (income[d]) ics.push("💰");
    const cellIc = ics.length ? `<span class="cell-ic" aria-hidden="true">${ics.slice(0, 2).join("")}${openN > 1 && ics.slice(0, 2).some((c) => c === "📌" || c === "❌") ? `<small>${openN}</small>` : ""}</span>` : "";
    html += `<div class="${cls}${pts ? " has-pts" : ""}" role="button" tabindex="0" data-act="selDay" data-day="${d}" aria-label="${esc(prettyDate(d))}">` +
      `<span class="top"><span class="num">${dt.getDate()}</span></span>${shown.join("")}${cellIc}${pts ? `<span class="day-pts">+${pts}</span>` : ""}</div>`;
  }
  $("calGrid").innerHTML = html;
  renderGcalChip();
  renderDaySide(); renderDayPanel();
}
// ---------- 체크하면 "얼마나 했어요?" ----------
let doneFor = null, doneTimer = null;
function showDoneSheet(taskId, day) {
  const x = S.tasks.get(taskId); if (!x) return;
  doneFor = { taskId, day };
  $("dsTitle").textContent = `✅ '${x.title}' 끝! 얼마나 했어요?`;
  setMinInput("dsMin", 0);
  $("doneSheet").hidden = false;
  clearTimeout(doneTimer); doneTimer = setTimeout(hideDoneSheet, 20000);   // 20초 동안 안 누르면 그냥 닫힘
}
function hideDoneSheet() { $("doneSheet").hidden = true; doneFor = null; clearTimeout(doneTimer); }
function saveTaskTime(min) {
  if (!doneFor || !ready()) return;
  const x = S.tasks.get(doneFor.taskId); if (!x) { hideDoneSheet(); return; }
  const { taskId, day } = doneFor; hideDoneSheet();
  if (!(min > 0)) return;
  recordTaskTime(x, taskId, day, min, `${fmtMin(min)} 기록했어요.`);
}
function recordTaskTime(x, taskId, day, min, msg) {
  return act((async () => {
    for (const l of taskLogs(taskId, day)) await backend.remove("logs", l.id);   // 같은 날 다시 기록하면 바꿔치기
    await backend.add("logs", { date: day, minutes: min, text: x.title, goalId: x.goalId || null, taskId, createdAt: Date.now() });
  })(), msg).catch(() => {});
}
// 시간 입력: 숨은 칸(id)에 총 분, 보이는 칸은 [시간][분] (data-hm="id")
// 빠른 버튼 (data-min-for="id"): ＋30분은 더하기, 나머지는 그 시간으로 (한 번 더 누르면 지움)
const MIN_QUICK = [60, 90, 120];
function renderMinChips(id) {
  const box = document.querySelector(`[data-min-for="${id}"]`), v = parseInt($(id).value, 10) || 0;
  if (box) box.innerHTML = `<button class="chip" type="button" data-act="addMin" data-for="${id}">＋30분</button>` +
    MIN_QUICK.map((m) => `<button class="chip" type="button" data-act="setMin" data-for="${id}" data-m="${m}" aria-pressed="${v === m}">${fmtMin(m)}</button>`).join("");
}
function setMinInput(id, v) {
  v = parseInt(v, 10) || 0; $(id).value = v || "";
  document.querySelectorAll(`[data-hm="${id}"]`).forEach((el) => { const n = el.dataset.u === "h" ? Math.floor(v / 60) : v % 60; el.value = n || ""; });
  renderMinChips(id);
}
document.querySelectorAll("[data-hm]").forEach((el) => el.addEventListener("input", () => {
  const id = el.dataset.hm, part = (u) => Math.max(0, parseInt(document.querySelector(`[data-hm="${id}"][data-u="${u}"]`).value, 10) || 0);
  $(id).value = part("h") * 60 + part("m") || ""; renderMinChips(id);
}));
// 달력 칸 시간: PC는 "· 1시간", 폰은 앞에 짧게 "1h"
function fmtShort(m) { const h = Math.floor(m / 60), r = m % 60; return !h ? r + "m" : !r ? h + "h" : r === 30 ? h + ".5h" : h + "h" + r; }   // 폰 칸이 좁아서 최대한 짧게

// ---------- 날짜가 다른 할 일을 체크할 때 확인 창 ----------
// 지난 일: 원래 날짜는 ❌(못 함)로 남기고 오늘 한 걸로 옮기거나, 그 날 한 걸로 체크
// 앞으로 할 일: 오늘로 당겨서 🔥, 원래 날짜에서는 없어짐
let moveFor = null, moveDay = null;
function openMove(id, repDay) {
  const x = S.tasks.get(id); if (!x) return;
  const t = today(), d = repDay || x.date, past = d < t, title = esc(x.title), from = shortDate(d), now = shortDate(t);
  moveFor = id; moveDay = d;
  $("mvTitle").textContent = repDay ? "지난 날 반복하는 일이에요" : past ? "지난 할 일이에요" : "앞당겨서 했어요?";
  $("mvText").innerHTML = past
    ? `<p>'<b>${title}</b>'은(는) ${from} ${repDay ? "반복하는 일" : "할 일"}이었어요. 언제 했어요?</p><ul>` +
      `<li><b>오늘 했어요</b> · ${from} 칸은 ❌(못 한 날)로 남고, 오늘 ${now} 칸에 🔥 실천으로 옮겨요.</li>` +
      `<li><b>그날 했어요</b> · 깜빡하고 늦게 체크한 거면 ${from}에 한 걸로 체크해요.</li></ul>`
    : `<p>'<b>${title}</b>'은(는) ${from} 할 일이에요. 오늘 미리 했어요?</p><ul>` +
      `<li>오늘 ${now} 칸으로 당겨서 🔥 실천으로 표시하고, ${from} 칸에서는 없어져요.</li>` +
      `<li>체크를 다시 풀면 ${from}로 돌아가요.</li></ul>`;
  $("mvBtns").innerHTML = past
    ? '<button class="btn" type="button" data-act="mvDo" data-k="late">오늘 했어요</button><button class="btn ghost" type="button" data-act="mvDo" data-k="that">그날 했어요</button><button class="btn ghost" type="button" data-act="mvClose">취소</button>'
    : '<button class="btn" type="button" data-act="mvDo" data-k="early">오늘로 당기기</button><button class="btn ghost" type="button" data-act="mvClose">취소</button>';
  openDlg($("moveDlg"));
}
function doMove(kind) {
  const id = moveFor, x = id && S.tasks.get(id), from = moveDay; closeDlg($("moveDlg")); moveFor = null; moveDay = null;
  if (!x || !ready()) return;
  const t = today();
  if (isRep(x)) {   // 반복하는 일: 그날 → 그 날 칸 체크 / 오늘 → 그 날은 ❌로 두고 오늘 🔥 실천으로 따로 기록
    if (kind === "that") {
      act(backend.update("tasks", id, { doneDates: { [from]: true } }), x.minutes > 0 ? "" : `${shortDate(from)}에 한 걸로 체크했어요.`).then(() => {
        if (x.minutes > 0) recordTaskTime(x, id, from, x.minutes, `🔥 ${fmtMin(x.minutes)} 기록했어요. ${shortDate(from)}에 한 걸로 체크했어요.`);
        else showDoneSheet(id, from);
      }).catch(() => {});
    } else {
      const min = Number(x.minutes) || 0;
      act(backend.add("logs", { date: t, minutes: min, text: x.title, goalId: x.goalId || null, lateFor: { taskId: id, date: from }, createdAt: Date.now() }),
        `오늘 🔥로 기록했어요. ${shortDate(from)}은 ❌로 남아요.` + (min ? "" : " 시간을 넣어 주세요.")).then((lid) => { if (!min && lid) openLog(lid); }).catch(() => {});
    }
    return;
  }
  const day = kind === "that" ? x.date : t;
  const patch = kind === "that" ? { done: true, doneDate: x.date }
    : { date: t, done: true, doneDate: t, [kind === "late" ? "lateFrom" : "earlyFrom"]: x.date };
  const msg = kind === "late" ? `오늘로 옮겼어요. ${shortDate(x.date)}은 ❌로 남아요.` : kind === "early" ? "오늘로 당겨서 체크했어요." : `${shortDate(x.date)}에 한 걸로 체크했어요.`;
  act(backend.update("tasks", id, patch), x.minutes > 0 ? "" : msg).then(() => {
    if (x.minutes > 0) recordTaskTime(x, id, day, x.minutes, `🔥 ${fmtMin(x.minutes)} 기록했어요. ` + msg);
    else showDoneSheet(id, day);
  }).catch(() => {});
}

// ---------- 되돌리기 ↶ / 다시 하기 ↷ ----------
// 저장할 때마다 바뀌는 문서의 '전'과 '후'를 모아 두고(1.5초 안의 변경은 한 묶음), 모든 기기가 같이 쓰는 기록(최근 30개)에 넣음
const HIST_COLS = ["goals", "tasks", "logs", "money", "accounts", "wins"];
const DEV = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "폰" : "PC";
let histGroup = null, histApplying = false, histTimer = null, histFor = null;
function histNorm(o) {   // 비교용: 빈 칸 빼고 키 순서 맞추기 (Firebase는 null·빈 묶음을 저장 안 함)
  if (o === null || o === undefined) return undefined;
  if (Array.isArray(o)) return o.map(histNorm);
  if (typeof o !== "object") return o;
  const out = {};
  Object.keys(o).sort().forEach((k) => { const v = histNorm(o[k]); if (v !== undefined && !(v && typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length)) out[k] = v; });
  return Object.keys(out).length ? out : undefined;
}
function sameDoc(a, b) { return JSON.stringify(histNorm(a)) === JSON.stringify(histNorm(b)); }
function histTouch(c, id, isNew) {
  if (histApplying || !HIST_COLS.includes(c) || !id) return;
  if (!histGroup) histGroup = { keys: [], before: {} };
  const k = c + "|" + id;
  if (!histGroup.keys.includes(k)) { histGroup.keys.push(k); const cur = !isNew && S[c].get(id); histGroup.before[k] = cur ? clone(cur) : null; }
  clearTimeout(histTimer); histTimer = setTimeout(histClose, 1500);
}
function wrapHistory(b) {
  const add = b.add, update = b.update, remove = b.remove;
  b.add = async (c, obj) => { const id = await add(c, obj); histTouch(c, id, true); clearTimeout(histTimer); histTimer = setTimeout(histClose, 1500); return id; };
  b.update = (c, id, patch) => { histTouch(c, id); return update(c, id, patch); };
  b.remove = (c, id) => { histTouch(c, id); return remove(c, id); };
  return b;
}
function histClose() {
  const g = histGroup; histGroup = null; if (!g || !backend) return;
  const after = {};
  g.keys.forEach((k) => { const [c, id] = k.split("|"); const cur = S[c].get(id); after[k] = cur ? clone(cur) : null; });
  if (g.keys.every((k) => sameDoc(g.before[k], after[k]))) return;
  const e = { at: Date.now(), dev: DEV, keys: g.keys, before: g.before, after, undone: false };
  Object.assign(e, histDescribe(e));
  const list = histList().filter((x) => !x.undone).concat([e]).slice(-30);
  S.history = list; renderHist();
  backend.saveHistory(list).catch(() => {});
}
function histList() { return (S.history || []).filter((x) => x && x.keys); }
function histDoc(map, k) { return (map && map[k]) || null; }
// 기록 한 줄 이름: 가장 중요한 문서 하나로 ("'강의듣기' 체크", "식비 30,000원 기록" …)
function histDescribe(e) {
  const order = ["tasks", "goals", "money", "accounts", "logs"];
  const k = [...e.keys].sort((a, b) => order.indexOf(a.split("|")[0]) - order.indexOf(b.split("|")[0]))[0];
  const c = k.split("|")[0], b = histDoc(e.before, k), a = histDoc(e.after, k), d = a || b || {};
  const verb = !b ? "추가" : !a ? "삭제" : "고치기";
  if (c === "tasks") {
    const name = `'${d.title || "할 일"}'`;
    if (a && b) {
      const ad = a.doneDates || {}, bd = b.doneDates || {};
      const day = Object.keys({ ...ad, ...bd }).find((x) => !!ad[x] !== !!bd[x]);
      if (day) return { label: `${name} ${ad[day] ? "체크" : "체크 풀기"}`, date: day };
      if (!!a.done !== !!b.done) return { label: `${name} ${a.done ? "체크" : "체크 풀기"}`, date: a.done ? a.doneDate || a.date : b.doneDate || b.date };
    }
    return { label: `${name} ${verb}`, date: d.date || d.start || null };
  }
  if (c === "logs") {
    const t = d.minutes ? fmtHM(d.minutes) : "";
    const name = d.taskId ? `'${d.text || "할 일"}' 시간${t ? " " + t : ""}` : `실천${t ? " " + t : ""}${d.text ? " · " + d.text : ""}`;
    return { label: `${name} ${!b ? "기록" : verb}`, date: d.date || null };
  }
  if (c === "money") return { label: `${d.kind === "move" ? "이체" : d.cat || KIND_LABEL[d.kind] || "돈"} ${won(d.amount)} ${!b ? "기록" : verb}`, date: d.date || null };
  if (c === "goals") {
    if (a && b) {
      const as = a.subs || {}, bs = b.subs || {}, sid = Object.keys({ ...as, ...bs }).find((x) => !sameDoc(as[x], bs[x]));
      if (sid) {
        const sv = as[sid] || bs[sid] || {};
        if (as[sid] && bs[sid] && !!as[sid].doneAt !== !!bs[sid].doneAt) return { label: `세부목표 '${sv.title || ""}' ${as[sid].doneAt ? "달성" : "달성 취소"}`, date: as[sid].doneAt || null };
        return { label: `세부목표 '${sv.title || ""}' ${!bs[sid] ? "추가" : !as[sid] ? "삭제" : "고치기"}`, date: null };
      }
      if (!!a.achievedAt !== !!b.achievedAt) return { label: `목표 '${d.title || ""}' ${a.achievedAt ? "달성" : "달성 취소"}`, date: a.achievedAt || null };
    }
    return { label: `목표 '${d.title || ""}' ${verb}`, date: null };
  }
  if (c === "accounts") return { label: `자산 '${d.name || ""}' ${verb}`, date: null };
  if (c === "wins") {
    if (a && b && !b.usedAt && a.usedAt) return a.fillDate ? { label: "🛡️ 쿠폰으로 실천 안 한 날 채우기", date: a.fillDate } : { label: `쿠폰 '${d.title}' 쓰기`, date: a.usedAt };
    if (a && b && (a.left || 0) < (b.left || 0)) return { label: `벌칙 '${d.title}' 했어요`, date: a.doneAt || null };
    return { label: `쿠폰함 '${d.title}' ${verb}`, date: null };
  }
  return { label: "변경", date: null };
}
function histTargets() {
  const list = histList();
  let undo = null; for (let i = list.length - 1; i >= 0; i--) if (!list[i].undone) { undo = list[i]; break; }
  const redo = list.find((x) => x.undone) || null;
  return { undo, redo };
}
function renderHist() {
  const { undo, redo } = histTargets();
  $("undoBtn").classList.toggle("off", !undo); $("redoBtn").classList.toggle("off", !redo);
  $("undoBtn").title = undo ? `되돌리기: ${undo.label}` : "되돌릴 게 없어요";
  $("redoBtn").title = redo ? `다시 하기: ${redo.label}` : "다시 할 게 없어요";
}
function agoText(at) {
  const m = Math.round((Date.now() - at) / 60000);
  return m < 1 ? "방금" : m < 60 ? `${m}분 전` : m < 60 * 24 ? `${Math.round(m / 60)}시간 전` : fmtTime(at);
}
function askHist(dir) {
  const { undo, redo } = histTargets(), e = dir === "undo" ? undo : redo;
  if (!e) { toast(dir === "undo" ? "되돌릴 게 없어요." : "다시 할 게 없어요."); return; }
  const now = dir === "undo" ? e.after : e.before;   // 지금 이 상태여야 그대로 되돌릴 수 있음
  const changed = e.keys.some((k) => { const [c, id] = k.split("|"); return !sameDoc(S[c].get(id) || null, histDoc(now, k)); });
  moveFor = null; logFor = null; histFor = { dir, at: e.at };
  $("mvTitle").textContent = dir === "undo" ? "되돌릴까요?" : "다시 할까요?";
  $("mvText").innerHTML = `<p><b>${e.date ? esc(shortDate(e.date)) + " " : ""}${esc(e.label)}</b></p>` +
    `<p class="small muted">${esc(agoText(e.at))} · ${esc(e.dev || "")}에서</p>` +
    (changed ? `<p class="hist-warn">그 뒤에 이 내용이 또 바뀌었어요 (다른 기기나 다른 작업). 그래도 ${dir === "undo" ? "되돌리면" : "다시 하면"} 그 뒤에 바뀐 것도 같이 ${dir === "undo" ? "그때로 돌아가요" : "덮어써요"}.</p>` : "");
  $("mvBtns").innerHTML = `<button class="btn" type="button" data-act="histDo">${dir === "undo" ? "되돌리기" : "다시 하기"}</button><button class="btn ghost" type="button" data-act="mvClose">취소</button>`;
  openDlg($("moveDlg"));
}
async function histApply() {
  const f = histFor; histFor = null; closeDlg($("moveDlg"));
  const list = histList(), e = f && list.find((x) => x.at === f.at);
  if (!e || !ready()) return;
  const target = f.dir === "undo" ? e.before : e.after;
  const keys = f.dir === "undo" ? [...e.keys].reverse() : e.keys;
  histApplying = true;
  try {
    await act((async () => {
      for (const k of keys) {
        const [c, id] = k.split("|"), doc = histDoc(target, k);
        if (doc) await backend.set(c, id, doc); else if (S[c].has(id)) await backend.remove(c, id);
      }
    })(), `${f.dir === "undo" ? "되돌렸어요" : "다시 했어요"}: ${e.label}`);
  } catch (err) { return; } finally { histApplying = false; }
  e.undone = f.dir === "undo";
  S.history = list; renderHist();
  backend.saveHistory(list).catch(() => {});
}

// ---------- 검색: 할 일·반복(날마다)·실천·목표·돈을 날짜 순으로 ----------
let searchTimer = null;
function searchRows(q) {
  q = q.trim().toLowerCase(); if (!q) return [];
  const t = today(), out = [], has = (v) => String(v || "").toLowerCase().includes(q);
  const tm = (m) => (m ? fmtHM(m) : "");
  S.tasks.forEach((x, id) => {
    if (!x || !x.title || !has(x.title)) return;
    if (isRep(x)) {   // 반복하는 일은 날마다 한 줄 (지난 날 + 앞으로 7일)
      const last = [x.end || "9999-12-31", addDays(t, 7)].sort()[0];
      let d = x.start || t; const floor = addDays(t, -400); if (d < floor) d = floor;
      for (let n = 0; d <= last && n < 500; n++, d = addDays(d, 1)) {
        if (!activeOn(x, d)) continue;
        const done = isDone(x, d);
        out.push({ date: d, icon: done ? "🔥" : d < t ? "❌" : "📌", time: tm(done ? taskMinutes(id, d) || x.minutes : x.minutes), title: x.title, act: "editTask", id });
      }
    } else if (x.date) {
      out.push({ date: x.date, icon: x.done ? "🔥" : x.date < t ? "❌" : "📌", time: tm(x.done ? taskMinutes(id, x.doneDate) || x.minutes : x.minutes), title: x.title, act: "editTask", id });
      if (x.lateFrom) out.push({ date: x.lateFrom, icon: "❌", time: tm(x.minutes), title: x.title, act: "editTask", id });
    }
  });
  S.logs.forEach((l, id) => { if (l && !l.taskId && l.date && has(l.text)) out.push({ date: l.date, icon: "🔥", time: tm(l.minutes), title: l.text || "실천", act: "editLog", id }); });
  S.goals.forEach((g, id) => {
    if (!g) return;
    if (has(g.title)) out.push({ date: g.due || "", icon: "🎯", time: g.due ? ddayText(g.due) : "", title: g.title, act: "openGoal", id });
    subsOf(g).forEach((v) => { if (has(v.title)) out.push({ date: v.due || "", icon: "🎯", time: v.due ? ddayText(v.due) : "", title: `${g.title} › ${v.title}`, act: "openGoal", id }); });
  });
  S.money.forEach((m, id) => {
    if (!m || !m.date || !(has(m.memo) || has(m.cat))) return;
    const sign = m.kind === "income" ? "+" : m.kind === "move" ? "" : "-";
    out.push({ date: m.date, icon: "💰", time: sign + won(m.amount), title: [m.kind === "transfer" ? partner() + "에게" : m.cat, m.memo].filter(Boolean).join(" · "), act: "searchMoney", id });
  });
  return out.sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
}
function renderSearch() {
  const q = $("calSearch").value, box = $("searchResults");
  $("calSearchClear").hidden = !q;
  if (!q.trim()) { box.hidden = true; box.innerHTML = ""; return; }
  const rows = searchRows(q), t = today(), DOWS = ["일", "월", "화", "수", "목", "금", "토"];
  let prev = null;
  box.innerHTML = rows.length ? rows.slice(0, 400).map((r) => {
    const first = r.date !== prev; prev = r.date;
    let day = "", sub = "날짜 미정";
    if (r.date) { const p = r.date.split("-"); day = String(+p[2]); sub = `${p[0]}년 ${+p[1]}월, ${DOWS[parseYmd(r.date).getDay()]}`; }
    return `<button type="button" class="sr-row${first ? "" : " cont"}${r.date === t ? " today-row" : ""}" data-act="${r.act}" data-id="${esc(r.id)}" data-date="${esc(r.date)}">` +
      `<span class="sr-day">${first ? day : ""}</span><span class="sr-date">${first ? esc(sub) : ""}</span><span class="sr-icon">${r.icon}</span>` +
      `<span class="sr-time">${esc(r.time || "")}</span><span class="sr-title">${esc(r.title)}</span></button>`;
  }).join("") : '<div class="sr-empty">찾는 게 없어요.</div>';
  box.hidden = false;
  const near = [...box.querySelectorAll(".sr-row")].find((el) => el.dataset.date && el.dataset.date >= t);   // 오늘 근처로
  box.scrollTop = near ? Math.max(0, near.offsetTop - box.offsetTop - 8) : box.scrollHeight;
}
$("calSearch").addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(renderSearch, 150); });
$("calSearch").addEventListener("keydown", (ev) => { if (ev.key === "Escape") { $("calSearch").value = ""; renderSearch(); } });

// ---------- 🔐 관리자 (복권 쿠폰·벌칙 목록, 요청 알림) · 🧪 테스트 모드 ----------
// 관리자 비밀번호는 해시만 settings.adminHash에 저장. 맞게 넣은 기기는 localStorage ukjin-admin=1
let testMode = false, testBonus = 0, realBackend = null, autoTestDone = false;
function sessionReal() { try { return sessionStorage.getItem("ukjin-real") === "1"; } catch (e) { return false; } }
async function adminHash(pw) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("ukjin-admin:" + pw));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function renderAdminBox() {
  const box = $("adminBox"), has = !!S.settings.adminHash, me = isAdminDevice();
  if (me) {
    box.innerHTML = `<p class="small" style="margin:0">✅ 이 기기는 <b>관리자</b>예요. 제목 옆 🧪로 테스트 모드를 열 수 있어요.</p>` +
      `<div class="admin-row"><button class="btn small" type="button" data-act="openLottoAdmin">🎟️ 복권 관리 (쿠폰·벌칙 목록)</button></div>` +
      `<div class="admin-row"><button class="btn ghost small" type="button" data-act="adminOff">이 기기 관리자 끄기</button><button class="btn ghost small" type="button" data-act="adminChange">비밀번호 바꾸기</button></div>` +
      `<form class="admin-row" id="adminChangeForm" hidden autocomplete="off"><input type="password" name="pw" placeholder="새 비밀번호" aria-label="새 관리자 비밀번호"><input type="password" name="pw2" placeholder="한 번 더" aria-label="새 관리자 비밀번호 확인"><button class="btn small" type="submit">바꾸기</button></form>`;
  } else if (!has) {
    box.innerHTML = `<p class="small muted" style="margin:0">복권 쿠폰·벌칙 목록을 고치는 사람만 쓰는 비밀번호예요. 보드 비밀번호와 다르게 정해 주세요.</p>` +
      `<form class="admin-row" id="adminSetForm" autocomplete="off"><input type="password" name="pw" placeholder="관리자 비밀번호" aria-label="관리자 비밀번호"><input type="password" name="pw2" placeholder="한 번 더" aria-label="관리자 비밀번호 확인"><button class="btn small" type="submit">정하기</button></form>`;
  } else {
    box.innerHTML = `<form class="admin-row" id="adminOpenForm" autocomplete="off"><input type="password" name="pw" placeholder="관리자 비밀번호" aria-label="관리자 비밀번호"><button class="btn small" type="submit">열기</button></form>`;
  }
}
function setAdminDevice(on) { try { if (on) localStorage.setItem("ukjin-admin", "1"); else { localStorage.removeItem("ukjin-admin"); sessionStorage.removeItem("ukjin-real"); } } catch (e) { /* 무시 */ } if (!on && testMode) { location.reload(); return; } render(); renderAdminBox(); }
document.addEventListener("submit", async (ev) => {
  const f = ev.target; if (!["adminSetForm", "adminOpenForm", "adminChangeForm"].includes(f.id)) return;
  ev.preventDefault();
  if (!ready()) return;
  const pw = f.elements.pw.value, pw2 = f.elements.pw2 && f.elements.pw2.value;
  if (pw.length < 4) { toast("4자 이상으로 해 주세요."); return; }
  if (f.id === "adminOpenForm") {
    if ((await adminHash(pw)) !== S.settings.adminHash) { toast("관리자 비밀번호가 달라요."); return; }
    setAdminDevice(true); toast("관리자로 열었어요."); return;
  }
  if (pw !== pw2) { toast("두 번 넣은 비밀번호가 달라요."); return; }
  const h = await adminHash(pw);
  act(Promise.all([backend.saveSettings({ adminHash: h }), testMode && realBackend ? realBackend.saveSettings({ adminHash: h }) : null]), f.id === "adminSetForm" ? "관리자 비밀번호를 정했어요." : "관리자 비밀번호를 바꿨어요.").then(() => setAdminDevice(true)).catch(() => {});
});
// 테스트 모드: 지금 보드를 복사한 연습판 (저장 안 됨). 끝내면 새로 불러와서 진짜 보드로
function testBackend(snapshot) {
  const data = snapshot;
  const load = () => { COLS.forEach((c) => { S[c] = new Map(Object.entries(data[c] || {})); }); S.settings = { ...DEFAULTS, ...(data.settings || {}) }; S.history = data.history || []; S.loaded = true; render(); };
  load();
  return {
    mode: "test",
    async add(c, obj) { const id = "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); data[c] = data[c] || {}; data[c][id] = clone(obj); load(); return id; },
    async update(c, id, patch) { if (data[c] && data[c][id]) { data[c][id] = deepMerge(clone(data[c][id]), patch); load(); } },
    async remove(c, id) { if (data[c]) delete data[c][id]; load(); },
    async set(c, id, obj) { data[c] = data[c] || {}; data[c][id] = clone(obj); load(); },
    async saveSettings(patch) { data.settings = { ...(data.settings || {}), ...patch }; load(); },
    async saveSettingsDeep(patch) { data.settings = deepMerge(clone(data.settings || {}), patch); load(); },
    async saveHistory(list) { data.history = list; }
  };
}
function toggleTestMode() {
  if (testMode) { try { sessionStorage.setItem("ukjin-real", "1"); } catch (e) { /* 무시 */ } toast("진짜 보드로 돌아가요… (이번에 연 동안만)"); setTimeout(() => location.reload(), 300); return; }
  if (!isAdminDevice() || !backend) return;
  const snap = {}; COLS.forEach((c) => { snap[c] = Object.fromEntries(clone([...S[c]])); });
  snap.settings = clone(S.settings); snap.history = clone(S.history || []);
  testMode = true; testBonus = 0; realBackend = backend;
  backend = wrapHistory(testBackend(snap));
  closeMenu(); closeSettings();
  try { sessionStorage.removeItem("ukjin-real"); } catch (e) { /* 무시 */ }
  toast("🧪 테스트 모드예요. 복권 관리만 진짜로 저장돼요.");
}
function renderAdminUi() {
  const me = isAdminDevice();
  ["testBtnSide", "testBtnTop"].forEach((id) => { $(id).hidden = !me && !testMode; $(id).classList.toggle("on", testMode); $(id).title = testMode ? "테스트 끝내기" : "테스트 모드 (저장 안 됨)"; });
  $("testBar").hidden = !testMode;
}

// ---------- 📝 복권 관리 (관리자만): settings.lotto = { on, used, odds, coupons{id:{tier,title,days}}, pens{id:{title,days}} } ----------
const TIERS = { big: "🥇 대박", mid: "🥈 쿠폰", small: "🥉 작은 쿠폰" };
const TIER_CAP = { big: "금액 제한 없음", mid: "3만 원까지", small: "1만 원까지" };
// 쿠폰 값: 누가 사는지 안 적힌 쿠폰은 공통비용에서 (등급별 금액까지)
function payText(w) { return /사\s?줌|사\s?줄|사\s?주기|쏘기|쏜다|내가 (사|내)|본인 돈|용돈으로|부담/.test(w.title || "") ? "" : `💳 돈 드는 건 공통비용 · ${TIER_CAP[w.tier] || ""}`; }
const ODDS_DEF = { big: 3, mid: 25, small: 47, miss: 20, pen: 5 };
const ODDS_LABEL = { big: "🥇 대박", mid: "🥈 쿠폰", small: "🥉 작은", miss: "😐 꽝", pen: "😈 벌칙" };
function lotto() { return S.settings.lotto || {}; }
function lottoOdds() { return { ...ODDS_DEF, ...(lotto().odds || {}) }; }
function lottoItems(kind) {
  return Object.entries(lotto()[kind] || {}).filter(([, v]) => v && v.title).map(([id, v]) => ({ id, ...v })).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}
// 복권 관리는 테스트 모드에서도 진짜 보드에 저장 (연습판에도 같이 반영)
function saveLotto(patch, msg) {
  if (!ready()) return Promise.resolve();
  const p = { lotto: patch }, jobs = [backend.saveSettingsDeep(p)];
  if (testMode && realBackend) jobs.push(realBackend.saveSettingsDeep(clone(p)));
  return act(Promise.all(jobs), msg).catch(() => {});
}
function renderLottoAdmin() {
  if (ui.page !== "lotto") return;
  const on = lottoOn(), cs = lottoItems("coupons"), ps = lottoItems("pens"), o = lottoOdds();
  const tab = laTab(), newReq = couponReqs().filter((r) => (r.status || "new") === "new").length;
  const oddsOk = Object.keys(ODDS_DEF).reduce((t, k) => t + (Number(o[k]) || 0), 0) === 100;
  const LT = { reqs: "💌 요청" + (newReq ? ` <b class="la-new">${newReq}</b>` : ""), odds: "🎲 확률" + (oddsOk ? "" : " ⚠️"), cp: `🎟️ 쿠폰 <b>${cs.length}</b>`, pen: `😈 벌칙 <b>${ps.length}</b>` };
  $("laTabs").querySelectorAll("button").forEach((b) => { b.innerHTML = LT[b.dataset.k]; b.setAttribute("aria-pressed", b.dataset.k === tab); });
  document.querySelectorAll("[data-la-tab]").forEach((el) => { if (el.id !== "laPresetSec") el.hidden = el.dataset.laTab !== tab; });
  $("laOn").innerHTML = `<div class="la-on"><span>${on ? "✅ <b>공개 중</b> · 욱진이도 복권·포인트가 보여요" : "🙈 <b>숨김</b> · 지금은 관리자 기기에서만 보여요"}</span>` +
    `<button class="btn small${on ? " ghost" : ""}" type="button" data-act="laToggleOn">${on ? "다시 숨기기" : "욱진이에게 공개하기"}</button></div>` +
    (on ? "" : `<p class="small muted" style="margin:6px 0 0">쿠폰을 등급마다 하나 이상, 벌칙도 하나 이상 넣은 뒤 공개해 주세요. (지금 쿠폰 ${cs.length}개 · 벌칙 ${ps.length}개)</p>`);
  const keepFocus = (box) => box.contains(document.activeElement) && /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName);   // 글자 치는 중일 때만 다시 안 그림 (버튼을 눌렀을 땐 바로 반영)
  if (!keepFocus($("laOdds"))) $("laOdds").innerHTML = Object.keys(ODDS_DEF).map((k) => `<label>${ODDS_LABEL[k]}<input type="number" min="0" max="100" step="1" value="${o[k]}" data-odds="${k}"></label>`).join("");
  const sum = Object.keys(ODDS_DEF).reduce((t, k) => t + (Number(o[k]) || 0), 0);
  $("laOddsSum").innerHTML = sum === 100 ? "합계 100% ✅" : `<span style="color:var(--danger)">합계 ${sum}% — 100이 되게 맞춰 주세요</span>`;
  $("laPresetSec").hidden = tab !== "cp" || cs.length > 0 || ps.length > 0;
  const rn = cs.filter((v) => PRESET_RENAMES[v.title]);
  $("laRename").hidden = !rn.length;
  $("laRename").innerHTML = rn.length ? `<span>💰 금액을 등급 기준으로 통일했어요. 예전 제목 ${rn.length}개에 금액이 남아 있어요 (예: ${esc(rn[0].title)} → ${esc(PRESET_RENAMES[rn[0].title])}).</span><button class="btn small" type="button" data-act="laRename">제목 고치기</button>` : "";
  const LF = { all: ["전체", () => true], big: ["🥇", (v) => v.tier === "big"], mid: ["🥈", (v) => v.tier === "mid"], small: ["🥉", (v) => v.tier === "small"], streak: ["🛡️", (v) => v.effect === "streak"] };
  const won = laWonCounts(), cpShown = laArrange("cp", cs.filter(LF[ui.laTier] ? LF[ui.laTier][1] : () => true), "coupon", won);
  const lf = LF[ui.laTier] ? ui.laTier : "all", shown = cpShown;
  $("laCpN").textContent = `모두 ${cs.length}개` + (shown.length !== cs.length ? ` · 보이는 ${shown.length}개` : "");
  $("laFilter").innerHTML = Object.keys(LF).map((k) => `<button type="button" data-act="laFilter" data-k="${k}" aria-pressed="${k === lf}">${LF[k][0]} <b>${cs.filter(LF[k][1]).length}</b></button>`).join("");
  if (!keepFocus($("laCoupons"))) $("laCoupons").innerHTML = shown.length ? shown.map((v) => `<div class="la-row la-cp"><select data-la="coupons" data-id="${esc(v.id)}" data-f="tier" aria-label="등급">${Object.keys(TIERS).map((k) => `<option value="${k}"${v.tier === k ? " selected" : ""}>${TIERS[k]}</option>`).join("")}</select>` +
    `<input type="text" value="${esc(v.title)}" maxlength="60" data-la="coupons" data-id="${esc(v.id)}" data-f="title" aria-label="쿠폰 내용"><label class="la-days"><input type="number" min="1" value="${Number(v.days) || 30}" data-steps data-la="coupons" data-id="${esc(v.id)}" data-f="days" aria-label="기한(일)">일</label>` + wonHtml(won["coupon|" + v.title]) +
    `<button class="la-eff${v.effect === "streak" ? " on" : ""}" type="button" data-act="laEff" data-id="${esc(v.id)}" aria-pressed="${v.effect === "streak"}" title="🛡️ 연속일 채우기 효과 ${v.effect === "streak" ? "켜짐" : "꺼짐"}">🛡️</button>` +
    `<button class="icon-btn" type="button" data-act="laDel" data-k="coupons" data-id="${esc(v.id)}">삭제</button></div>`).join("") : `<p class="small muted" style="margin:0">${cs.length ? "찾는 쿠폰이 없어요." : "아직 없어요."}</p>`;
  const psShown = laArrange("pen", ps, "pen", won);
  $("laPenN").textContent = `모두 ${ps.length}개` + (psShown.length !== ps.length ? ` · 보이는 ${psShown.length}개` : "");
  if (!keepFocus($("laPens"))) $("laPens").innerHTML = psShown.length ? psShown.map((v) => `<div class="la-row la-pn"><span class="la-tier">😈</span>` +
    `<input type="text" value="${esc(v.title)}" maxlength="60" data-la="pens" data-id="${esc(v.id)}" data-f="title" aria-label="벌칙 내용"><label class="la-days"><input type="number" min="1" value="${Number(v.days) || 7}" data-steps="3,7,15" data-la="pens" data-id="${esc(v.id)}" data-f="days" aria-label="기한(일)">일</label>` + wonHtml(won["pen|" + v.title]) +
    `<button class="icon-btn" type="button" data-act="laDel" data-k="pens" data-id="${esc(v.id)}">삭제</button></div>`).join("") : `<p class="small muted" style="margin:0">${ps.length ? "찾는 벌칙이 없어요." : "아직 없어요."}</p>`;
}
// 복권 관리 목록: 검색 · 정렬 · 당첨 횟수 (긁은 복권 wins에서 같은 내용을 셈)
function laWonCounts() { const n = {}; S.wins.forEach((w) => { if (w && w.title) { const k = w.kind + "|" + w.title; n[k] = (n[k] || 0) + 1; } }); return n; }
function wonHtml(n) { return `<span class="la-won${n ? " on" : ""}" title="지금까지 당첨된 횟수">당첨 ${n || 0}회</span>`; }
function laArrange(k, list, kind, won) {
  const q = ((ui.laQ || {})[k] || "").trim().toLowerCase(), sort = (ui.laSort || {})[k] || "new", w = (v) => won[kind + "|" + v.title] || 0, d = (v) => Number(v.days) || 0;
  const out = q ? list.filter((v) => v.title.toLowerCase().includes(q)) : list.slice();
  if (sort === "abc") out.sort((a, b) => a.title.localeCompare(b.title, "ko"));
  if (sort === "short") out.sort((a, b) => d(a) - d(b) || a.title.localeCompare(b.title, "ko"));
  if (sort === "long") out.sort((a, b) => d(b) - d(a) || a.title.localeCompare(b.title, "ko"));
  if (sort === "won") out.sort((a, b) => w(b) - w(a) || a.title.localeCompare(b.title, "ko"));
  return out;
}
$("lottoPage").addEventListener("input", (ev) => { const k = ev.target.dataset.laQ; if (!k) return; (ui.laQ ||= {})[k] = ev.target.value; renderLottoAdmin(); });
$("lottoPage").addEventListener("change", (ev) => { const k = ev.target.dataset.laSort; if (!k) return; (ui.laSort ||= {})[k] = ev.target.value; renderLottoAdmin(); });
function openLottoAdmin() {
  if (!isAdminDevice()) { toast("관리자만 열 수 있어요."); return; }
  closeSettings(); location.hash = "#lotto";
}
["laCouponForm", "laPenForm"].forEach((fid) => $(fid).addEventListener("submit", (ev) => {
  ev.preventDefault();
  const f = ev.target, kind = fid === "laCouponForm" ? "coupons" : "pens", title = f.elements.title.value.trim();
  if (!title) { toast("내용을 적어 주세요."); return; }
  const id = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const doc = { title, days: Math.max(1, parseInt(f.elements.days.value, 10) || (kind === "pens" ? 7 : 30)), createdAt: Date.now() };
  if (kind === "coupons") { doc.tier = f.elements.tier.value; if (f.elements.streak.checked) doc.effect = "streak"; }
  saveLotto({ [kind]: { [id]: doc } }, kind === "pens" ? "벌칙을 넣었어요." : "쿠폰을 넣었어요.").then(() => { f.elements.title.value = ""; if (f.elements.streak) f.elements.streak.checked = false; f.elements.title.focus(); });
}));
// 기한 칸 화살표(▲▼·키보드)는 하루씩 말고 단계로: 쿠폰 7 → 15 → 30 → 60 → 90일, 벌칙 3 → 7 → 15일 (data-steps, 직접 치는 건 그대로)
const DAY_STEPS = [7, 15, 30, 60, 90];
["pointerdown", "keydown"].forEach((t) => $("lottoPage").addEventListener(t, (ev) => { const el = ev.target; if (el.matches && el.matches("input[data-steps]")) el.dataset.prev = el.value; }, true));
$("lottoPage").addEventListener("input", (ev) => {
  const el = ev.target; if (!el.matches("input[data-steps]") || ev.inputType) return;   // 글자 입력은 inputType이 있음
  const prev = Number(el.dataset.prev), v = Number(el.value); if (!prev || Math.abs(v - prev) !== 1) return;
  const steps = el.dataset.steps ? el.dataset.steps.split(",").map(Number) : DAY_STEPS;
  const next = v > prev ? steps.find((d) => d > prev) || steps[steps.length - 1] : [...steps].reverse().find((d) => d < prev) || steps[0];
  el.value = next; el.dataset.prev = next;
}, true);
// 등급을 고르면 기한 기본값: 🥇 60일 · 🥈 30일 · 🥉 7일
const TIER_DAYS = { big: 60, mid: 30, small: 7 };
$("laCouponForm").elements.tier.addEventListener("change", (ev) => { const f = $("laCouponForm"); f.elements.days.value = f.elements.streak.checked ? 30 : TIER_DAYS[ev.target.value] || 30; });
$("laStreak").addEventListener("change", (ev) => {   // 🛡️ 켜면 보통 대박 · 30일
  const f = $("laCouponForm"); if (!ev.target.checked) return;
  f.elements.tier.value = "big"; f.elements.days.value = 30; if (!f.elements.title.value.trim()) f.elements.title.value = "🛡️ 연속일 하루 채우기";
});
$("lottoPage").addEventListener("change", (ev) => {
  const el = ev.target;
  if (el.dataset.odds) { saveLotto({ odds: { [el.dataset.odds]: Math.max(0, Math.min(100, parseInt(el.value, 10) || 0)) } }, "확률을 바꿨어요."); return; }
  if (!el.dataset.la) return;
  let v = el.value; if (el.dataset.f === "days") v = Math.max(1, parseInt(v, 10) || 1); if (el.dataset.f === "title") { v = v.trim(); if (!v) { toast("내용을 적어 주세요."); renderLottoAdmin(); return; } }
  saveLotto({ [el.dataset.la]: { [el.dataset.id]: { [el.dataset.f]: v } } }, "고쳤어요.");
});

// ---------- 🎟️ 복권 긁기 · 쿠폰함 (wins 모음: kind coupon|pen|miss) ----------
// 쿠폰: expires(받은 날+기한), usedAt. 벌칙: left(남은 장), deadline, days, doneAt — 기한 지나면 남은 장 ×2, 기한 다시 (끝없이)
let scratch = null;   // { res, committed, revealed }
function ticketsLeft() { return Math.max(0, Math.floor(pointsLedger().total / PT_TICKET) - S.wins.size); }
function drawLotto() {
  const o = lottoOdds(), pm = practiceMinutes();
  if (streak(pm) >= 30) { o.big += 1; o.mid += 2; o.miss = Math.max(0, o.miss - 2); o.pen = Math.max(0, o.pen - 1); }   // 연속 30일+ 덤
  const keys = Object.keys(ODDS_DEF), tot = keys.reduce((t, k) => t + (Number(o[k]) || 0), 0) || 1;
  let r = Math.random() * tot, pick = "miss";
  for (const k of keys) { r -= Number(o[k]) || 0; if (r < 0) { pick = k; break; } }
  const cs = lottoItems("coupons"), ps = lottoItems("pens"), any = (list) => list[Math.floor(Math.random() * list.length)];
  if (pick === "pen") { const v = any(ps); if (v) return { kind: "pen", title: v.title, days: Number(v.days) || 7 }; pick = "miss"; }
  if (["big", "mid", "small"].includes(pick)) {
    let list = cs.filter((v) => v.tier === pick);
    if (!list.length) list = cs;   // 그 등급이 비었으면 아무 쿠폰
    const v = any(list); if (v) return { kind: "coupon", tier: v.tier, title: v.title, days: Number(v.days) || 30, effect: v.effect || null };
  }
  return { kind: "miss", title: "꽝" };
}
async function quietly(fn) { histApplying = true; try { return await fn(); } finally { histApplying = false; } }   // 되돌리기 기록에 안 남김
function commitWin(res, at) {
  const t = today(), doc = { kind: res.kind, title: res.title, wonAt: t, at };
  if (res.kind === "coupon") Object.assign(doc, { tier: res.tier, days: res.days, expires: addDays(t, res.days) }, res.effect ? { effect: res.effect } : {});
  if (res.kind === "pen") Object.assign(doc, { days: res.days, left: 1, deadline: addDays(t, res.days) });
  return quietly(() => backend.add("wins", doc));
}
// 기한 글: 10/21(수)까지 (7일 남음)
function untilText(d) { const n = diffDays(d, today()); return `${shortDate(d)}까지 (${n > 0 ? n + "일 남음" : n === 0 ? "오늘 마감" : "지남"})`; }
function resHtml(res) {
  const due = addDays(today(), res.days);
  if (res.kind === "coupon") return `<div class="big">${res.tier === "big" ? "🥇" : res.tier === "mid" ? "🥈" : "🥉"}</div><div class="tt">${esc(res.title)}</div>${res.effect === "streak" ? '<div class="sm">🛡️ 쓰면 실천 못 한 날 하루를 채워요</div>' : payText(res) ? `<div class="sm">${payText(res)}</div>` : ""}<div class="sm">${untilText(due)}</div>`;
  if (res.kind === "pen") return `<div class="big">😈</div><div class="lv">벌칙…</div><div class="tt">${esc(res.title)}</div><div class="sm">${untilText(due)} · 못 하면 ×2</div><div class="sm"><b>📸 꼭 인증샷 찍어서 보내기!</b></div>`;
  return `<div class="big">😐</div><div class="lv">꽝</div><div class="tt">아쉽다! 다음 기회에</div>`;
}
function openScratch() {
  if (!ready()) return;
  const left = ticketsLeft();
  if (!left) { toast("긁을 복권이 없어요. 실천해서 포인트를 모아요!"); return; }
  cancelGame();
  scratch = { res: drawLotto(), committed: false, revealed: false, at: Date.now(), left };
  $("scSub").textContent = `남은 복권 ${left}장`;
  $("scratchUnder").innerHTML = resHtml(scratch.res);
  $("scGame").hidden = true;
  $("scBtns").innerHTML = '<button class="btn ghost" type="button" data-act="scReveal">한 번에 열기</button>';
  $("scHint").hidden = false;
  openDlg($("scratchDlg"));
  setTimeout(paintScratch, 30);
}
function paintScratch() {
  if (!scratch || scratch.revealed || scratch.painted) return;
  const cv = $("scratchCanvas"), r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  cv.classList.remove("gone"); cv.width = Math.max(1, r.width * dpr); cv.height = Math.max(1, r.height * dpr);
  const c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.globalCompositeOperation = "source-over";
  const g = c.createLinearGradient(0, 0, r.width, r.height); g.addColorStop(0, "#C9CED6"); g.addColorStop(.5, "#E9ECF1"); g.addColorStop(1, "#AEB4BE");
  c.fillStyle = g; c.fillRect(0, 0, r.width, r.height);
  c.fillStyle = "#6B7280"; c.font = "600 18px sans-serif"; c.textAlign = "center"; c.fillText("🪙 여기를 문질러요", r.width / 2, r.height / 2 + 6);
  c.globalCompositeOperation = "destination-out";
  scratch.painted = true;
}
function scratchCommit() {   // 긁기 시작하면 바로 저장 (닫았다 다시 뽑기 못 하게)
  const sc = scratch; if (!sc) return Promise.resolve();
  if (!sc.commitP) {
    sc.committed = true;
    sc.commitP = commitWin(sc.res, sc.at).then((id) => { sc.id = id; }).catch(() => { sc.committed = false; sc.commitP = null; });
  }
  return sc.commitP;
}
function scAfterBtns() {
  const left = scratch ? scratch.left - 1 : 0;
  return (left > 0 ? `<button class="btn" type="button" data-act="scAgain">한 장 더 긁기 (${left}장)</button>` : "") + `<button class="btn${left > 0 ? " ghost" : ""}" type="button" data-act="scClose">닫기</button>`;
}
async function scratchReveal() {
  const sc = scratch; if (!sc || sc.revealed) return;
  const saving = scratchCommit();
  sc.revealed = true; renderCoupons();
  $("scratchCanvas").classList.add("gone"); $("scHint").hidden = true;
  const res = sc.res, left = sc.left - 1;
  $("scSub").textContent = left > 0 ? `남은 복권 ${left}장` : "남은 복권 없음";
  toast(res.kind === "coupon" ? (res.tier === "big" ? "🥇 대박!! " : "🎉 ") + res.title : res.kind === "pen" ? "😈 벌칙: " + res.title : "😐 꽝! 다음 기회에");
  $("scBtns").innerHTML = scAfterBtns();
  if (res.kind === "coupon") return;
  await saving;   // 꽝·벌칙: 저장되면 바로 아래에서 🎯 게임
  if (scratch === sc && sc.id && $("scratchDlg").open) openGame(sc.id, true);
}
(() => {   // 문질러 긁기
  const cv = $("scratchCanvas"); let down = false, n = 0;
  const pos = (ev) => { const r = cv.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; };
  const rub = (ev) => {
    if (!down || !scratch || scratch.revealed) return;
    if (!scratch.painted) paintScratch();   // 아직 은색이 안 칠해졌으면 먼저
    const c = cv.getContext("2d"), [x, y] = pos(ev); c.beginPath(); c.arc(x, y, 20, 0, Math.PI * 2); c.fill();
    if (++n % 8 === 0) {   // 얼마나 긁혔는지 가끔 재기
      const d = c.getImageData(0, 0, cv.width, cv.height).data; let clear = 0;
      for (let i = 3; i < d.length; i += 64) if (d[i] === 0) clear++;
      if (clear / (d.length / 64) > 0.5) scratchReveal();
    }
  };
  cv.addEventListener("pointerdown", (ev) => { down = true; cv.setPointerCapture(ev.pointerId); scratchCommit(); rub(ev); });
  cv.addEventListener("pointermove", rub);
  ["pointerup", "pointercancel", "pointerleave"].forEach((e) => cv.addEventListener(e, () => { down = false; }));
})();
// 🛡️ 연속일 채우기: 최근 30일 중 실천 안 한 날 하나를 골라 wins.fillDate (보드 쓰기 전 날은 빼고)
let fillFor = null;
function openFill(id) {
  const w = S.wins.get(id); if (!w || w.usedAt || !ready()) return;
  const t = today(), pm = practiceMinutes(), st = boardStart(), ds = [];
  for (let i = 1; i <= 30; i++) { const d = addDays(t, -i); if (st && d < st) break; if (!pm[d]) ds.push(d); }
  if (!ds.length) { toast("최근 30일에 빈 날이 없어요. 쿠폰은 아껴 둬요! 👍"); return; }
  const now = streak(pm);
  fillFor = id;
  $("mvTitle").textContent = "🛡️ 어느 날을 채울까요?";
  $("mvText").innerHTML = `<p class="small muted">최근 30일 중 실천 안 한 날이에요. 고른 날은 실천한 날로 쳐서 연속 실천이 이어지고 연속 보너스도 받아요. (실천 시간 점수는 없어요) 지금 연속 ${now}일.</p>` +
    `<div class="fill-list">${ds.map((d) => { const n = streak({ ...pm, [d]: 1 }); return `<button class="btn ghost small" type="button" data-act="fillDo" data-day="${d}">${shortDate(d)}${n > now ? ` <b>→ 연속 ${n}일</b>` : ""}</button>`; }).join("")}</div>`;
  $("mvBtns").innerHTML = '<button class="btn ghost" type="button" data-act="mvClose">취소</button>';
  openDlg($("moveDlg"));
}
function penDone(id) {
  const w = S.wins.get(id); if (!w || !ready()) return; const left = Math.max(0, (w.left || 1) - 1);
  act(backend.update("wins", id, left ? { left } : { left: 0, doneAt: today() }), left ? `💪 한 장 했어요! ${left}장 남았어요. 📸 인증샷 보냈죠?` : "✅ 벌칙 끝! 📸 인증샷 보냈죠?").catch(() => {});
}
// 😈 벌칙 = 기한 마감일의 할 일 (tasks.penId). 장 수·기한이 바뀌면 따라 바뀌고, 다 하면 끝낸 일로
let penTaskSyncing = false;
function syncPenTasks() {
  if (penTaskSyncing || !backend || !S.loaded) return;
  const jobs = [], byPen = new Map(rows(S.tasks).filter((x) => x.penId).map((x) => [x.penId, x]));
  S.wins.forEach((w, id) => {
    if (!w || w.kind !== "pen") return;
    const x = byPen.get(id), open = w.left > 0, title = `😈 벌칙: ${w.title}${open && w.left > 1 ? ` ×${w.left}` : ""}`;
    if (open && !x) jobs.push(() => backend.add("tasks", { title, repeat: "none", date: w.deadline, done: false, doneDate: null, penId: id, createdAt: Date.now() }));
    else if (open && (x.title !== title || x.date !== w.deadline || x.done)) jobs.push(() => backend.update("tasks", x.id, { title, date: w.deadline, done: false, doneDate: null }));
    else if (!open && x && (!x.done || x.title !== title)) jobs.push(() => backend.update("tasks", x.id, { title, done: true, doneDate: w.doneAt || today() }));
  });
  if (!jobs.length) return;
  penTaskSyncing = true;
  quietly(async () => { for (const j of jobs) await j(); }).catch(() => {}).finally(() => { penTaskSyncing = false; });
}
// 벌칙 기한: 지났으면 남은 장 ×2, 기한 다시 (어느 기기든 열면 맞춰 둠)
let penSweeping = false;
function sweepPens() {
  if (penSweeping || !backend || !S.loaded) return;
  const t = today(), jobs = [];
  S.wins.forEach((w, id) => {
    if (!w || w.kind !== "pen" || !(w.left > 0) || !w.deadline || w.deadline >= t) return;
    let left = w.left, dl = w.deadline; const days = Number(w.days) || 7;
    while (dl < t) { left *= 2; dl = addDays(dl, days); }
    jobs.push([id, { left, deadline: dl }]);
  });
  if (!jobs.length) return;
  penSweeping = true;
  quietly(async () => { for (const [id, p] of jobs) await backend.update("wins", id, p); }).finally(() => { penSweeping = false; });
}
function renderCoupons() {
  if (ui.page !== "coupons") return;
  const t = today(), L = pointsLedger(), left = Math.max(0, Math.floor(L.total / PT_TICKET) - S.wins.size), prog = L.total % PT_TICKET;
  const tst = lottoStage(L);
  $("cpTicket").innerHTML = `<svg class="ticket" viewBox="-12 -16 124 92" aria-hidden="true" id="cpTicketSvg"></svg>` +
    `<div><div class="cp-n">${left ? `긁을 복권 ${left}장!` : "다음 복권까지 " + (PT_TICKET - prog) + "점"}</div><div class="small muted">${esc(LOTTO_STAGES[tst.stage - 1])} · ⭐ ${prog} / ${PT_TICKET} · 모두 ${L.total.toLocaleString("ko-KR")}점</div></div>` +
    `<button class="btn" type="button" data-act="openScratch"${left ? "" : ' aria-disabled="true"'}>🪙 긁기</button>`;
  paintTicket($("cpTicketSvg"), tst);
  const hide = scratch && !scratch.revealed ? scratch.at : null;   // 긁는 중인 건 다 긁기 전까지 목록에 안 보이게
  const ws = rows(S.wins).filter((w) => w.at !== hide).sort((a, b) => (b.at || 0) - (a.at || 0));
  const tierIc = (w) => w.tier === "big" ? "🥇" : w.tier === "mid" ? "🥈" : "🥉";
  const tab = cpTab(), sort = cpSort(), TR = { big: 0, mid: 1, small: 2 };
  const by = (dueKey) => (a, b) => sort === "recent" ? (b.at || 0) - (a.at || 0)
    : sort === "tier" && dueKey === "expires" ? (TR[a.tier] ?? 3) - (TR[b.tier] ?? 3) || String(a.expires).localeCompare(String(b.expires))
    : String(a[dueKey] || "9999").localeCompare(String(b[dueKey] || "9999")) || (b.at || 0) - (a.at || 0);
  const avail = ws.filter((w) => w.kind === "coupon" && !w.usedAt && (w.expires || "9999") >= t).sort(by("expires"));
  const pens = ws.filter((w) => w.kind === "pen"), pOpen = pens.filter((w) => w.left > 0).sort(by("deadline")), pDone = pens.filter((w) => !(w.left > 0));
  const past = ws.filter((w) => (w.kind === "coupon" && (w.usedAt || (w.expires || "9999") < t)) || w.kind === "miss");
  const TABS = { avail: ["🎟️ 쓸 쿠폰", avail.length], pens: ["😈 벌칙", pOpen.length], past: ["📜 지난 것", 0], reqs: ["💌 요청", 0] };
  $("cpTabs").querySelectorAll("button").forEach((b) => { const [lb, n] = TABS[b.dataset.k]; b.innerHTML = lb + (n ? ` <b>${n}</b>` : ""); b.setAttribute("aria-pressed", b.dataset.k === tab); });
  document.querySelectorAll("[data-cp]").forEach((el) => { el.hidden = el.dataset.cp !== tab; });
  const HEAD = { avail: ["쓸 수 있는 쿠폰", "💳 누가 사는지 안 적힌 쿠폰은 공통비용에서 · 🥇 금액 제한 없음 · 🥈 3만 원까지 · 🥉 1만 원까지"], pens: ["벌칙", "📸 꼭 인증샷 찍어서 보내기 · 기한 안에 다 못 하면 남은 장 수가 두 배"], past: ["지난 것", "사용함 · 기한 만료 · 꽝 (최근 순)"], reqs: ["쿠폰 요청", "있으면 좋겠는 쿠폰을 보내면 관리자가 보고 넣어 줘요"] };
  $("cpTabTitle").textContent = HEAD[tab][0]; $("cpTabSub").textContent = HEAD[tab][1];
  const sel = $("cpSort"); sel.hidden = !(tab === "avail" || tab === "pens"); sel.value = sort; sel.querySelector('[value="tier"]').hidden = tab !== "avail";
  if (tab === "pens" && sort === "tier") sel.value = "due";
  $("cpAvail").innerHTML = avail.length ? avail.map((w) => `<div class="item cp-item"><span class="cp-tier">${tierIc(w)}</span><div class="body"><div class="title">${esc(w.title)}</div>` +
    `<div class="meta">${w.effect === "streak" ? '<span class="tag cat c-grape">🛡️ 연속일 채우기</span>' : ""}<span class="tag">${untilText(w.expires)}</span><span class="small muted">${esc(shortDate(w.wonAt))} 받음${w.effect === "streak" || !payText(w) ? "" : " · " + esc(TIER_CAP[w.tier] || "")}</span></div></div>` +
    `<div class="actions"><button class="btn small" type="button" data-act="cpUse" data-id="${esc(w.id)}">쓰기</button></div></div>`).join("") : '<div class="empty">아직 쓸 쿠폰이 없어요.</div>';
  $("cpPens").innerHTML = (pOpen.length ? pOpen.map((w) => `<div class="item cp-item"><span class="cp-tier">😈</span><div class="body"><div class="title">${esc(w.title)}${w.left > 1 ? ` <b style="color:var(--danger)">×${w.left}</b>` : ""}</div>` +
    `<div class="meta"><span class="tag late">${untilText(w.deadline)}</span><span class="small muted">못 하면 ×${w.left * 2}</span></div></div>` +
    `<div class="actions" style="display:grid;gap:4px"><button class="btn small" type="button" data-act="penDone" data-id="${esc(w.id)}">했어요${w.left > 1 ? " (1장)" : ""}</button>${w.game ? "" : `<button class="btn ghost small" type="button" data-act="gmOpen" data-id="${esc(w.id)}">🎯 한 판</button>`}</div></div>`).join("") : '<div class="empty">미완료 벌칙이 없어요. 👍</div>') +
    pDone.map((w) => `<div class="item done"><span class="cp-tier">✅</span><div class="body"><div class="title">${esc(w.title)}</div><div class="meta"><span class="small muted">${esc(shortDate(w.doneAt || w.wonAt))} 완료</span></div></div><div class="actions"></div></div>`).join("");
  $("cpPast").innerHTML = past.length ? past.map((w) => {
    const st = w.kind === "miss" ? "😐 꽝" : w.usedAt ? `${shortDate(w.usedAt)} 사용함${w.fillDate ? ` · 🛡️ ${shortDate(w.fillDate)} 채움` : ""}` : `${shortDate(w.expires)} 기한 만료`;
    const gm = w.kind === "miss" ? (w.game ? `<span class="small muted">🎯 +${w.game.pts}</span>` : `<button class="btn ghost small" type="button" data-act="gmOpen" data-id="${esc(w.id)}">🎯 한 판</button>`) : "";
    return `<div class="item${w.kind === "miss" && !w.game ? "" : " done"}"><span class="cp-tier">${w.kind === "miss" ? "😐" : tierIc(w)}</span><div class="body"><div class="title">${esc(w.kind === "miss" ? "꽝" : w.title)}</div><div class="meta"><span class="small muted">${esc(st)} · ${esc(shortDate(w.wonAt))} 긁음</span></div></div><div class="actions">${gm}</div></div>`;
  }).join("") : '<div class="empty">아직 없어요.</div>';
}
// 쿠폰함 탭·정렬 (이 기기에만 기억)
function cpTab() { try { const v = localStorage.getItem("ukjin-cp-tab"); return ["avail", "pens", "past", "reqs"].includes(v) ? v : "avail"; } catch (e) { return "avail"; } }
function cpSort() { try { const v = localStorage.getItem("ukjin-cp-sort"); return ["due", "recent", "tier"].includes(v) ? v : "due"; } catch (e) { return "due"; } }
$("cpSort").addEventListener("change", (ev) => { try { localStorage.setItem("ukjin-cp-sort", ev.target.value); } catch (e) { /* 무시 */ } renderCoupons(); });
function maybeLottoIntro() {   // 공개된 뒤 처음 여는 기기에 한 번 소개
  if (!lottoOn() || isAdminDevice()) return;
  try { if (localStorage.getItem("ukjin-lotto-intro")) return; localStorage.setItem("ukjin-lotto-intro", "1"); } catch (e) { return; }
  openDlg($("lottoIntroDlg"));
}

// ---------- 💌 쿠폰 요청 (settings.lotto.reqs{id:{text, at, status new|added|no}}) · 관리자 기기에만 N ----------
function lsGet(k) { try { return Number(localStorage.getItem(k)) || 0; } catch (e) { return 0; } }
function lsSet(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) { /* 무시 */ } }
// 복권 관리 탭 (이 기기에만 기억). 새 쿠폰 요청은 요청 탭을 봐야 '본 걸로' → N 꺼짐
function laTab() { try { const v = localStorage.getItem("ukjin-la-tab"); return ["reqs", "odds", "cp", "pen"].includes(v) ? v : "cp"; } catch (e) { return "cp"; } }
function markCreqSeen() { if (ui.creqHi == null) ui.creqHi = lsGet("ukjin-creq-seen"); lsSet("ukjin-creq-seen", Date.now()); renderAdminN(); }
function couponReqs() { return Object.entries(lotto().reqs || {}).filter(([, v]) => v && v.text).map(([id, v]) => ({ id, ...v })).sort((a, b) => (b.at || 0) - (a.at || 0)); }
const REQ_ST = { new: "보냄", added: "✅ 목록에 넣었어요", no: "😅 이번엔 안 돼요" };
function renderCouponReqs() {
  const rs = couponReqs();
  if (ui.page === "coupons") $("cpReqs").innerHTML = rs.length ? rs.map((r) => `<div class="item"><span class="cp-tier">💌</span><div class="body"><div class="title">${esc(r.text)}</div><div class="meta"><span class="small muted">${esc(fmtTime(r.at))} · ${REQ_ST[r.status || "new"]}</span></div></div><div class="actions"></div></div>`).join("") : "";
  if (ui.page === "lotto") {
    const seen = ui.creqHi ?? lsGet("ukjin-creq-seen");
    $("laReqs").innerHTML = rs.length ? rs.map((r) => `<div class="item${(r.status || "new") === "new" && r.at > seen ? " req-new" : ""}"><span class="cp-tier">💌</span><div class="body"><div class="title">${esc(r.text)}</div><div class="meta"><span class="small muted">${esc(fmtTime(r.at))} · ${REQ_ST[r.status || "new"]}</span></div></div>` +
      `<div class="actions" style="display:flex;gap:4px">${(r.status || "new") === "new" ? `<button class="btn small" type="button" data-act="crAdd" data-id="${esc(r.id)}">목록에 넣기</button><button class="btn ghost small" type="button" data-act="crNo" data-id="${esc(r.id)}">거절</button>` : ""}<button class="icon-btn" type="button" data-act="crDel" data-id="${esc(r.id)}">지우기</button></div></div>`).join("") : '<p class="small muted" style="margin:0">아직 요청이 없어요.</p>';
  }
}
// 관리자 기기: 새 기능 요청·쿠폰 요청이 있으면 N (그 기기에서 본 뒤로 새로 온 것만)
function renderAdminN() {
  const me = isAdminDevice();
  $("navLotto").hidden = !me;
  renderSideReqs(me);
  const reqNew = me && rows(S.requests).some((r) => (r.createdAt || 0) > lsGet("ukjin-req-seen"));
  const crNew = me && couponReqs().some((r) => (r.status || "new") === "new" && r.at > lsGet("ukjin-creq-seen"));
  const rb = $("reqBadge");
  if (reqNew) { rb.hidden = false; rb.textContent = "N"; }
  document.querySelectorAll("[data-admin-n]").forEach((b) => { b.hidden = !crNew; });
  const lb = document.querySelector('#adminBox [data-act="openLottoAdmin"]'); if (lb) lb.textContent = "🎟️ 복권 관리 (쿠폰·벌칙 목록)" + (crNew ? " · 💌 새 요청" : "");
  if (me && ui.page === "requests" && reqNew) lsSet("ukjin-req-seen", Date.now());   // 보고 있으면 본 걸로
}
// 관리자 기기: 왼쪽 복권 위에 아직 처리 안 한 요청 (본 것도 처리 전이면 계속, 없으면 '없음 👍'). 🛠️ 기능 요청(완료 전) · 💌 쿠폰 요청(보냄)
function renderSideReqs(me) {
  const box = $("sideReqs");
  const fr = me ? rows(S.requests).filter((r) => r.text && r.status !== "done").sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)) : [];
  const cr = me ? couponReqs().filter((r) => (r.status || "new") === "new").reverse() : [];
  box.hidden = !me;
  if (!me) { box.innerHTML = ""; return; }
  if (!fr.length && !cr.length) { box.innerHTML = '<div class="side-reqs-h"><b>📋 처리할 요청 없음 👍</b></div>'; return; }
  const items = [...cr.map((r) => ["goCreqs", "💌", r.text]), ...fr.map((r) => ["goReqs", "🛠️", r.text])], MAX = 5;
  box.innerHTML = `<div class="side-reqs-h"><b>📋 처리할 요청</b><span>🛠️ ${fr.length} · 💌 ${cr.length}</span></div>` +
    items.slice(0, MAX).map(([a, ic, t]) => `<button type="button" data-act="${a}" title="${esc(t)}"><span>${ic}</span><span class="t">${esc(t)}</span></button>`).join("") +
    (items.length > MAX ? `<small>+${items.length - MAX}개 더</small>` : "");
}
$("cpReqForm").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const text = $("cpReqText").value.trim(); if (!text) { toast("어떤 쿠폰이면 좋겠는지 적어 주세요."); return; }
  const id = "q" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  saveLotto({ reqs: { [id]: { text, at: Date.now(), status: "new" } } }, "💌 쿠폰 요청을 보냈어요!").then(() => { $("cpReqText").value = ""; });
});

// ---------- 📱 폰: 달력 아래 고른 날 자세히 (처음엔 오늘) ----------
function isPhone() { return window.matchMedia("(max-width: 720px)").matches; }
function renderDayPanel() {
  const box = $("dayPanel"); if (!box || !S.loaded) return;
  const d = ui.selDay || today(), t = today(), n = diffDays(d, t);
  const exams = rows(S.goals).filter((g) => g.due === d), ts = tasksOn(d).filter((x) => x.title);
  const ls = rows(S.logs).filter((l) => l.date === d && !l.taskId).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const gs = gcalEventsOn(d), ms = rows(S.money).filter((x) => x.date === d);
  const pd = lottoVisible() && pointsLedger().day[d];
  const KIND = { income: "수입", transfer: partner() + "에게", expense: "지출", move: "이체" };
  let h = `<div class="dp-head"><div><h3>${esc(prettyDate(d))}</h3><span class="muted small">${n === 0 ? "오늘" : n > 0 ? `${n}일 뒤` : `${-n}일 전`}</span></div>${pd && pd.sum ? `<span class="dp-pts">+${pd.sum} ⭐</span>` : ""}</div>`;
  if (exams.length) h += `<div class="dp-sec">${exams.map((g) => `<div class="item"><span class="tag cat c-coral">🎯 D-DAY</span><div class="body"><div class="title">${esc(g.title)}</div></div></div>`).join("")}</div>`;
  const extra = dayExtraItems(d); if (extra) h += `<div class="dp-sec"><div class="list">${extra}</div></div>`;
  h += `<div class="dp-sec"><h4>할 일</h4>${ts.length ? `<div class="list">${ts.map((x) => taskItem(x, d)).join("")}</div>` : '<div class="small muted">이 날 할 일이 없어요.</div>'}</div>`;
  if (ls.length) h += `<div class="dp-sec"><h4>🔥 실천한 일</h4><div class="list">${ls.map((l) => `<div class="item"><button type="button" class="log-fire" data-act="logFire" data-id="${esc(l.id)}" aria-label="실천한 일 편집·삭제">🔥</button>` +
    `<div class="body" data-act="editLog" data-id="${esc(l.id)}" style="cursor:pointer"><div class="title">${esc(l.text || "기록")}</div><div class="meta"><span class="tag mono">${l.minutes ? fmtHM(l.minutes) : "-"}</span></div></div><div class="actions"></div></div>`).join("")}</div></div>`;
  if (gs.length) h += `<div class="dp-sec"><h4>📅 구글 일정</h4><div class="list">${gs.map((g) => `<div class="item"><span class="tag mono">${esc(g.time || "종일")}</span><div class="body"><div class="title">${esc(g.title)}</div></div>${g.link ? `<div class="actions"><a class="icon-btn" href="${esc(g.link)}" target="_blank" rel="noopener">열기</a></div>` : ""}</div>`).join("")}</div></div>`;
  if (ms.length) h += `<div class="dp-sec"><h4>💰 돈</h4><div class="list">${ms.map((x) => `<div class="item" data-act="searchMoney" data-id="${esc(x.id)}" style="cursor:pointer"><span class="tag">${esc(KIND[x.kind] || "")}</span><div class="body"><div class="title">${esc(x.memo || x.cat || "")}</div></div><span class="won ${x.kind === "income" ? "plus" : x.kind === "move" ? "" : "minus"}">${x.kind === "income" ? "+" : x.kind === "move" ? "" : "-"}${won(x.amount)}</span></div>`).join("")}</div></div>`;
  h += `<div class="dp-btns"><button class="btn ghost small" type="button" data-act="dpAddTask" data-day="${d}">＋ 할 일</button><button class="btn ghost small" type="button" data-act="openDayLogs" data-day="${d}">＋ 실천한 일</button></div>`;
  box.innerHTML = h;
}
// 날짜 자세히(폰 패널·PC 창): 🎟️ 쿠폰 마감 · 🛡️ 채운 날 (누르면 쿠폰함)
function dayExtraItems(d) {
  const row = (tag, title) => `<div class="item" data-act="goCoupons" style="cursor:pointer" title="눌러서 쿠폰함"><span class="tag cat c-grape">${tag}</span><div class="body"><div class="title">${title}</div></div></div>`;
  return couponsDueOn(d).map((w) => row("🎟️ 쿠폰 마감", `${esc(w.title)} <span class="small muted">· 이 날까지 써요</span>`)).join("") +
    (fillDays()[d] ? row("🛡️ 채운 날", "연속일 채우기 쿠폰으로 실천한 날로 쳤어요") : "");
}
window.matchMedia("(max-width: 720px)").addEventListener("change", () => renderCalendar());

// ---------- 🎯 타이밍 게임: 꽝·벌칙 뒤 한 판, 가운데 가까울수록 포인트 돌려받기 (wins.game = {pts, date}) ----------
let game = null;   // { id, pos, dir, raf, last, done, inline, ui }
// inline = 긁기 창 바로 아래에서 (꽝·벌칙 나오면). 멈추기 전에 닫으면 안 한 걸로 → 쿠폰함에서 나중에 한 판
function openGame(id, inline) {
  const w = S.wins.get(id); if (!w || w.game || !["miss", "pen"].includes(w.kind)) { if (!inline) toast("이 복권은 이미 게임을 했어요."); return; }
  cancelGame();
  const ui = inline ? { needle: $("scTgNeedle"), res: $("scTgRes"), btns: $("scBtns") } : { needle: $("tgNeedle"), res: $("tgRes"), btns: $("gmBtns") };
  game = { id, pos: Math.random(), dir: Math.random() < .5 ? 1 : -1, last: 0, done: false, inline: !!inline, ui };
  ui.res.textContent = "";
  ui.btns.innerHTML = '<button class="btn" type="button" data-act="gmStop">멈춰!</button>' + (inline ? '<button class="btn ghost" type="button" data-act="gmLater">나중에 할게요</button>' : "");
  if (inline) $("scGame").hidden = false; else { closeDlg($("scratchDlg")); openDlg($("gameDlg")); }
  const step = (ts) => {
    if (!game || game.done) return;
    if (game.last) { game.pos += game.dir * (ts - game.last) / 750; if (game.pos > 1) { game.pos = 2 - game.pos; game.dir = -1; } if (game.pos < 0) { game.pos = -game.pos; game.dir = 1; } }
    game.last = ts; game.ui.needle.style.left = (game.pos * 100) + "%"; game.raf = requestAnimationFrame(step);
  };
  game.raf = requestAnimationFrame(step);
}
function cancelGame() {   // 긁기 창 안 게임을 멈추기 전에 그만둠 (저장 안 함)
  if (!game || !game.inline || game.done) return;
  cancelAnimationFrame(game.raf); game = null; $("scGame").hidden = true;
}
$("gameDlg").addEventListener("cancel", (ev) => { if (game && !game.done && !game.inline) ev.preventDefault(); });   // 멈추기 전엔 못 닫음 (닫았다 다시 하기 막기)
$("scratchDlg").addEventListener("close", () => cancelGame());
function stopGame() {
  if (!game || game.done) return;
  game.done = true; cancelAnimationFrame(game.raf);
  const d = Math.abs(game.pos - 0.5), pts = d <= 0.03 ? 300 : d <= 0.1 ? 150 : d <= 0.2 ? 50 : 0;
  const id = game.id;
  game.ui.res.textContent = pts ? `🎉 +${pts}점 돌려받았어요!` : "😅 아깝다! 0점";
  game.ui.btns.innerHTML = game.inline ? scAfterBtns() : '<button class="btn" type="button" data-act="gmClose">확인</button>';
  quietly(() => backend.update("wins", id, { game: { pts, date: today() } })).catch(() => {});
}

// ---------- ⭐ 포인트 (기록에서 바로 계산: 지우거나 되돌리면 포인트도 같이 맞춰짐) ----------
// 실천 1분 1 · 세부목표 달성 50 · 목표 달성 300 · 연속 7일 30 / 15일 100 / 30일 250 / 90일 1000 / 그 뒤 30일마다 300 · 돈 기록 1 (월급 30)
const PT_GOAL = 300, PT_SUB = 50, PT_TICKET = 1000;
function lottoOn() { return !!(S.settings.lotto && S.settings.lotto.on); }
function isAdminDevice() { try { return localStorage.getItem("ukjin-admin") === "1"; } catch (e) { return false; } }
function lottoVisible() { return lottoOn() || isAdminDevice(); }   // 쿠폰 목록 준비 끝나기 전에는 관리자 기기에서만 보임
function streakBonus(n) { return n === 7 ? 30 : n === 15 ? 100 : n === 30 ? 250 : n === 90 ? 1000 : n > 90 && (n - 90) % 30 === 0 ? 300 : 0; }
function pointsLedger() {
  const day = {}, at = (d) => (day[d] ||= { sum: 0, min: 0, money: 0, salary: 0, lines: [] });
  S.logs.forEach((l) => { const m = Math.round(Number(l && l.minutes) || 0); if (l && l.date && m > 0) { const x = at(l.date); x.min += m; x.sum += m; } });
  S.money.forEach((m) => {
    if (!m || !m.date) return; const x = at(m.date);
    if (m.kind === "income" && m.cat === "월급") { x.salary++; x.sum += 30; } else { x.money++; x.sum += 1; }
  });
  S.wins.forEach((w) => { if (w && w.game && w.game.pts > 0 && w.game.date) { const x = at(w.game.date); x.sum += w.game.pts; x.lines.push(["🎯", "타이밍 게임", w.game.pts]); } });
  S.goals.forEach((g) => {
    if (!g) return;
    if (g.achievedAt) { const x = at(g.achievedAt); x.sum += PT_GOAL; x.lines.push(["🎉", `목표 '${g.title}' 달성`, PT_GOAL]); }
    subsOf(g).forEach((v) => { if (v.doneAt) { const x = at(v.doneAt); x.sum += PT_SUB; x.lines.push(["🎉", `세부목표 '${v.title}' 달성`, PT_SUB]); } });
  });
  // 연속 실천: 실천한 날(달력 초록 칸과 같은 기준)을 이어서 세고, 7·15·30·90일…에 닿는 날 보너스
  const pm = practiceMinutes(), days = Object.keys(pm).filter((d) => pm[d] > 0).sort();
  let run = 0, prev = null;
  days.forEach((d) => {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1; prev = d;
    const b = streakBonus(run); if (b) { const x = at(d); x.sum += b; x.lines.push(["🔥", `연속 실천 ${run}일 보너스`, b]); }
  });
  Object.values(day).forEach((x) => {
    if (x.min) x.lines.unshift(["🔥", `실천 ${fmtHM(x.min)}`, x.min]);
    if (x.money) x.lines.push(["💰", `돈 기록 ${x.money}건`, x.money]);
    if (x.salary) x.lines.push(["💰", `월급 기록${x.salary > 1 ? " " + x.salary + "건" : ""}`, x.salary * 30]);
  });
  if (testMode && testBonus) { const x = at(today()); x.sum += testBonus; x.lines.push(["🧪", "테스트 포인트", testBonus]); }
  const total = Object.values(day).reduce((t, x) => t + x.sum, 0);
  return { total, day };
}
// 복권 그림 8단계 (125점마다) + 다 참(9). n = 몇 번째 복권 (No.001…, 번호 공도 복권마다 다름)
const LOTTO_STAGES = ["작업복 주머니에서 빈 복권 발견", "꼬깃꼬깃 펴 보니 진짜 복권이네!", "오늘도 실천 도장 꾹!", "행운 번호가 하나씩 떠올라요",
  "은박이 반짝반짝", "주머니 속에서 들썩들썩!", "행운의 동전 준비 완료", "두근두근!! 곧 긁어요", "긁을 복권 도착! 🎉"];
const LOTTO_MOVE = { 6: "tk-w1", 7: "tk-w2", 8: "tk-hop", 9: "tk-glow" };
let tkUid = 0;
// fill/stroke="var(--…)"를 style로 옮김 (아이폰 사파리에서도 색이 나오게)
function svgVars(h) { return h.replace(/<(\w+)([^>]*?)(\/?)>/g, (m, tag, at, sl) => { let st = ""; at = at.replace(/\s(fill|stroke)="(var\([^"]+\))"/g, (x, k, v) => { st += `${k}:${v};`; return ""; }); return st ? `<${tag}${at} style="${st}"${sl}>` : m; }); }
function luckyNums(n) { return [(n * 7 + 3) % 9 + 1, (n * 5 + 1) % 9 + 1, (n * 3 + 5) % 9 + 1]; }
function ticketSvg(stage, n, since) {
  const k = "tk" + (tkUid++), full = stage >= 9, P = "M4 6h92v17a7 7 0 0 0 0 14v19H4V37a7 7 0 0 0 0-14z";
  let g = `<defs><pattern id="${k}f" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="6" height="6" fill="var(--tk-foil)"/><rect width="2" height="6" fill="var(--tk-foil-hi)"/></pattern><clipPath id="${k}c"><path d="${P}"/></clipPath></defs>`;
  if (stage <= 1) {   // 청바지 주머니에서 빼꼼
    g += `<g transform="translate(0 6)"><path d="${P}" fill="var(--tk-paper)" stroke="var(--tk-line)" stroke-width="2"/><text x="37" y="34" text-anchor="middle" font-size="18" fill="var(--muted)" font-family="Do Hyeon, sans-serif">?</text></g>`;
    g += `<path d="M-6 30h112v34q0 8-8 8H2q-8 0-8-8z" fill="var(--tk-denim)"/><path d="M-6 30h112" stroke="var(--tk-denim-d)" stroke-width="3"/><path d="M0 36h100" stroke="var(--tk-gold)" stroke-width="1.4" stroke-dasharray="4 3"/><path d="M46 42v24" stroke="var(--tk-gold)" stroke-width="1.2" stroke-dasharray="3 3"/>`;
    return svgVars(g);
  }
  g += `<path d="${P}" fill="${full ? "var(--sun-soft)" : "var(--tk-paper)"}" stroke="var(--sun)" stroke-width="${full ? 3 : 2.2}"/>`;
  g += `<g clip-path="url(#${k}c)"><rect x="0" y="6" width="100" height="10" fill="var(--tk-band)"/></g>`;
  g += `<text x="37" y="14" text-anchor="middle" font-size="7.5" fill="#FFFFFF" font-family="Do Hyeon, sans-serif" letter-spacing=".5">실천 복권</text>`;
  g += `<path d="M71 16v40" stroke="var(--sun)" stroke-width="1.3" stroke-dasharray="2.5 2.5"/>`;
  g += `<text x="83" y="13.6" text-anchor="middle" font-size="5.6" fill="#FFFFFF" font-family="IBM Plex Mono, monospace">No.${String(n || 1).padStart(3, "0")}</text>`;
  if (since) g += `<text x="83.5" y="21.6" text-anchor="middle" font-size="5" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${since.slice(5).replace("-", ".")}~</text>`;   // No. 바로 밑
  const nums = luckyNums(n), cols = ["var(--coral)", "var(--blue)", "var(--mint)"];
  const balls = nums.map((v, i) => `<circle cx="${22 + i * 15}" cy="34" r="6.5" fill="${cols[i]}"/><text x="${22 + i * 15}" y="37.5" text-anchor="middle" font-size="9" fill="#FFFFFF" font-family="IBM Plex Mono, monospace" font-weight="600">${v}</text>`).join("");
  if (stage === 2) g += `<path d="M30 16l-6 40M62 18l8 36M4 40l92 -6" stroke="var(--tk-line)" stroke-width="1.2" fill="none"/><path d="M14 30h40M14 40h26" stroke="var(--tk-line)" stroke-width="2.4" stroke-linecap="round"/>`;
  if (stage === 3) g += `<path d="M14 34h46M14 44h30" stroke="var(--tk-line)" stroke-width="2.4" stroke-linecap="round"/>`;
  if (stage === 4) g += balls;
  if (stage >= 5) {
    g += `<rect x="11" y="21" width="53" height="29" rx="5" fill="url(#${k}f)" stroke="var(--tk-foil-lo)" stroke-width="1"/>`;
    g += full ? `<text x="37.5" y="39.5" text-anchor="middle" font-size="12" fill="var(--fg)" font-family="Do Hyeon, sans-serif">긁어요!</text>`
      : `<text x="37.5" y="39" text-anchor="middle" font-size="8" fill="var(--tk-foil-lo)" font-family="Do Hyeon, sans-serif">여기를 긁어요</text>`;
  }
  // 실천 도장: 뜯는 칸 아래쪽 (홈에 안 걸리게)
  if (stage >= 3) g += `<g transform="rotate(-14 83.5 46)"><circle cx="83.5" cy="46" r="8" fill="none" stroke="var(--coral)" stroke-width="1.8"/><circle cx="83.5" cy="46" r="5.6" fill="none" stroke="var(--coral)" stroke-width=".7"/><text x="83.5" y="48.4" text-anchor="middle" font-size="6.3" fill="var(--coral)" font-family="Do Hyeon, sans-serif">실천</text></g>`;
  if (stage === 6) g += `<path d="M-4 22q-6 6 0 13M-9 18q-8 10 0 21M104 22q6 6 0 13M109 18q8 10 0 21" fill="none" stroke="var(--grape)" stroke-width="2" stroke-linecap="round"/>`;
  if (stage >= 7 && !full) g += `<g transform="translate(94 60)"><circle r="11" fill="var(--tk-gold)" stroke="var(--tk-gold-d)" stroke-width="2"/><circle r="7.5" fill="none" stroke="var(--tk-gold-d)" stroke-width="1"/><text y="3.6" text-anchor="middle" font-size="10" fill="#7A4A00" font-weight="700">₩</text></g>`;
  const spark = (x, y, sc) => `<path class="tw" d="M0 -6Q1 -1 6 0Q1 1 0 6Q-1 1 -6 0Q-1 -1 0 -6Z" fill="var(--sun)" transform="translate(${x} ${y}) scale(${sc})"/>`;
  if (stage >= 8) g += spark(6, -4, 1) + spark(98, -6, .8) + spark(50, -10, .7);
  if (full) g += spark(-6, 50, .8);
  return svgVars(g);
}
function ticketSince(L, n) {   // n번째 복권을 모으기 시작한 날
  const need = (n - 1) * PT_TICKET; let sum = 0;
  for (const d of Object.keys(L.day).sort()) { if (!L.day[d].sum) continue; sum += L.day[d].sum; if (n === 1 || sum > need) return n === 1 ? d : d; }
  return null;
}
function lottoStage(L) {   // { stage 1~9, n 몇 번째 복권, left 긁을 장 수, prog, since 시작 날짜 }
  const used = S.wins.size, earned = Math.floor(L.total / PT_TICKET), left = Math.max(0, earned - used), prog = L.total % PT_TICKET;
  const st = left ? { stage: 9, n: used + 1, left, prog } : { stage: Math.min(8, Math.floor(prog / (PT_TICKET / 8)) + 1), n: earned + 1, left, prog };
  st.since = st.stage >= 2 ? ticketSince(L, st.n) : null;
  return st;
}
function paintTicket(el, st) {
  el.innerHTML = ticketSvg(st.stage, st.n, st.since);
  el.classList.remove("tk-w1", "tk-w2", "tk-hop", "tk-glow");
  if (LOTTO_MOVE[st.stage]) el.classList.add(LOTTO_MOVE[st.stage]);
}
function renderPoints() {
  const vis = lottoVisible() && S.loaded;
  ["sideLotto", "topLotto", "ptsBtn", "navCoupons", "helpLotto"].forEach((id) => { $(id).hidden = !vis; });
  if (!vis) return;
  const L = pointsLedger(), used = S.wins.size;
  const earned = Math.floor(L.total / PT_TICKET), left = Math.max(0, earned - used), prog = L.total % PT_TICKET, stage = Math.floor(prog / (PT_TICKET / 8));
  const tst = lottoStage(L);
  ["sideTicket", "topTicket"].forEach((id) => paintTicket($(id), tst));
  $("sideStage").textContent = LOTTO_STAGES[tst.stage - 1];
  $("sidePts").textContent = left ? `긁을 복권 ${left}장!` : `${(PT_TICKET - prog).toLocaleString("ko-KR")}점 남음`;   // 다음 복권까지 남은 점수
  ["sideTickets", "topTickets", "navTickets"].forEach((id) => { $(id).hidden = !left; $(id).textContent = left; });
  $("sideLotto").title = $("topLotto").title = `⭐ 모두 ${L.total.toLocaleString("ko-KR")}점 · 다음 복권까지 ${PT_TICKET - prog}점${left ? ` · 긁을 복권 ${left}장` : ""}`;
  $("ptsBtn").classList.toggle("off", !ptsShown());
  $("ptsBtn").title = ptsShown() ? "달력에 포인트 숨기기" : "달력에 포인트 보이기";
  if ($("pointsDlg").open) renderPointsDlg(L);
}
function ptsShown() { try { return localStorage.getItem("ukjin-pts-show") !== "0"; } catch (e) { return true; } }
function renderPointsDlg(L) {
  L = L || pointsLedger();
  const used = S.wins.size, earned = Math.floor(L.total / PT_TICKET), prog = L.total % PT_TICKET;
  $("ptSub").textContent = `모두 ${L.total.toLocaleString("ko-KR")}점 · 복권 ${earned}장 받음`;
  $("ptHead").innerHTML = `<div class="pt-big">${prog.toLocaleString("ko-KR")} <small class="muted" style="font-size:14px">/ ${PT_TICKET}</small></div>` +
    `<div class="bar"><i style="width:${Math.round(prog / PT_TICKET * 100)}%;background:var(--sun)"></i></div>` +
    `<div class="small muted">다음 복권까지 <b>${PT_TICKET - prog}점</b>${earned - used > 0 ? ` · 긁을 복권 <b>${earned - used}장</b>` : ""}</div>`;
  const ds = Object.keys(L.day).filter((d) => L.day[d].sum).sort().reverse();
  $("ptList").innerHTML = ds.length ? ds.map((d) => `<div class="pt-day"><span>${esc(shortDate(d))}</span><b>+${L.day[d].sum}</b><span>${L.day[d].lines.map((x) => `${x[0]} ${esc(x[1])} +${x[2]}`).join(" · ")}</span></div>`).join("")
    : '<div class="small muted">아직 받은 포인트가 없어요.</div>';
}
function renderDayPts(d) {
  const sec = $("dayPtsSec"), x = lottoVisible() && pointsLedger().day[d];
  sec.hidden = !(x && x.sum);
  if (x && x.sum) $("dayPts").innerHTML = x.lines.map((l) => `<div><span>${l[0]} ${esc(l[1])}</span><b>+${l[2]}</b></div>`).join("") + `<div><span><b style="color:var(--fg)">합계</b></span><b>+${x.sum}</b></div>`;
}

// ---------- 설명서: 사용 설명서 · 업데이트 내역, 새 버전이면 한 번 알려 주기 ----------
const NEWS_KEY = "ukjin-news-seen";
function newsSeen() { try { return localStorage.getItem(NEWS_KEY) || ""; } catch (e) { return ""; } }
function chgHtml(list) { return list.map((c) => `<div class="chg-date">${esc(c.date.replace(/-/g, "."))}</div><ul>${c.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`).join(""); }
function renderHelp() {
  const tab = ui.helpTab || "guide";
  document.querySelectorAll("#helpSeg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === tab)));
  $("helpGuide").hidden = tab !== "guide"; $("helpChanges").hidden = tab !== "changes";
  $("helpChanges").innerHTML = chgHtml(CHANGES);
  $("newsBadge").hidden = !CHANGES.length || newsSeen() >= CHANGES[0].date;
}
function markNewsSeen() { try { localStorage.setItem(NEWS_KEY, CHANGES[0].date); } catch (e) { /* 무시 */ } renderHelp(); }
function maybeShowNews() {
  const seen = newsSeen(); if (!CHANGES.length || seen >= CHANGES[0].date) return;
  // 처음 여는 기기는 가장 최근 묶음만, 아니면 못 본 것 (최대 3일치)
  $("nwBody").innerHTML = chgHtml(seen ? CHANGES.filter((c) => c.date > seen).slice(0, 3) : CHANGES.slice(0, 1));
  openDlg($("newsDlg"));
}

// ---------- 실천한 일: 🔥 누르면 편집/삭제 묻기, 글자 누르면 편집 창 ----------
let logFor = null;
function logLabel(l) { return [l.minutes ? fmtHM(l.minutes) : "", l.text || ""].filter(Boolean).join(" · ") || "기록"; }
function askLog(id) {
  const l = S.logs.get(id); if (!l) return;
  moveFor = null; logFor = id;
  $("mvTitle").textContent = "🔥 실천한 일";
  $("mvText").innerHTML = `<p><b>${esc(logLabel(l))}</b> <span class="muted">(${shortDate(l.date)})</span></p><p class="small muted">이 기록을 고치거나 지울 수 있어요.</p>`;
  $("mvBtns").innerHTML = '<button class="btn" type="button" data-act="logEditGo">편집하기</button><button class="btn ghost danger-txt" type="button" data-act="logDelGo">삭제하기</button><button class="btn ghost" type="button" data-act="mvClose">취소</button>';
  openDlg($("moveDlg"));
}
function openLog(id) {
  const l = S.logs.get(id); if (!l) return;
  logFor = id;
  $("lgDate").value = l.date || today(); setMinInput("lgMin", l.minutes); $("lgText").value = l.text || "";
  openDlg($("logDlg"));
}
function delLog(id) {
  const l = S.logs.get(id); if (!l || !ready()) return;
  const x = l.taskId && S.tasks.get(l.taskId), saved = logCopies([{ id, ...l }]);
  act(backend.remove("logs", id)).then(() => toastUndo(x ? "시간 기록을 지웠어요. (할 일 체크는 그대로)" : "실천한 일을 지웠어요.", () => backend.add("logs", saved[0]))).catch(() => {});
}

// ---------- 할 일 편집 작은 창 ----------
const tk = { id: null, rep: "none", days: new Set() };
function openTask(id) {
  const x = S.tasks.get(id); if (!x) return;
  tk.id = id; tk.rep = isRep(x) ? x.repeat : "none"; tk.days = new Set(x.days || [parseYmd(x.start || x.date || today()).getDay()]);
  $("tkTitle").value = x.title || "";
  $("tkDate").value = (isRep(x) ? x.start : x.date) || today();
  $("tkEnd").value = x.end || "";
  $("tkDone").checked = !!x.done;
  setMinInput("tkMin", x.done ? taskMinutes(id, x.doneDate) : 0);
  setMinInput("tkPlan", x.minutes);
  const sel = $("tkGoal");
  sel.innerHTML = '<option value="">없음</option>' + rows(S.goals).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).map((g) => `<option value="${esc(g.id)}">${esc(g.title)}</option>`).join("");
  sel.value = x.goalId && S.goals.has(x.goalId) ? x.goalId : "";
  fillSubSelect("tkSubGoal", "tkSubWrap", sel.value, x.subId);
  const del = $("tkDel"); del.classList.remove("armed"); del.textContent = "삭제"; delete del.dataset.armed;
  renderTaskForm(); openDlg($("taskDlg"));
}
function renderTaskForm() {
  document.querySelectorAll("#tkRepSeg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === tk.rep)));
  $("tkDays").hidden = tk.rep !== "weekly";
  $("tkDays").innerHTML = [1, 2, 3, 4, 5, 6, 0].map((n) => `<button class="chip" type="button" data-act="tkDay" data-d="${n}" aria-pressed="${tk.days.has(n)}">${DOW[n]}</button>`).join("");
  $("tkDateLabel").firstChild.textContent = tk.rep === "none" ? "날짜" : "시작일";
  $("tkEndLabel").hidden = tk.rep === "none";
  $("tkDoneWrap").hidden = tk.rep !== "none";
  $("tkMinWrap").hidden = tk.rep !== "none" || !$("tkDone").checked;
  const x = S.tasks.get(tk.id);
  $("tkSub").textContent = x ? (isRep(x) ? repeatLabel(x) : shortDate(x.date || today())) : "";
}

// 날짜 작은 창: [할 일] [실천한 일] 두 버튼, 할 일 추가는 한 번/매일/매주 요일
const dt = { tab: "tasks", rep: "none", days: new Set() };
function openDay(d) {
  ui.selDay = d; if (d.slice(0, 7) !== ui.calMonth) ui.calMonth = d.slice(0, 7);
  dt.tab = "tasks"; dt.rep = "none"; dt.days = new Set([parseYmd(d).getDay()]);
  $("dayTaskTitle").value = ""; $("dtGoal").value = ""; setMinInput("dtMin", "");
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
  fillSubSelect("dtSubGoal", "dtSubWrap", sel.value, $("dtSubGoal").value);
}
function renderDaySide() {
  renderDayForm();
  const d = ui.selDay, t = today(), n = diffDays(d, t);
  $("dayTitle").textContent = prettyDate(d);
  $("daySub").textContent = n === 0 ? "오늘" : n > 0 ? `${n}일 뒤` : `${-n}일 전`;
  const exams = rows(S.goals).filter((g) => g.due === d);
  const ts = tasksOn(d);
  const extra = dayExtraItems(d);
  $("dayTasks").innerHTML = exams.map((g) => `<div class="item"><span class="tag cat c-coral">D-DAY</span><div class="body"><div class="title">${esc(g.title)}</div></div></div>`).join("") + extra +
    (ts.length ? ts.map((x) => taskItem(x, d)).join("") : (exams.length || extra ? "" : '<div class="empty">이 날 할 일이 없어요.</div>'));
  renderDayPts(d);
  const ls = rows(S.logs).filter((l) => l.date === d).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  $("dayLogs").innerHTML = ls.length ? ls.map((l) => `<div class="item"><span class="tag mono">${l.minutes ? fmtHM(l.minutes) : "기록"}</span><div class="body" data-act="editLog" data-id="${esc(l.id)}" style="cursor:pointer" title="눌러서 편집"><div class="title">${l.text ? esc(l.text) : '<span class="muted">메모 없음</span>'}</div></div>` +
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
  // 달력 위 요약 4칸 + 달력 아래 목표
  const t = today(), wk = mondayOf(t), list = todayTasks(), days = practiceMinutes();
  const dn = list.filter((x) => isDone(x, t)).length;
  $("todayStats").innerHTML =
    statTile(STAT_ICON.task + "오늘 할 일", `${dn}/${list.length}`, list.length ? (dn === list.length ? "다 끝냈어요!" : "누르면 체크하러 가요") : "아직 없음", "click", "openToday") +
    statTile(STAT_ICON.clock + "오늘 실천", fmtHM(logMinutes(t, t))) +
    statTile(STAT_ICON.week + "이번 주 실천", fmtHM(logMinutes(wk, addDays(wk, 6)))) +
    statTile(STAT_ICON.fire + "연속 실천", streak(days) + "일", "기록이나 완료가 있는 날");
  renderHomeGoals();
}

// ---------- 세부목표: 목표 안 subs {id: {title, due, createdAt}}, 할 일은 subId로 묶음 (진행률은 큰 목표만) ----------
function ddayText(d) { const n = diffDays(d, today()); return n > 0 ? "D-" + n : n === 0 ? "D-DAY" : "D+" + (-n); }
function subsOf(g) {
  return Object.entries((g && g.subs) || {}).filter(([, v]) => v && v.title).map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999") || (a.createdAt || 0) - (b.createdAt || 0));
}
function fillSubSelect(selId, wrapId, goalId, cur) {
  const ss = subsOf(goalId && S.goals.get(goalId));
  $(wrapId).hidden = !ss.length;
  $(selId).innerHTML = '<option value="">없음</option>' + ss.map((v) => `<option value="${esc(v.id)}">${esc(v.title)}</option>`).join("");
  $(selId).value = ss.some((v) => v.id === cur) ? cur : "";
}
// 목록을 세부목표별로 묶어서 (세부목표가 없으면 그냥 목록)
function groupBySub(list, g, item) {
  const ss = subsOf(g); if (!ss.length) return list.map(item).join("");
  let html = "";
  ss.forEach((v) => { const xs = list.filter((x) => x.subId === v.id); if (xs.length) html += `<div class="grp-label">${esc(v.title)}</div>` + xs.map(item).join(""); });
  const rest = list.filter((x) => !ss.some((v) => v.id === x.subId));
  if (rest.length) html += '<div class="grp-label">세부목표 없음</div>' + rest.map(item).join("");
  return html;
}
// 세부목표 달성 네모 (달성하면 🎉)
function subCheck(gid, v) {
  return `<button type="button" class="sub-check${v.doneAt ? " on" : ""}" data-act="subDone" data-id="${esc(gid)}" data-sid="${esc(v.id)}" aria-pressed="${!!v.doneAt}" aria-label="${esc(v.title)} ${v.doneAt ? "달성 취소" : "달성"}">${v.doneAt ? "🎉" : ""}</button>`;
}
function subForm(gid) {
  return `<form class="sub-form" data-gid="${esc(gid)}" autocomplete="off"><input type="text" name="t" maxlength="60" placeholder="세부목표, 예: 필기 합격" aria-label="세부목표 이름">` +
    `<input type="date" name="d" aria-label="날짜 (선택)"><button class="btn small" type="submit">추가</button><button class="btn ghost small" type="button" data-act="subCancel">취소</button></form>`;
}
function sortedGoals() {
  return rows(S.goals).sort((a, b) => {
    if (!!a.due !== !!b.due) return a.due ? -1 : 1;
    if (a.due && b.due && a.due !== b.due) return a.due.localeCompare(b.due);
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
}
// 달력 아래: 목표 → 세부목표 → 할 일 (끝낸 할 일·끝난 반복은 빼고)
function renderHomeGoals() {
  const box = $("homeGoals"), t = today(), tasks = rows(S.tasks).filter((x) => x.title);   // 이름 없는 건 지운 할 일의 남은 조각
  if (!S.loaded) { box.innerHTML = '<div class="muted">불러오는 중…</div>'; return; }
  const live = (x) => isRep(x) ? !(x.end && x.end < t) : !x.done;
  const order = (a, b) => (isRep(b) - isRep(a)) || (a.date || "").localeCompare(b.date || "") || (a.createdAt || 0) - (b.createdAt || 0);
  const item = (x) => taskItem(x, t, !isRep(x) && x.date > t, true);
  const block = (xs) => xs.length ? `<div class="list">${xs.map(item).join("")}</div>` : "";
  let html = sortedGoals().map((g) => {
    const ts = tasks.filter((x) => x.goalId === g.id), once = ts.filter((x) => !isRep(x)), od = once.filter((x) => x.done).length;
    const pct = once.length ? Math.round(od / once.length * 100) : 0, show = ts.filter(live).sort(order), ss = subsOf(g);
    let body = "";
    ss.forEach((v) => {
      const xs = show.filter((x) => x.subId === v.id);
      body += `<div class="hsub${v.doneAt ? " done" : ""}"><div class="hsub-head"><span>${subCheck(g.id, v)}<b>${esc(v.title)}</b></span>` +
        (v.doneAt ? `<span class="small muted">🎉 ${shortDate(v.doneAt)} 달성</span>` : v.due ? `<span class="mono small muted">${ddayText(v.due)} · ${shortDate(v.due)}</span>` : "") + "</div>" +
        (xs.length ? block(xs) : '<div class="small muted hsub-empty">아직 할 일이 없어요</div>') + "</div>";
    });
    const rest = show.filter((x) => !ss.some((v) => v.id === x.subId));
    if (rest.length) body += `<div class="hsub">${ss.length ? '<div class="hsub-head"><b class="muted">세부목표 없음</b></div>' : ""}${block(rest)}</div>`;
    return `<div class="hgoal ${catCls(g)}${g.achievedAt ? " achieved" : ""}"><div class="hgoal-head" data-act="openGoal" data-id="${esc(g.id)}" role="button" tabindex="0" title="눌러서 목표 편집">` +
      `<div class="hgoal-title"><b>${esc(g.title)}</b>${g.achievedAt ? `<span class="ach-badge">🎉 ${shortDate(g.achievedAt)} 달성</span>` : g.due ? `<span class="dd mono">${ddayText(g.due)}</span>` : ""}</div>` +
      `<div class="hgoal-prog"><div class="bar"><i style="width:${pct}%"></i></div><span class="small muted mono">할 일 ${od}/${once.length}</span></div></div>` +
      body + (ui.subFor === g.id ? subForm(g.id) : `<button class="link-btn hsub-add" type="button" data-act="subAdd" data-id="${esc(g.id)}">＋ 세부목표</button>`) + "</div>";
  }).join("");
  const free = tasks.filter((x) => (!x.goalId || !S.goals.has(x.goalId)) && live(x)).sort(order);
  if (free.length) html += `<div class="hgoal"><div class="hgoal-title"><b class="muted">목표 없는 할 일</b></div>${block(free)}</div>`;
  box.innerHTML = html || '<div class="empty">아직 목표가 없어요. ＋ 목표로 추가해요.</div>';
  const hc = $("hgCat"); if (!hc.options.length) { hc.innerHTML = GOAL_CATS.map((c) => `<option>${c}</option>`).join(""); hc.value = "자격증"; }
}

function renderGoals() {
  const t = today(), weekAgo = addDays(t, -6), allTasks = rows(S.tasks);
  const gs = sortedGoals();
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
        `<div><span class="tag">${esc(g.cat || "기타")}</span>${g.achievedAt ? ` <span class="ach-badge">🎉 ${shortDate(g.achievedAt)} 달성</span>` : ""}</div><div class="goal-title">${esc(g.title)}</div></div>${dd}</div>` +
        (subsOf(g).length ? `<div class="small muted">세부목표 · ${subsOf(g).map((v) => esc(v.title)).join(" · ")}</div>` : "") +
        `<div style="display:grid;gap:4px"><div class="bar"><i style="width:${pct}%"></i></div>` +
        `<div class="small muted">할 일 <span class="mono">${onceDone}/${once.length}</span> 완료` +
        (habits.length ? ` · 반복하는 일 ${habits.length}개, 최근 7일 <span class="mono">${hits}</span>회` : "") +
        ` · 누적 <span class="mono">${fmtHM(mins)}</span></div></div>` +
        `<div class="goal-foot"><span>누르면 할 일·반복 설정</span><span aria-hidden="true">›</span></div></article>`;
    }).join("");
  const gc = $("goalCat"), v = gc.value || "자격증";
  gc.innerHTML = GOAL_CATS.map((c) => `<option>${c}</option>`).join(""); gc.value = v;
}

// 지운 목표에 딸려 있던 할 일 (예전 버전은 목표를 지워도 할 일이 남았음)
function orphanTasks() { return rows(S.tasks).filter((x) => x.goalId && !S.goals.has(x.goalId)); }
// 이름 없는 할 일 조각 (지운 할 일에 다른 기기가 체크 같은 걸 늦게 써서 남은 것)
function scrapTasks() { return rows(S.tasks).filter((x) => !x.title); }
function renderOrphanNote() {
  const n = S.loaded ? orphanTasks().filter((x) => x.title).length : 0, k = S.loaded ? scrapTasks().length : 0;
  document.querySelectorAll("[data-orphans]").forEach((box) => {
    box.hidden = !n && !k;
    box.innerHTML = (n ? `<span>지운 목표에 딸려 있던 할 일이 <b>${n}개</b> 남아 있어요.</span><button class="btn small" type="button" data-act="cleanOrphans">모두 지우기</button>` : "") +
      (k ? `<span>지운 할 일의 남은 조각(이름 없음)이 <b>${k}개</b> 있어요.</span><button class="btn small" type="button" data-act="cleanScraps">조각 지우기</button>` : "");
  });
}

// ---------- 목표 작은 창 ----------
const gt = { open: null, rep: "daily", days: new Set([1, 3, 5]) };   // 할 일 추가 폼 상태 (open: "rep" | "once" | null)
function openGoal(id) {
  ui.goalId = id;
  const g = S.goals.get(id); if (!g) return;
  $("geTitle").value = g.title || ""; $("geDue").value = g.due || "";
  $("geCat").innerHTML = GOAL_CATS.map((c) => `<option>${c}</option>`).join(""); $("geCat").value = g.cat || "기타";
  gt.open = null; gt.subOpen = false;
  renderGoalDlg(); openDlg($("goalDlg"));
}
function renderGoalDlg() {
  const d = $("goalDlg"); if (!d.open && !ui.goalId) return;
  const g = ui.goalId && S.goals.get(ui.goalId);
  if (!g) { closeDlg(d); ui.goalId = null; return; }
  const t = today();
  $("gTitle").textContent = g.title;
  const n = g.due ? diffDays(g.due, t) : null;
  $("gSub").textContent = (g.cat || "기타") + (g.due ? ` · ${n > 0 ? "D-" + n : n === 0 ? "D-DAY" : "D+" + (-n)} (${shortDate(g.due)})` : " · 날짜 미정") + (g.achievedAt ? ` · 🎉 ${shortDate(g.achievedAt)} 달성` : "");
  $("gAchieve").innerHTML = g.achievedAt
    ? `<span class="ach-badge">🎉 ${esc(shortDate(g.achievedAt))} 달성</span> <button class="btn ghost small" type="button" data-act="goalAchieve" data-id="${esc(ui.goalId)}">달성 취소</button>`
    : `<button class="btn small" type="button" data-act="goalAchieve" data-id="${esc(ui.goalId)}">🎉 달성!</button>`;
  $("gDlgHead").className = "dlg-head goal-band " + catCls(ui.goalId);
  const ts = rows(S.tasks).filter((x) => x.goalId === ui.goalId);
  const reps = ts.filter(isRep).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const once = ts.filter((x) => !isRep(x)).sort((a, b) => (a.done - b.done) || (a.date || "").localeCompare(b.date || ""));
  $("gRepeats").innerHTML = reps.length ? groupBySub(reps, g, (x) => taskItem(x, t, false, true)) : '<div class="empty">아직 없어요. ＋ 추가를 눌러 매일·매주 하는 일을 넣어요.</div>';
  $("gTasks").innerHTML = once.length ? groupBySub(once, g, (x) => taskItem(x, t, !x.done && x.date > t, true)) : '<div class="empty">아직 없어요.</div>';
  // 세부목표: 바로 고치기 (이름·날짜 바꾸면 저장)
  const ss = subsOf(g);
  $("gSubs").innerHTML = ss.map((v) => `<div class="sub-row${v.doneAt ? " done" : ""}">${subCheck(ui.goalId, v)}<input type="text" value="${esc(v.title)}" maxlength="60" data-sub="title" data-sid="${esc(v.id)}" aria-label="세부목표 이름">` +
    `<input type="date" value="${esc(v.due || "")}" data-sub="due" data-sid="${esc(v.id)}" aria-label="세부목표 날짜"><button class="icon-btn" type="button" data-act="delSub" data-sid="${esc(v.id)}">삭제</button></div>`).join("") +
    (gt.subOpen ? `<div style="margin-top:8px">${subForm(ui.goalId)}</div>` : ss.length ? "" : '<p class="small muted" style="margin:0">예: 필기 합격, 실기 합격. 할 일을 세부목표별로 묶을 수 있어요.</p>');
  // 추가 폼: ＋ 누른 칸 바로 아래에 열림
  const f = $("goalTaskForm"), rep = gt.open === "rep";
  f.hidden = !gt.open;
  if (gt.open) {
    const sec = $(rep ? "gRepSec" : "gOnceSec"); if (sec.nextElementSibling !== f) sec.after(f);
    $("gtHead").textContent = rep ? "반복하는 일 추가" : "할 일 추가";
    fillSubSelect("gtSubGoal", "gtSubWrap", ui.goalId, $("gtSubGoal").value);
    $("gtRepSeg").hidden = !rep;
    document.querySelectorAll("#gtRepSeg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === gt.rep)));
    $("gtDays").hidden = !rep || gt.rep !== "weekly";
    $("gtDays").innerHTML = [1, 2, 3, 4, 5, 6, 0].map((n) => `<button class="chip" type="button" data-act="gtDay" data-d="${n}" aria-pressed="${gt.days.has(n)}">${DOW[n]}</button>`).join("");
    $("gtDateLabel").firstChild.textContent = rep ? "시작일" : "날짜";
    $("gtEndLabel").hidden = !rep;
    const quick = [[addDays($("gtDate").value || t, 27), "4주"], [addDays($("gtDate").value || t, 55), "8주"]];
    if (g.due) quick.unshift([g.due, `목표일 ${shortDate(g.due)}`]);
    $("gtEndQuick").hidden = !rep;
    $("gtEndQuick").innerHTML = quick.map(([d, l]) => `<button class="chip" type="button" data-act="gtEnd" data-d="${d}" aria-pressed="${$("gtEnd").value === d}">${esc(l)}까지</button>`).join("") +
      `<button class="chip" type="button" data-act="gtEnd" data-d="" aria-pressed="${!$("gtEnd").value}">계속</button>`;
  }
  $("gDelBtn").dataset.id = ui.goalId;
  const c = g.cert && CERTS.find((z) => z.name === g.cert);
  $("gTemplate").hidden = !(c && c.tasks);
  if (c && c.tasks) $("gTemplate").innerHTML = `<button class="btn ghost small" type="button" data-act="addTemplate">추천 할 일 ${c.tasks.length}개 넣기</button><span class="small muted">${esc(c.tasks.map((z) => z.t).slice(0, 3).join(", "))} 등</span>`;
}

// ---------- 한 달 예산: settings.budgets[월] = { income, items: {id: {cat, amount, createdAt}} } ----------
// 쓸 돈을 분류별로 미리 정해 두면, 예상 수입에서 빼서 여자친구에게 줄 수 있는 돈이 얼마쯤인지 보임
// 예산이 없는 달은 그 전 가장 가까운 달 예산을 그대로 이어서 씀 (고치는 순간 그 달 것으로 저장)
function planSource(m) {
  const all = S.settings.budgets || {};
  if (all[m]) return m;
  const ks = Object.keys(all).filter((k) => k < m && all[k]).sort();
  return ks.length ? ks[ks.length - 1] : null;
}
function planOf(m) {
  const src = planSource(m), b = (src && S.settings.budgets[src]) || {};
  const items = Object.entries(b.items || {}).filter(([, v]) => v && v.cat).map(([id, v]) => ({ id, ...v }))
    .sort((a, b2) => (a.createdAt || 0) - (b2.createdAt || 0));
  return { income: Number(b.income) || 0, items, total: items.reduce((t, v) => t + (Number(v.amount) || 0), 0), from: src && src !== m ? src : null };
}
function savePlan(m, patch, msg) {
  if (!ready()) return Promise.resolve();
  const pl = planOf(m);
  if (pl.from) {   // 이어서 쓰던 예산을 이 달 것으로 옮겨 적고 바꿀 칸만 덮어씀
    const base = { income: pl.income, items: {} };
    pl.items.forEach((v) => { base.items[v.id] = { cat: v.cat, amount: Number(v.amount) || 0, createdAt: v.createdAt || Date.now() }; });
    patch = deepMerge(base, patch);
  }
  return act(backend.saveSettingsDeep({ budgets: { [m]: patch } }), msg).catch(() => {});
}
function renderPlan(m, r) {
  const pl = planOf(m), give = pl.income - pl.total;
  $("planSub").textContent = pl.from
    ? `${monthLabel(m)} · ${monthLabel(pl.from)} 예산을 이어서 쓰는 중 (고치면 이 달 것만 바뀌어요)`
    : `${monthLabel(m)} · 쓸 돈을 분류별로 정해 두는 곳 (다음 달로 그대로 이어져요)`;
  $("planTiles").innerHTML =
    `<div class="plan-tile"><span>예상 수입</span><b>${won(pl.income)}</b><small>${r.inc ? `실제 ${won(r.inc)}` : "아래에 넣어요"}</small></div>` +
    `<div class="plan-tile"><span>쓸 돈 (예산)</span><b>${won(pl.total)}</b><small>${pl.items.length ? `실제 ${won(r.exp)} 씀` : "분류별로 추가해요"}</small></div>` +
    `<div class="plan-tile give${give < 0 ? " minus" : ""}"><span>${esc(partner())}에게 줄 돈 (예상)</span><b>${pl.income ? won(give) : "-"}</b><small>${r.out ? `실제 ${won(r.out)} 보냄` : "예상 수입 − 쓸 돈"}</small></div>`;
  if (document.activeElement !== $("planIncome")) $("planIncome").value = pl.income || "";
  const planned = new Set(pl.items.map((v) => v.cat));
  const extra = Object.entries(r.byCat).filter(([c]) => !planned.has(c)).reduce((t, [, v]) => t + v, 0);
  $("planRows").innerHTML = pl.items.map((v) => {
    const used = r.byCat[v.cat] || 0, amt = Number(v.amount) || 0, over = used > amt;
    return `<div class="plan-row"><span class="plan-cat">${esc(v.cat)}</span>` +
      `<input type="number" min="0" step="1" inputmode="numeric" value="${amt || ""}" data-plan-amt="${esc(v.id)}" aria-label="${esc(v.cat)} 예산">` +
      `<div class="plan-use"><div class="bar${over ? " over" : ""}"><i style="width:${amt ? Math.min(100, Math.round(used / amt * 100)) : used ? 100 : 0}%"></i></div>` +
      `<span class="small muted">${won(used)} 씀 · ${over ? `<span class="won minus">${won(used - amt)} 초과</span>` : `<span class="won plus">${won(amt - used)} 남음</span>`}</span></div>` +
      `<button class="icon-btn" type="button" data-act="planDel" data-id="${esc(v.id)}" aria-label="${esc(v.cat)} 예산 빼기">빼기</button></div>`;
  }).join("") + (pl.items.length && extra ? `<div class="plan-row extra"><span class="plan-cat">예산 밖</span><span class="won">${won(extra)}</span><span class="small">예산에 없는 분류로 쓴 돈</span><span></span></div>` : "") +
    (pl.items.length ? "" : '<p class="small muted" style="margin:0">예: 식비 300,000 · 교통·차량 150,000 · 통신 60,000. 분류는 돈 기록의 지출 분류와 같게 쓰면 실제로 쓴 돈이 같이 보여요.</p>');
  $("planCatList").innerHTML = moneyCats("expense").filter((c) => !planned.has(c)).map((c) => `<option value="${esc(c)}">`).join("");
}

function monthTotals(m) {
  const r = { inc: 0, out: 0, exp: 0, byCat: {}, items: [] };
  S.money.forEach((x, id) => {
    if (!x.date || x.date.slice(0, 7) !== m) return;
    const a = Number(x.amount) || 0;
    r.items.push({ id, ...x });
    if (x.kind === "income") r.inc += a;
    else if (x.kind === "transfer") r.out += a;
    else if (x.kind === "expense" || !x.kind) { r.exp += a; r.byCat[x.cat || "기타"] = (r.byCat[x.cat || "기타"] || 0) + a; }
    // move(내 자산끼리 이체)는 수입·지출이 아님
  });
  r.left = r.inc - r.out - r.exp;
  return r;
}
// 자산별 잔액: 시작 잔액 + 들어온 돈 − 나간 돈 (카드는 음수 = 갚을 카드값)
function balances() {
  const b = {};
  S.accounts.forEach((a, id) => { b[id] = Number(a.initial) || 0; });
  S.money.forEach((x) => {
    const amt = Number(x.amount) || 0;
    if (x.kind === "income") { if (x.account in b) b[x.account] += amt; }
    else if (x.kind === "move") { if (x.account in b) b[x.account] -= amt; if (x.toAccount in b) b[x.toAccount] += amt; }
    else if (x.account in b) b[x.account] -= amt;
  });
  return b;
}
const acctName = (id) => !id ? "자산 미지정" : S.accounts.has(id) ? S.accounts.get(id).name : "지운 자산";
const sortedAccts = () => rows(S.accounts).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
const ACCT_ICON = { bank: "🏦", card: "💳", cash: "💵", save: "🐷" };

function renderMoney() {
  const m = ui.month, r = monthTotals(m), bal = balances();
  $("monthLabel").textContent = monthLabel(m);
  $("moneyStats").innerHTML =
    statTile("수입", won(r.inc)) +
    statTile(partner() + "에게 보낸 돈", won(r.out), r.inc ? `수입의 ${Math.round(r.out / r.inc * 100)}%` : "") +
    statTile("지출", won(r.exp), r.inc ? `수입의 ${Math.round(r.exp / r.inc * 100)}%` : "") +
    statTile("남은 돈", won(r.left), r.inc ? `수입의 ${Math.round(r.left / r.inc * 100)}%` : "", r.left < 0 ? "minus" : "plus");

  // 내 자산
  const accts = sortedAccts();
  const total = accts.reduce((s2, a) => s2 + (bal[a.id] || 0), 0);
  const owed = accts.filter((a) => a.type === "card").reduce((s2, a) => s2 + Math.max(0, -(bal[a.id] || 0)), 0);
  $("assetTotal").innerHTML = accts.length ? `총자산 <span class="won ${total < 0 ? "minus" : ""}">${won(total)}</span>${owed ? ` · 갚을 카드값 <span class="won minus">${won(owed)}</span>` : ""}` : "";
  $("acctList").innerHTML = accts.map((a) => {
    const v = bal[a.id] || 0, card = a.type === "card";
    return `<button type="button" class="acct t-${esc(a.type || "bank")}" data-act="editAcct" data-id="${esc(a.id)}">` +
      `<span class="acct-name"><span aria-hidden="true">${ACCT_ICON[a.type] || "🏦"}</span>${esc(a.name)}</span>` +
      `<b class="won ${card ? (v < 0 ? "minus" : "") : v < 0 ? "minus" : ""}">${card ? won(Math.max(0, -v)) : won(v)}</b>` +
      `<small>${card ? "갚을 카드값" : ACCT_TYPES[a.type] || "통장"}</small></button>`;
  }).join("") + (accts.length ? "" : '<p class="muted small" style="margin:0">통장·카드·현금을 추가하면 어디서 쓰고 어디로 들어왔는지 기록하고, 자산마다 잔액을 볼 수 있어요.</p>');

  renderPlan(m, r);

  // 지출 예산·분류 (한 달 예산을 짰으면 그 합계, 아니면 예전 '한 달 지출 예산')
  const planTotal = planOf(m).total;
  const budget = planTotal || Number(S.settings.budget) || 0;
  $("budgetForm").hidden = !!planTotal; $("budgetFromPlan").hidden = !planTotal;
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
  ).join("") : '<div class="muted small">이번 달 지출 기록이 아직 없어요.</div>';

  // 최근 6개월 표
  let trs = "";
  for (let i = 5; i >= 0; i--) {
    const mm = shiftMonth(m, -i), x = monthTotals(mm);
    trs += `<tr class="${mm === m ? "cur" : ""}"><td class="mono">${monthLabel(mm)}</td><td class="num won">${won(x.inc)}</td><td class="num won">${won(x.out)}</td><td class="num won">${won(x.exp)}</td><td class="num won ${x.left < 0 ? "minus" : x.left > 0 ? "plus" : ""}">${won(x.left)}</td></tr>`;
  }
  $("monthTable").innerHTML = `<thead><tr><th>월</th><th class="num">수입</th><th class="num">보낸 돈</th><th class="num">지출</th><th class="num">남은 돈</th></tr></thead><tbody>${trs}</tbody>`;

  renderMoneyForm();

  // 이번 달 내역 (자산별로 걸러 보기)
  $("acctFilter").innerHTML = accts.length ? [["all", "전체"]].concat(accts.map((a) => [a.id, a.name])).map(([k, l]) =>
    `<button class="chip" type="button" data-act="acctFilter" data-k="${esc(k)}" aria-pressed="${ui.acctFilter === k}">${esc(l)}</button>`).join("") : "";
  const items = r.items.filter((x) => ui.acctFilter === "all" || x.account === ui.acctFilter || x.toAccount === ui.acctFilter)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
  $("moneyCount").textContent = items.length ? items.length + "건 · 줄을 누르면 고칠 수 있어요" : "";
  $("moneyTable").innerHTML = !S.loaded ? '<tbody><tr><td class="muted">불러오는 중…</td></tr></tbody>'
    : !items.length ? `<tbody><tr><td class="muted">${monthLabel(m)} 기록이 없어요.</td></tr></tbody>`
    : `<thead><tr><th>날짜</th><th>구분</th><th>분류</th><th>자산</th><th>메모</th><th class="num">금액</th></tr></thead><tbody>` +
      items.map((x) => {
        const kind = x.kind || "expense", sign = kind === "income" ? "+" : kind === "move" ? "" : "-";
        const where = kind === "move" ? `${esc(acctName(x.account))} → ${esc(acctName(x.toAccount))}` : esc(acctName(x.account));
        return `<tr class="clickable${ui.mEdit === x.id ? " cur" : ""}" data-act="editMoney" data-id="${esc(x.id)}"><td class="mono">${shortDate(x.date)}</td>` +
          `<td>${esc(kind === "transfer" ? partner() + "에게" : KIND_LABEL[kind])}</td><td>${esc(kind === "move" ? "-" : x.cat || "")}</td><td>${where}</td><td>${esc(x.memo || "")}</td>` +
          `<td class="num won ${kind === "income" ? "plus" : kind === "move" ? "" : "minus"}">${sign}${won(x.amount)}</td></tr>`;
      }).join("") + "</tbody>";
}

// 돈 기록 폼: 종류에 맞게 자산·분류 칸 바꾸기
function acctOptions(sel, cur, kind) {
  const list = sortedAccts();
  // 수입은 카드로 받을 일이 없으니 카드 빼기
  const ok = list.filter((a) => !(kind === "income" && a.type === "card"));
  sel.innerHTML = '<option value="">선택 안 함</option>' + ok.map((a) => `<option value="${esc(a.id)}">${ACCT_ICON[a.type] || ""} ${esc(a.name)}</option>`).join("") +
    (cur && !ok.some((a) => a.id === cur) ? `<option value="${esc(cur)}">${esc(acctName(cur))}</option>` : "");
  sel.value = cur || "";
}
function lastAcct(kind) { try { return localStorage.getItem("ukjin-lastacct-" + kind) || ""; } catch (e) { return ""; } }
function rememberAcct(kind, id) { try { localStorage.setItem("ukjin-lastacct-" + kind, id || ""); } catch (e) { /* 무시 */ } }
function renderMoneyForm(fill) {
  const k = ui.kind, editing = ui.mEdit && S.money.get(ui.mEdit);
  document.querySelectorAll("#kindSeg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === k)));
  $("mFormTitle").textContent = editing ? "기록 고치기" : "돈 기록하기";
  $("mCancel").hidden = !editing; $("mDelete").hidden = !editing;
  if (!editing) { const d = $("mDelete"); d.classList.remove("armed"); d.textContent = "이 기록 삭제"; delete d.dataset.armed; }
  $("mAcctLabel").textContent = k === "income" ? "들어온 곳" : k === "expense" ? "낸 곳 (카드·통장·현금)" : k === "transfer" ? "보낸 곳" : "보내는 곳";
  $("mToWrap").hidden = k !== "move"; $("mCatWrap").hidden = k === "move";
  const keepAcct = fill ? fill.account : ($("mAcct").value || lastAcct(k));
  acctOptions($("mAcct"), keepAcct, k);
  if (k === "move") acctOptions($("mTo"), fill ? fill.toAccount : ($("mTo").value || lastAcct("moveTo")), k);
  const mc = $("mCat"), want = fill ? fill.cat : mc.value, list = moneyCats(k === "move" ? "expense" : k);
  if (want && !list.includes(want)) list.push(want);
  mc.innerHTML = list.map((c) => `<option>${esc(c)}</option>`).join("");
  if (want && list.includes(want)) mc.value = want;
  $("mHint").textContent = k === "income" ? "월급, 수당 같은 들어온 돈이에요."
    : k === "expense" ? "카드로 냈으면 카드를 고르세요. 카드값은 나중에 '이체'로 통장 → 카드로 적으면 돼요."
    : k === "transfer" ? `${partner()}에게 보낸 돈이에요. 남은 돈에서 빠져요.`
    : "내 자산끼리 옮긴 돈이에요 (통장 → 통장, 통장 → 카드값). 수입·지출로 치지 않아요.";
  $("mSubmit").textContent = editing ? "고친 내용 저장" : { income: "수입 기록", expense: "지출 기록", transfer: "보낸 돈 기록", move: "이체 기록" }[k];
  if (!$("mDate").value) $("mDate").value = today();
}
function editMoney(id) {
  const x = S.money.get(id); if (!x) return;
  ui.mEdit = id; ui.kind = x.kind || "expense";
  $("mAmount").value = x.amount || ""; $("mDate").value = x.date || today(); $("mMemo").value = x.memo || "";
  renderMoneyForm(x); renderMoney();
  $("moneyPanel").scrollIntoView({ behavior: "smooth", block: "start" });
}
function resetMoneyForm() {
  ui.mEdit = null; $("mAmount").value = ""; $("mMemo").value = ""; $("mDate").value = today();
  renderMoney();
}

// ---------- 자산 작은 창 ----------
const ac = { id: null, type: "bank" };
function openAcct(id) {
  const a = id ? S.accounts.get(id) : null;
  ac.id = id || null; ac.type = (a && a.type) || "bank";
  $("acTitle").textContent = a ? "자산 고치기" : "자산 추가";
  $("acName").value = a ? a.name : "";
  $("acInit").value = a ? (ac.type === "card" ? -(Number(a.initial) || 0) : Number(a.initial) || 0) || "" : "";
  const del = $("acDel"); del.hidden = !a; del.classList.remove("armed"); del.textContent = "이 자산 삭제"; delete del.dataset.armed;
  renderAcctForm(); openDlg($("acctDlg"));
}
function renderAcctForm() {
  document.querySelectorAll("#acTypeSeg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === ac.type)));
  const card = ac.type === "card";
  $("acInitLabel").textContent = card ? "지금 남아 있는 카드값 (원)" : "지금 잔액 (원)";
  $("acHint").textContent = card ? "카드로 쓴 지출만큼 카드값이 늘고, 통장 → 카드 '이체'로 갚으면 줄어요." : "앞으로 이 자산으로 들어오고 나간 기록이 잔액에 반영돼요.";
}

// ---------- 분류 편집 ----------
function renderCatEditor() {
  const groups = [["expense", "지출 분류"], ["income", "수입 분류"], ["transfer", "보낸 돈 분류"]];
  $("catEditor").innerHTML = groups.map(([k, label]) =>
    `<div class="dlg-sec"><h4>${label}</h4><div class="chips">` +
    moneyCats(k).map((c, i) => `<span class="chip">${esc(c)} <button class="link-btn" type="button" data-act="catDel" data-k="${k}" data-i="${i}" aria-label="${esc(c)} 지우기">×</button></span>`).join("") +
    `</div><form class="mini-row" data-cat-form="${k}" autocomplete="off"><input type="text" maxlength="12" placeholder="새 분류 이름" aria-label="${label} 추가"><button class="btn small" type="submit">추가</button></form></div>`
  ).join("") + '<div class="dlg-foot"><button class="btn ghost small" type="button" data-act="catReset">기본 분류로 되돌리기</button><span class="small muted">이미 적은 기록의 분류는 바뀌지 않아요.</span></div>';
}
function saveCats(kind, list) {
  if (!ready()) return;
  const all = { income: moneyCats("income"), expense: moneyCats("expense"), transfer: moneyCats("transfer") };
  if (kind) all[kind] = list;
  act(backend.saveSettings({ moneyCats: kind ? all : null }), "분류를 저장했어요.").then(() => { renderCatEditor(); renderMoneyForm(); }).catch(() => {});
}

// ---------- 기능 요청 ----------
const REQ_STATUS = { todo: "요청", doing: "진행 중", done: "완료" };
const REQ_AREAS = ["달력", "목표", "돈 관리", "자격증 찾기", "구글 캘린더", "기타"];
const REQ_NEXT = { todo: "doing", doing: "done", done: "todo" };
function renderRequests() {
  $("reqArea").innerHTML = REQ_AREAS.map((a2) => `<button class="chip" type="button" data-act="reqArea" data-k="${a2}" aria-pressed="${ui.reqArea === a2}">${a2}</button>`).join("");
  const all = rows(S.requests).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const open = all.filter((r) => r.status !== "done");
  const badge = $("reqBadge"); badge.hidden = !open.length; badge.textContent = open.length;
  const counts = { open: open.length, done: all.length - open.length, all: all.length };
  $("reqFilter").innerHTML = [["open", "진행 전·중"], ["done", "완료"], ["all", "전체"]].map(([k, l]) =>
    `<button class="chip" type="button" data-act="reqFilter" data-k="${k}" aria-pressed="${ui.reqFilter === k}">${l} ${counts[k]}</button>`).join("");
  // 메모를 쓰는 중이면 목록을 다시 그리지 않음 (쓰던 칸이 사라지지 않게)
  if (document.activeElement && document.activeElement.dataset && document.activeElement.dataset.reqNote) return;
  const list = all.filter((r) => ui.reqFilter === "all" || (ui.reqFilter === "done" ? r.status === "done" : r.status !== "done"));
  $("reqList").innerHTML = !S.loaded ? '<div class="panel muted">불러오는 중…</div>' : list.length ? list.map((r) => {
    const st = r.status || "todo";
    return `<article class="req st-${st}"><div class="req-head">` +
      `<button class="req-status" type="button" data-act="reqStatus" data-id="${esc(r.id)}" title="눌러서 상태 바꾸기">${REQ_STATUS[st]}</button>` +
      `<span class="tag">${esc(r.area || "기타")}</span><span class="muted small">${r.createdAt ? fmtTime(r.createdAt) : ""}</span>` +
      `<button class="icon-btn" type="button" data-act="del" data-col="requests" data-id="${esc(r.id)}">삭제</button></div>` +
      `<p class="req-text">${esc(r.text || "")}</p>` +
      `<label class="f">메모·답변<textarea data-req-note="${esc(r.id)}" maxlength="1000" rows="2" placeholder="예: 10/12에 넣었어요">${esc(r.note || "")}</textarea></label></article>`;
  }).join("") : `<div class="panel muted">${ui.reqFilter === "done" ? "아직 완료된 요청이 없어요." : "아직 요청이 없어요. 위에 적어 보세요."}</div>`;
}
function requestsText() {
  const open = rows(S.requests).filter((r) => r.status !== "done").sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  if (!open.length) return "";
  return "욱진 실천 보드 기능 요청 (" + today() + ")\n" + open.map((r, i) =>
    `${i + 1}. [${r.area || "기타"}] ${(r.text || "").trim()} (${REQ_STATUS[r.status || "todo"]}${r.createdAt ? ", " + fmtTime(r.createdAt) : ""})${r.note ? "\n   메모: " + r.note.trim() : ""}`).join("\n");
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

let newsChecked = false;
function render() {
  refreshGoalColors(); renderHeader(); renderCalendar(); renderToday(); renderGoals(); renderMoney(); renderCerts(); renderRequests(); renderGoalDlg(); renderOrphanNote(); showMode(); setSync();
  renderHelp(); renderHist(); renderPoints(); renderAdminUi(); renderLottoAdmin(); renderCoupons(); sweepPens(); syncPenTasks(); renderCouponReqs(); renderAdminN();
  if (S.loaded && $("newsDlg").open === false) maybeLottoIntro();
  if (S.loaded && !testMode && !autoTestDone && isAdminDevice() && backend && !sessionReal()) { autoTestDone = true; setTimeout(toggleTestMode, 0); }   // 관리자 기기는 처음부터 테스트 모드
  if (S.loaded && ui.page === "coupons" && !lottoVisible()) { location.hash = "#calendar"; }   // 공개 전엔 쿠폰함 주소로 와도 달력으로 if (!$("searchResults").hidden) renderSearch();
  if (S.loaded && !newsChecked) { newsChecked = true; maybeShowNews(); }
  if ($("settingsDlg").open) renderGcalBox();
}

// ---------- 동작 ----------
const PAGES = ["calendar", "goals", "money", "certs", "requests", "help", "coupons", "lotto"];
function route() {
  const h = location.hash.slice(1); ui.page = PAGES.includes(h) ? h : "calendar"; if (ui.page === "coupons" && S.loaded && !lottoVisible()) ui.page = "calendar";
  if (ui.page === "lotto" && !isAdminDevice()) ui.page = "calendar";   // 복권 관리는 관리자 기기만
  if (ui.page !== "lotto") ui.creqHi = null;
  if (ui.page === "requests" && isAdminDevice()) lsSet("ukjin-req-seen", Date.now());
  if (ui.page === "lotto" && couponReqs().some((r) => (r.status || "new") === "new" && r.at > lsGet("ukjin-creq-seen"))) lsSet("ukjin-la-tab", "reqs");   // 새 요청이 있으면 요청 탭부터
  if (ui.page === "lotto" && laTab() === "reqs") markCreqSeen();
  renderHeader(); renderLottoAdmin(); renderCoupons(); renderCouponReqs(); renderRequests(); renderAdminN(); window.scrollTo(0, 0);
}
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
  if (a === "lock") { if (lockAction) lockAction(); return; }
  if (a === "selDay") {
    if (isPhone()) { ui.selDay = el.dataset.day; renderCalendar(); const p = $("dayPanel"); if (p.getBoundingClientRect().top > innerHeight - 120) p.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    openDay(el.dataset.day); return;
  }
  if (a === "dpAddTask") { openDay(el.dataset.day); return; }
  if (a === "dsMin") { saveTaskTime(+el.dataset.m); return; }
  if (a === "dsSkip") { hideDoneSheet(); return; }
  if (a === "editTask") { openTask(id); return; }
  if (a === "closeTask") { closeDlg($("taskDlg")); return; }
  if (a === "tkRep") { tk.rep = el.dataset.k; renderTaskForm(); return; }
  if (a === "tkDay") { const n = +el.dataset.d; if (tk.days.has(n)) tk.days.delete(n); else tk.days.add(n); renderTaskForm(); return; }
  if (a === "delTask") {
    if (!ready() || !tk.id) return;
    if (el.dataset.armed !== "1") { el.dataset.armed = "1"; el.classList.add("armed"); el.textContent = "정말 삭제?"; return; }
    act(backend.remove("tasks", tk.id), "삭제했어요.").then(() => closeDlg($("taskDlg"))).catch(() => {});
    return;
  }
  if (a === "openDayLogs") { openDay(el.dataset.day); dt.tab = "logs"; renderDayForm(); return; }
  if (a === "dayTab") { dt.tab = el.dataset.k; renderDayForm(); return; }
  if (a === "dtRep") { dt.rep = el.dataset.k; renderDayForm(); return; }
  if (a === "dtDay") { const n = +el.dataset.d; if (dt.days.has(n)) dt.days.delete(n); else dt.days.add(n); renderDayForm(); return; }
  if (a === "closeDay") { closeDlg($("dayDlg")); return; }
  if (a === "openGoal") { if (ev.target.closest("a, button, input, select") && ev.target.closest("[data-act]") !== el) return; openGoal(el.dataset.id); return; }
  if (a === "closeGoal") { closeDlg($("goalDlg")); ui.goalId = null; return; }
  if (a === "gtOpen") {
    gt.open = el.dataset.k; if (gt.rep === "none") gt.rep = "daily";
    $("gtTitle").value = ""; $("gtDate").value = today(); $("gtEnd").value = ""; setMinInput("gtMin", "");
    renderGoalDlg(); $("goalTaskForm").scrollIntoView({ block: "nearest", behavior: "smooth" }); $("gtTitle").focus({ preventScroll: true }); return;
  }
  if (a === "homeGoalOpen") { $("homeGoalForm").hidden = false; $("hgTitle").focus(); return; }
  if (a === "homeGoalClose") { $("homeGoalForm").hidden = true; return; }
  if (a === "subAdd") { ui.subFor = id; renderHomeGoals(); const f = document.querySelector(`#homeGoals .sub-form[data-gid="${id}"] input`); if (f) f.focus(); return; }
  if (a === "gSubOpen") { gt.subOpen = true; renderGoalDlg(); const f = document.querySelector("#gSubs .sub-form input"); if (f) f.focus(); return; }
  if (a === "subCancel") { if (el.closest("#goalDlg")) { gt.subOpen = false; renderGoalDlg(); } else { ui.subFor = null; renderHomeGoals(); } return; }
  if (a === "delSub") {
    if (!ready() || !ui.goalId) return;
    if (el.dataset.armed !== "1") {
      el.dataset.armed = "1"; el.textContent = "정말 삭제?"; el.classList.add("armed");
      setTimeout(() => { if (el.isConnected) { el.dataset.armed = ""; el.textContent = "삭제"; el.classList.remove("armed"); } }, 3000);
      return;
    }
    const sid = el.dataset.sid, gid = ui.goalId, mine = rows(S.tasks).filter((x) => x.goalId === gid && x.subId === sid);
    act((async () => { for (const x of mine) await backend.update("tasks", x.id, { subId: null }); await backend.update("goals", gid, { subs: { [sid]: null } }); })(),
      mine.length ? `세부목표를 지웠어요. 그 할 일 ${mine.length}개는 '세부목표 없음'으로 옮겼어요.` : "세부목표를 지웠어요.").catch(() => {});
    return;
  }
  if (a === "planDel") { const v = planOf(ui.month).items.find((z) => z.id === id); savePlan(ui.month, { items: { [id]: null } }, v ? `${v.cat} 예산을 뺐어요.` : ""); return; }
  if (a === "helpTab") { ui.helpTab = el.dataset.k; if (ui.helpTab === "changes") markNewsSeen(); renderHelp(); return; }
  if (a === "newsClose") { closeDlg($("newsDlg")); markNewsSeen(); return; }
  if (a === "newsAll") { closeDlg($("newsDlg")); markNewsSeen(); ui.helpTab = "changes"; renderHelp(); return; }
  if (a === "mvClose") { closeDlg($("moveDlg")); moveFor = null; logFor = null; histFor = null; fillFor = null; return; }
  if (a === "testMode") { toggleTestMode(); return; }
  if (a === "openLottoAdmin") { openLottoAdmin(); return; }
  if (a === "openScratch") { openScratch(); return; }
  if (a === "cpTab") { try { localStorage.setItem("ukjin-cp-tab", el.dataset.k); } catch (e) { /* 무시 */ } renderCoupons(); renderCouponReqs(); return; }
  if (a === "gmOpen") { openGame(id); return; }
  if (a === "gmLater") { cancelGame(); $("scBtns").innerHTML = scAfterBtns(); toast("쿠폰함에서 나중에 한 판 할 수 있어요."); return; }
  if (a === "gmStop") { stopGame(); return; }
  if (a === "gmClose") { if (game && !game.done) return; closeDlg($("gameDlg")); game = null; return; }
  if (a === "laRename") {
    const patch = {}; lottoItems("coupons").forEach((v) => { if (PRESET_RENAMES[v.title]) patch[v.id] = { title: PRESET_RENAMES[v.title] }; });
    if (Object.keys(patch).length) saveLotto({ coupons: patch }, `💰 제목 ${Object.keys(patch).length}개를 고쳤어요.`); return;
  }
  if (a === "laPreset") {
    if (lottoItems("coupons").length || lottoItems("pens").length) { toast("이미 목록이 있어요."); return; }
    const now = Date.now(), coupons = {}, pens = {};
    PRESET_COUPONS.forEach(([tier, title, days], i) => { coupons["p" + i.toString(36) + now.toString(36)] = { tier, title, days, createdAt: now + i }; });
    PRESET_PENS.forEach(([title, days], i) => { pens["n" + i.toString(36) + now.toString(36)] = { title, days, createdAt: now + i }; });
    saveLotto({ coupons, pens }, `📦 쿠폰 ${PRESET_COUPONS.length}개 · 벌칙 ${PRESET_PENS.length}개를 넣었어요.`); return;
  }
  if (a === "crAdd") {
    const r = couponReqs().find((z) => z.id === id); if (!r) return;
    saveLotto({ reqs: { [id]: { status: "added" } } }, "요청을 '넣었어요'로 표시했어요. 아래 쿠폰 목록에 등급·기한을 정해 넣어 주세요.");
    const f = $("laCouponForm"); f.elements.title.value = r.text.replace(/\s*(쿠폰)?\s*(넣어\s*줘|주세요|해\s*줘)\.?$/, "").trim() || r.text; f.scrollIntoView({ block: "center" }); f.elements.title.focus(); return;
  }
  if (a === "crNo") { saveLotto({ reqs: { [id]: { status: "no" } } }, "거절로 표시했어요."); return; }
  if (a === "crDel") { saveLotto({ reqs: { [id]: null } }, "요청을 지웠어요."); return; }
  if (a === "scReveal") { scratchReveal(); return; }
  if (a === "scAgain") { cancelGame(); closeDlg($("scratchDlg")); setTimeout(openScratch, 150); return; }
  if (a === "scClose") { if (scratch && scratch.committed && !scratch.revealed) scratchReveal(); else { closeDlg($("scratchDlg")); scratch = null; } return; }
  if (a === "liClose") { closeDlg($("lottoIntroDlg")); return; }
  if (a === "cpUse" && S.wins.get(id) && S.wins.get(id).effect === "streak") { openFill(id); return; }
  if (a === "fillDo") {
    const fid = fillFor, w = fid && S.wins.get(fid), d = el.dataset.day; fillFor = null; closeDlg($("moveDlg"));
    if (!w || w.usedAt || !ready()) return;
    act(backend.update("wins", fid, { usedAt: t, fillDate: d }), `🛡️ ${shortDate(d)}, 실천한 날로 채웠어요! (↶로 되돌릴 수 있어요)`).catch(() => {}); return;
  }
  if (a === "goCoupons") { if ($("dayDlg").open) closeDlg($("dayDlg")); location.hash = "#coupons"; return; }
  if (a === "cpUse") { const w = S.wins.get(id); if (!w || !ready()) return; act(backend.update("wins", id, { usedAt: t }), `🎉 '${w.title}' 쿠폰을 썼어요! (↶로 되돌릴 수 있어요)`).catch(() => {}); return; }
  if (a === "penDone") { penDone(id); return; }
  if (a === "laEff") { const v = (lotto().coupons || {})[id]; if (!v) return; saveLotto({ coupons: { [id]: { effect: v.effect === "streak" ? null : "streak" } } }, v.effect === "streak" ? "🛡️ 효과를 껐어요." : "🛡️ 연속일 채우기 쿠폰으로 바꿨어요."); return; }
  if (a === "goReqs") { location.hash = "#requests"; return; }
  if (a === "goCreqs") { lsSet("ukjin-la-tab", "reqs"); if (ui.page === "lotto") { markCreqSeen(); renderLottoAdmin(); renderCouponReqs(); } else location.hash = "#lotto"; closeMenu(); return; }
  if (a === "laTab") { lsSet("ukjin-la-tab", el.dataset.k); if (el.dataset.k === "reqs") markCreqSeen(); renderLottoAdmin(); renderCouponReqs(); return; }
  if (a === "laFilter") { ui.laTier = el.dataset.k; renderLottoAdmin(); return; }
  if (a === "laDel") {
    if (el.dataset.armed !== "1") { el.dataset.armed = "1"; el.classList.add("armed"); el.textContent = "정말?"; setTimeout(() => { if (el.isConnected) { el.dataset.armed = ""; el.classList.remove("armed"); el.textContent = "삭제"; } }, 3000); return; }
    saveLotto({ [el.dataset.k]: { [id]: null } }, "지웠어요."); return;
  }
  if (a === "laToggleOn") {
    const on = lottoOn(), cs = lottoItems("coupons"), ps = lottoItems("pens");
    if (!on && (!["big", "mid", "small"].every((k) => cs.some((v) => v.tier === k)) || !ps.length)) { toast("쿠폰을 등급마다 하나 이상, 벌칙도 하나 이상 넣어 주세요."); return; }
    const sum = Object.values(lottoOdds()).reduce((t, v) => t + (Number(v) || 0), 0);
    if (!on && sum !== 100) { toast("확률 합계를 100으로 맞춰 주세요."); return; }
    saveLotto({ on: !on }, on ? "다시 숨겼어요. 관리자 기기에서만 보여요." : "🎉 욱진이에게 공개했어요!"); return;
  }
  if (a === "testPts") { testBonus += PT_TICKET; render(); toast("🧪 테스트 포인트 +1000점"); return; }
  if (a === "adminOff") { setAdminDevice(false); toast("이 기기에서 관리자를 껐어요."); return; }
  if (a === "adminChange") { const f = $("adminChangeForm"); if (f) { f.hidden = !f.hidden; } return; }
  if (a === "openPoints") { closeMenu(); if (S.loaded && lottoVisible() && ticketsLeft() > 0) { openScratch(); return; } location.hash = "#coupons"; return; }
  if (a === "openPtsDlg") { renderPointsDlg(); openDlg($("pointsDlg")); return; }
  if (a === "ptClose") { closeDlg($("pointsDlg")); return; }
  if (a === "ptsToggle") { try { localStorage.setItem("ukjin-pts-show", ptsShown() ? "0" : "1"); } catch (e) { /* 무시 */ } renderCalendar(); renderPoints(); toast(ptsShown() ? "달력에 포인트를 보여요." : "달력에서 포인트를 숨겼어요."); return; }
  if (a === "goalAchieve") {
    if (!ready()) return; const g = S.goals.get(id); if (!g) return;
    act(backend.update("goals", id, { achievedAt: g.achievedAt ? null : t }), g.achievedAt ? "달성 표시를 풀었어요." : `🎉 '${g.title}' 목표 달성! 축하해요!`).catch(() => {});
    return;
  }
  if (a === "subDone") {
    if (!ready()) return; const g = S.goals.get(id), v = g && subsOf(g).find((z) => z.id === el.dataset.sid); if (!v) return;
    act(backend.update("goals", id, { subs: { [v.id]: { doneAt: v.doneAt ? null : t } } }), v.doneAt ? "달성 표시를 풀었어요." : `🎉 '${v.title}' 달성!`).catch(() => {});
    return;
  }
  if (a === "histUndo") { askHist("undo"); return; }
  if (a === "histRedo") { askHist("redo"); return; }
  if (a === "histDo") { histApply(); return; }
  if (a === "searchClear") { $("calSearch").value = ""; renderSearch(); $("calSearch").focus(); return; }
  if (a === "searchMoney") { const m = S.money.get(id); if (!m) return; ui.month = m.date.slice(0, 7); location.hash = "#money"; setTimeout(() => editMoney(id), 60); return; }
  if (a === "logFire") { askLog(id); return; }
  if (a === "editLog") { openLog(id); return; }
  if (a === "logEditGo") { closeDlg($("moveDlg")); openLog(logFor); return; }
  if (a === "logDelGo") { closeDlg($("moveDlg")); delLog(logFor); logFor = null; return; }
  if (a === "lgClose") { closeDlg($("logDlg")); logFor = null; return; }
  if (a === "lgDel") {
    if (el.dataset.armed !== "1") { el.dataset.armed = "1"; el.classList.add("armed"); el.textContent = "정말 삭제?"; setTimeout(() => { el.dataset.armed = ""; el.classList.remove("armed"); el.textContent = "삭제"; }, 3000); return; }
    el.dataset.armed = ""; el.classList.remove("armed"); el.textContent = "삭제";
    closeDlg($("logDlg")); delLog(logFor); logFor = null; return;
  }
  if (a === "mvDo") { doMove(el.dataset.k); return; }
  if (a === "addMin") { const k = el.dataset.for; setMinInput(k, (parseInt($(k).value, 10) || 0) + 30); return; }
  if (a === "setMin") { const k = el.dataset.for, m = +el.dataset.m; setMinInput(k, (parseInt($(k).value, 10) || 0) === m ? "" : m); return; }
  if (a === "gtClose") { gt.open = null; renderGoalDlg(); return; }
  if (a === "gtEnd") { $("gtEnd").value = el.dataset.d; renderGoalDlg(); return; }
  if (a === "gtRep") { gt.rep = el.dataset.k; renderGoalDlg(); return; }
  if (a === "gtDay") { const n = +el.dataset.d; if (gt.days.has(n)) gt.days.delete(n); else gt.days.add(n); renderGoalDlg(); return; }
  if (a === "calMonth") { ui.calMonth = shiftMonth(ui.calMonth, +el.dataset.d); renderCalendar(); return; }
  if (a === "calToday") { ui.calMonth = today().slice(0, 7); ui.selDay = today(); renderCalendar(); return; }
  if (a === "month") { ui.month = shiftMonth(ui.month, +el.dataset.d); renderMoney(); return; }
  if (a === "kind") { ui.kind = el.dataset.k; if (!ui.mEdit) { $("mAcct").value = ""; $("mTo").value = ""; } renderMoneyForm(); return; }
  if (a === "editMoney") { editMoney(id); return; }
  if (a === "reqArea") { ui.reqArea = el.dataset.k; renderRequests(); return; }
  if (a === "reqFilter") { ui.reqFilter = el.dataset.k; renderRequests(); return; }
  if (a === "reqStatus") { if (!ready()) return; const r = S.requests.get(id); if (r) act(backend.update("requests", id, { status: REQ_NEXT[r.status || "todo"] })).catch(() => {}); return; }
  if (a === "copyReqs") {
    const text = requestsText();
    if (!text) { toast("열린 요청이 없어요."); return; }
    const done = () => toast("복사했어요. Claude와 대화할 때 붙여넣으면 돼요.");
    const fallback = () => { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); done(); } catch (e) { toast("복사하지 못했어요."); } ta.remove(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    return;
  }
  if (a === "mCancel") { resetMoneyForm(); return; }
  if (a === "mDelete") {
    if (!ready() || !ui.mEdit) return;
    if (el.dataset.armed !== "1") { el.dataset.armed = "1"; el.classList.add("armed"); el.textContent = "정말 삭제?"; return; }
    act(backend.remove("money", ui.mEdit), "삭제했어요.").then(resetMoneyForm).catch(() => {});
    return;
  }
  if (a === "acctFilter") { ui.acctFilter = el.dataset.k; renderMoney(); return; }
  if (a === "newAcct") { openAcct(null); return; }
  if (a === "editAcct") { openAcct(id); return; }
  if (a === "closeAcct") { closeDlg($("acctDlg")); return; }
  if (a === "acType") { ac.type = el.dataset.k; renderAcctForm(); return; }
  if (a === "delAcct") {
    if (!ready() || !ac.id) return;
    if (el.dataset.armed !== "1") { el.dataset.armed = "1"; el.classList.add("armed"); el.textContent = "정말 삭제? (기록은 남아요)"; return; }
    act(backend.remove("accounts", ac.id), "자산을 지웠어요.").then(() => closeDlg($("acctDlg"))).catch(() => {});
    return;
  }
  if (a === "editCats") { renderCatEditor(); openDlg($("catDlg")); return; }
  if (a === "closeCats") { closeDlg($("catDlg")); return; }
  if (a === "catDel") { const list = moneyCats(el.dataset.k); list.splice(+el.dataset.i, 1); if (!list.length) { toast("분류는 하나 이상 있어야 해요."); return; } saveCats(el.dataset.k, list); return; }
  if (a === "catReset") { saveCats(null); return; }
  if (a === "openToday") { openDay(today()); return; }
  if (a === "certTag") { ui.certTag = el.dataset.t; renderCerts(); return; }

  if (a === "toggle") {
    if (!ready()) return;
    const x = S.tasks.get(id); if (!x) return;
    if (x.penId) {   // 😈 벌칙 할 일: 체크 = 벌칙 한 장 하기 (풀기는 쿠폰함·↶에서)
      if (x.done) { toast("끝낸 벌칙이에요. 잘못 눌렀으면 ↶ 되돌리기를 써요."); return; }
      if (!S.wins.get(x.penId)) { toast("이 벌칙은 쿠폰함에 없어요."); return; }
      penDone(x.penId); return;
    }
    if (!isRep(x) && !x.done && x.date && x.date !== t) { openMove(id); return; }   // 지난 일·앞으로 할 일을 오늘 체크 → 어떻게 할지 묻기
    if (isRep(x) && el.dataset.day && el.dataset.day < t && !isDone(x, el.dataset.day)) { openMove(id, el.dataset.day); return; }   // 반복하는 일의 지난 날
    if (!isRep(x) && x.done && (x.lateFrom || x.earlyFrom)) {   // 옮겨서 체크했던 걸 풀면 원래 날짜로 돌려놓기
      const back = x.lateFrom || x.earlyFrom, old = taskLogs(id, x.doneDate), saved = logCopies(old);
      const prev = { done: true, doneDate: x.doneDate, date: x.date, lateFrom: x.lateFrom || null, earlyFrom: x.earlyFrom || null };
      act((async () => {
        await backend.update("tasks", id, { done: false, doneDate: null, date: back, lateFrom: null, earlyFrom: null });
        for (const l of old) await backend.remove("logs", l.id);
      })()).then(() => toastUndo(`체크를 풀고 원래 날짜(${shortDate(back)})로 돌려놨어요.`, async () => {
        await backend.update("tasks", id, prev);
        for (const l of saved) await backend.add("logs", l);
      })).catch(() => {});
      hideDoneSheet(); return;
    }
    const day = el.dataset.day && el.dataset.day <= t ? el.dataset.day : t; // 지난 날짜에서 체크하면 그 날 한 걸로
    const nd = !isDone(x, day), doneDay = isRep(x) ? day : (nd ? day : x.doneDate);
    const patch = isRep(x) ? { doneDates: { [day]: nd } } : { done: nd, doneDate: nd ? day : null };
    // 체크를 풀 때: 원래 상태와 같이 지워지는 시간 기록을 챙겨 두고 [되돌리기]로 그대로 복구
    const prev = isRep(x) ? { doneDates: { [day]: true } } : { done: true, doneDate: x.doneDate };
    const old = nd ? [] : taskLogs(id, doneDay), saved = logCopies(old), oldMin = old.reduce((m, l) => m + (Number(l.minutes) || 0), 0);
    act(backend.update("tasks", id, patch)).then(async () => {
      if (nd && x.minutes > 0) { hideDoneSheet(); recordTaskTime(x, id, day, x.minutes, `🔥 ${fmtMin(x.minutes)} 기록했어요.`); }
      else if (nd) showDoneSheet(id, day);
      else {
        hideDoneSheet();
        for (const l of old) await backend.remove("logs", l.id);   // 체크를 풀면 같이 기록한 시간도 지움
        toastUndo(`'${x.title}' 체크를 풀었어요.` + (oldMin ? ` (기록한 ${fmtHM(oldMin)}도 지움)` : ""), async () => {
          await backend.update("tasks", id, prev);
          for (const l of saved) await backend.add("logs", l);
        });
      }
    }).catch(() => {});
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
  if (a === "cleanScraps") {
    if (!ready()) return;
    if (el.dataset.armed !== "1") { el.dataset.armed = "1"; el.classList.add("armed"); el.textContent = "정말 지울까요?"; return; }
    const scraps = scrapTasks(); el.disabled = true;
    act((async () => { for (const x of scraps) await backend.remove("tasks", x.id); })(), `조각 ${scraps.length}개를 지웠어요.`).catch(() => {});
    return;
  }
  if (a === "cleanOrphans") {
    if (!ready()) return;
    if (el.dataset.armed !== "1") { el.dataset.armed = "1"; el.classList.add("armed"); el.textContent = "정말 지울까요?"; return; }
    const orphans = orphanTasks().filter((x) => x.title); el.disabled = true;
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
  if (el.id === "tkGoal") { fillSubSelect("tkSubGoal", "tkSubWrap", el.value, ""); return; }
  if (el.id === "dtGoal") { fillSubSelect("dtSubGoal", "dtSubWrap", el.value, ""); return; }
  if (el.dataset && el.dataset.sub && ui.goalId) {
    if (!ready()) return;
    const v = el.value.trim();
    if (el.dataset.sub === "title" && !v) { toast("세부목표 이름을 적어 주세요."); renderGoalDlg(); return; }
    act(backend.update("goals", ui.goalId, { subs: { [el.dataset.sid]: { [el.dataset.sub]: v || null } } }), "세부목표를 고쳤어요.").catch(() => {});
    return;
  }
  if (el.id === "tkDone") { if (el.checked && !$("tkMin").value && $("tkPlan").value) setMinInput("tkMin", $("tkPlan").value); renderTaskForm(); return; }
  if (el.dataset && el.dataset.act === "due") {
    if (!ready()) return;
    act(backend.update("goals", el.dataset.id, { due: el.value || null }), "목표일을 바꿨어요.").catch(() => {});
  }
});

$("logForm").addEventListener("submit", (ev) => {
  ev.preventDefault();
  if (!ready() || !logFor || !S.logs.get(logFor)) return;
  const minutes = parseInt($("lgMin").value, 10) || 0, text = $("lgText").value.trim();
  if (!minutes && !text) { toast("시간이나 메모 중 하나는 적어 주세요."); return; }
  act(backend.update("logs", logFor, { date: $("lgDate").value || today(), minutes, text }), "실천한 일을 고쳤어요.")
    .then(() => { closeDlg($("logDlg")); logFor = null; }).catch(() => {});
});
$("homeGoalForm").addEventListener("submit", (ev) => {
  ev.preventDefault();
  if (!ready()) return;
  const title = $("hgTitle").value.trim(); if (!title) { toast("목표 이름을 적어 주세요."); return; }
  act(backend.add("goals", { title, cat: $("hgCat").value, due: $("hgDue").value || null, createdAt: Date.now() }), "목표를 추가했어요. ＋ 세부목표로 나눠 봐요.")
    .then(() => { $("hgTitle").value = ""; $("hgDue").value = ""; $("homeGoalForm").hidden = true; }).catch(() => {});
});
document.addEventListener("submit", (ev) => {
  const f = ev.target.closest && ev.target.closest(".sub-form"); if (!f) return;
  ev.preventDefault();
  if (!ready()) return;
  const gid = f.dataset.gid, title = f.elements.t.value.trim(); if (!title) { toast("세부목표 이름을 적어 주세요."); return; }
  const sid = "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  act(backend.update("goals", gid, { subs: { [sid]: { title, due: f.elements.d.value || null, createdAt: Date.now() } } }), "세부목표를 추가했어요.")
    .then(() => { ui.subFor = null; gt.subOpen = false; render(); }).catch(() => {});
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
  const date = $("mDate").value || today(), k = ui.kind;
  const account = $("mAcct").value || null, toAccount = k === "move" ? ($("mTo").value || null) : null;
  if (k === "move" && (!account || !toAccount)) { toast("이체는 보내는 곳과 받는 곳을 골라 주세요."); return; }
  if (k === "move" && account === toAccount) { toast("보내는 곳과 받는 곳이 같아요."); return; }
  const doc = { kind: k, amount, date, cat: k === "move" ? null : $("mCat").value, memo: $("mMemo").value.trim(), account, toAccount };
  rememberAcct(k, account); if (k === "move") rememberAcct("moveTo", toAccount);
  const editing = ui.mEdit && S.money.has(ui.mEdit);
  act(editing ? backend.update("money", ui.mEdit, doc) : backend.add("money", { ...doc, createdAt: Date.now() }), editing ? "고쳤어요." : "기록했어요.")
    .then(() => { if (date.slice(0, 7) !== ui.month) ui.month = date.slice(0, 7); resetMoneyForm(); }).catch(() => {});
});

$("acctForm").addEventListener("submit", (ev) => {
  ev.preventDefault();
  if (!ready()) return;
  const name = $("acName").value.trim(); if (!name) { toast("이름을 적어 주세요."); return; }
  const v = parseInt($("acInit").value, 10) || 0;
  const doc = { name, type: ac.type, initial: ac.type === "card" ? -Math.abs(v) : v };
  act(ac.id ? backend.update("accounts", ac.id, doc) : backend.add("accounts", { ...doc, createdAt: Date.now() }), ac.id ? "자산을 고쳤어요." : "자산을 추가했어요.")
    .then(() => closeDlg($("acctDlg"))).catch(() => {});
});
$("catEditor").addEventListener("submit", (ev) => {
  const f = ev.target.closest("[data-cat-form]"); if (!f) return;
  ev.preventDefault();
  const k = f.dataset.catForm, v = f.querySelector("input").value.trim(); if (!v) return;
  const list = moneyCats(k); if (list.includes(v)) { toast("이미 있는 분류예요."); return; }
  list.push(v); saveCats(k, list);
});

$("planAddForm").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const m = ui.month, cat = $("planCat").value.trim(), amount = parseInt($("planAmt").value, 10) || 0;
  if (!cat) { toast("분류를 적어 주세요. 예: 식비"); return; }
  if (planOf(m).items.some((v) => v.cat === cat)) { toast("이미 있는 분류예요. 금액 칸을 고쳐 주세요."); return; }
  const id = "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  savePlan(m, { items: { [id]: { cat, amount, createdAt: Date.now() } } }, `${cat} 예산을 넣었어요.`).then(() => { $("planCat").value = ""; $("planAmt").value = ""; $("planCat").focus(); });
});
$("planIncome").addEventListener("change", () => savePlan(ui.month, { income: parseInt($("planIncome").value, 10) || 0 }, "예상 수입을 저장했어요."));
$("planRows").addEventListener("change", (ev) => {
  const id = ev.target.dataset && ev.target.dataset.planAmt; if (!id) return;
  savePlan(ui.month, { items: { [id]: { amount: parseInt(ev.target.value, 10) || 0 } } }, "예산을 고쳤어요.");
});
$("budgetForm").addEventListener("submit", (ev) => {
  ev.preventDefault();
  if (!ready()) return;
  act(backend.saveSettings({ budget: parseInt($("budgetIn").value, 10) || 0 }), "예산을 저장했어요.").catch(() => {});
});

$("reqForm").addEventListener("submit", (ev) => {
  ev.preventDefault();
  if (!ready()) return;
  const text = $("reqText").value.trim(); if (!text) return;
  act(backend.add("requests", { text, area: ui.reqArea, status: "todo", note: "", createdAt: Date.now() }), "요청을 남겼어요.")
    .then(() => { $("reqText").value = ""; ui.reqFilter = "open"; }).catch(() => {});
});
// 메모·답변은 입력을 멈추면 저장
let reqNoteTimer = null;
document.addEventListener("input", (ev) => {
  const id = ev.target.dataset && ev.target.dataset.reqNote; if (!id) return;
  clearTimeout(reqNoteTimer);
  reqNoteTimer = setTimeout(() => { if (ready() && S.requests.has(id)) act(backend.update("requests", id, { note: ev.target.value })).catch(() => {}); }, 800);
});

$("dsForm").addEventListener("submit", (ev) => { ev.preventDefault(); saveTaskTime(parseInt($("dsMin").value, 10) || 0); });
$("dsQuick").innerHTML = [30, 60, 90, 120].map((m) => `<button class="chip" type="button" data-act="dsMin" data-m="${m}">${fmtMin(m)}</button>`).join("");

$("taskEditForm").addEventListener("submit", (ev) => {
  ev.preventDefault();
  if (!ready() || !tk.id) return;
  const x = S.tasks.get(tk.id); if (!x) { closeDlg($("taskDlg")); return; }
  const title = $("tkTitle").value.trim(); if (!title) { toast("할 일을 적어 주세요."); return; }
  const date = $("tkDate").value || today(), goalId = $("tkGoal").value || null, minutes = parseInt($("tkPlan").value, 10) || null;
  const subId = goalId ? ($("tkSubGoal").value || null) : null;
  let patch, timeOps = null;
  if (tk.rep === "none") {
    const done = $("tkDone").checked;
    patch = { title, goalId, subId, minutes, repeat: "none", date, done, ...(done ? {} : { lateFrom: null, earlyFrom: null }), doneDate: done ? (x.doneDate || today()) : null, start: null, end: null, days: null, doneDates: null };
    // 걸린 시간: 연결된 실천 기록을 고치거나 만들거나 지움
    const min = parseInt($("tkMin").value, 10) || 0, doneDay = patch.doneDate || x.doneDate;
    const old = x.doneDate ? taskLogs(tk.id, x.doneDate) : [];
    timeOps = async () => {
      for (const l of old) await backend.remove("logs", l.id);
      if (done && min > 0) await backend.add("logs", { date: doneDay, minutes: min, text: title, goalId, taskId: tk.id, createdAt: Date.now() });
    };
  } else {
    if (tk.rep === "weekly" && !tk.days.size) { toast("반복할 요일을 하나 이상 골라 주세요."); return; }
    const end = $("tkEnd").value || null;
    if (end && end < date) { toast("끝나는 날이 시작일보다 빨라요."); return; }
    patch = { title, goalId, subId, minutes, repeat: tk.rep, start: date, end, days: tk.rep === "weekly" ? [...tk.days].sort() : null, date: null, done: null, doneDate: null };
  }
  act((async () => { await backend.update("tasks", tk.id, patch); if (timeOps) await timeOps(); })(), "저장했어요.").then(() => closeDlg($("taskDlg"))).catch(() => {});
});

$("goalEditForm").addEventListener("submit", (ev) => {
  ev.preventDefault();
  if (!ready() || !ui.goalId) return;
  const title = $("geTitle").value.trim(); if (!title) { toast("목표 이름을 적어 주세요."); return; }
  act(backend.update("goals", ui.goalId, { title, cat: $("geCat").value, due: $("geDue").value || null }), "목표를 저장했어요.").catch(() => {});
});
["gtDate", "gtEnd"].forEach((k) => $(k).addEventListener("change", renderGoalDlg));
["gtMin", "dtMin", "tkPlan", "dayLogMin", "lgMin"].forEach(renderMinChips);
$("goalTaskForm").addEventListener("submit", (ev) => {
  ev.preventDefault();
  if (!ready() || !ui.goalId) return;
  const g = S.goals.get(ui.goalId); if (!g) return;
  const title = $("gtTitle").value.trim(); if (!title) { toast("할 일을 적어 주세요."); return; }
  const date = $("gtDate").value || today(), once = gt.open !== "rep", end = $("gtEnd").value;
  const doc = { title, goalId: ui.goalId, subId: $("gtSubGoal").value || null, createdAt: Date.now() }, min = parseInt($("gtMin").value, 10) || 0;
  if (min > 0) doc.minutes = min;
  if (once) Object.assign(doc, { repeat: "none", date, done: false, doneDate: null });
  else {
    if (gt.rep === "weekly" && !gt.days.size) { toast("반복할 요일을 하나 이상 골라 주세요."); return; }
    Object.assign(doc, { repeat: gt.rep, start: date, doneDates: {} });
    if (gt.rep === "weekly") doc.days = [...gt.days].sort();
    if (end && end < date) { toast("끝나는 날이 시작일보다 빨라요."); return; }
    if (end) doc.end = end;
  }
  act(backend.add("tasks", doc), once ? "할 일을 추가했어요." : "반복하는 일을 추가했어요.").then(() => { $("gtTitle").value = ""; setMinInput("gtMin", ""); $("gtTitle").focus(); }).catch(() => {});
});

$("dayTaskForm").addEventListener("submit", (ev) => {
  ev.preventDefault();
  if (!ready()) return;
  const title = $("dayTaskTitle").value.trim(); if (!title) { toast("할 일을 적어 주세요."); return; }
  const goalId = $("dtGoal").value || null, g = goalId && S.goals.get(goalId);
  const doc = { title, goalId, subId: goalId ? ($("dtSubGoal").value || null) : null, createdAt: Date.now() }, min = parseInt($("dtMin").value, 10) || 0;
  if (min > 0) doc.minutes = min;
  if (dt.rep === "none") Object.assign(doc, { repeat: "none", date: ui.selDay, done: false, doneDate: null });
  else {
    if (dt.rep === "weekly" && !dt.days.size) { toast("반복할 요일을 하나 이상 골라 주세요."); return; }
    Object.assign(doc, { repeat: dt.rep, start: ui.selDay, doneDates: {} });
    if (dt.rep === "weekly") doc.days = [...dt.days].sort();
    if (g && g.due && g.due >= ui.selDay) doc.end = g.due;
  }
  act(backend.add("tasks", doc), dt.rep === "none" ? "할 일을 추가했어요." : "반복하는 일을 추가했어요.")
    .then(() => { $("dayTaskTitle").value = ""; setMinInput("dtMin", ""); }).catch(() => {});
});
$("dayLogForm").addEventListener("submit", (ev) => {
  ev.preventDefault();
  if (!ready()) return;
  const min = parseInt($("dayLogMin").value, 10) || 0, text = $("dayLogText").value.trim();
  if (!min && !text) { toast("시간이나 메모 중 하나는 적어 주세요."); return; }
  act(backend.add("logs", { date: ui.selDay, minutes: min, text, goalId: null, createdAt: Date.now() }), "기록했어요.")
    .then(() => { setMinInput("dayLogMin", 0); $("dayLogText").value = ""; }).catch(() => {});
});

document.addEventListener("keydown", (ev) => {
  const el = ev.target;
  if ((ev.key === "Enter" || ev.key === " ") && el.dataset && el.dataset.act === "openGoal") { ev.preventDefault(); openGoal(el.dataset.id); }
  if ((ev.key === "Enter" || ev.key === " ") && el.dataset && el.dataset.act === "selDay") { ev.preventDefault(); openDay(el.dataset.day); }
});
$("goalDlg").addEventListener("close", () => { ui.goalId = null; });

$("certSearch").addEventListener("submit", (ev) => { ev.preventDefault(); ui.certQ = $("certQ").value; ui.certTag = "전체"; renderCerts(); });
$("certQ").addEventListener("input", () => { ui.certQ = $("certQ").value; renderCerts(); });


// 로고 = 강력 새로고침 (폰에는 Ctrl+Shift+R이 없고, 홈 화면 앱엔 주소창도 없음)
// location.reload(true)는 무시되므로: index.html을 HTTP 캐시 건너뛰고 다시 받은 뒤 평범하게 reload → 바뀐 ?v= 따라 js·css도 새로 받음
async function hardReload() {
  if (sync.pending > 0) { toast("저장 중이에요. 잠깐 뒤에 다시 눌러 주세요."); return; }
  toast("새로 받아오는 중…");
  try { if (window.caches) await Promise.all((await caches.keys()).map((k) => caches.delete(k))); } catch (e) { /* 무시 */ }
  try { await fetch(location.pathname, { cache: "reload" }); } catch (e) { /* 오프라인이면 그냥 reload */ }
  history.replaceState(null, "", location.pathname + "#calendar");
  location.reload();
}
document.querySelectorAll(".brand").forEach((b) => b.addEventListener("click", (ev) => { ev.preventDefault(); hardReload(); }));

// ---------- 시작 ----------
route();
render();
if (firebaseConfig && firebaseConfig.databaseURL) {
  $("mainView").hidden = true;
  firebaseStart().catch(() => {
    showNote("Firebase에 연결하지 못했어요. 인터넷 연결과 firebase-config.js 값을 확인해 주세요.", true);
  });
} else {
  backend = wrapHistory(localBackend());
  render();
  if (firebaseConfig) showNote("firebase-config.js에 Realtime Database 주소(databaseURL)를 넣으면 비밀번호로 여는 공유 보드가 돼요. 지금은 이 브라우저에만 저장돼요.");
}

// 자정이 지나면 날짜 갱신
let lastDay = today();
setInterval(() => { if (today() !== lastDay) { lastDay = today(); $("mDate").value = lastDay; render(); } }, 60000);
