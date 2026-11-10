// ✅ 자동 점검 목록 — http://localhost:8000/?local=test 로 열면 app.js runTests가 이 파일을 돌림 (이 컴퓨터에서만, 진짜 데이터는 안 씀)
// 가짜 기록을 넣고(h.load(데이터, 오늘 날짜)) 계산 결과(h.calc.…)가 규칙대로인지 봄. 규칙은 CLAUDE.md '데이터' 참고.
// 계산 규칙을 일부러 바꿨으면 여기 기대값도 같이 고치기. 점검을 더할 땐 아래 t("이름", () => { … }) 를 한 묶음 더 쓰면 됨.
// 달력: 2026-10-11(일)이 새 규칙 첫 주. 주 = 일~토 → 10/11~17 · 10/18~24 · 10/25~31 · 11/01~07 · 11/08~14

export async function run(h) {
  const { load, calc } = h, names = [], fails = [];
  let cur = "";
  const eq = (got, want, what) => { if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`${what}: 기대 ${JSON.stringify(want)} · 실제 ${JSON.stringify(got)}`); };
  const t = (name, fn) => { cur = name; names.push(name); try { fn(); } catch (e) { fails.push({ name, msg: String(e && e.message || e) }); } };
  // 가짜 기록 만들기
  const logs = (list) => Object.fromEntries(list.map(([date, minutes, taskId], i) => ["l" + i, { date, minutes, ...(taskId ? { taskId } : {}) }]));
  const days = (from, n, min = 60) => { const out = [], d = new Date(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8)); for (let i = 0; i < n; i++) { out.push([`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, min]); d.setDate(d.getDate() + 1); } return out; };
  const money = (list) => Object.fromEntries(list.map((x, i) => ["m" + i, { account: "a", ...x }]));

  // ---------- 실천한 날 · 주 · 연속 ----------
  t("실천한 날은 하루 60분부터 (59분은 아님)", () => {
    load({ logs: logs([["2026-10-12", 60], ["2026-10-13", 59], ["2026-10-14", 30], ["2026-10-14", 30]]) }, "2026-10-17");
    const w = calc.weekRuns(calc.practiceMinutes())[0];
    eq(w.n, 2, "10/11 주 실천한 날 수"); eq(w.pd, ["2026-10-12", "2026-10-14"], "실천한 날");
  });
  t("한 주에 실천한 날 5일이면 그 주 성공, 4일이면 아님", () => {
    load({ logs: logs(days("2026-10-11", 5)) }, "2026-10-17");
    let w = calc.weekRuns(calc.practiceMinutes())[0];
    eq([w.n, w.hit], [5, "2026-10-15"], "5일 한 주"); eq(calc.streak(calc.practiceMinutes()), 1, "연속");
    load({ logs: logs(days("2026-10-11", 4)) }, "2026-10-17");
    eq(calc.streak(calc.practiceMinutes()), 0, "4일만 한 주의 연속");
  });
  t("이번 주는 끝날 때까지 연속이 안 끊김, 지난 주를 못 채웠으면 끊김", () => {
    const two = [...days("2026-10-11", 5), ...days("2026-10-18", 5)];
    load({ logs: logs(two) }, "2026-10-26");   // 3번째 주 월요일, 아직 0일
    eq(calc.streak(calc.practiceMinutes()), 2, "이번 주 아직이어도 연속 2주");
    load({ logs: logs([...two, ...days("2026-10-25", 2)]) }, "2026-11-02");   // 3번째 주를 2일만 하고 넘어감
    eq(calc.streak(calc.practiceMinutes()), 0, "지난 주 실패 뒤 연속");
  });
  t("예전 규칙(10/11 전): 50분이면 실천, 날마다 이어서 7일째 +30", () => {
    load({ logs: logs(days("2026-10-01", 7, 50)) }, "2026-10-08");
    const p = calc.pointsLedger();
    eq(p.total, 350 + 30, "포인트 합계"); eq(p.day["2026-10-07"].sum, 50 + 30, "7일째 날 점수");
  });

  // ---------- 포인트 ----------
  t("포인트: 실천 1분 1점, 한 주 6번째 날 +15 · 7번째 날 +30", () => {
    load({ logs: logs(days("2026-10-11", 7)) }, "2026-10-17");
    const p = calc.pointsLedger();
    eq(p.total, 420 + 15 + 30, "7일 다 한 주 합계");
    eq([p.day["2026-10-16"].sum, p.day["2026-10-17"].sum], [75, 90], "6·7번째 날 점수");
    eq([calc.dayExtra(5), calc.dayExtra(6), calc.dayExtra(7), calc.weekExtra(7)], [0, 15, 30, 45], "덤 점수 표");
  });
  t("포인트: 연속 3주째 +30 (그 주 5번째 실천한 날에), 6·12·25주 100·250·1000, 그 뒤 5주마다 300", () => {
    load({ logs: logs([...days("2026-10-11", 5), ...days("2026-10-18", 5), ...days("2026-10-25", 5)]) }, "2026-10-31");
    const p = calc.pointsLedger();
    eq(p.total, 900 + 30, "3주 합계"); eq(p.day["2026-10-29"].sum, 60 + 30, "3주째 5번째 날");
    eq([3, 6, 12, 25, 30, 35, 4, 26].map(calc.weekStreakBonus), [30, 100, 250, 1000, 300, 300, 0, 0], "연속 보너스 표");
  });
  t("포인트: 돈 기록 1점 · 월급 30점 · 🤲 받을 돈 짝은 0점", () => {
    load({ money: money([{ kind: "expense", amount: 5000, date: "2026-11-03", cat: "식비" }, { kind: "income", amount: 2600000, date: "2026-11-10", cat: "월급" },
      { kind: "transfer", amount: 100000, date: "2026-11-10" }, { kind: "expense", amount: -5000, date: "2026-11-03", cat: "기타", recvOf: "m0" }]) }, "2026-11-11");
    eq(calc.pointsLedger().total, 1 + 30 + 1, "합계");
  });
  t("포인트: 목표 달성 300점 · 세부목표 50점", () => {
    load({ goals: { g1: { title: "자격증", achievedAt: "2026-11-05", subs: { s1: { title: "필기", doneAt: "2026-11-01" }, s2: { title: "실기" } } } } }, "2026-11-11");
    eq(calc.pointsLedger().total, 300 + 50, "합계");
  });
  t("실천 아닌 할 일(noPractice)에 붙은 시간은 실천·포인트에서 뺌", () => {
    load({ tasks: { t1: { title: "카드값 이체", noPractice: true, date: "2026-11-03" } }, logs: logs([["2026-11-03", 90, "t1"], ["2026-11-04", 40]]) }, "2026-11-11");
    eq(calc.pointsLedger().total, 40, "포인트"); eq(calc.practiceMinutes()["2026-11-03"] || 0, 0, "그날 실천 시간");
  });

  // ---------- 할 일 반복 ----------
  t("매주 반복: 고른 요일에만, 시작~끝 사이에만", () => {
    load({}, "2026-11-11");
    const x = { repeat: "weekly", days: [1, 3], start: "2026-11-02", end: "2026-11-20" };
    eq(["2026-11-09", "2026-11-10", "2026-11-11", "2026-10-26", "2026-11-23"].map((d) => calc.activeOn(x, d)), [true, false, true, false, false], "월·수 반복");
    eq(["2026-11-01", "2026-11-02", "2026-11-21"].map((d) => calc.activeOn({ repeat: "daily", start: "2026-11-02", end: "2026-11-20" }, d)), [false, true, false], "매일 반복");
  });
  t("주 3번 할 일: 다 채우면 남은 날 안 보임 (오늘만 덤으로 남음)", () => {
    load({}, "2026-11-11");   // 수요일, 이번 주 = 11/08~14
    const x = { repeat: "nweek", times: 3, start: "2026-11-01", doneDates: { "2026-11-08": true, "2026-11-09": true, "2026-11-10": true } };
    eq(calc.nweekCount(x, "2026-11-11"), 3, "이번 주 체크 수");
    eq(["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-14"].map((d) => calc.activeOn(x, d)), [true, true, false, false], "한 날 · 오늘 · 내일 · 토요일");
    eq(calc.nweekExtra(x, "2026-11-11"), true, "오늘은 덤");
  });
  t("주 3번 할 일: 덜 채웠으면 오늘부터 남은 날마다 보이고, 지난 안 한 날은 안 보임", () => {
    load({}, "2026-11-11");
    const x = { repeat: "nweek", times: 3, start: "2026-11-01", doneDates: { "2026-11-08": true, "2026-11-03": true } };
    eq(["2026-11-08", "2026-11-09", "2026-11-11", "2026-11-13"].map((d) => calc.activeOn(x, d)), [true, false, true, true], "한 날 · 지난 안 한 날 · 오늘 · 모레");
    eq(["2026-11-03", "2026-11-05", "2026-11-07"].map((d) => calc.activeOn(x, d)), [true, false, true], "못 채운 지난주: 한 날 · 안 한 날 · 토요일(❌ 자리)");
  });

  // ---------- 돈 ----------
  t("한 달 합계: 수입 · 지출 · 💝 보낸 돈 따로, 내 자산끼리 이체와 다른 화폐는 뺌", () => {
    load({ money: money([{ kind: "income", amount: 100, date: "2026-11-02", cat: "월급" }, { kind: "expense", amount: 30, date: "2026-11-03", cat: "식비" },
      { kind: "expense", amount: 20, date: "2026-11-03", cat: "식비", cur: "USD" }, { kind: "transfer", amount: 10, date: "2026-11-04" },
      { kind: "move", amount: 50, date: "2026-11-05", toAccount: "b" }, { kind: "expense", amount: 999, date: "2026-10-31", cat: "식비" }]) }, "2026-11-11");
    const r = calc.monthTotals("2026-11");
    eq([r.inc, r.exp, r.out, r.left, r.byCat], [100, 30, 10, 60, { 식비: 30 }], "11월");
  });
  t("💑 내 몫 보기: 공통비용 지출은 절반, 정산 받은 돈(욱진입금·냐냐입금)은 수입에서 뺌", () => {
    const m = money([{ kind: "income", amount: 100, date: "2026-11-02", cat: "월급" }, { kind: "income", amount: 40, date: "2026-11-03", cat: "💚 냐냐입금" },
      { kind: "expense", amount: 60, date: "2026-11-03", cat: "💙 공통비용" }, { kind: "expense", amount: 20, date: "2026-11-04", cat: "식비", common: true }, { kind: "expense", amount: 10, date: "2026-11-04", cat: "식비" }]);
    load({ money: m, settings: { moneyMine: true } }, "2026-11-11");
    let r = calc.monthTotals("2026-11"); eq([calc.mineOn(), r.inc, r.exp, r.settleIn], [true, 100, 50, 40], "켰을 때");
    load({ money: m }, "2026-11-11");
    r = calc.monthTotals("2026-11"); eq([calc.mineOn(), r.inc, r.exp], [false, 140, 90], "껐을 때");
  });
  t("자산 잔액: 시작 잔액 + 수입 − 지출, 이체는 한쪽에서 빼고 다른 쪽에 더함", () => {
    load({ accounts: { a: { name: "통장", type: "bank", initial: 1000 }, b: { name: "적금", type: "save", initial: 0 } },
      money: money([{ kind: "income", amount: 500, date: "2026-11-01" }, { kind: "expense", amount: 200, date: "2026-11-02" }, { kind: "move", amount: 300, date: "2026-11-05", toAccount: "b" },
        { kind: "transfer", amount: 100, date: "2026-11-06" }, { kind: "expense", amount: 77, date: "2026-11-06", cur: "USD" }]) }, "2026-11-11");
    eq(calc.balances(), { a: 900, b: 300 }, "지금"); eq(calc.balances("2026-11-03"), { a: 1300, b: 0 }, "11/3까지");
  });
  t("카드 결제일 31일 = 말일 (2월은 28일), 이용기간은 정한 달·날 그대로", () => {
    eq(calc.cardPayPlan({ day: 31, fm: -1, fd: 1, tm: -1, td: 31 }, "2026-02"), { date: "2026-02-28", from: "2026-01-01", to: "2026-01-31" }, "말일 결제");
    eq(calc.cardPayPlan({ day: 15, fm: -1, fd: 4, tm: 0, td: 3 }, "2026-11"), { date: "2026-11-15", from: "2026-10-04", to: "2026-11-03" }, "15일 결제");
  });
  t("예산: 그 달 것이 없으면 그 전 가까운 달 예산을 이어 씀 · 이번 달 월급이 아직이면 수입은 지난달 것", () => {
    load({ settings: { budgets: { "2026-09": { items: { a: { cat: "식비", amount: 300000, createdAt: 1 }, b: { cat: "통신", amount: 60000, createdAt: 2 } }, give: 1000000 } } },
      money: money([{ kind: "income", amount: 2600000, date: "2026-10-10", cat: "월급" }, { kind: "income", amount: 12, date: "2026-11-01", cat: "이자·환급" }]) }, "2026-11-05");
    const p = calc.planOf("2026-11");
    eq([p.from, p.total, p.give, p.income, p.incAuto], ["2026-09", 360000, 1000000, 2600000, true], "11월 예산");
  });
  t("🔁 매월 반복: 날짜가 된 달만 만들고, 31일은 짧은 달 말일, 이미 만든 달은 건너뜀", () => {
    const rule = { kind: "expense", amount: 55000, account: "a", cat: "통신", day: 31, from: "2026-01", made: { "2026-01": true } };
    const patch = calc.duePatch({ r1: rule }, "2026-03-15");
    eq(Object.keys(patch).sort(), ["money/rp-r1-202602", "settings/moneyRepeat/r1/made/2026-02"], "만들 것");
    eq([patch["money/rp-r1-202602"].date, patch["money/rp-r1-202602"].amount, calc.repeatDate("2026-04", 31)], ["2026-02-28", 55000, "2026-04-30"], "날짜·금액");
  });

  void cur;
  return { pass: names.length - fails.length, fail: fails.length, fails, names };
}
