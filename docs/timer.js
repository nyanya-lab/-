// ⏱ 할 일 타이머 — 실천 보드(app.js)에서 떼어 낸 코드 (2026-11-12). 보드 쪽 공통 함수·상태는 시작할 때 bindTimer(env)로 받고, 값이 바뀌는 backend 는 E.backend 로 읽음
//   맨 위 띠(#timerBar) · 끝낼 때 시간 확인 창(#moveDlg) · 기록하고 체크. 시작 버튼(tmStart·tmStartDlg)은 app.js에서 timerStart(id)를 부름
//   그 밖의 버튼(tmPause·tmResume·tmEnd·tmSave·tmDrop)은 app.js 클릭 처리에서 timerAction(a, el, id, t)으로 넘어옴. 1초마다 시계 갱신은 initTimer()에서

let E = null;
let $, APP, S, act, addDays, closeDlg, esc, fmtMin, isDone, isRep, openDlg, pad, ready, shortDate, taskLogs, taskMinutes, toast, today, ymd;
export function bindTimer(env) {
  E = env;
  ({ $, APP, S, act, addDays, closeDlg, esc, fmtMin, isDone, isRep, openDlg, pad, ready, shortDate, taskLogs, taskMinutes, toast, today, ymd } = env);
}
// ---------- ⏱ 할 일 타이머: settings.timer = { taskId, title, start(재는 중이면 시작 ms, 멈추면 null), acc(모은 ms) } ----------
// 한 번에 하나. 보드에 저장해서 폰에서 시작하고 PC에서 끝내도 됨. [■ 끝] → 시간 확인(고칠 수 있음) → 그 할 일을 오늘 그 시간으로 체크 (그날 이미 기록한 시간에 더함)
const TIMER_WARN = 5 * 3600e3;
const timerNow = () => { const tm = S.settings.timer; return tm && tm.taskId ? tm : null; };
const timerMs = (tm) => (Number(tm.acc) || 0) + (tm.start ? Math.max(0, Date.now() - tm.start) : 0);
const fmtClock = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; };
const canTime = (x) => x && !x.noPractice && !x.penId && !x.cardPay;   // 돈·벌칙·카드값 할 일은 타이머 없음
function saveTimer(v, msg) { return act(E.backend.saveSettings({ timer: v }), msg).catch(() => {}); }
function timerStart(id) {
  const x = S.tasks.get(id); if (!canTime(x) || !ready()) return;
  const tm = timerNow();
  if (tm && tm.taskId === id) { if (!tm.start) saveTimer({ ...tm, start: Date.now() }, "▶ 다시 재요."); else toast("이미 재고 있어요. 맨 위 띠를 봐요."); return; }
  if (tm) { toast(`지금 '${tm.title}' 타이머가 돌고 있어요. 먼저 끝내 주세요.`); openTimerEnd(); return; }
  closeDlg($("taskDlg"));
  saveTimer({ taskId: id, title: x.title || "할 일", start: Date.now(), acc: 0, day: today() }, `⏱ '${x.title}' 시작! 맨 위 띠에서 멈추거나 끝내요.`);   // day = 시작한 날 (밤에 시작해 자정을 넘기면 끝낼 때 고름)
}
function renderTimerBar() {
  const tm = timerNow(), bar = $("timerBar");
  bar.hidden = !tm || APP === "money"; if (bar.hidden) { bar.dataset.k = ""; return; }
  const ms = timerMs(tm), warn = ms > TIMER_WARN, k = `${tm.taskId}|${tm.start ? 1 : 0}|${warn ? 1 : 0}|${tm.title}`;
  if (bar.dataset.k !== k) {   // 1초마다는 시계 글자만 바꿈
    bar.dataset.k = k; bar.classList.toggle("warn", warn); bar.classList.toggle("paused", !tm.start);
    bar.innerHTML = `<span>⏱ <b>${esc(tm.title)}</b><span class="tm-clock" id="tmClock"></span>${tm.start ? "" : ' <span class="muted small">멈춤</span>'}${warn ? ' <span class="small tm-warn">· 5시간이 넘었어요. 끄는 걸 잊었나요?</span>' : ""}</span>` +
      `<span class="test-bar-btns">${tm.start ? '<button class="btn small ghost" type="button" data-act="tmPause">⏸ 멈춤</button>' : '<button class="btn small ghost" type="button" data-act="tmResume">▶ 다시</button>'}<button class="btn small" type="button" data-act="tmEnd">■ 끝</button></span>`;
  }
  $("tmClock").textContent = fmtClock(ms);
}
// 🗓️ 타이머가 자정을 넘겼으면 기록할 날을 고름: 시작한 날 ~ 오늘 (기본 = 시작한 날)
function timerDays(tm) {
  const t = today(), from = tm.day || (tm.start && !(Number(tm.acc) > 0) ? ymd(new Date(tm.start)) : t), out = [];
  for (let d = from < t ? from : t, n = 0; d <= t && n < 7; d = addDays(d, 1), n++) out.push(d);
  if (out[out.length - 1] !== t) out.push(t);
  return out;
}
function openTimerEnd() {
  const tm = timerNow(); if (!tm) return;
  const ms = timerMs(tm), min = Math.max(1, Math.round(ms / 60000)), days = timerDays(tm), t = today();
  $("mvTitle").textContent = `⏱ '${tm.title}' 끝!`;
  $("mvText").innerHTML = `<p><b>${fmtClock(ms)}</b> 했어요. 실제로 한 시간과 다르면 고쳐 주세요.</p>` +
    (ms > TIMER_WARN ? '<p class="small" style="color:var(--danger);margin:0">5시간이 넘었어요. 끄는 걸 잊었으면 실제로 한 시간으로 고쳐 주세요.</p>' : "") +
    `<div class="hm"><input type="number" id="tmH" min="0" max="99" step="1" inputmode="numeric" value="${Math.floor(min / 60)}" aria-label="시간"><span>시간</span><input type="number" id="tmM" min="0" max="59" step="1" inputmode="numeric" value="${min % 60}" aria-label="분"><span>분</span></div>` +
    (days.length > 1 ? `<p class="small" style="margin:0">🌙 자정이 지났어요. 어느 날에 기록할까요?</p><div class="chips tm-days">${days.map((d, i) => `<label class="chip tm-day"><input type="radio" name="tmDay" value="${d}"${i === 0 ? " checked" : ""}> ${shortDate(d)}${d === t ? " 오늘" : i === 0 ? " 시작한 날" : ""}</label>`).join("")}</div>` : "") +
    `<p class="small muted" style="margin:0">[기록하고 체크]를 누르면 '${esc(tm.title)}'이(가) ${days.length > 1 ? "고른 날" : "오늘"} 이 시간으로 체크돼요 (🔥 실천 · ⭐ 포인트).</p>`;
  $("mvBtns").innerHTML = '<button class="btn" type="button" data-act="tmSave">기록하고 체크</button><button class="btn ghost" type="button" data-act="mvClose">더 할래요</button><button class="btn ghost danger-txt" type="button" data-act="tmDrop">버리기</button>';
  openDlg($("moveDlg"));
}
function timerSave() {
  const tm = timerNow(); if (!tm || !ready()) return;
  const min = (parseInt($("tmH").value, 10) || 0) * 60 + (parseInt($("tmM").value, 10) || 0);
  if (!(min > 0)) { toast("시간을 넣어 주세요."); return; }
  closeDlg($("moveDlg"));
  const pick = document.querySelector('#moveDlg input[name="tmDay"]:checked');
  const x = S.tasks.get(tm.taskId), id = tm.taskId, t = pick && /^\d{4}-\d{2}-\d{2}$/.test(pick.value) ? pick.value : today();   // t = 기록할 날 (자정을 넘겼으면 고른 날)
  if (!x) { saveTimer(null, "할 일이 지워져서 타이머만 껐어요."); return; }
  const was = isDone(x, t), day = !isRep(x) && was && x.doneDate ? x.doneDate : t, prevMin = was ? taskMinutes(id, day) : 0;
  act((async () => {
    if (!was) await E.backend.update("tasks", id, isRep(x) ? { doneDates: { [t]: true } }
      : x.date && x.date !== t ? { date: t, done: true, doneDate: t, [x.date < t ? "lateFrom" : "earlyFrom"]: x.date } : { done: true, doneDate: t });
    for (const l of taskLogs(id, day)) await E.backend.remove("logs", l.id);
    await E.backend.add("logs", { date: day, minutes: prevMin + min, text: x.title, goalId: x.goalId || null, taskId: id, createdAt: Date.now() });
    await E.backend.saveSettings({ timer: null });
  })(), `⏱ ${t === today() ? "" : shortDate(t) + "에 "}${fmtMin(min)} 기록하고 '${x.title}' 체크했어요. 🔥`).catch(() => {});
}

// 화면 칸에 거는 것들 (bindTimer 뒤에 한 번)
export function initTimer() {
setInterval(() => { if (timerNow()) renderTimerBar(); }, 1000);
}

// 버튼 누름 (app.js 클릭 처리에서 넘어옴). 여기서 처리했으면 true
export function timerAction(a, el, id, t) {
  if (a === "tmPause") { const tm = timerNow(); if (tm && tm.start && ready()) saveTimer({ ...tm, acc: timerMs(tm), start: null }, "⏸ 멈췄어요. [▶ 다시]로 이어서 재요."); return true; }
  if (a === "tmResume") { const tm = timerNow(); if (tm && !tm.start && ready()) saveTimer({ ...tm, start: Date.now() }, "▶ 다시 재요."); return true; }
  if (a === "tmEnd") { openTimerEnd(); return true; }
  if (a === "tmSave") { timerSave(); return true; }
  if (a === "tmDrop") {
    if (el.dataset.armed !== "1") { el.dataset.armed = "1"; el.textContent = "정말 버릴까요?"; return true; }
    closeDlg($("moveDlg")); saveTimer(null, "타이머를 기록 없이 껐어요."); return true;
  }
  return false;
}

export { canTime, renderTimerBar, timerNow, timerStart };
