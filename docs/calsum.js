// 📝 이번 달 정리 (달력 아래 #calSum) — 냐냐 가계부 '이번 달 정리'(summary.js)처럼 기록 숫자로 문장을 만듦 (2026-10-29)
// 달력에서 보는 달(ui.calMonth)을 지난달·평소(앞 12달 평균, 실천 기록 있는 달만)와 비교. 이번 달이면 오늘까지만, 비교하는 달도 같은 날짜까지.
// 실천 시간 = 실천 기록(logs) 합계, 실천한 날·주 목표·연속은 달력 도장판과 같은 계산(env.practiceMinutes·weekRuns). 데이터는 안 바꿈.
export function calSummary(m, env) {
  const { S, esc, fmtHM, today, addDays, rows } = env;
  const lastDay = (mm) => { const [y, mo] = mm.split("-").map(Number); return new Date(y, mo, 0).getDate(); };
  const shift = (mm, k) => { const [y, mo] = mm.split("-").map(Number), d = new Date(y, mo - 1 + k, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
  const rangeOf = (mm, day) => ({ from: `${mm}-01`, to: `${mm}-${String(Math.min(day, lastDay(mm))).padStart(2, "0")}` });
  const diffTxt = (d) => Math.abs(d) < 10 ? "비슷" : `${fmtHM(Math.abs(d))} ${d > 0 ? "더" : "덜"}`;
  const t = today(), cur = t.slice(0, 7), now = m === cur, day = now ? Number(t.slice(8)) : 31, mon = Number(m.slice(5));
  const head = (sub) => `<div class="panel-head"><div><h3>📝 ${mon}월 정리</h3>${sub ? `<span class="muted small">${sub}</span>` : ""}</div></div>`;
  const empty = (msg) => head("") + `<p class="muted small" style="margin:0">${esc(msg)}</p>`;
  const start = env.boardStart() || t;
  if (m > cur) return empty(`${mon}월은 아직 안 왔어요. 지난달 정리는 ‹ 이전 달에서 볼 수 있어요.`);
  if (m < start.slice(0, 7)) return empty("이 달엔 보드를 쓰기 전이라 기록이 없어요.");

  const logs = rows(S.logs).filter((l) => l.date && !env.noPracLog(l));
  const mins = (r) => logs.reduce((s, l) => s + (l.date >= r.from && l.date <= r.to ? Number(l.minutes) || 0 : 0), 0);
  const me = rangeOf(m, day), myMin = mins(me), prevMin = mins(rangeOf(shift(m, -1), day));
  const past = []; for (let k = 1; k <= 12; k++) { const mm = shift(m, -k); if (mm < start.slice(0, 7)) break; const v = mins(rangeOf(mm, day)); if (v > 0) past.push(v); }
  const avg = past.length ? past.reduce((s, v) => s + v, 0) / past.length : null;

  // 실천한 날: 보드 시작일부터 오늘까지만 셈
  const pm = env.practiceMinutes(), dayList = [];
  for (let d = me.from; d <= me.to && d <= t; d = addDays(d, 1)) if (d >= start) dayList.push(d);
  const pDays = dayList.filter((d) => env.practiced(pm, d)).length;

  // 주 목표(5일): 일요일이 이 달에 있는 주 (10/11 주부터 새 규칙)
  const wks = env.weekRuns(pm).filter((w) => w.ws.slice(0, 7) === m);
  const wOk = wks.filter((w) => w.n >= env.WEEK_GOAL).length, wDone = wks.filter((w) => w.past || w.n >= env.WEEK_GOAL).length;
  const wNow = wks.find((w) => !w.past && w.n < env.WEEK_GOAL);
  const lastW = wks[wks.length - 1], run = now ? env.streak(pm) : lastW && lastW.n >= env.WEEK_GOAL ? lastW.run : 0;

  // 시간을 많이 쓴 목표 · 할 일 (할 일에 붙은 시간은 할 일 이름, 따로 적은 실천은 적은 글)
  const byGoal = {}, byTask = {};
  logs.forEach((l) => {
    if (l.date < me.from || l.date > me.to) return; const v = Number(l.minutes) || 0; if (!v) return;
    const tk = l.taskId && S.tasks.get(l.taskId), gid = l.goalId || (tk && tk.goalId);
    if (gid && S.goals.has(gid)) byGoal[gid] = (byGoal[gid] || 0) + v;
    const name = (tk && tk.title) || l.text || "실천 기록"; byTask[name] = (byTask[name] || 0) + v;
  });
  const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const topGoals = top(byGoal), topTasks = top(byTask);

  // 할 일 체크: 그 날 할 일(달력에 보이는 것) 중 끝낸 것, 지난 날 못 한 것(❌)·늦게 한 것
  let all = 0, done = 0; const miss = {};
  const tasks = rows(S.tasks).filter((x) => x.title);
  dayList.forEach((d) => tasks.forEach((x) => {
    if (!env.activeOn(x, d)) return; all++;
    if (env.isDone(x, d)) done++; else if (d < t) miss[x.title] = (miss[x.title] || 0) + 1;
  }));
  tasks.forEach((x) => { if (!env.isRep(x) && x.lateFrom && x.lateFrom >= me.from && x.lateFrom <= me.to) miss[x.title] = (miss[x.title] || 0) + 1; });
  const topMiss = top(miss);

  // ⭐ 포인트 (복권이 보일 때만)
  let pts = null;
  if (env.lottoVisible()) {
    const L = env.pointsLedger(); let sum = 0;
    Object.entries(L.day).forEach(([d, x]) => { if (d >= me.from && d <= me.to) sum += x.sum; });
    const left = Math.max(0, Math.floor(L.total / env.PT_TICKET) - S.wins.size), prog = L.total % env.PT_TICKET;
    pts = { sum, left, need: env.PT_TICKET - prog };
  }

  if (!myMin && !pDays && !done) return empty(now ? "이 달은 아직 실천 기록이 없어요. 오늘 첫 기록을 남겨 볼까요? 🔥" : "이 달은 실천 기록이 없어요.");

  const b = [];
  const dAvg = avg == null ? null : myMin - avg, dPrev = myMin - prevMin;
  b.push(dAvg == null ? `실천 시간은 <b>${fmtHM(myMin)}</b>이에요. <span class="muted">(지난달 같은 날까지보다 ${diffTxt(dPrev)})</span>`
    : (Math.abs(dAvg) < 10 ? "평소랑 비슷하게 실천했어요." : dAvg > 0 ? `평소보다 <b class="sm-good">${fmtHM(dAvg)} 더</b> 실천했어요 👍` : `평소보다 <b class="sm-bad">${fmtHM(-dAvg)} 덜</b> 실천했어요.`) +
      ` <span class="muted">(평소 ${fmtHM(avg)} · 지난달보다 ${diffTxt(dPrev)})</span>`);
  if (wks.length) b.push(`<b>주 목표</b> (한 주에 ${env.WEEK_GOAL}일) <b>${wOk}</b>/${wDone}주 성공` +
    (wNow ? ` <span class="muted">· 이번 주 ${wNow.n}일째, ${env.WEEK_GOAL - wNow.n}일 더 하면 성공</span>` : "") +
    ` · ${run ? `🔥 연속 <b>${run}주</b>${now ? " 이어 가는 중" : " (달 끝)"}` : "연속은 아직 없어요"}`);
  if (topGoals.length) b.push(`<b>시간을 많이 쓴 목표</b><ul>${topGoals.map(([id, v]) => `<li>${esc(S.goals.get(id).title)} <b>${fmtHM(v)}</b> <span class="muted">· ${Math.round(v / myMin * 100)}%</span></li>`).join("")}</ul>`);
  if (topTasks.length) b.push(`<b>많이 한 일</b><ul>${topTasks.map(([n, v]) => `<li>${esc(n)} <b>${fmtHM(v)}</b></li>`).join("")}</ul>`);
  if (topMiss.length) b.push(`<b>자주 놓친 할 일</b><ul>${topMiss.map(([n, c]) => `<li>${esc(n)} <span class="sm-bad">❌ ${c}번</span></li>`).join("")}</ul>`);
  else if (all) b.push(`할 일을 하나도 안 놓쳤어요 👏`);
  if (pts) b.push(`⭐ ${now ? "이번 달" : `${mon}월에`} <b class="sm-good">${pts.sum.toLocaleString("ko-KR")}점</b> 모았어요.` +
    (now ? ` <span class="muted">${pts.left ? `긁을 복권 ${pts.left}장이 있어요!` : `다음 복권까지 ${pts.need.toLocaleString("ko-KR")}점`}</span>` : ""));

  const pct = all ? Math.round(done / all * 100) : 0;
  return head(now ? `${mon}월 1일~${day}일 · 지난달·평소도 ${day}일까지로 비교` : avg == null ? "지난달과 비교" : `지난달 · 평소(앞 ${past.length}달 평균)와 비교`) +
    `<div class="plan-tiles sm-tiles">
      <div class="plan-tile"><span>실천 시간</span><b>${fmtHM(myMin)}</b><small>${dAvg == null ? `지난달보다 ${diffTxt(dPrev)}` : `평소보다 ${diffTxt(dAvg)}`}</small></div>
      <div class="plan-tile${pDays ? " left" : ""}"><span>실천한 날</span><b>${pDays}일</b><small>${dayList.length}일 중</small></div>
      <div class="plan-tile"><span>할 일 체크</span><b>${done}/${all}</b><small>${all ? `${pct}% 끝냄` : "할 일 없음"}</small></div>
      <div class="plan-tile"><span>${pts ? "⭐ 포인트" : "연속 실천"}</span><b>${pts ? pts.sum.toLocaleString("ko-KR") + "점" : run + "주"}</b><small>${pts ? (now ? "이번 달 모은 점수" : `${mon}월에 모은 점수`) : `한 주에 ${env.WEEK_GOAL}일`}</small></div>
    </div>
    <div class="sm-list">${b.map((x) => `<div class="sm-li">${x}</div>`).join("")}</div>`;
}
