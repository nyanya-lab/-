// ↶↷ 되돌리기 · 다시 하기 — 실천 보드(app.js)에서 떼어 낸 코드 (2026-11-12). 보드 쪽 공통 함수·상태는 시작할 때 bindUndo(env)로 받고, 값이 바뀌는 backend 는 E.backend 로 읽음
//   wrapHistory(저장소)로 감싸 두면 저장할 때마다 바뀐 문서의 전·후를 모아 기록(S.history, 최근 30개, 모든 기기 공유)에 넣음. quietly(fn) = 기록에 안 남기고 저장
//   버튼(data-act histUndo·histRedo·histDo)은 app.js 클릭 처리에서 undoAction(a, el, id, t)으로 넘어옴. 확인 창은 보드와 같이 쓰는 #moveDlg

let E = null;
let $, KIND_LABEL, S, act, clearAsk, clone, closeDlg, esc, fmtHM, fmtTime, openDlg, ready, shortDate, toast, won;
export function bindUndo(env) {
  E = env;
  ({ $, KIND_LABEL, S, act, clearAsk, clone, closeDlg, esc, fmtHM, fmtTime, openDlg, ready, shortDate, toast, won } = env);
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
  const g = histGroup; histGroup = null; if (!g || !E.backend) return;
  const after = {};
  g.keys.forEach((k) => { const [c, id] = k.split("|"); const cur = S[c].get(id); after[k] = cur ? clone(cur) : null; });
  if (g.keys.every((k) => sameDoc(g.before[k], after[k]))) return;
  const e = { at: Date.now(), dev: DEV, keys: g.keys, before: g.before, after, undone: false };
  Object.assign(e, histDescribe(e));
  const list = histList().filter((x) => !x.undone).concat([e]).slice(-30);
  S.history = list; renderHist();
  E.backend.saveHistory(list).catch(() => {});
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
    if (a && b && b.shield && !b.fillDate && a.fillDate) return { label: "🛡️ 쿠폰으로 실천 안 한 날 채우기", date: a.fillDate };
    if (a && b && !b.usedAt && a.usedAt) return a.fillDate && !a.shield ? { label: "🛡️ 쿠폰으로 실천 안 한 날 채우기", date: a.fillDate } : { label: `쿠폰 '${d.title}' 쓰기`, date: a.usedAt };
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
  clearAsk(); histFor = { dir, at: e.at };   // clearAsk = 같은 창을 쓰는 다른 물음(옮기기·실천 기록)을 비움
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
        if (doc) await E.backend.set(c, id, doc); else if (S[c].has(id)) await E.backend.remove(c, id);
      }
    })(), `${f.dir === "undo" ? "되돌렸어요" : "다시 했어요"}: ${e.label}`);
  } catch (err) { return; } finally { histApplying = false; }
  e.undone = f.dir === "undo";
  S.history = list; renderHist();
  E.backend.saveHistory(list).catch(() => {});
}
async function quietly(fn) { histApplying = true; try { return await fn(); } finally { histApplying = false; } }   // 되돌리기 기록에 안 남김
function clearHist() { histFor = null; }   // 확인 창을 닫을 때 (app.js mvClose)

// 화면 칸에 거는 것들 (bindUndo 뒤에 한 번)
export function initUndo() {

}

// 버튼 누름 (app.js 클릭 처리에서 넘어옴). 여기서 처리했으면 true
export function undoAction(a, el, id, t) {
  if (a === "histUndo") { askHist("undo"); return true; }
  if (a === "histRedo") { askHist("redo"); return true; }
  if (a === "histDo") { histApply(); return true; }
  return false;
}

export { clearHist, quietly, renderHist, wrapHistory };
