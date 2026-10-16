// 💰 돈 관리 (가계부) — 보드(index.html)와 가계부 모드(money.html → index.html?app=money)가 같이 쓰는 코드
// 한 달 예산 · 지출 기록 · 자산(통장·카드·현금, 카드 결제일) · 분류·색·원형 그래프 · 줄 돈 15일 자동 · 카드값 할 일 · 연습 데이터
// 화면 마크업은 index.html의 #moneyPage · #acctDlg · #catDlg. 보드 쪽 공통 함수·상태는 시작할 때 bindMoney(env)로 받음
// (따로 떼어 새 가계부를 만들 땐: 이 파일 + index.html의 위 마크업 + env로 넘기는 공통 함수(저장소·$·toast 등)만 가져가면 됨)

let E = null;   // 보드 쪽 환경 (값이 바뀌는 backend·testMode·realBackend 는 E.이름 으로 읽음)
let $, DEFAULTS, DEMO, S, act, amtVal, clone, closeDlg, commaNum, deepMerge, esc, isAdminDevice, moneyShort, monthLabel, openDlg, pad, partner, quietly, ready, render, rows, shiftMonth, shortDate, statTile, toast, today, ui, won;
export function bindMoney(env) {
  E = env;
  ({ $, DEFAULTS, DEMO, S, act, amtVal, clone, closeDlg, commaNum, deepMerge, esc, isAdminDevice, moneyShort, monthLabel, openDlg, pad, partner, quietly, ready, render, rows, shiftMonth, shortDate, statTile, toast, today, ui, won } = env);
}

export const MONEY_CATS = {
  income: ["월급", "현장 수당", "부업·알바", "이자·환급", "기타 수입"],
  transfer: ["생활비", "용돈", "데이트 통장", "저축", "기타"],
  expense: ["식비", "카페·간식", "장보기", "주거·관리비", "교통·차량", "통신", "데이트", "생필품", "쇼핑", "병원·약", "경조사", "공구·작업", "자기계발", "기타"]
};
export const ACCT_TYPES = { bank: "통장", card: "카드", cash: "현금", save: "저축" };
export const KIND_LABEL = { income: "수입", expense: "지출", transfer: "보낸 돈", move: "이체" };
// 분류는 설정에서 바꿀 수 있음 (없으면 기본)
export const moneyCats = (kind) => ((S.settings.moneyCats && S.settings.moneyCats[kind]) || MONEY_CATS[kind] || []).slice();
// 🎨 분류 색: --c0~--c7 (파랑·코랄·민트·노랑·보라·분홍·청록·갈색), --c8 회색. 기본은 분류 목록 순서대로, '기타…'는 회색
// 분류 설정에서 바꾼 색은 settings.catColors[kind][키] = 0~8 (키 = 분류 이름을 Firebase 키로 쓸 수 있게 바꾼 것)
export const CAT_N = 8;
export const catKey = (c) => encodeURIComponent(c).replace(/\./g, "%2E");
export function catIdx(kind, cat) {
  const k = kind === "move" ? "expense" : kind || "expense", set = ((S.settings.catColors || {})[k] || {})[catKey(cat || "")];
  if (Number.isInteger(set) && set >= 0 && set <= CAT_N) return set;
  if (!cat || /^기타/.test(cat)) return CAT_N;
  if (k === "expense" && catMap && cat in catMap) return catMap[cat];
  const i = moneyCats(k).indexOf(cat);
  return i < 0 ? CAT_N : i % CAT_N;
}
// 보고 있는 달에 쓰는 지출 분류끼리는 색이 안 겹치게 (분류는 14개, 색은 8개). 직접 고른 색은 그대로, 나머지는 기본 색이 이미 쓰였으면 다음 빈 색
export let catMap = null;
export function setCatMap(cats) {
  catMap = null;
  const set = (S.settings.catColors || {}).expense || {}, list = moneyCats("expense"), used = new Set(), map = {};
  const mine = (c) => Number.isInteger(set[catKey(c)]) ? set[catKey(c)] : null;
  const todo = [...new Set(cats)].filter((c) => c && !/^기타/.test(c));
  todo.forEach((c) => { if (mine(c) != null) used.add(mine(c)); });
  todo.filter((c) => mine(c) == null).sort((a, b) => (list.indexOf(a) + 1 || 999) - (list.indexOf(b) + 1 || 999)).forEach((c) => {
    let i = catIdx("expense", c);
    if (i < CAT_N && used.has(i)) { for (let j = 1; j < CAT_N; j++) { const n = (i + j) % CAT_N; if (!used.has(n)) { i = n; break; } } }
    map[c] = i; if (i < CAT_N) used.add(i);
  });
  catMap = map;
}
export const catVar = (kind, cat) => `var(--c${catIdx(kind, cat)})`;
export const catDot = (kind, cat) => `<span class="cdot" style="--c:${catVar(kind, cat)}" aria-hidden="true"></span>`;
// 🥧 분류별 원형(도넛) + 범례: [{cat, amt}]. 9개 넘으면 작은 것들은 '그 밖'(회색)으로
export function pieHtml(kind, list, label) {
  let xs = list.filter((x) => x.amt > 0).sort((a, b) => b.amt - a.amt);
  const total = xs.reduce((t, x) => t + x.amt, 0);
  if (!total) return "";
  if (xs.length > 8) xs = xs.slice(0, 7).concat([{ cat: "그 밖", amt: xs.slice(7).reduce((t, x) => t + x.amt, 0), other: true }]);
  const gap = xs.length > 1 ? 0.6 : 0, col = (x) => x.other ? `var(--c${CAT_N})` : catVar(kind, x.cat), pct = (x) => Math.round(x.amt / total * 100);
  let acc = 0;
  const segs = xs.map((x) => {
    const p = x.amt / total * 100, d = Math.max(0.2, p - gap);
    const s = `<circle cx="21" cy="21" r="15.9155" pathLength="100" stroke="${col(x)}" stroke-dasharray="${d.toFixed(2)} ${(100 - d).toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}"><title>${esc(x.cat)} ${won(x.amt)} (${pct(x)}%)</title></circle>`;
    acc += p; return s;
  }).join("");
  return `<div class="pie"><svg class="pie-svg" viewBox="0 0 42 42" role="img" aria-label="${esc(label)} ${won(total)} 분류별 원형"><g transform="rotate(-90 21 21)" fill="none" stroke-width="6.5">${segs}</g>` +
    `<text x="21" y="19.6" class="pie-l">${esc(label)}</text><text x="21" y="25.4" class="pie-v">${moneyShort(total)}</text></svg>` +
    `<ul class="pie-legend">${xs.map((x) => `<li><i style="background:${col(x)}"></i><span>${esc(x.cat)}</span><b>${won(x.amt)}</b><small>${pct(x)}%</small></li>`).join("")}</ul></div>`;
}

// 🗓️ 매달 1일 '예산 입력하기' · 15일 '수입 입력하기' 할 일 (이번 달·다음 달, 지난 날짜는 안 만듦, 한 번 만든 건 지워도 다시 안 만듦)
// 예산·수입이 들어오면 저절로 체크. 실천 시간으로는 안 침 (noPractice). 구글 캘린더에도 할 일로 가서 폰 알림
export let moneyTaskSyncing = false;
// 돈 할 일인지: 자동으로 만든 mt-budget/income-{YYYY-MM}, 또는 직접 넣었다가 바꾼 할 일(mt{k,m})
export function moneyTaskKind(x, id) {
  const mm = /^mt-(budget|income)-(\d{4}-\d{2})$/.exec(id || (x && x.id) || "");
  if (mm) return { k: mm[1], m: mm[2] };
  return x && x.mt && x.mt.k ? { k: x.mt.k, m: x.mt.m } : null;
}
// 이름: 아직이면 '○○ 입력하기', 들어오면 '🗓️ 10월 예산 760,000원' · '💰 10월 월급 2,600,000원' (월급 기록이 없으면 '수입')
function moneyTaskTitle(k, m, filled) {
  if (!filled) return k === "budget" ? "🗓️ 이번 달 예산 입력하기" : "💰 이번 달 수입 입력하기";
  const mon = +m.slice(5);
  if (k === "budget") return `🗓️ ${mon}월 예산 ${won(planOf(m).total)}`;
  const r = monthTotals(m), sal = r.items.some((x) => x.kind === "income" && x.cat === "월급");
  return `💰 ${mon}월 ${sal ? "월급" : "수입"} ${won(r.inc)}`;
}
export function syncMoneyTasks() {
  if (moneyTaskSyncing || !E.backend || !S.loaded || E.testMode) return;
  const t = today(), made = S.settings.autoTasks || {}, jobs = [], flags = {}, budgets = S.settings.budgets || {};
  [t.slice(0, 7), shiftMonth(t.slice(0, 7), 1)].forEach((m) => {
    [["budget", "01"], ["income", "15"]].forEach(([k, dd]) => {
      const ok = k === "budget" ? !!budgets[m] : monthTotals(m).inc > 0, key = `mt-${k}-${m}`, date = `${m}-${dd}`, want = moneyTaskTitle(k, m, ok);
      let id = key, x = S.tasks.get(key);
      if (!x) { const f = [...S.tasks].find(([, v]) => v && v.mt && v.mt.k === k && v.mt.m === m); if (f) { id = f[0]; x = f[1]; } }
      if (!x && !made[key]) {   // 직접 넣은 '예산 입력…'·'수입 입력…' 할 일(그 달 하루짜리)은 이 할 일로 바꿈 — 붙은 시간 기록은 지움 (실천 아님, ↶로 되돌릴 수 있음)
        const re = k === "budget" ? /예산\s*입력/ : /수입\s*입력/;
        const own = [...S.tasks].find(([tid, v]) => v && (!v.repeat || v.repeat === "none") && v.date && v.date.slice(0, 7) === m && re.test(v.title || "") && !/^(mt|cp)-/.test(tid) && !v.mt);
        if (own) {
          const [oid, ov] = own;
          jobs.push(async () => {
            await E.backend.update("tasks", oid, { mt: { k, m }, noPractice: true, minutes: null, title: want, done: ok, doneDate: ok ? (ov.doneDate || t) : null });
            for (const l of rows(S.logs).filter((l) => l.taskId === oid)) await E.backend.remove("logs", l.id);
          });
          flags[key] = true; return;
        }
      }
      if (!x && !made[key] && date >= t) { jobs.push(() => E.backend.set("tasks", key, { title: want, repeat: "none", date, done: ok, doneDate: ok ? t : null, noPractice: true, createdAt: Date.now() })); flags[key] = true; }
      else if (x && ok && (!x.done || x.title !== want)) jobs.push(() => E.backend.update("tasks", id, { done: true, doneDate: x.doneDate || t, title: want }));
      else if (x && !ok && x.title !== want) jobs.push(() => E.backend.update("tasks", id, { done: false, doneDate: null, title: want }));   // 지우면 원래대로
    });
  });
  if (!jobs.length) return;
  moneyTaskSyncing = true;
  quietly(async () => { for (const j of jobs) await j(); if (Object.keys(flags).length) await E.backend.saveSettingsDeep({ autoTasks: flags }); }).catch(() => {}).finally(() => { moneyTaskSyncing = false; });
}
// 💳 카드값: 결제일이 되면 '💳 ○○카드 값 이체하기 (예상 …원)' 할 일 (tasks.cardPay). 체크하면 금액 확인 창 → [이체 기록하기]로
// '빠지는 통장 → 카드' 이체 기록 (자동으로 넣지 않음). id = cp-{카드}-{YYYY-MM} (할 일·이체 같은 id), 지우면 다시 안 만듦 (settings.autoTasks)
export let cardPaySyncing = false;
export const cardValue = (n) => /카드$/.test(n || "") ? n + "값" : (n || "카드") + " 카드값";   // 현대카드 → 현대카드값, 신한 → 신한 카드값
export function dayInMonth(m, d) { const last = new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate(); return `${m}-${pad(Math.min(d, last))}`; }
export function cardPayPlan(p, m) { return { date: dayInMonth(m, p.day), from: dayInMonth(shiftMonth(m, p.fm ?? -1), p.fd || 1), to: dayInMonth(shiftMonth(m, p.tm ?? -1), p.td || 31) }; }
export function cardSpent(id, from, to) { let s = 0; S.money.forEach((x) => { if ((x.kind === "expense" || !x.kind) && x.account === id && x.date >= from && x.date <= to) s += Number(x.amount) || 0; }); return s; }
export function syncCardPays() {
  if (cardPaySyncing || !E.backend || !S.loaded || E.testMode) return;
  const t = today(), m = t.slice(0, 7), made = S.settings.autoTasks || {}, jobs = [], flags = {};
  S.accounts.forEach((a, id) => {
    const p = a && a.type === "card" && a.pay; if (!p || !p.day || !p.from || !S.accounts.has(p.from)) return;
    const pl = cardPayPlan(p, m), key = `cp-${id}-${m}`;
    if (pl.date > t || pl.date < (p.since || t) || made[key] || S.money.has(key) || S.tasks.has(key)) return;
    const amt = cardSpent(id, pl.from, pl.to);
    flags[key] = true;
    jobs.push(() => E.backend.set("tasks", key, { title: `💳 ${cardValue(a.name)} 이체하기 (${amt > 0 ? "예상 " + won(amt) : "이 기간 사용 없음"})`, repeat: "none", date: pl.date, done: false, doneDate: null, noPractice: true,
      cardPay: { card: id, from: p.from, start: pl.from, end: pl.to }, createdAt: Date.now() }));
  });
  if (!jobs.length) return;
  cardPaySyncing = true;
  quietly(async () => { for (const j of jobs) await j(); await E.backend.saveSettingsDeep({ autoTasks: flags }); }).catch(() => {}).finally(() => { cardPaySyncing = false; });
}
// 💝 줄 돈: 이번 달 15일이 되면 '보낸 돈'(transfer)을 money/give-{YYYY-MM}로 자동 기록 (그 달에 이미 직접 보낸 만큼은 빼고, 다 보냈으면 안 넣음)
// 한 번 넣은 달은 다시 안 넣음 (settings.autoTasks) — 지우거나 고쳐도 그대로
export let giveSyncing = false;
export function syncGive() {
  if (giveSyncing || !E.backend || !S.loaded || E.testMode) return;
  const t = today(), m = t.slice(0, 7), id = `give-${m}`, made = S.settings.autoTasks || {};
  if (t < `${m}-15` || made[id] || S.money.has(id)) return;
  const pl = planOf(m); if (!(pl.give > 0)) return;
  const amt = pl.give - monthTotals(m).out;
  giveSyncing = true;
  quietly(async () => {
    if (amt > 0) await E.backend.set("money", id, { kind: "transfer", cat: moneyCats("transfer")[0] || "생활비", amount: amt, date: `${m}-15`, account: S.accounts.has(S.settings.giveFrom) ? S.settings.giveFrom : null, memo: `💝 ${+m.slice(5)}월 줄 돈 (자동)`, auto: true, createdAt: Date.now() });
    await E.backend.saveSettingsDeep({ autoTasks: { [id]: true } });
  }).catch(() => {}).finally(() => { giveSyncing = false; });
}
// 💳 카드값 결제 확인 창: 할 일 '카드값 이체하기' 체크, 또는 자산 탭 카드의 [결제]
// 금액(미리 계산, 고칠 수 있음) · 날짜 · 빠지는 통장을 확인하고 [이체 기록하기]를 눌러야 '통장 → 카드' 이체로 기록 (자동으로 안 넣음)
// 할 일에서 왔거나 그 결제의 할 일이 아직이면 같은 id(cp-카드-월)로 기록하고 할 일도 체크
export let cardPayFor = null;
export function openCardPay(taskId) {
  const x = S.tasks.get(taskId), c = x && x.cardPay; if (!c) return;
  showCardPay({ taskId, card: c.card, from: c.from, start: c.start, end: c.end, date: x.date || today(), amt: cardSpent(c.card, c.start, c.end) });
}
function showCardPay(o) {
  const card = S.accounts.get(o.card); if (!card) return;
  cardPayFor = o;
  const banks = sortedAccts().filter((a) => a.type !== "card");
  $("mvTitle").textContent = `💳 ${cardValue(card.name)} 결제`;
  $("mvText").innerHTML = `<p class="small muted">${o.start ? `이용기간 ${shortDate(o.start)} ~ ${shortDate(o.end)} 사용분이에요. ` : ""}카드 앱의 실제 청구 금액과 다르면 고쳐 주세요 (할부·연회비 등). [이체 기록하기]를 눌러야 기록돼요.</p>` +
    `<div class="form"><label class="f">금액 (원)<input type="text" class="amt-in" id="cpAmt" inputmode="numeric" autocomplete="off" value="${o.amt ? commaNum(o.amt) : ""}"></label>` +
    `<div class="row"><label class="f">날짜<input type="date" id="cpDate" value="${esc(o.date || today())}"></label>` +
    `<label class="f">빠지는 통장<select id="cpFrom">${banks.map((a) => `<option value="${esc(a.id)}"${a.id === o.from ? " selected" : ""}>${ACCT_ICON[a.type] || ""} ${esc(a.name)}</option>`).join("") || '<option value="">통장을 먼저 추가해 주세요</option>'}</select></label></div>` +
    `<p class="small muted" style="margin:0">→ 받는 곳: 💳 ${esc(card.name)}</p></div>`;
  $("mvBtns").innerHTML = '<button class="btn" type="button" data-act="cardPayDo">이체 기록하기</button><button class="btn ghost" type="button" data-act="mvClose">취소</button>';
  openDlg($("moveDlg"));
}
export function doCardPay() {
  const o = cardPayFor, amt = amtVal($("cpAmt")), from = $("cpFrom").value, date = $("cpDate").value || today(); if (!o || !ready()) return;
  if (!(amt > 0)) { toast("금액을 적어 주세요."); return; }
  if (!S.accounts.has(from)) { toast("카드값이 빠지는 통장을 골라 주세요."); return; }
  cardPayFor = null; closeDlg($("moveDlg"));
  const card = S.accounts.get(o.card), t = today(), id = o.taskId;
  const doc = { kind: "move", account: from, toAccount: o.card, amount: amt, date, memo: `💳 ${cardValue(card && card.name)}${o.start ? ` (${shortDate(o.start)}~${shortDate(o.end)} 사용분)` : ""}`, createdAt: Date.now() };
  act((async () => {
    if (id) { await E.backend.set("money", id, doc); await E.backend.update("tasks", id, { done: true, doneDate: t }); }
    else await E.backend.add("money", doc);
  })(), `💳 카드값 ${won(amt)} 이체를 기록했어요.`).catch(() => {});
}
// 다음 결제: 이번 달 결제일이 안 지났으면 이번 달, 지났으면 다음 달. 결제예정 = 지금 카드값 − 그 결제 이용기간 뒤에 쓴 돈(미결제)
export function cardDue(a, owed) {
  const p = a && a.pay; if (!p || !p.day) return null;
  const t = today(), m0 = t.slice(0, 7);
  let m = m0, pl = cardPayPlan(p, m0);
  if (pl.date < t) { m = shiftMonth(m0, 1); pl = cardPayPlan(p, m); }
  let open = 0; S.money.forEach((x) => { if ((x.kind === "expense" || !x.kind) && x.account === a.id && x.date > pl.to) open += Number(x.amount) || 0; });
  return { m, ...pl, open: Math.min(open, Math.max(0, owed)), due: Math.max(0, owed - open) };
}
function payCardNow(id) {
  const a = S.accounts.get(id); if (!a) return;
  const owed = Math.max(0, -(balances()[id] || 0)), d = cardDue({ ...a, id }, owed), t = today(), m0 = t.slice(0, 7);
  const banks = sortedAccts().filter((x) => x.type !== "card"), p = a.pay || {};
  const from = S.accounts.has(p.from) ? p.from : S.accounts.has(lastAcct("move")) && S.accounts.get(lastAcct("move")).type !== "card" ? lastAcct("move") : banks[0] ? banks[0].id : "";
  // 아직 안 한 '카드값 이체하기' 할 일이 있으면 그걸로 (이번 달 → 다음 결제 달)
  const taskId = [m0, d ? d.m : m0].map((mm) => `cp-${id}-${mm}`).find((k) => S.tasks.has(k) && !S.tasks.get(k).done && !S.money.has(k)) || null;
  const tc = taskId && S.tasks.get(taskId).cardPay;
  showCardPay({ taskId, card: id, from, start: tc ? tc.start : d ? d.from : null, end: tc ? tc.end : d ? d.to : null, date: t, amt: tc ? cardSpent(id, tc.start, tc.end) : d ? d.due : owed });
}

// ---------- 한 달 예산: settings.budgets[월] = { income, items: {id: {cat, memo, amount, createdAt}} } ----------
// 쓸 돈을 분류별로 미리 정해 두면, 예상 수입에서 빼서 여자친구에게 줄 수 있는 돈이 얼마쯤인지 보임
// 예산이 없는 달은 그 전 가장 가까운 달 예산을 그대로 이어서 씀 (고치는 순간 그 달 것으로 저장)
export function planSource(m) {
  const all = S.settings.budgets || {};
  if (all[m]) return m;
  const ks = Object.keys(all).filter((k) => k < m && all[k]).sort();
  return ks.length ? ks[ks.length - 1] : null;
}
export function planOf(m) {
  const src = planSource(m), b = (src && S.settings.budgets[src]) || {};
  const items = Object.entries(b.items || {}).filter(([, v]) => v && v.cat).map(([id, v]) => ({ id, ...v }))
    .sort((a, b2) => (a.createdAt || 0) - (b2.createdAt || 0));
  // 수입: 이번 달 실제 수입 → 아직이면 지난달 실제 수입 (incAuto). 예상 수입을 따로 넣는 칸은 없앰 (예전에 넣은 income은 안 씀)
  // 💝 줄 돈(give): 욱진이가 예산에서 정한 금액 (안 정하면 null → 남는 돈은 다 잔액)
  const prevM = shiftMonth(m, -1), cur = monthTotals(m).inc, prevInc = monthTotals(prevM).inc, incAuto = !cur && prevInc > 0;
  const give = b.give == null || b.give === "" ? null : Number(b.give) || 0;
  return { income: cur || (incAuto ? prevInc : 0), incAuto, incFrom: incAuto ? prevM : null, give, items, total: items.reduce((t, v) => t + (Number(v.amount) || 0), 0), from: src && src !== m ? src : null };
}
export function savePlan(m, patch, msg) {
  if (!ready()) return Promise.resolve();
  const pl = planOf(m);
  if (pl.from) {   // 이어서 쓰던 예산을 이 달 것으로 옮겨 적고 바꿀 칸만 덮어씀
    const base = { items: {} };
    if (pl.give != null) base.give = pl.give;   // 이어 쓰던 줄 돈도 같이 옮김
    pl.items.forEach((v) => { base.items[v.id] = { cat: v.cat, memo: v.memo || "", amount: Number(v.amount) || 0, createdAt: v.createdAt || Date.now() }; });
    patch = deepMerge(base, patch);
  }
  return act(E.backend.saveSettingsDeep({ budgets: { [m]: patch } }), msg).catch(() => {});
}
// 💝 줄 돈: 욱진이가 정한 금액 그대로 (수입에 따라 안 바뀜). 네(관리자)가 [확인했어요] 하면 settings.giveConfirm[월] = {inc, give, at}
export function giveOf(m, r, pl) {
  const conf = (S.settings.giveConfirm || {})[m];
  const ok = pl.give != null && conf && r.inc > 0 && conf.inc === r.inc && Number(conf.give) === pl.give;
  return { give: pl.give, state: pl.give == null ? "none" : ok ? "ok" : "set" };
}
export function renderPlan(m, r) {
  const pl = planOf(m), g = giveOf(m, r, pl), give = g.give, adm = moneyAdminView();
  $("planSub").textContent = pl.from
    ? `${monthLabel(m)} · ${monthLabel(pl.from)} 예산을 이어서 쓰는 중 (고치면 이 달 것만 바뀌어요)`
    : `${monthLabel(m)} · 쓸 돈을 분류별로 정해 두는 곳 (다음 달로 그대로 이어져요)`;
  const left = pl.income - pl.total - (give || 0);   // 잔액 = 수입 − 쓸 돈 − 줄 돈
  $("planTiles").innerHTML =
    `<div class="plan-tile"><span>수입</span><b>${pl.income ? won(pl.income) : "-"}</b><small>${r.inc ? "이번 달 실제" : pl.incAuto ? `지난달 기준 (${monthLabel(pl.incFrom)} 실제)` : "수입이 들어오면 계산돼요"}</small></div>` +
    `<div class="plan-tile"><span>쓸 돈 (예산)</span><b>${won(pl.total)}</b><small>${adm ? `${pl.items.length}개 분류` : pl.items.length ? `실제 ${won(r.exp)} 씀` : "분류별로 추가해요"}</small></div>` +
    (() => {   // 💝 줄 돈 → 15일에 자동으로 '보낸 돈' 기록되면 '준 돈 ✅' + [고치기] (그 기록 열기)
      const gid = `give-${m}`, auto = S.money.get(gid), sent = give != null && r.out >= give;
      const sub = give == null ? (adm ? "욱진이가 예산에서 정해요" : "아래에서 정해요")
        : auto || sent ? `${auto ? shortDate(auto.date) + " " : ""}${won(r.out)} 보냄${r.out < give ? ` · 남은 ${won(give - r.out)}` : ""}${auto && !adm ? ` · <button class="link-btn" type="button" data-act="editMoney" data-id="${gid}">고치기</button>` : ""}`
        : r.out ? `${won(r.out)} 보냄 · 남은 ${won(give - r.out)} · 15일 자동 기록` : "15일에 자동으로 '보낸 돈' 기록";
      return `<div class="plan-tile give"><span>💝 ${esc(partner())}에게 ${auto || sent ? "준 돈 ✅" : "줄 돈"}${g.state === "ok" ? " ✔" : ""}</span><b>${give == null ? "아직 안 정함" : won(give)}</b><small>${sub}</small></div>`;
    })() +
    `<div class="plan-tile left${left < 0 ? " minus" : ""}"><span>잔액</span><b>${pl.income ? won(left) : "-"}</b><small>수입 − 쓸 돈${give == null ? "" : " − 줄 돈"}</small></div>`;
  $("planPie").innerHTML = pieHtml("expense", pl.items.map((v) => ({ cat: v.cat, amt: Number(v.amount) || 0 })), "예산");
  if (document.activeElement !== $("planGive")) $("planGive").value = give == null ? "" : commaNum(give);
  const gf = $("planGiveFrom"), gfv = S.settings.giveFrom || "";
  gf.innerHTML = '<option value="">선택 안 함</option>' + sortedAccts().filter((x) => x.type !== "card").map((x) => `<option value="${esc(x.id)}">${ACCT_ICON[x.type] || ""} ${esc(x.name)}</option>`).join("");
  gf.value = S.accounts.has(gfv) ? gfv : "";
  const planned = new Set(pl.items.map((v) => v.cat));
  const extra = Object.entries(r.byCat).filter(([c]) => !planned.has(c)).reduce((t, [, v]) => t + v, 0);
  if (adm) {
    $("planRows").innerHTML = pl.items.map((v) => `<div class="plan-row plan-ro"><span class="plan-cat">${catDot("expense", v.cat)}${esc(v.cat)}${v.memo ? ` <span class="muted small" style="font-weight:400">· ${esc(v.memo)}</span>` : ""}</span><span class="won">${won(v.amount)}</span></div>`).join("") ||
      '<p class="small muted" style="margin:0">아직 예산이 없어요.</p>';
    return;
  }
  $("planRows").innerHTML = pl.items.map((v) => {
    const used = r.byCat[v.cat] || 0, amt = Number(v.amount) || 0, over = used > amt;
    return `<div class="plan-row"><span class="plan-cat">${catDot("expense", v.cat)}${esc(v.cat)}</span>` +
      `<input type="text" class="plan-memo" maxlength="40" value="${esc(v.memo || "")}" placeholder="메모" data-plan-memo="${esc(v.id)}" aria-label="${esc(v.cat)} 메모">` +
      `<input type="text" class="plan-amt amt-in" inputmode="numeric" autocomplete="off" value="${amt ? commaNum(amt) : ""}" data-plan-amt="${esc(v.id)}" aria-label="${esc(v.cat)} 예산">` +
      `<div class="plan-use"><div class="bar${over ? " over" : ""}"><i style="width:${amt ? Math.min(100, Math.round(used / amt * 100)) : used ? 100 : 0}%;--cat:${catVar("expense", v.cat)}"></i></div>` +
      `<span class="small muted">${won(used)} 씀 · ${over ? `<span class="won minus">${won(used - amt)} 초과</span>` : `<span class="won plus">${won(amt - used)} 남음</span>`}</span></div>` +
      `<button class="icon-btn" type="button" data-act="planDel" data-id="${esc(v.id)}" aria-label="${esc(v.cat)} 예산 빼기">빼기</button></div>`;
  }).join("") + (pl.items.length && extra ? `<div class="plan-row extra"><span class="plan-cat">예산 밖</span><span class="won">${won(extra)}</span><span class="small">예산에 없는 분류로 쓴 돈</span><span></span></div>` : "") +
    (pl.items.length ? "" : '<p class="small muted" style="margin:0">예: 식비 300,000 · 교통·차량 150,000 · 통신 60,000. 분류는 돈 기록의 지출 분류와 같게 쓰면 실제로 쓴 돈이 같이 보여요.</p>');
  $("planCatList").innerHTML = moneyCats("expense").filter((c) => !planned.has(c)).map((c) => `<option value="${esc(c)}">`).join("");
}

export function monthTotals(m) {
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
export function balances() {
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
export const acctName = (id) => !id ? "자산 미지정" : S.accounts.has(id) ? S.accounts.get(id).name : "지운 자산";
export const sortedAccts = () => rows(S.accounts).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
export const ACCT_ICON = { bank: "🏦", card: "💳", cash: "💵", save: "🐷" };

// 관리자(여자친구) 기기에선 지출·자산은 안 보이게 (예산 금액 · 수입 · 보낸 돈만). 화면에서만 숨김
export function moneyAdminView() { return isAdminDevice() && !DEMO; }
export function moneyShown(x) { return !moneyAdminView() || x.kind === "income" || x.kind === "transfer"; }   // 달력 날짜·검색에서도 같게
// 돈 관리 탭: 예산 · 지출 · 자산 · 통계 (이 기기에 기억). 관리자 기기는 자산 탭 없음, 지출 탭은 '내역'(수입·보낸 돈 목록만)
export function mTab() { let v = "budget"; try { v = localStorage.getItem("ukjin-mtab") || "budget"; } catch (e) { /* 무시 */ } if (!["budget", "spend", "assets", "stats"].includes(v) || (v === "assets" && moneyAdminView())) v = "budget"; return v; }
export function setMTab(k) { try { localStorage.setItem("ukjin-mtab", k); } catch (e) { /* 무시 */ } renderMoney(); }
export function renderMTabs() {
  const adm = moneyAdminView(), tab = adm ? "stats" : mTab();   // 관리자 보드 '예산'은 통계만 (실제 수입 · 보낸 돈 · 나머지)
  $("mTabs").hidden = adm;
  // 가계부 모드: 옆 메뉴(PC)·아래 메뉴(폰)의 예산·지출·자산·통계 / 제목: 관리자 보드는 '예산', 그 외 '가계부'
  document.querySelectorAll('.m-nav, #mBottom button').forEach((b) => { const on = b.dataset.k === tab; b.setAttribute(b.tagName === "A" ? "aria-current" : "aria-pressed", on ? (b.tagName === "A" ? "page" : "true") : (b.tagName === "A" ? "" : "false")); if (b.tagName === "A" && !on) b.removeAttribute("aria-current"); });
  $("moneyTitle").textContent = adm ? "예산" : "가계부";
  document.querySelectorAll("#mTabs button").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.k === tab));
    b.hidden = adm && b.dataset.k === "assets";
    if (b.dataset.k === "spend") b.textContent = adm ? "🧾 내역" : "🧾 지출";
  });
  $("mTabs").classList.toggle("seg3", adm);
  document.querySelectorAll("#moneyPage [data-mtab]").forEach((el) => { el.hidden = el.dataset.mtab !== tab; });
}
export function renderMoney() {
  const m = ui.month, r = monthTotals(m), bal = balances(), adm = moneyAdminView();
  renderMTabs();
  setCatMap(planOf(m).items.map((v) => v.cat).concat(Object.keys(r.byCat)));
  $("monthLabel").textContent = monthLabel(m);
  $("moneyPage").classList.toggle("admin-view", adm);
  $("moneyIntro").textContent = adm ? "💡 지출은 욱진이만 보여요. 기능 오류나 추가 기능이 있으면 욱진이에게 자세히 설명해 달라고 하자!" : "통장·카드별로 기록하면 자산마다 잔액이 계산돼요.";
  $("moneyStats").classList.toggle("three", adm);
  $("moneyStats").innerHTML = adm
    ? statTile("실제 수입", won(r.inc)) + statTile(partner() + "에게 보낸 돈", won(r.out), r.inc ? `수입의 ${Math.round(r.out / r.inc * 100)}%` : "") +
      statTile("나머지", won(r.inc - r.out), "실제 수입 − 보낸 돈", "left" + (r.inc - r.out < 0 ? " minus" : ""))
    : statTile("수입", won(r.inc)) +
    statTile(partner() + "에게 보낸 돈", won(r.out), r.inc ? `수입의 ${Math.round(r.out / r.inc * 100)}%` : "") +
    statTile("지출", won(r.exp), r.inc ? `수입의 ${Math.round(r.exp / r.inc * 100)}%` : "") +
    statTile("남은 돈", won(r.left), r.inc ? `수입의 ${Math.round(r.left / r.inc * 100)}%` : "", r.left < 0 ? "minus" : "plus");

  // 내 자산
  const accts = sortedAccts();
  renderAssets(accts, bal);

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
  if (document.activeElement !== $("budgetIn")) $("budgetIn").value = commaNum(budget || "");
  $("catBars").innerHTML = pieHtml("expense", Object.entries(r.byCat).map(([cat, amt]) => ({ cat, amt })), "지출") || '<div class="muted small">이번 달 지출 기록이 아직 없어요.</div>';

  // 최근 내역 조회: 6개월 · 1년 · 기간 (오늘 기준, 새 달이 위). 줄을 누르면 그 달로 (위 예산·내역이 그 달 것으로)
  const tm = today().slice(0, 7), hr = ui.histRange || "6";
  let from = shiftMonth(tm, -5), to = tm;
  if (hr === "12") from = shiftMonth(tm, -11);
  if (hr === "custom") { from = ui.histFrom || shiftMonth(tm, -5); to = ui.histTo || tm; if (from > to) [from, to] = [to, from]; }
  document.querySelectorAll("#histRange button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === hr)));
  $("histCustom").hidden = hr !== "custom";
  if (hr === "custom" && document.activeElement !== $("histFrom") && document.activeElement !== $("histTo")) { $("histFrom").value = from; $("histTo").value = to; }
  const months = []; for (let mm = to; mm >= from && months.length < 60; mm = shiftMonth(mm, -1)) months.push(mm);
  const sum = { inc: 0, plan: 0, out: 0, exp: 0, left: 0 };
  let trs = "";
  months.forEach((mm) => {
    const x = monthTotals(mm), p = planOf(mm).total;
    sum.inc += x.inc; sum.plan += p; sum.out += x.out; sum.exp += x.exp; sum.left += x.left;
    trs += `<tr class="clickable${mm === m ? " cur" : ""}" data-act="histMonth" data-m="${mm}" title="눌러서 ${monthLabel(mm)} 보기"><td class="mono">${monthLabel(mm)}</td><td class="num won">${won(x.inc)}</td>` +
      (adm ? `<td class="num won">${won(x.out)}</td><td class="num won ${x.inc - x.out < 0 ? "minus" : "plus"}">${won(x.inc - x.out)}</td>`
        : `<td class="num won">${p ? won(p) : "-"}</td><td class="num won">${won(x.out)}</td><td class="num won">${won(x.exp)}</td><td class="num won ${x.left < 0 ? "minus" : "plus"}">${won(x.left)}</td>`) + "</tr>";
  });
  const tot = months.length > 1 ? `<tr class="sum"><td>합계 (${months.length}달)</td><td class="num won">${won(sum.inc)}</td>` +
    (adm ? `<td class="num won">${won(sum.out)}</td><td class="num won ${sum.inc - sum.out < 0 ? "minus" : "plus"}">${won(sum.inc - sum.out)}</td>`
      : `<td class="num won">${won(sum.plan)}</td><td class="num won">${won(sum.out)}</td><td class="num won">${won(sum.exp)}</td><td class="num won ${sum.left < 0 ? "minus" : "plus"}">${won(sum.left)}</td>`) + "</tr>" : "";
  $("monthTable").innerHTML = `<thead><tr><th>월</th><th class="num">${adm ? "실제 수입" : "수입"}</th>${adm ? '<th class="num">보낸 돈</th><th class="num">나머지</th>' : '<th class="num">예산 (쓸 돈)</th><th class="num">보낸 돈</th><th class="num">지출</th><th class="num">남은 돈</th>'}</tr></thead><tbody>${trs}${tot}</tbody>`;

  renderMoneyForm();

  // 이번 달 내역 (자산별로 걸러 보기)
  $("acctFilter").innerHTML = accts.length ? [["all", "전체"]].concat(accts.map((a) => [a.id, a.name])).map(([k, l]) =>
    `<button class="chip" type="button" data-act="acctFilter" data-k="${esc(k)}" aria-pressed="${ui.acctFilter === k}">${esc(l)}</button>`).join("") : "";
  const items = r.items.filter((x) => adm ? x.kind === "income" || x.kind === "transfer" : ui.acctFilter === "all" || x.account === ui.acctFilter || x.toAccount === ui.acctFilter)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
  $("moneyCount").textContent = items.length ? items.length + "건" + (adm ? " · 수입·보낸 돈만" : " · 줄을 누르면 고칠 수 있어요") : "";
  $("moneyTable").innerHTML = !S.loaded ? '<tbody><tr><td class="muted">불러오는 중…</td></tr></tbody>'
    : !items.length ? `<tbody><tr><td class="muted">${monthLabel(m)} 기록이 없어요.</td></tr></tbody>`
    : `<thead><tr><th>날짜</th><th>구분</th><th>분류</th><th>자산</th><th>메모</th><th class="num">금액</th></tr></thead><tbody>` +
      items.map((x) => {
        const kind = x.kind || "expense", sign = kind === "income" ? "+" : kind === "move" ? "" : "-";
        const where = kind === "move" ? `${esc(acctName(x.account))} → ${esc(acctName(x.toAccount))}` : esc(acctName(x.account));
        return `<tr${adm ? "" : ` class="clickable${ui.mEdit === x.id ? " cur" : ""}" data-act="editMoney" data-id="${esc(x.id)}"`}><td class="mono">${shortDate(x.date)}</td>` +
          `<td>${esc(kind === "transfer" ? partner() + "에게" : KIND_LABEL[kind])}</td><td>${kind === "move" ? "-" : x.cat ? catDot(kind, x.cat) + esc(x.cat) : ""}</td><td>${where}</td><td>${esc(x.memo || "")}</td>` +
          `<td class="num won ${kind === "income" ? "plus" : kind === "move" ? "" : "minus"}">${sign}${won(x.amount)}</td></tr>`;
      }).join("") + "</tbody>";
}

// ---------- 🏦 자산 탭: 왼쪽 목록(현금·통장·카드·저축 묶음, 합계, 접기) + 오른쪽 자세히 ----------
// 자세히 = 그 달 입금·출금·합계·누적잔액 + 내역(줄마다 그때 잔액). 고른 자산·접은 묶음은 이 기기에 기억 (ukjin-as-sel, ukjin-as-fold)
// 좁은 화면(≤1100px)은 목록만 → 자산을 누르면 자세히(ui.asOpen), [‹ 목록]으로 돌아감
const AS_GROUPS = [["cash", "현금"], ["bank", "통장"], ["card", "카드"], ["save", "저축"]];
function lsGet(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 무시 */ } }
function asFold() { try { return JSON.parse(lsGet("ukjin-as-fold") || "{}") || {}; } catch (e) { return {}; } }
export function asSelected() { const id = lsGet("ukjin-as-sel"); if (S.accounts.has(id)) return id; const a = sortedAccts()[0]; return a ? a.id : null; }
// 이 자산에 들고 난 돈 (d: + 들어옴 / − 나감), 날짜 → 넣은 순서
export function acctFlow(id) {
  const out = [];
  S.money.forEach((x, mid) => {
    const amt = Number(x.amount) || 0; let d = 0;
    if (x.kind === "move") { if (x.account === id) d -= amt; if (x.toAccount === id) d += amt; }
    else if (x.account === id) d = x.kind === "income" ? amt : -amt;
    if (d) out.push({ ...x, id: mid, d });
  });
  return out.sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.createdAt || 0) - (b.createdAt || 0));
}
// 그 달에 보여 줄 기간: 보통은 달력 한 달. 결제일을 정한 카드는 결제일 기준 = 그 달에 빠지는 카드값의 이용기간 (date = 결제일)
export function acctPeriod(a, m) { return a && a.type === "card" && a.pay && a.pay.day ? cardPayPlan(a.pay, m) : { from: `${m}-01`, to: dayInMonth(m, 31) }; }
const ymdDot = (s) => `${s.slice(2, 4)}.${+s.slice(5, 7)}.${+s.slice(8)}`;   // 2026-10-01 → 26.10.1
function renderAssets(accts, bal) {
  const fold = asFold(), sel = asSelected(), owedOf = (a) => Math.max(0, -(bal[a.id] || 0));
  const total = accts.reduce((s2, a) => s2 + (bal[a.id] || 0), 0);
  const owed = accts.filter((a) => a.type === "card").reduce((s2, a) => s2 + owedOf(a), 0);
  $("assetTotal").innerHTML = accts.length ? `총자산 <span class="won ${total < 0 ? "minus" : ""}">${won(total)}</span>${owed ? ` · 갚을 카드값 <span class="won minus">${won(owed)}</span>` : ""}` : "";
  $("acctList").innerHTML = accts.length ? AS_GROUPS.map(([t, label]) => {
    const list = accts.filter((a) => (ACCT_TYPES[a.type] ? a.type : "bank") === t); if (!list.length) return "";
    const card = t === "card", shut = !!fold[t], sum = list.reduce((s2, a) => s2 + (card ? owedOf(a) : bal[a.id] || 0), 0);
    // 💳 카드는 결제일 기준 두 칸: 결제예정(다음 결제일에 빠질 돈) · 미결제(그 뒤 이용기간에 쓰는 중). 결제일을 안 정했으면 갚을 카드값 전체를 결제예정 칸에
    const dues = card ? list.map((a) => cardDue(a, owedOf(a)) || { due: owedOf(a), open: 0, none: true }) : [];
    const two = (l1, v1, l2, v2) => `<span class="as-cp"><span><small>${l1}</small><b class="won">${v1}</b></span><span><small>${l2}</small><b class="won">${v2}</b></span></span>`;
    return `<div class="as-group t-${t}"><button type="button" class="as-gh" data-act="asFold" data-k="${t}" aria-expanded="${!shut}">` +
      `<span>${ACCT_ICON[t]} ${label}<small>${list.length}</small><i class="as-chev" aria-hidden="true"></i></span>` +
      (card ? two("결제예정", won(dues.reduce((s2, d) => s2 + d.due, 0)), "미결제", won(dues.reduce((s2, d) => s2 + d.open, 0))) : `<b class="won${sum < 0 ? " minus" : ""}">${won(sum)}</b>`) + "</button>" +
      (shut ? "" : list.map((a, i) => { const v = bal[a.id] || 0, d = dues[i];
        return `<button type="button" class="as-row${a.id === sel ? " on" : ""}" data-act="asSel" data-id="${esc(a.id)}" aria-pressed="${a.id === sel}"><span class="as-name">${esc(a.name)}</span>` +
          (card ? `<span class="as-cp"><b class="won">${won(d.due)}</b><b class="won">${d.none ? "-" : won(d.open)}</b></span>` : `<b class="won${v < 0 ? " minus" : ""}">${won(v)}</b>`) + "</button>";
      }).join("")) + "</div>";
  }).join("") : '<p class="muted small" style="margin:0">통장·카드·현금을 추가하면 어디서 쓰고 어디로 들어왔는지 기록하고, 자산마다 잔액을 볼 수 있어요.</p>';
  $("asGrid").classList.toggle("as-open", !!ui.asOpen && !!sel);
  renderAssetDetail(sel);
}
function renderAssetDetail(id) {
  const box = $("asDetail"), a = id && S.accounts.get(id);
  if (!a) { box.innerHTML = '<p class="muted small" style="margin:0">자산을 추가하면 여기에 그 달 내역과 잔액이 보여요.</p>'; return; }
  const m = ui.month, card = a.type === "card", p = acctPeriod(a, m), shown = [], payCard = card && !!p.date;
  const flow = acctFlow(id), init = Number(a.initial) || 0;
  let run = init, endBal = run, inn = 0, out = 0;
  // 결제일 기준 카드: 쓴 돈은 이용기간, 낸 돈(통장 → 카드)은 지난달 결제일 다음 날 ~ 이 달 결제일
  const prevPay = payCard ? cardPayPlan(a.pay, shiftMonth(m, -1)).date : "";
  const inP = (x) => payCard && x.d > 0 ? x.date > prevPay && x.date <= p.date : x.date >= p.from && x.date <= p.to;
  flow.forEach((x) => {
    run += x.d; x.bal = run;
    if (x.date <= p.to) endBal = run;
    if (inP(x)) { shown.push(x); if (x.d > 0) inn += x.d; else out -= x.d; }
  });
  // 📈 최근 12달 (보고 있는 달까지): 통장·현금·저축 = 그 달 끝 잔액 꺾은선, 카드 = 그 달 기간에 쓴 돈 막대
  asChart = { card, m, pts: Array.from({ length: 12 }, (_, i) => shiftMonth(m, i - 11)).map((mm) => {
    const q = acctPeriod(a, mm);
    return { m: mm, v: card ? flow.reduce((t, x) => t + (x.d < 0 && x.date >= q.from && x.date <= q.to ? -x.d : 0), 0) : init + flow.reduce((t, x) => t + (x.date <= q.to ? x.d : 0), 0) };
  }) };
  const balTxt = (v) => card ? `카드값 ${won(Math.max(0, -v))}` : `잔액 ${won(v)}`;
  const tile = (label, v, cls) => `<div><span>${label}</span><b class="won${cls ? " " + cls : ""}">${v}</b></div>`;
  box.innerHTML =
    `<div class="as-head"><button class="icon-btn as-back" type="button" data-act="asBack">‹ 목록</button>` +
    `<h3><span aria-hidden="true">${ACCT_ICON[a.type] || "🏦"}</span><span class="as-title">${esc(a.name)}</span><button class="icon-btn" type="button" data-act="editAcct" data-id="${esc(id)}" aria-label="${esc(a.name)} 고치기" title="이름·잔액${card ? "·결제일" : ""} 고치기">✏️</button></h3>` +
    (card ? `<button class="btn small as-pay" type="button" data-act="cardPayNow" data-id="${esc(id)}">💳 결제</button>` : "") +
    `<div class="as-month"><button class="chip" type="button" data-act="month" data-d="-1" aria-label="이전 달">‹</button><b>${monthLabel(m)}</b><button class="chip" type="button" data-act="month" data-d="1" aria-label="다음 달">›</button></div></div>` +
    `<p class="small muted as-period">${payCard ? `<b>${+m.slice(5)}월 ${+p.date.slice(8)}일 결제</b> · 이용기간 ${ymdDot(p.from)} ~ ${ymdDot(p.to)}`
      : `기간 ${ymdDot(p.from)} ~ ${ymdDot(p.to)}${card ? ` · <button class="link-btn" type="button" data-act="editAcct" data-id="${esc(id)}">결제일을 정하면</button> 결제일 기준으로 보여요` : ""}`}</p>` +
    `<div class="as-stats">${payCard
      ? tile("결제할 돈", won(out), "minus") + tile("낸 돈", won(inn), "plus") + tile("남은 결제액", won(Math.max(0, out - inn)), out > inn ? "minus" : "") + tile("지금 카드값", won(Math.max(0, -run)))
      : tile(card ? "갚은 돈" : "입금", won(inn), "plus") + tile(card ? "쓴 돈" : "출금", won(out), "minus") + tile("합계", won(inn - out), inn - out < 0 ? "minus" : "") +
        tile(card ? "남은 카드값" : "누적잔액", card ? won(Math.max(0, -endBal)) : won(endBal), !card && endBal < 0 ? "minus" : "")}</div>` +
    `<div class="as-chart-h small muted">${payCard ? "달마다 결제할 돈 (결제일 기준)" : card ? "달마다 쓴 돈" : "달마다 잔액 (그 달 끝)"} · 최근 12달</div><div class="as-chart" id="asChart"></div>` +
    `<div class="as-tx">${shown.reverse().map((x) => {
      const kind = x.kind || "expense";
      const what = kind === "move" ? (x.d < 0 ? `→ ${esc(acctName(x.toAccount))}` : `← ${esc(acctName(x.account))}`)
        : `${x.cat ? catDot(kind, x.cat) + esc(x.cat) : esc(KIND_LABEL[kind])}${kind === "transfer" ? ` <span class="muted small">(${esc(partner())}에게)</span>` : ""}`;
      return `<button type="button" class="as-tr" data-act="editMoney" data-id="${esc(x.id)}"><span class="as-d mono">${shortDate(x.date)}</span><span class="as-c">${what}</span><span class="as-m">${esc(x.memo || "")}</span>` +
        `<span class="as-a"><b class="won ${x.d > 0 ? "plus" : "minus"}">${x.d > 0 ? "+" : "-"}${won(Math.abs(x.d))}</b><small>${balTxt(x.bal)}</small></span></button>`;
    }).join("") || `<p class="muted small" style="margin:8px 0 0">${monthLabel(m)}에 이 자산 기록이 없어요.</p>`}</div>`;
  drawAsChart();
}
// 그래프는 칸 너비 그대로 그림 (글자가 안 줄어들게) → 너비가 바뀌면 다시 그림 (initMoney의 ResizeObserver)
let asChart = null;
const axisWon = (v) => { const n = Math.abs(v), s = v < 0 ? "-" : ""; return n >= 1e8 ? s + +(n / 1e8).toFixed(1) + "억" : n >= 1e4 ? s + Math.round(n / 1e4).toLocaleString("ko-KR") + "만" : s + n.toLocaleString("ko-KR"); };
function niceStep(span) { const raw = span / 4 || 1, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
export function drawAsChart() {
  const el = $("asChart"); if (!el || !asChart) return;
  const { card, m, pts } = asChart, W = Math.max(260, el.clientWidth || 600), H = 170, L = 44, R = 8, T = 8, B = 24, pw = W - L - R, ph = H - T - B;
  const vs = pts.map((p) => p.v);
  let lo = Math.min(0, ...vs), hi = Math.max(0, ...vs); if (hi === lo) hi = lo + 10000;
  const st = niceStep(hi - lo); lo = Math.floor(lo / st) * st; hi = Math.ceil(hi / st) * st;
  const n = pts.length, cw = pw / n, x = (i) => L + cw * (i + 0.5), y = (v) => T + ph - (v - lo) / (hi - lo) * ph, f = (v) => v.toFixed(1);
  let s = `<rect x="${L}" y="${T}" width="${f(pw)}" height="${ph}" class="bg"/>`;
  for (let k = 0, steps = Math.round((hi - lo) / st); k <= steps; k++) { const v = lo + k * st; s += `<line x1="${L}" x2="${f(W - R)}" y1="${f(y(v))}" y2="${f(y(v))}"${v === 0 ? ' class="z"' : ""}/><text x="${L - 6}" y="${f(y(v) + 3.5)}" class="yl">${axisWon(v)}</text>`; }
  s += `<line x1="${f(x(n - 1))}" x2="${f(x(n - 1))}" y1="${T}" y2="${T + ph}" class="cur"/>`;
  if (card) { const bw = Math.min(26, cw * 0.55); s += pts.map((p, i) => `<rect x="${f(x(i) - bw / 2)}" y="${f(Math.min(y(p.v), y(0)))}" width="${f(bw)}" height="${f(p.v ? Math.max(1.5, Math.abs(y(0) - y(p.v))) : 0)}" rx="3" class="cbar${p.m === m ? " on" : ""}"><title>${monthLabel(p.m)} 쓴 돈 ${won(p.v)}</title></rect>`).join(""); }
  else s += `<polyline points="${pts.map((p, i) => f(x(i)) + "," + f(y(p.v))).join(" ")}" class="ln"/>` + pts.map((p, i) => `<circle cx="${f(x(i))}" cy="${f(y(p.v))}" r="${p.m === m ? 4.5 : 3}" class="dot"><title>${monthLabel(p.m)} 끝 잔액 ${won(p.v)}</title></circle>`).join("");
  const every = cw < 30 ? 2 : 1;
  s += pts.map((p, i) => (n - 1 - i) % every ? "" : `<text x="${f(x(i))}" y="${H - 7}" class="xl${p.m === m ? " on" : ""}">${+p.m.slice(5)}월</text>`).join("");
  el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${card ? "달마다 쓴 돈" : "달마다 잔액"} 최근 12달">${s}</svg>`;
}

// 돈 기록 폼: 종류에 맞게 자산·분류 칸 바꾸기
export function acctOptions(sel, cur, kind) {
  const list = sortedAccts();
  // 수입은 카드로 받을 일이 없으니 카드 빼기
  const ok = list.filter((a) => !(kind === "income" && a.type === "card"));
  sel.innerHTML = '<option value="">선택 안 함</option>' + ok.map((a) => `<option value="${esc(a.id)}">${ACCT_ICON[a.type] || ""} ${esc(a.name)}</option>`).join("") +
    (cur && !ok.some((a) => a.id === cur) ? `<option value="${esc(cur)}">${esc(acctName(cur))}</option>` : "");
  sel.value = cur || "";
}
export function lastAcct(kind) { try { return localStorage.getItem("ukjin-lastacct-" + kind) || ""; } catch (e) { return ""; } }
export function rememberAcct(kind, id) { try { localStorage.setItem("ukjin-lastacct-" + kind, id || ""); } catch (e) { /* 무시 */ } }
export function renderMoneyForm(fill) {
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
export function editMoney(id) {
  const x = S.money.get(id); if (!x) return;
  try { localStorage.setItem("ukjin-mtab", "spend"); } catch (e) { /* 무시 */ }
  ui.mEdit = id; ui.kind = x.kind || "expense";
  $("mAmount").value = commaNum(x.amount || ""); $("mDate").value = x.date || today(); $("mMemo").value = x.memo || "";
  renderMoneyForm(x); renderMoney();
  $("moneyPanel").scrollIntoView({ behavior: "smooth", block: "start" });
}
export function resetMoneyForm() {
  ui.mEdit = null; $("mAmount").value = ""; $("mMemo").value = ""; $("mDate").value = today();
  renderMoney();
}

// ---------- 자산 작은 창 ----------
export const ac = { id: null, type: "bank" };
export function openAcct(id) {
  const a = id ? S.accounts.get(id) : null;
  ac.id = id || null; ac.type = (a && a.type) || "bank";
  $("acTitle").textContent = a ? "자산 고치기" : "자산 추가";
  $("acName").value = a ? a.name : "";
  $("acInit").value = a ? commaNum((ac.type === "card" ? -(Number(a.initial) || 0) : Number(a.initial) || 0) || "", true) : "";
  const del = $("acDel"); del.hidden = !a; del.classList.remove("armed"); del.textContent = "이 자산 삭제"; delete del.dataset.armed;
  // 💳 카드 결제일·빠지는 통장·이용기간 (기본 전월 1일 ~ 전월 말일, 31 = 말일)
  const p = (a && a.pay) || {}, days = (max, last) => Array.from({ length: max }, (_, i) => i + 1).map((n) => `<option value="${n}">${n === 31 && last ? "말일" : n + "일"}</option>`).join("");
  $("acPayDay").innerHTML = '<option value="">아직 안 정함</option>' + days(31, true);
  $("acFromD").innerHTML = days(31, true); $("acToD").innerHTML = days(31, true);
  $("acPayFrom").innerHTML = sortedAccts().filter((x) => x.type !== "card").map((x) => `<option value="${esc(x.id)}">${ACCT_ICON[x.type] || ""} ${esc(x.name)}</option>`).join("") || '<option value="">통장을 먼저 추가해 주세요</option>';
  $("acPayDay").value = p.day || ""; if (p.from) $("acPayFrom").value = p.from;
  $("acFromM").value = String(p.fm ?? -1); $("acFromD").value = String(p.fd || 1); $("acToM").value = String(p.tm ?? -1); $("acToD").value = String(p.td || 31);
  renderAcctForm(); openDlg($("acctDlg"));
}
export function renderAcctForm() {
  document.querySelectorAll("#acTypeSeg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === ac.type)));
  const card = ac.type === "card";
  $("acInitLabel").textContent = card ? "지금 남아 있는 카드값 (원)" : "지금 잔액 (원)";
  $("acHint").textContent = card ? "카드로 쓴 지출만큼 카드값이 늘고, 통장 → 카드 '이체'로 갚으면 줄어요." : "앞으로 이 자산으로 들어오고 나간 기록이 잔액에 반영돼요.";
  $("acPay").hidden = !card;
}

// ---------- 분류 편집 ----------
export function renderCatEditor() {
  const groups = [["expense", "지출 분류"], ["income", "수입 분류"], ["transfer", "보낸 돈 분류"]];
  $("catEditor").innerHTML = groups.map(([k, label]) =>
    `<div class="dlg-sec"><h4>${label}</h4><div class="chips">` +
    moneyCats(k).map((c, i) => `<span class="chip"><button type="button" class="cdot-btn" data-act="catColor" data-k="${k}" data-i="${i}" style="--c:${catVar(k, c)}" aria-label="${esc(c)} 색 바꾸기" title="눌러서 색 바꾸기"></button>${esc(c)} <button class="link-btn" type="button" data-act="catDel" data-k="${k}" data-i="${i}" aria-label="${esc(c)} 지우기">×</button></span>`).join("") +
    `</div><form class="mini-row" data-cat-form="${k}" autocomplete="off"><input type="text" maxlength="12" placeholder="새 분류 이름" aria-label="${label} 추가"><button class="btn small" type="submit">추가</button></form></div>`
  ).join("") + '<div class="dlg-foot"><button class="btn ghost small" type="button" data-act="catReset">기본 분류로 되돌리기</button><span class="small muted">이미 적은 기록의 분류는 바뀌지 않아요.</span></div>';
}
export function saveCats(kind, list) {
  if (!ready()) return;
  const all = { income: moneyCats("income"), expense: moneyCats("expense"), transfer: moneyCats("transfer") };
  if (kind) all[kind] = list;
  act(E.backend.saveSettings({ moneyCats: kind ? all : null }), "분류를 저장했어요.").then(() => { renderCatEditor(); renderMoneyForm(); }).catch(() => {});
}


// 🧪 연습 가계부 가짜 데이터: 통장·카드·현금·저축, 지난 3달 + 이번 달 월급(10일)·지출·카드값(15일)·줄 돈(15일), 예산·줄 돈
// 특정 상황이 필요하면 여기에 더 넣으면 됨 (주인이 말해 주면 Claude가 상황에 맞게 추가)
export function makeDemoData() {
  const t = today(), m0 = t.slice(0, 7), now = Date.now(), money = {}, rnd = (a, b) => Math.round((a + Math.random() * (b - a)) / 100) * 100;
  let n = 0; const put = (doc) => { money["d" + (++n)] = { createdAt: now + n, ...doc }; };
  const accounts = {
    bank: { name: "국민 월급통장", type: "bank", initial: 1200000, createdAt: 1 },
    card: { name: "현대카드", type: "card", initial: 0, createdAt: 2, pay: { day: 15, from: "bank", fm: -1, fd: 4, tm: 0, td: 3, since: shiftMonth(m0, -3) + "-01" } },
    cash: { name: "현금", type: "cash", initial: 300000, createdAt: 3 },
    save: { name: "청년 적금", type: "save", initial: 3000000, createdAt: 4 }
  };
  const spend = [["식비", 8000, 15000, 10], ["카페·간식", 3000, 7000, 6], ["교통·차량", 10000, 50000, 3], ["장보기", 20000, 60000, 3], ["데이트", 30000, 80000, 2], ["통신", 59000, 59000, 1], ["생필품", 5000, 25000, 2], ["쇼핑", 20000, 70000, 1]];
  for (let k = -3; k <= 0; k++) {
    const m = shiftMonth(m0, k), last = new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate(), upto = k === 0 ? +t.slice(8) : last, day = (d) => `${m}-${pad(Math.min(d, last))}`;
    if (upto >= 10) put({ kind: "income", cat: "월급", amount: 2600000 + (k % 2) * 100000, date: day(10), account: "bank", memo: `${+m.slice(5)}월 월급` });
    spend.forEach(([cat, lo, hi, times]) => { for (let i = 0; i < times; i++) { const d = 1 + Math.floor(Math.random() * upto); put({ kind: "expense", cat, amount: rnd(lo, hi), date: day(d), account: cat === "통신" ? "bank" : Math.random() < 0.75 ? "card" : Math.random() < 0.8 ? "bank" : "cash", memo: "" }); } });
    if (k < 0 || upto >= 15) put({ kind: "transfer", cat: "생활비", amount: 1500000, date: day(15), account: "bank", memo: `💝 ${+m.slice(5)}월 줄 돈` });
  }
  // 카드값: 15일에 이용기간(전월 4일 ~ 당월 3일) 카드 사용액만큼 통장 → 카드 (이번 달은 15일이 지났을 때만)
  for (let k = -2; k <= 0; k++) {
    const m = shiftMonth(m0, k), date = `${m}-15`, from = `${shiftMonth(m, -1)}-04`, to = `${m}-03`;
    if (date > t) continue;
    const amt = Object.values(money).filter((x) => x.kind === "expense" && x.account === "card" && x.date >= from && x.date <= to).reduce((a, x) => a + x.amount, 0);
    if (amt) put({ kind: "move", amount: amt, date, account: "bank", toAccount: "card", memo: `💳 현대카드값 (${+from.slice(5, 7)}/4~${+m.slice(5)}/3 사용분)` });
  }
  const items = { a: { cat: "식비", memo: "점심", amount: 300000, createdAt: 1 }, b: { cat: "교통·차량", memo: "", amount: 150000, createdAt: 2 }, c: { cat: "통신", memo: "", amount: 60000, createdAt: 3 }, d: { cat: "데이트", memo: "", amount: 200000, createdAt: 4 }, e: { cat: "기타", memo: "", amount: 50000, createdAt: 5 } };
  const budgets = {}; for (let k = -3; k <= 0; k++) budgets[shiftMonth(m0, k)] = { items: clone(items), give: 1500000 };
  const autoTasks = {}; for (let k = -3; k <= 0; k++) { const m = shiftMonth(m0, k); autoTasks[`give-${m}`] = true; autoTasks[`cp-card-${m}`] = true; }
  return { settings: { ...DEFAULTS, createdAt: now - 100 * 864e5, budgets, autoTasks, giveFrom: "bank" }, accounts, money, goals: {}, tasks: {}, logs: {}, requests: {}, wins: {} };
}


// 돈 관리 화면의 입력 칸 연결 (bindMoney 다음에 한 번)
export function initMoney() {
  if (window.ResizeObserver) { let w = 0; new ResizeObserver(() => { const nw = $("asDetail").clientWidth; if (nw && nw !== w) { w = nw; drawAsChart(); } }).observe($("asDetail")); }
  $("moneyForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    if (!ready()) return;
    const amount = amtVal($("mAmount"));
    if (!(amount > 0)) { toast("금액을 적어 주세요."); return; }
    const date = $("mDate").value || today(), k = ui.kind;
    const account = $("mAcct").value || null, toAccount = k === "move" ? ($("mTo").value || null) : null;
    if (k === "move" && (!account || !toAccount)) { toast("이체는 보내는 곳과 받는 곳을 골라 주세요."); return; }
    if (k === "move" && account === toAccount) { toast("보내는 곳과 받는 곳이 같아요."); return; }
    const doc = { kind: k, amount, date, cat: k === "move" ? null : $("mCat").value, memo: $("mMemo").value.trim(), account, toAccount };
    rememberAcct(k, account); if (k === "move") rememberAcct("moveTo", toAccount);
    const editing = ui.mEdit && S.money.has(ui.mEdit);
    act(editing ? E.backend.update("money", ui.mEdit, doc) : E.backend.add("money", { ...doc, createdAt: Date.now() }), editing ? "고쳤어요." : "기록했어요.")
      .then(() => { if (date.slice(0, 7) !== ui.month) ui.month = date.slice(0, 7); resetMoneyForm(); }).catch(() => {});
  });

  $("acctForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    if (!ready()) return;
    const name = $("acName").value.trim(); if (!name) { toast("이름을 적어 주세요."); return; }
    const v = amtVal($("acInit"));
    const doc = { name, type: ac.type, initial: ac.type === "card" ? -Math.abs(v) : v };
    if (ac.type === "card") {   // 결제일을 정하면 그날부터 자동 이체 (정한 날 전 결제일은 건드리지 않음 — since)
      const day = parseInt($("acPayDay").value, 10) || 0, from = $("acPayFrom").value, old = (ac.id && (S.accounts.get(ac.id) || {}).pay) || {};
      if (day && !from) { toast("카드값이 빠지는 통장을 골라 주세요."); return; }
      doc.pay = day ? { day, from, fm: +$("acFromM").value, fd: +$("acFromD").value, tm: +$("acToM").value, td: +$("acToD").value, since: old.since || today() } : null;
    }
    act(ac.id ? E.backend.update("accounts", ac.id, doc) : E.backend.add("accounts", { ...doc, createdAt: Date.now() }), ac.id ? "자산을 고쳤어요." : "자산을 추가했어요.")
      .then(() => closeDlg($("acctDlg"))).catch(() => {});
  });
  $("catEditor").addEventListener("submit", (ev) => {
    const f = ev.target.closest("[data-cat-form]"); if (!f) return;
    ev.preventDefault();
    const k = f.dataset.catForm, v = f.querySelector("input").value.trim(); if (!v) return;
    const list = moneyCats(k); if (list.includes(v)) { toast("이미 있는 분류예요."); return; }
    list.push(v); saveCats(k, list);
  });

  ["histFrom", "histTo"].forEach((k) => $(k).addEventListener("change", () => { ui[k] = $(k).value || null; renderMoney(); }));
  $("planAddForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const m = ui.month, cat = $("planCat").value.trim(), memo = $("planMemo").value.trim(), amount = amtVal($("planAmt"));
    if (!cat) { toast("분류를 적어 주세요. 예: 식비"); return; }
    if (planOf(m).items.some((v) => v.cat === cat)) { toast("이미 있는 분류예요. 금액 칸을 고쳐 주세요."); return; }
    const id = "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    savePlan(m, { items: { [id]: { cat, memo, amount, createdAt: Date.now() } } }, `${cat} 예산을 넣었어요.`).then(() => { $("planCat").value = ""; $("planMemo").value = ""; $("planAmt").value = ""; $("planCat").focus(); });
  });
  $("planGiveFrom").addEventListener("change", () => act(E.backend.saveSettings({ giveFrom: $("planGiveFrom").value || null }), "💝 보내는 통장을 저장했어요.").catch(() => {}));
  $("planGive").addEventListener("change", () => { const v = $("planGive").value.trim(); savePlan(ui.month, { give: v ? amtVal($("planGive")) : null }, v ? `💝 줄 돈을 ${won(amtVal($("planGive")))}으로 정했어요.` : "💝 줄 돈을 비웠어요. 남는 돈은 다 잔액이에요."); });
  $("planRows").addEventListener("change", (ev) => {
    const d = ev.target.dataset || {};
    if (d.planMemo) { savePlan(ui.month, { items: { [d.planMemo]: { memo: ev.target.value.trim() } } }, "메모를 고쳤어요."); return; }
    const id = d.planAmt; if (!id) return;
    savePlan(ui.month, { items: { [id]: { amount: amtVal(ev.target) } } }, "예산을 고쳤어요.");
  });
  $("budgetForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    if (!ready()) return;
    act(E.backend.saveSettings({ budget: amtVal($("budgetIn")) }), "예산을 저장했어요.").catch(() => {});
  });
}

// 돈 관리 버튼 동작: 처리했으면 true (보드 쪽 클릭 처리기가 먼저 물어봄)
export function moneyAction(a, el, id, t) {
  if (a === "cardPayDo") { doCardPay(); return true; }
  if (a === "planDel") { const v = planOf(ui.month).items.find((z) => z.id === id); savePlan(ui.month, { items: { [id]: null } }, v ? `${v.cat} 예산을 뺐어요.` : ""); return true; }
  if (a === "histRange") { ui.histRange = el.dataset.k; renderMoney(); return true; }
  if (a === "histMonth") { ui.month = el.dataset.m; renderMoney(); const p = $("planPanel"); if (p) p.scrollIntoView({ behavior: "smooth", block: "start" }); toast(`${monthLabel(el.dataset.m)} 예산·내역을 보여요.`); return true; }
  if (a === "month") { ui.month = shiftMonth(ui.month, +el.dataset.d); renderMoney(); return true; }
  if (a === "kind") { ui.kind = el.dataset.k; if (!ui.mEdit) { $("mAcct").value = ""; $("mTo").value = ""; } renderMoneyForm(); return true; }
  if (a === "editMoney") { editMoney(id); return true; }
  if (a === "mCancel") { resetMoneyForm(); return true; }
  if (a === "mDelete") {
    if (!ready() || !ui.mEdit) return true;
    if (el.dataset.armed !== "1") { el.dataset.armed = "1"; el.classList.add("armed"); el.textContent = "정말 삭제?"; return true; }
    act(E.backend.remove("money", ui.mEdit), "삭제했어요.").then(resetMoneyForm).catch(() => {});
    return true;
  }
  if (a === "asSel") { lsSet("ukjin-as-sel", id); ui.asOpen = true; renderMoney(); if (window.matchMedia("(max-width: 1100px)").matches) $("asGrid").scrollIntoView({ block: "start" }); return true; }
  if (a === "asBack") { ui.asOpen = false; renderMoney(); $("asGrid").scrollIntoView({ block: "start" }); return true; }
  if (a === "cardPayNow") { payCardNow(id); return true; }
  if (a === "asFold") { const f = asFold(); if (f[el.dataset.k]) delete f[el.dataset.k]; else f[el.dataset.k] = 1; lsSet("ukjin-as-fold", JSON.stringify(f)); renderMoney(); return true; }
  if (a === "acctFilter") { ui.acctFilter = el.dataset.k; renderMoney(); return true; }
  if (a === "newAcct") { openAcct(null); return true; }
  if (a === "editAcct") { openAcct(id); return true; }
  if (a === "demoReset") { try { localStorage.removeItem("ukjin-money-demo"); } catch (e) { /* 무시 */ } toast("연습 데이터를 새로 만들어요…"); setTimeout(() => location.reload(), 300); return true; }
  if (a === "mTab") { setMTab(el.dataset.k); return true; }
  if (a === "closeAcct") { closeDlg($("acctDlg")); return true; }
  if (a === "acType") { ac.type = el.dataset.k; renderAcctForm(); return true; }
  if (a === "delAcct") {
    if (!ready() || !ac.id) return true;
    if (el.dataset.armed !== "1") { el.dataset.armed = "1"; el.classList.add("armed"); el.textContent = "정말 삭제? (기록은 남아요)"; return true; }
    act(E.backend.remove("accounts", ac.id), "자산을 지웠어요.").then(() => closeDlg($("acctDlg"))).catch(() => {});
    return true;
  }
  if (a === "editCats") { renderCatEditor(); openDlg($("catDlg")); return true; }
  if (a === "closeCats") { closeDlg($("catDlg")); return true; }
  if (a === "catColor") {
    if (!ready()) return true;
    const k = el.dataset.k, c = moneyCats(k)[+el.dataset.i]; if (c == null) return true;
    act(E.backend.saveSettingsDeep({ catColors: { [k]: { [catKey(c)]: (catIdx(k, c) + 1) % (CAT_N + 1) } } })).then(() => { renderCatEditor(); render(); }).catch(() => {});
    return true;
  }
  if (a === "catDel") { const list = moneyCats(el.dataset.k); list.splice(+el.dataset.i, 1); if (!list.length) { toast("분류는 하나 이상 있어야 해요."); return true; } saveCats(el.dataset.k, list); return true; }
  if (a === "catReset") { saveCats(null); return true; }
  return false;
}
