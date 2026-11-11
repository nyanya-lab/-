// 🎟️ 복권·쿠폰함 — 실천 보드(app.js)에서 떼어 낸 코드 (2026-11-11). 보드 쪽 공통 함수·상태는 시작할 때 bindLotto(env)로 받고, 값이 바뀌는 backend·testMode·realBackend 는 E.이름 으로 읽음
//   📝 복권 관리(관리자) · 👏 칭찬·감점 · 🪙 긁기 · 🛡️ 연속 채우기 · 📸 인증샷·추억 · 😈 벌칙 할 일 · 쿠폰함 · 💌 쿠폰 요청 · 🎯 타이밍 게임 · 복권 그림
//   포인트 계산(pointsLedger)과 달력 쪽 표시는 app.js에 그대로. 화면 마크업은 index.html (#couponsPage·#lottoPage·작은 창들)
//   버튼(data-act)은 app.js 클릭 처리에서 lottoAction(a, el, id, t)으로 넘어옴. 화면 칸에 거는 것(폼·긁기 등)은 initLotto()에서 한 번
import { PRESET_COUPONS, PRESET_PENS, PRESET_RENAMES } from "./lotto-presets.js?v=20261112c";

let E = null;
let $, APP, PRACTICE_MIN, S, WEEK_GOAL, WEEK_RULE_FROM, act, addDays, boardStart, clone, closeDlg, closeSettings, diffDays, esc, fmtTime, isAdminDevice, lottoOn, lsGet, lsSet, notifyNyanya, openDlg, pointsLedger, practiceMinutes, practiced, quietly, ready, renderAdminN, rid, rows, shieldOpen, shortDate, shrinkPic, streak, sundayOf, toast, today, ui, weekRuns, yDate;
export function bindLotto(env) {
  E = env;
  ({ $, APP, PRACTICE_MIN, S, WEEK_GOAL, WEEK_RULE_FROM, act, addDays, boardStart, clone, closeDlg, closeSettings, diffDays, esc, fmtTime, isAdminDevice, lottoOn, lsGet, lsSet, notifyNyanya, openDlg, pointsLedger, practiceMinutes, practiced, quietly, ready, renderAdminN, rid, rows, shieldOpen, shortDate, shrinkPic, streak, sundayOf, toast, today, ui, weekRuns, yDate } = env);
}
export const PT_TICKET = 1000;   // 1000점 = 복권 1장
// ---------- 📝 복권 관리 (관리자만): settings.lotto = { on, used, odds, coupons{id:{tier,title,days}}, pens{id:{title,days}} } ----------
const TIERS = { big: "🥇 대박", mid: "🥈 쿠폰", small: "🥉 작은 쿠폰" };
const TIER_CAP = { big: "30만 원까지", mid: "3만 원까지", small: "1만 원까지" };
// 쿠폰 값: 누가 사는지 안 적힌 쿠폰은 공통비용에서 (등급별 금액까지)
function payText(w) { return /사\s?줌|사\s?줄|사\s?주기|쏘기|쏜다|내가 (사|내)|본인 돈|용돈으로|부담/.test(w.title || "") ? "" : `💳 돈 드는 건 공통비용 · ${TIER_CAP[w.tier] || ""}`; }
const ODDS_DEF = { big: 3, mid: 25, small: 47, miss: 20, pen: 5 };
const ODDS_LABEL = { big: "🥇 대박", mid: "🥈 쿠폰", small: "🥉 작은", miss: "😐 꽝", pen: "😈 벌칙" };
function lotto() { return S.settings.lotto || {}; }
function lottoOdds() { return { ...ODDS_DEF, ...(lotto().odds || {}) }; }
// 연속 실천 6주+ 보너스 (확률에 더하고 빼는 %p, settings.lotto.bonus) · 결과는 0 아래로 안 내려감
const BONUS_DEF = { big: 1, mid: 2, small: 0, miss: -2, pen: -1 };
function lottoBonus() { return { ...BONUS_DEF, ...(lotto().bonus || {}) }; }
function streakOdds(o) { const b = lottoBonus(), r = {}; Object.keys(ODDS_DEF).forEach((k) => { r[k] = Math.max(0, (Number(o[k]) || 0) + (Number(b[k]) || 0)); }); return r; }
function lottoItems(kind) {
  return Object.entries(lotto()[kind] || {}).filter(([, v]) => v && v.title).map(([id, v]) => ({ id, ...v })).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

function saveLotto(patch, msg) {
  if (!ready()) return Promise.resolve();
  const p = { lotto: patch }, jobs = [E.backend.saveSettingsDeep(p)];
  if (E.testMode && E.realBackend) jobs.push(E.realBackend.saveSettingsDeep(clone(p)));
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
  const prs = praises().slice(0, 5);
  $("praiseList").innerHTML = prs.map((p) => `<div class="item"><span class="cp-tier">${p.pts < 0 ? "😥" : "👏"}</span><div class="body"><div class="title">${esc(p.text || (p.pts < 0 ? "감점" : "칭찬"))}</div><div class="meta"><span class="small muted">${esc(fmtTime(p.at))} · ${p.pts < 0 ? `😥 ${p.pts}점 · 바로 빠짐` : `+${p.pts}점 · ${(() => { const s = praiseState(p); return s.st === "got" ? (p.claim ? `✅ ${shortDate(s.day)} 받음` : "✅ 받음") : s.st === "wait" ? `⏳ 기다리는 중 · ${untilText(s.end)}` : "⌛ 안 받아서 사라짐"; })()}`}</span></div></div>` +
    `<div class="actions"><button class="icon-btn" type="button" data-act="praiseDel" data-id="${esc(p.id)}">지우기</button></div></div>`).join("");
  const keepFocus = (box) => box.contains(document.activeElement) && /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName);   // 글자 치는 중일 때만 다시 안 그림 (버튼을 눌렀을 땐 바로 반영)
  if (!keepFocus($("laOdds"))) $("laOdds").innerHTML = Object.keys(ODDS_DEF).map((k) => `<label>${ODDS_LABEL[k]}<input type="number" min="0" max="100" step="1" value="${o[k]}" data-odds="${k}"></label>`).join("");
  const sum = Object.keys(ODDS_DEF).reduce((t, k) => t + (Number(o[k]) || 0), 0);
  $("laOddsSum").innerHTML = sum === 100 ? "합계 100% ✅" : `<span style="color:var(--danger)">합계 ${sum}% — 100이 되게 맞춰 주세요</span>`;
  const b = lottoBonus(), so = streakOdds(o), bsum = Object.keys(ODDS_DEF).reduce((t, k) => t + (Number(b[k]) || 0), 0), ssum = Object.keys(ODDS_DEF).reduce((t, k) => t + so[k], 0);
  if (!keepFocus($("laBonus"))) $("laBonus").innerHTML = Object.keys(ODDS_DEF).map((k) => `<label>${ODDS_LABEL[k]}<input type="number" min="-100" max="100" step="1" value="${Number(b[k]) || 0}" data-bonus="${k}"></label>`).join("");
  $("laBonusSum").innerHTML = `6주+ 확률: ${Object.keys(ODDS_DEF).map((k) => `${ODDS_LABEL[k].split(" ")[0]} <b>${so[k]}</b>`).join(" · ")}` +
    (bsum !== 0 ? ` <span style="color:var(--danger)">· 보너스 합계 ${bsum > 0 ? "+" : ""}${bsum} (0으로 맞추면 합계가 그대로 100)</span>` : ssum !== 100 ? ` <span class="muted">· 0 아래는 0으로 쳐서 합계 ${ssum} (비율대로 나눠 뽑아요)</span>` : " ✅");
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
    `<input type="text" value="${esc(v.title)}" maxlength="60" data-la="pens" data-id="${esc(v.id)}" data-f="title" aria-label="벌칙 내용"><label class="la-days"><input type="number" min="1" value="${Number(v.days) || 7}" data-steps="1,3,7,15" data-la="pens" data-id="${esc(v.id)}" data-f="days" aria-label="기한(일)">일</label>` + wonHtml(won["pen|" + v.title]) +
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

// 👏 칭찬 (관리자): settings.lotto.praises{id:{text, at, date, pts}} → 포인트에 더함 (pts < 0 = 😥 감점, claim 없이 바로). 테스트 모드여도 진짜로 저장
const PT_PRAISE = 30;
// 칭찬 받기: 새 칭찬(claim: 1)은 욱진이가 [받기]를 눌러야 점수 (got = 받은 날). 칭찬한 날 포함 3일째 밤까지, 지나면 사라짐
// claim 없는 예전 칭찬은 칭찬한 날 받은 걸로
const PRAISE_DAYS = 3;
function praiseState(p) {
  if (!p.claim) return { st: "got", day: p.date };
  if (p.got) return { st: "got", day: p.got };
  const end = addDays(p.date, PRAISE_DAYS - 1);
  return { st: today() > end ? "gone" : "wait", end };
}
function pendingPraises() { return praises().filter((p) => praiseState(p).st === "wait").reverse(); }   // 먼저 온 것부터
function praiseGetAll() {
  const ps = pendingPraises(); if (!ps.length || !ready()) return;
  const t = today(), patch = {}, sum = ps.reduce((n, p) => n + p.pts, 0);
  ps.forEach((p) => { patch[p.id] = { got: t }; });
  closeDlg($("praiseDlg"));
  saveLotto({ praises: patch }, `👏 칭찬 ${ps.length > 1 ? ps.length + "개 " : ""}받았어요! ⭐ +${sum}점`);
}
// 욱진이 기기: 받을 칭찬이 있으면 열 때 팝업 (이번에 열린 동안 같은 칭찬은 한 번만, 다른 창이 떠 있으면 기다림). 닫아도 맨 위 띠로 남음
function maybePraise() {
  if (APP === "money") return;
  if (!S.loaded || isAdminDevice() || !lottoOn() || document.querySelector("dialog[open]")) return;
  const ps = pendingPraises(); if (!ps.length) return;
  const key = ps.map((p) => p.id).join(","); let seen = "";
  try { seen = sessionStorage.getItem("ukjin-praise-seen") || ""; if (seen === key) return; sessionStorage.setItem("ukjin-praise-seen", key); } catch (e) { /* 무시 */ }
  const sum = ps.reduce((n, p) => n + p.pts, 0);
  $("prBody").innerHTML = ps.map((p) => `<div class="praise-card"><b>${esc(p.text ? `"${p.text}"` : "잘했어요!")}</b><span>⭐ +${p.pts}점 · ${esc(untilText(praiseState(p).end))}</span></div>`).join("");
  $("prGet").textContent = `받기 (+${sum}점)`;
  openDlg($("praiseDlg"));
}

function praises() { return Object.entries(lotto().praises || {}).filter(([, v]) => v && v.date).map(([id, v]) => ({ id, ...v, pts: Number(v.pts) || PT_PRAISE })).sort((a, b) => (b.at || 0) - (a.at || 0)); }
// 점수는 5점 단위. 👏 칭찬 = +점수 (욱진이가 [받기]), 😥 감점 = −점수 (받기 없이 바로, claim 없음)
const praiseAmt = () => Math.max(5, Math.round((parseInt($("praisePts").value, 10) || PT_PRAISE) / 5) * 5);
function praiseBtns() { const n = praiseAmt(); $("praiseBtn").textContent = `👏 칭찬 +${n}`; $("minusBtn").textContent = `😥 감점 −${n}`; }

function openLottoAdmin() {
  if (!isAdminDevice()) { toast("관리자만 열 수 있어요."); return; }
  closeSettings(); location.hash = "#lotto";
}

// 기한 칸 화살표(▲▼·키보드)는 하루씩 말고 단계로: 쿠폰 7 → 15 → 30 → 60 → 90일, 벌칙 1 → 3 → 7 → 15일 (data-steps, 직접 치는 건 그대로)
const DAY_STEPS = [7, 15, 30, 60, 90];

// 등급을 고르면 기한 기본값: 🥇 60일 · 🥈 30일 · 🥉 7일
const TIER_DAYS = { big: 60, mid: 30, small: 7 };

// ---------- 🎟️ 복권 긁기 · 쿠폰함 (wins 모음: kind coupon|pen|miss) ----------
// 쿠폰: expires(받은 날+기한), usedAt. 벌칙: left(남은 장), deadline, days, doneAt — 기한 지나면 남은 장 ×2, 기한 다시 (끝없이)
let scratch = null;   // { res, committed, revealed }
function ticketsLeft() { return Math.max(0, Math.floor(pointsLedger().total / PT_TICKET) - S.wins.size); }
function drawLotto() {
  const o0 = lottoOdds(), o = streak(practiceMinutes()) >= 6 ? streakOdds(o0) : o0;   // 연속 6주+ 보너스
  const keys = Object.keys(ODDS_DEF), tot = keys.reduce((t, k) => t + (Number(o[k]) || 0), 0) || 1;
  let r = Math.random() * tot, pick = "miss";
  for (const k of keys) { r -= Number(o[k]) || 0; if (r < 0) { pick = k; break; } }
  const cs = lottoItems("coupons"), ps = lottoItems("pens"), any = (list) => list[Math.floor(Math.random() * list.length)];
  if (pick === "pen") { const v = any(ps); if (v) return { kind: "pen", title: v.title, days: Number(v.days) || 7 }; pick = "miss"; }
  if (["big", "mid", "small"].includes(pick)) {
    let list = cs.filter((v) => v.tier === pick);
    if (!list.length) list = cs;   // 그 등급이 비었으면 아무 쿠폰
    const v = any(list); if (v) return { kind: "coupon", tier: v.tier, title: v.title, days: Number(v.days) || 30, effect: v.effect || null, shield: v.tier === "big" && v.effect !== "streak" };
  }
  return { kind: "miss", title: "꽝" };
}

function commitWin(res, at) {
  const t = today(), doc = { kind: res.kind, title: res.title, wonAt: t, at };
  if (res.kind === "coupon") Object.assign(doc, { tier: res.tier, days: res.days, expires: addDays(t, res.days) }, res.effect ? { effect: res.effect } : {}, res.shield ? { shield: true } : {});
  if (res.kind === "pen") Object.assign(doc, { days: res.days, left: 1, deadline: addDays(t, res.days) });
  return quietly(() => E.backend.add("wins", doc));
}
// 기한 글: 10/21(수)까지 (7일 남음)
function untilText(d) { const n = diffDays(d, today()); return `${shortDate(d)}까지 (${n > 0 ? n + "일 남음" : n === 0 ? "오늘 마감" : "지남"})`; }
function resHtml(res) {
  const due = addDays(today(), res.days);
  if (res.kind === "coupon") return `<div class="big">${res.tier === "big" ? "🥇" : res.tier === "mid" ? "🥈" : "🥉"}</div><div class="tt">${esc(res.title)}</div>${res.effect === "streak" ? '<div class="sm">🛡️ 쓰면 실천 못 한 날 하루를 채워요</div>' : payText(res) ? `<div class="sm">${payText(res)}</div>` : ""}${res.shield ? '<div class="sm"><b>🛡️ 연속 채우기 1번도 같이 받아요!</b></div>' : ""}<div class="sm">${untilText(due)}</div>`;
  if (res.kind === "pen") return `<div class="big">😈</div><div class="lv">벌칙…</div><div class="tt">${esc(res.title)}</div><div class="sm">${untilText(due)} · 못 하면 ×2</div><div class="sm"><b>📸 하고 나면 인증샷 올리기!</b></div>`;
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

// 🛡️ 연속일 채우기: 최근 30일 중 실천 안 한 날 하나를 골라 wins.fillDate (보드 쓰기 전 날은 빼고)
let fillFor = null;
function openFill(id) {
  const w = S.wins.get(id); if (!w || !(w.shield ? shieldOpen(w) : !w.usedAt) || !ready()) return;
  const t = today(), pm = practiceMinutes(), st = boardStart(), ds = [];
  for (let i = 1; i <= 30; i++) { const d = addDays(t, -i); if ((st && d < st) || d < WEEK_RULE_FROM) break; if (!practiced(pm, d)) ds.push(d); }
  if (!ds.length) { toast("최근 30일에 빈 날이 없어요. 쿠폰은 아껴 둬요! 👍"); return; }
  const now = streak(pm);
  fillFor = id;
  $("mvTitle").textContent = "🛡️ 어느 날을 채울까요?";
  $("mvText").innerHTML = `<p class="small muted">최근 30일 중 실천을 60분 못 채운 날이에요. 고른 날은 실천한 날로 쳐서 그 주 실천한 날이 하루 늘어요 (한 주에 ${WEEK_GOAL}일이면 성공). 실천 시간 점수는 없어요. 지금 연속 ${now}주.</p>` +
    `<div class="fill-list">${ds.map((d) => { const p2 = { ...pm, [d]: PRACTICE_MIN }, w = weekRuns(p2).find((x) => x.ws === sundayOf(d)), n = streak(p2); return `<button class="btn ghost small" type="button" data-act="fillDo" data-day="${d}">${shortDate(d)}${w ? ` · 그 주 ${w.n}/${WEEK_GOAL}일${w.n >= WEEK_GOAL ? " ✅" : ""}` : ""}${n > now ? ` <b>→ 연속 ${n}주</b>` : ""}</button>`; }).join("")}</div>`;
  $("mvBtns").innerHTML = '<button class="btn ghost" type="button" data-act="mvClose">취소</button>';
  openDlg($("moveDlg"));
}
function penDone(id) { openProof(id); }   // 벌칙 한 장 = 📸 인증샷을 올려야 끝
// 📸 인증샷 창: 벌칙 [했어요]·쿠폰 [쓰기]는 사진을 올려야 눌러져요 (달력 체크박스도 여기로)
// 사진은 보드 데이터와 따로 pics/{사진id}에 (긴 쪽 1280px + 작은 사진 360px), wins.pics = {사진id: 날짜}
let proof = null;   // { id, full, thumb, busy }
function openProof(id) {
  const w = S.wins.get(id); if (!w || !ready()) return;
  const pen = w.kind === "pen";
  if (pen && !(w.left > 0)) { toast("끝낸 벌칙이에요. 잘못 눌렀으면 ↶ 되돌리기를 써요."); return; }
  if (!pen && (w.kind !== "coupon" || w.usedAt)) { toast("이미 쓴 쿠폰이에요."); return; }
  proof = { id, full: null, thumb: null, busy: false };
  $("pfTitle").textContent = pen ? `😈 ${w.title}${w.left > 1 ? ` ×${w.left}` : ""}` : `${w.tier === "big" ? "🥇" : w.tier === "mid" ? "🥈" : "🥉"} ${w.title}`;
  $("pfSub").textContent = pen ? `${untilText(w.deadline)} · 못 하면 ×${w.left * 2}` : untilText(w.expires);
  $("pfBody").innerHTML = pen ? `<p><b>📸 인증샷을 올려야 [했어요]가 눌러져요.</b>${w.left > 1 ? " 한 장 할 때마다 한 번씩 올려요." : ""}</p>`
    : `<p><b>📸 쓰는 모습을 찍어서 올려야 [쓰기]가 눌러져요.</b> 쿠폰함 📸 추억에 모여요.</p>${payText(w) ? `<p class="muted">${payText(w)}</p>` : ""}`;
  $("pfOk").dataset.label = pen ? (w.left > 1 ? "했어요 (1장)" : "했어요") : "쓰기";
  renderProof(); openDlg($("proofDlg"));
}
function renderProof() {
  const p = proof; if (!p) return;
  $("pfPic").innerHTML = p.full ? `<img src="${p.full}" alt="올릴 인증샷">` : p.busy ? '<div class="proof-empty">사진 줄이는 중…</div>' : '<div class="proof-empty">아직 사진이 없어요</div>';
  $("pfPickTxt").textContent = p.full ? "📷 다른 사진으로" : "📷 사진 찍기·고르기";
  $("pfOk").disabled = !p.full || p.busy;
  $("pfOk").textContent = p.busy && p.full ? "올리는 중…" : $("pfOk").dataset.label;
}
async function setProofFile(file) {
  const p = proof; if (!p || p.busy || !file || !(file.type || "").startsWith("image/")) return;
  p.busy = true; renderProof();
  try { const full = await shrinkPic(file), thumb = await shrinkPic(file, 360, 40000); p.full = full; p.thumb = thumb; }
  catch (e) { toast("그림을 못 읽었어요."); }
  p.busy = false; renderProof();
}
function proofDone() {
  const p = proof, w = p && S.wins.get(p.id); if (!w || !p.full || p.busy || !ready()) return;
  const t = today(), picId = rid(), pen = w.kind === "pen", left = Math.max(0, (w.left || 1) - 1);
  const patch = pen ? (left ? { left } : { left: 0, doneAt: t }) : { usedAt: t };
  patch.pics = { [picId]: t };
  p.busy = true; renderProof();
  act((async () => {
    await E.backend.putPic(picId, { full: p.full, thumb: p.thumb, win: p.id, kind: w.kind, title: w.title || "", date: t, at: Date.now() });
    await E.backend.update("wins", p.id, patch);
  })(), pen ? (left ? `💪 한 장 했어요! ${left}장 남았어요. 📸 인증샷도 올렸어요.` : "✅ 벌칙 끝! 📸 인증샷도 올렸어요.") : `🎉 '${w.title}' 쿠폰을 썼어요! 📸 추억에 남겼어요. (↶로 되돌릴 수 있어요)`)
    .then(() => { picThumbs.set(picId, p.thumb); if (proof === p) { proof = null; closeDlg($("proofDlg")); } }, () => { p.busy = false; renderProof(); });
}

// 📸 추억 탭: wins.pics로 목록을 만들고, 작은 사진은 화면에 9장씩 (아래로 내리면 9장 더) 받아 와요. 누르면 큰 사진
const picThumbs = new Map(), picLoading = new Set();
let picIO = null;
function picList() {
  const out = [];
  S.wins.forEach((w, wid) => { if (w && w.pics && typeof w.pics === "object") Object.entries(w.pics).forEach(([pid, d]) => out.push({ pid, wid, date: typeof d === "string" ? d : "", w })); });
  return out.sort((a, b) => b.date.localeCompare(a.date) || b.pid.localeCompare(a.pid));
}
const okPic = (v) => typeof v === "string" && v.startsWith("data:image/");
function picCardImg(pid) { const v = picThumbs.get(pid); return okPic(v) ? `<img src="${v}" alt="">` : `<span class="ph">${picThumbs.has(pid) ? "사진 없음" : "📸"}</span>`; }
function picCard(pid, w, date) {
  return `<button type="button" class="pic-card" data-act="pfView" data-id="${esc(pid)}" data-pic="${esc(pid)}" aria-label="${esc(w.title || "")} 사진 크게 보기">${picCardImg(pid)}` +
    `<span class="cap">${w.kind === "pen" ? "😈" : "🎟️"} ${esc(w.title || "")}<br><span class="muted">${typeof date === "string" && date ? esc(yDate(date)) : ""}</span></span></button>`;
}
function renderPics() {
  const box = $("cpPics"), all = picList(), n = Math.min(all.length, ui.picShown || 9);
  if (picIO) { picIO.disconnect(); picIO = null; }
  if (!all.length) { box.innerHTML = '<div class="empty">아직 사진이 없어요. 벌칙 [했어요]·쿠폰 [쓰기] 때 올린 인증샷이 여기 모여요.</div>'; return; }
  box.innerHTML = all.slice(0, n).map((x) => picCard(x.pid, x.w, x.date)).join("") +
    (n < all.length ? `<div class="pic-more" id="cpPicsMore"><button class="btn ghost small" type="button" data-act="pfMore">더 보기 (${all.length - n}장)</button></div>` : "");
  all.slice(0, n).forEach((x) => loadThumb(x.pid));
  const more = $("cpPicsMore");
  if (more && "IntersectionObserver" in window) {
    picIO = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { picIO.disconnect(); picIO = null; ui.picShown = n + 9; renderPics(); } });
    picIO.observe(more);
  }
}
function loadThumb(pid) {
  if (picThumbs.has(pid) || picLoading.has(pid) || !E.backend || !E.backend.getPic) return;
  picLoading.add(pid);
  E.backend.getPic(pid, "thumb").then((v) => { picThumbs.set(pid, okPic(v) ? v : ""); }, () => {}).finally(() => {
    picLoading.delete(pid);
    document.querySelectorAll(`[data-pic="${pid}"] .ph`).forEach((ph) => { if (picThumbs.has(pid)) ph.outerHTML = picCardImg(pid); });
  });
}
async function viewPic(pid) {
  if (!E.backend || !E.backend.getPic) return;
  const small = picThumbs.get(pid);
  if (okPic(small)) { $("picImg").src = small; openDlg($("picDlg")); }
  try { const v = await E.backend.getPic(pid, "full"); if (okPic(v)) { $("picImg").src = v; openDlg($("picDlg")); } else if (!okPic(small)) toast("사진을 찾지 못했어요."); }
  catch (e) { if (!okPic(small)) toast("사진을 불러오지 못했어요. 인터넷 연결을 확인해 주세요."); }
}
// 😈 벌칙 = 기한 마감일의 할 일 (tasks.penId). 장 수·기한이 바뀌면 따라 바뀌고, 다 하면 끝낸 일로
let penTaskSyncing = false;
function syncPenTasks() {
  if (penTaskSyncing || !E.backend || !S.loaded) return;
  const jobs = [], byPen = new Map(rows(S.tasks).filter((x) => x.penId).map((x) => [x.penId, x]));
  S.wins.forEach((w, id) => {
    if (!w || w.kind !== "pen") return;
    const x = byPen.get(id), open = w.left > 0, title = `😈 ${w.title}${open && w.left > 1 ? ` ×${w.left}` : ""}`;
    if (open && !x) jobs.push(() => E.backend.add("tasks", { title, repeat: "none", date: w.deadline, done: false, doneDate: null, penId: id, createdAt: Date.now() }));
    else if (open && (x.title !== title || x.date !== w.deadline || x.done)) jobs.push(() => E.backend.update("tasks", x.id, { title, date: w.deadline, done: false, doneDate: null }));
    else if (!open && x && (!x.done || x.title !== title)) jobs.push(() => E.backend.update("tasks", x.id, { title, done: true, doneDate: w.doneAt || today() }));
  });
  if (!jobs.length) return;
  penTaskSyncing = true;
  quietly(async () => { for (const j of jobs) await j(); }).catch(() => {}).finally(() => { penTaskSyncing = false; });
}
// 벌칙 기한: 지났으면 남은 장 ×2, 기한 다시 (어느 기기든 열면 맞춰 둠)
let penSweeping = false;
function sweepPens() {
  if (penSweeping || !E.backend || !S.loaded) return;
  const t = today(), jobs = [];
  S.wins.forEach((w, id) => {
    if (!w || w.kind !== "pen" || !(w.left > 0) || !w.deadline || w.deadline >= t) return;
    let left = w.left, dl = w.deadline; const days = Number(w.days) || 7;
    while (dl < t) { left *= 2; dl = addDays(dl, days); }
    jobs.push([id, { left, deadline: dl }]);
  });
  if (!jobs.length) return;
  penSweeping = true;
  quietly(async () => { for (const [id, p] of jobs) await E.backend.update("wins", id, p); }).finally(() => { penSweeping = false; });
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
  const tab = cpTab(), sort = cpSort(tab), TR = { big: 0, mid: 1, small: 2 };
  const by = (dueKey) => (a, b) => sort === "recent" ? (b.at || 0) - (a.at || 0)
    : sort === "tier" && dueKey === "expires" ? (TR[a.tier] ?? 3) - (TR[b.tier] ?? 3) || String(a.expires).localeCompare(String(b.expires))
    : String(a[dueKey] || "9999").localeCompare(String(b[dueKey] || "9999")) || (b.at || 0) - (a.at || 0);
  const avail = ws.filter((w) => w.kind === "coupon" && (w.usedAt ? shieldOpen(w) : (w.expires || "9999") >= t)).sort(by("expires"));
  const pens = ws.filter((w) => w.kind === "pen"), pOpen = pens.filter((w) => w.left > 0).sort(by("deadline"));
  const pastAll = ws.filter((w) => (w.kind === "coupon" && ((w.usedAt && !shieldOpen(w)) || (w.expires || "9999") < t)) || w.kind === "miss" || (w.kind === "pen" && !(w.left > 0)));
  const pf = cpPf(), PR = (w) => w.kind === "coupon" ? TR[w.tier] ?? 3 : w.kind === "pen" ? 4 : 5, nm = (w) => w.kind === "miss" ? "꽝" : w.title || "";
  const past = pastAll.filter(CP_PF[pf][1]).sort(sort === "tier" ? (a, b) => PR(a) - PR(b) || (b.at || 0) - (a.at || 0) : sort === "abc" ? (a, b) => nm(a).localeCompare(nm(b), "ko") || (b.at || 0) - (a.at || 0) : (a, b) => (b.at || 0) - (a.at || 0));
  $("cpPastFilter").innerHTML = Object.keys(CP_PF).map((k) => `<button type="button" data-act="cpPf" data-k="${k}" aria-pressed="${k === pf}">${CP_PF[k][0]} <b>${pastAll.filter(CP_PF[k][1]).length}</b></button>`).join("");
  const TABS = { avail: ["🎟️ 쓸 쿠폰", avail.length], pens: ["😈 벌칙", pOpen.length], past: ["📜 지난 것", 0], pics: ["📸 추억", 0], reqs: ["💌 요청", 0] };
  $("cpTabs").querySelectorAll("button").forEach((b) => { const [lb, n] = TABS[b.dataset.k]; b.innerHTML = lb + (n ? ` <b>${n}</b>` : ""); b.setAttribute("aria-pressed", b.dataset.k === tab); });
  document.querySelectorAll("[data-cp]").forEach((el) => { el.hidden = el.dataset.cp !== tab; });
  const HEAD = { avail: ["쓸 수 있는 쿠폰", "💳 누가 사는지 안 적힌 쿠폰은 공통비용에서 · 🥇 30만 원까지 · 🥈 3만 원까지 · 🥉 1만 원까지"], pens: ["벌칙", "📸 [했어요]를 누르고 인증샷 올리기 · 기한 안에 다 못 하면 남은 장 수가 두 배"], past: ["지난 것", "사용함 · 기한 만료 · 꽝 · 끝낸 벌칙"], pics: ["📸 추억", "벌칙·쿠폰 인증샷 모음 · 누르면 크게 보여요"], reqs: ["쿠폰 요청", "있으면 좋겠는 쿠폰을 보내면 관리자가 보고 넣어 줘요"] };
  $("cpTabTitle").textContent = HEAD[tab][0]; $("cpTabSub").textContent = HEAD[tab][1];
  const sel = $("cpSort"); sel.hidden = !CP_SORTS[tab];
  if (CP_SORTS[tab]) { sel.innerHTML = CP_SORTS[tab].map((k) => `<option value="${k}">${k === "recent" && tab !== "past" ? "최근 받은 순" : CP_SORT_LABEL[k]}</option>`).join(""); sel.value = sort; }
  $("cpAvail").innerHTML = avail.length ? avail.map((w) => `<div class="item cp-item"><span class="cp-tier">${tierIc(w)}</span><div class="body"><div class="title">${esc(w.title)}</div>` +
    `<div class="meta">${w.effect === "streak" ? '<span class="tag cat c-grape">🛡️ 연속일 채우기</span>' : ""}${w.usedAt ? `<span class="tag">✅ 상품 사용: ${yDate(w.usedAt)}</span>` : ""}${w.fillDate && w.shield ? `<span class="tag">🛡️ 채운 날: ${yDate(w.fillDate)}</span>` : shieldOpen(w) ? '<span class="tag cat c-grape">🛡️ 연속 채우기 포함</span>' : ""}<span class="tag">${untilText(w.expires)}</span><span class="small muted">${esc(shortDate(w.wonAt))} 받음${w.effect === "streak" || !payText(w) ? "" : " · " + esc(TIER_CAP[w.tier] || "")}</span></div></div>` +
    `<div class="actions" style="display:grid;gap:4px">${w.usedAt ? "" : `<button class="btn small" type="button" data-act="cpUse" data-id="${esc(w.id)}">쓰기</button>`}${shieldOpen(w) ? `<button class="btn ghost small" type="button" data-act="cpFill" data-id="${esc(w.id)}">🛡️ 채우기</button>` : ""}</div></div>`).join("") : '<div class="empty">아직 쓸 쿠폰이 없어요.</div>';
  $("cpPens").innerHTML = pOpen.length ? pOpen.map((w) => `<div class="item cp-item"><span class="cp-tier">😈</span><div class="body"><div class="title">${esc(w.title)}${w.left > 1 ? ` <b style="color:var(--danger)">×${w.left}</b>` : ""}</div>` +
    `<div class="meta"><span class="tag late">${untilText(w.deadline)}</span><span class="small muted">못 하면 ×${w.left * 2}</span></div></div>` +
    `<div class="actions" style="display:grid;gap:4px"><button class="btn small" type="button" data-act="penDone" data-id="${esc(w.id)}">했어요${w.left > 1 ? " (1장)" : ""}</button>${w.game ? "" : `<button class="btn ghost small" type="button" data-act="gmOpen" data-id="${esc(w.id)}">🎯 한 판</button>`}</div></div>`).join("") : '<div class="empty">지금 할 벌칙이 없어요. 👍 끝낸 벌칙은 📜 지난 것에 있어요.</div>';
  $("cpPast").innerHTML = past.length ? past.map((w) => {
    const st = w.kind === "pen" ? `✅ 끝: ${yDate(w.doneAt || w.wonAt)} · ` : w.kind === "miss" ? "" : `${w.usedAt ? `사용: ${yDate(w.usedAt)}` : `만료: ${yDate(w.expires)}`}${w.fillDate ? ` · 🛡️ 채운 날: ${yDate(w.fillDate)}` : ""} · `;
    const np = w.pics && typeof w.pics === "object" ? Object.keys(w.pics).length : 0;
    const gm = w.kind === "miss" || w.kind === "pen" ? (w.game ? `<span class="small muted">🎯 +${w.game.pts}</span>` : `<button class="btn ghost small" type="button" data-act="gmOpen" data-id="${esc(w.id)}">🎯 한 판</button>`) : "";
    return `<div class="item${w.kind !== "coupon" && !w.game ? "" : " done"}" data-act="winOpen" data-id="${esc(w.id)}" style="cursor:pointer" title="눌러서 보기"><span class="cp-tier">${w.kind === "miss" ? "😐" : w.kind === "pen" ? "😈" : tierIc(w)}</span><div class="body"><div class="title">${esc(w.kind === "miss" ? "꽝" : w.title)}${np ? ` <span class="small muted">📸${np > 1 ? np : ""}</span>` : ""}</div><div class="meta"><span class="small muted">${esc(st)}긁음: ${esc(yDate(w.wonAt))}</span></div></div><div class="actions">${gm}</div></div>`;
  }).join("") : `<div class="empty">${pastAll.length ? "여기에 해당하는 게 없어요." : "아직 없어요."}</div>`;
  if (tab === "pics") renderPics();
}
// 쿠폰함 탭·정렬 (이 기기에만 기억)
function cpTab() { try { const v = localStorage.getItem("ukjin-cp-tab"); return ["avail", "pens", "past", "pics", "reqs"].includes(v) ? v : "avail"; } catch (e) { return "avail"; } }
// 정렬: 탭마다 고를 수 있는 것과 기억하는 칸이 다름 (지난 것은 최근 순이 기본)
const CP_SORTS = { avail: ["due", "recent", "tier"], pens: ["due", "recent"], past: ["recent", "tier", "abc"] };
const CP_SORT_LABEL = { due: "남은 기한 짧은 순", recent: "최근 순", tier: "등급 순", abc: "가나다순" };
function cpSortKey(tab) { return tab === "past" ? "ukjin-cp-psort" : "ukjin-cp-sort"; }
function cpSort(tab) { const ok = CP_SORTS[tab] || CP_SORTS.avail; try { const v = localStorage.getItem(cpSortKey(tab)); return ok.includes(v) ? v : ok[0]; } catch (e) { return ok[0]; } }

// 지난 것 거르기: 전체 · 사용함 · 기한 만료 · 꽝 · 끝낸 벌칙 (이 기기에 기억)
const CP_PF = { all: ["전체", () => true], used: ["사용함", (w) => w.kind === "coupon" && !!w.usedAt], exp: ["기한 만료", (w) => w.kind === "coupon" && !w.usedAt], miss: ["😐 꽝", (w) => w.kind === "miss"], pen: ["😈 벌칙", (w) => w.kind === "pen"] };
function cpPf() { try { const v = localStorage.getItem("ukjin-cp-pf"); return CP_PF[v] ? v : "all"; } catch (e) { return "all"; } }
function maybeLottoIntro() {   // 공개된 뒤 처음 여는 기기에 한 번 소개
  if (APP === "money") return;
  if (!lottoOn() || isAdminDevice()) return;
  try { if (localStorage.getItem("ukjin-lotto-intro")) return; localStorage.setItem("ukjin-lotto-intro", "1"); } catch (e) { return; }
  openDlg($("lottoIntroDlg"));
}

// ---------- 💌 쿠폰 요청 (settings.lotto.reqs{id:{text, at, status new|added|no}}) · 관리자 기기에만 N ----------

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

// 🎟️·😈 팝업: 달력에서 쿠폰·벌칙을 누르면 쿠폰함으로 안 가고 여기서 보고 바로 [쓰기]·[했어요]
function openWin(id) {
  const w = S.wins.get(id); if (!w) { toast("쿠폰함에 없어요."); return; }
  const t = today(), tierIc = w.tier === "big" ? "🥇" : w.tier === "mid" ? "🥈" : "🥉", body = [], btns = [];
  $("wnSub").textContent = `긁음: ${yDate(w.wonAt)}`;
  if (w.kind === "pen") {
    const open = w.left > 0;
    $("wnTitle").textContent = `😈 ${w.title}${open && w.left > 1 ? ` ×${w.left}` : ""}`;
    if (open) {
      body.push(`<p><b>${untilText(w.deadline)}</b> · 못 하면 ×${w.left * 2}</p>`, `<p><b>📸 [했어요]를 누르고 인증샷을 올려요</b></p>`);
      btns.push(`<button class="btn" type="button" data-act="penDone" data-id="${esc(id)}">했어요${w.left > 1 ? " (1장)" : ""}</button>`);
    } else body.push(`<p>✅ 끝: ${yDate(w.doneAt || w.wonAt)}</p>`);
    if (w.game) body.push(`<p>🎯 게임으로 +${w.game.pts} 돌려받음</p>`);
    else btns.push(`<button class="btn ghost" type="button" data-act="gmOpen" data-id="${esc(id)}">🎯 포인트 돌려받기 한 판</button>`);
  } else if (w.kind === "coupon") {
    const usable = !w.usedAt && (w.expires || "9999") >= t;
    $("wnTitle").textContent = `${tierIc} ${w.title}`;
    if (w.effect === "streak") body.push(`<p>🛡️ 쓰면 실천 못 한 날 하루를 채워요</p>`);
    else if (usable && payText(w)) body.push(`<p class="muted">${payText(w)}</p>`);
    if (w.usedAt) body.push(`<p>✅ 사용: ${yDate(w.usedAt)}${w.fillDate && !w.shield ? ` · 🛡️ 채운 날: ${yDate(w.fillDate)}` : ""}</p>`);
    else if (usable) body.push(`<p><b>${untilText(w.expires)}</b></p>`);
    else body.push(`<p>⌛ 만료: ${yDate(w.expires)} (안 쓰고 기한이 지났어요)</p>`);
    if (w.shield) body.push(w.fillDate ? `<p>🛡️ 채운 날: ${yDate(w.fillDate)}</p>` : shieldOpen(w) ? `<p>🛡️ 연속 채우기 1번도 같이 받았어요. 최근 30일 중 실천을 못 채운 날 하루를 채워요 (사진 없이, ${untilText(w.expires)})</p>` : `<p class="muted">🛡️ 연속 채우기는 안 쓰고 기한이 지났어요</p>`);
    if (usable) btns.push(`<button class="btn" type="button" data-act="cpUse" data-id="${esc(id)}">쓰기</button>`);
    if (shieldOpen(w)) btns.push(`<button class="btn ghost" type="button" data-act="cpFill" data-id="${esc(id)}">🛡️ 채우기</button>`);
  } else if (w.kind === "miss") {
    $("wnTitle").textContent = "😐 꽝";
    body.push(w.game ? `<p>🎯 게임으로 +${w.game.pts} 돌려받음</p>` : "<p>아쉽다! 🎯 게임 한 판으로 포인트를 돌려받을 수 있어요.</p>");
    if (!w.game) btns.push(`<button class="btn" type="button" data-act="gmOpen" data-id="${esc(id)}">🎯 포인트 돌려받기 한 판</button>`);
  } else return;
  const ps = w.pics && typeof w.pics === "object" ? Object.entries(w.pics).sort((a, b) => String(a[1]).localeCompare(String(b[1]))) : [];
  if (ps.length) body.push(`<p class="small muted" style="margin-bottom:6px">📸 인증샷 ${ps.length}장 · 누르면 크게</p><div class="pic-grid">${ps.map(([pid, d]) => picCard(pid, w, d)).join("")}</div>`);
  btns.push('<button class="btn ghost" type="button" data-act="winClose">닫기</button>');
  $("wnBody").innerHTML = body.join(""); $("wnBtns").innerHTML = btns.join("");
  ps.forEach(([pid]) => loadThumb(pid));
  openDlg($("winDlg"));
}

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

function stopGame() {
  if (!game || game.done) return;
  game.done = true; cancelAnimationFrame(game.raf);
  const d = Math.abs(game.pos - 0.5), pts = d <= 0.03 ? 300 : d <= 0.1 ? 150 : d <= 0.2 ? 50 : 0;
  const id = game.id;
  game.ui.res.textContent = pts ? `🎉 +${pts}점 돌려받았어요!` : "😅 아깝다! 0점";
  game.ui.btns.innerHTML = game.inline ? scAfterBtns() : '<button class="btn" type="button" data-act="gmClose">확인</button>';
  quietly(() => E.backend.update("wins", id, { game: { pts, date: today() } })).catch(() => {});
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
function clearFill() { fillFor = null; }   // 날짜 고르는 창을 닫을 때 (app.js mvClose)

// 화면 칸에 거는 것들 (bindLotto 뒤에 한 번)
export function initLotto() {
$("lottoPage").addEventListener("input", (ev) => { const k = ev.target.dataset.laQ; if (!k) return; (ui.laQ ||= {})[k] = ev.target.value; renderLottoAdmin(); });
$("lottoPage").addEventListener("change", (ev) => { const k = ev.target.dataset.laSort; if (!k) return; (ui.laSort ||= {})[k] = ev.target.value; renderLottoAdmin(); });
["newsDlg", "lottoIntroDlg"].forEach((id) => $(id).addEventListener("close", () => setTimeout(maybePraise, 200)));
$("praiseForm").addEventListener("submit", (ev) => {
  ev.preventDefault();
  if (!isAdminDevice()) return;
  const minus = ev.submitter && ev.submitter.dataset.sign === "-1", n = praiseAmt();
  const text = $("praiseText").value.trim(), id = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const doc = minus ? { text, at: Date.now(), date: today(), pts: -n } : { text, at: Date.now(), date: today(), pts: n, claim: 1 };
  saveLotto({ praises: { [id]: doc } }, minus ? `😥 감점했어요. ⭐ −${n}점 (바로 빠져요)` : `👏 칭찬했어요! 욱진이가 ${PRAISE_DAYS}일 안에 [받기]를 누르면 +${n}점`)
    .then(() => { $("praiseText").value = ""; $("praisePts").value = PT_PRAISE; praiseBtns(); });
});
$("praisePts").addEventListener("input", praiseBtns);
["laCouponForm", "laPenForm"].forEach((fid) => $(fid).addEventListener("submit", (ev) => {
  ev.preventDefault();
  const f = ev.target, kind = fid === "laCouponForm" ? "coupons" : "pens", title = f.elements.title.value.trim();
  if (!title) { toast("내용을 적어 주세요."); return; }
  const id = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const doc = { title, days: Math.max(1, parseInt(f.elements.days.value, 10) || (kind === "pens" ? 7 : 30)), createdAt: Date.now() };
  if (kind === "coupons") { doc.tier = f.elements.tier.value; if (f.elements.streak.checked) doc.effect = "streak"; }
  saveLotto({ [kind]: { [id]: doc } }, kind === "pens" ? "벌칙을 넣었어요." : "쿠폰을 넣었어요.").then(() => { f.elements.title.value = ""; if (f.elements.streak) f.elements.streak.checked = false; f.elements.title.focus(); });
}));
["pointerdown", "keydown"].forEach((t) => $("lottoPage").addEventListener(t, (ev) => { const el = ev.target; if (el.matches && el.matches("input[data-steps]")) el.dataset.prev = el.value; }, true));
$("lottoPage").addEventListener("input", (ev) => {
  const el = ev.target; if (!el.matches("input[data-steps]") || ev.inputType) return;   // 글자 입력은 inputType이 있음
  const prev = Number(el.dataset.prev), v = Number(el.value); if (!prev || Math.abs(v - prev) !== 1) return;
  const steps = el.dataset.steps ? el.dataset.steps.split(",").map(Number) : DAY_STEPS;
  const next = v > prev ? steps.find((d) => d > prev) || steps[steps.length - 1] : [...steps].reverse().find((d) => d < prev) || steps[0];
  el.value = next; el.dataset.prev = next;
}, true);
$("laCouponForm").elements.tier.addEventListener("change", (ev) => { const f = $("laCouponForm"); f.elements.days.value = f.elements.streak.checked ? 30 : TIER_DAYS[ev.target.value] || 30; });
$("laStreak").addEventListener("change", (ev) => {   // 🛡️ 켜면 보통 대박 · 30일
  const f = $("laCouponForm"); if (!ev.target.checked) return;
  f.elements.tier.value = "big"; f.elements.days.value = 30; if (!f.elements.title.value.trim()) f.elements.title.value = "🛡️ 연속일 하루 채우기";
});
$("lottoPage").addEventListener("change", (ev) => {
  const el = ev.target;
  if (el.dataset.bonus) { saveLotto({ bonus: { [el.dataset.bonus]: Math.max(-100, Math.min(100, parseInt(el.value, 10) || 0)) } }, "🔥 6주+ 보너스를 바꿨어요."); return; }
  if (el.dataset.odds) { saveLotto({ odds: { [el.dataset.odds]: Math.max(0, Math.min(100, parseInt(el.value, 10) || 0)) } }, "확률을 바꿨어요."); return; }
  if (!el.dataset.la) return;
  let v = el.value; if (el.dataset.f === "days") v = Math.max(1, parseInt(v, 10) || 1); if (el.dataset.f === "title") { v = v.trim(); if (!v) { toast("내용을 적어 주세요."); renderLottoAdmin(); return; } }
  saveLotto({ [el.dataset.la]: { [el.dataset.id]: { [el.dataset.f]: v } } }, "고쳤어요.");
});
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
$("pfFile").addEventListener("change", (ev) => { setProofFile(ev.target.files && ev.target.files[0]); ev.target.value = ""; });
document.addEventListener("paste", (ev) => {
  if (!$("proofDlg").open) return;
  const f = [...(ev.clipboardData && ev.clipboardData.items || [])].filter((it) => it.kind === "file").map((it) => it.getAsFile()).find((x) => x && x.type.startsWith("image/"));
  if (f) { ev.preventDefault(); setProofFile(f); }
});
$("proofDlg").addEventListener("close", () => { if (proof && !proof.busy) proof = null; });
$("cpSort").addEventListener("change", (ev) => { try { localStorage.setItem(cpSortKey(cpTab()), ev.target.value); } catch (e) { /* 무시 */ } renderCoupons(); });
$("cpReqForm").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const text = $("cpReqText").value.trim(); if (!text) { toast("어떤 쿠폰이면 좋겠는지 적어 주세요."); return; }
  const id = "q" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  saveLotto({ reqs: { [id]: { text, at: Date.now(), status: "new" } } }, "💌 쿠폰 요청을 보냈어요!").then(() => { $("cpReqText").value = ""; });
  notifyNyanya("coupon", text);
});
$("gameDlg").addEventListener("cancel", (ev) => { if (game && !game.done && !game.inline) ev.preventDefault(); });   // 멈추기 전엔 못 닫음 (닫았다 다시 하기 막기)
$("scratchDlg").addEventListener("close", () => cancelGame());
}

// 버튼 누름 (app.js 클릭 처리에서 넘어옴). 여기서 처리했으면 true
export function lottoAction(a, el, id, t) {
  if (a === "openLottoAdmin") { openLottoAdmin(); return true; }
  if (a === "openScratch") { openScratch(); return true; }
  if (a === "prGet") { praiseGetAll(); return true; }
  if (a === "cpPf") { try { localStorage.setItem("ukjin-cp-pf", el.dataset.k); } catch (e) { /* 무시 */ } renderCoupons(); return true; }
  if (a === "cpTab") { try { localStorage.setItem("ukjin-cp-tab", el.dataset.k); } catch (e) { /* 무시 */ } renderCoupons(); renderCouponReqs(); return true; }
  if (a === "gmOpen") { openGame(id); return true; }
  if (a === "gmLater") { cancelGame(); $("scBtns").innerHTML = scAfterBtns(); toast("쿠폰함에서 나중에 한 판 할 수 있어요."); return true; }
  if (a === "gmStop") { stopGame(); return true; }
  if (a === "gmClose") { if (game && !game.done) return true; closeDlg($("gameDlg")); game = null; return true; }
  if (a === "laRename") {
    const patch = {}; lottoItems("coupons").forEach((v) => { if (PRESET_RENAMES[v.title]) patch[v.id] = { title: PRESET_RENAMES[v.title] }; });
    if (Object.keys(patch).length) saveLotto({ coupons: patch }, `💰 제목 ${Object.keys(patch).length}개를 고쳤어요.`); return true;
  }
  if (a === "laPreset") {
    if (lottoItems("coupons").length || lottoItems("pens").length) { toast("이미 목록이 있어요."); return true; }
    const now = Date.now(), coupons = {}, pens = {};
    PRESET_COUPONS.forEach(([tier, title, days], i) => { coupons["p" + i.toString(36) + now.toString(36)] = { tier, title, days, createdAt: now + i }; });
    PRESET_PENS.forEach(([title, days], i) => { pens["n" + i.toString(36) + now.toString(36)] = { title, days, createdAt: now + i }; });
    saveLotto({ coupons, pens }, `📦 쿠폰 ${PRESET_COUPONS.length}개 · 벌칙 ${PRESET_PENS.length}개를 넣었어요.`); return true;
  }
  if (a === "crAdd") {
    const r = couponReqs().find((z) => z.id === id); if (!r) return true;
    saveLotto({ reqs: { [id]: { status: "added" } } }, "요청을 '넣었어요'로 표시했어요. 아래 쿠폰 목록에 등급·기한을 정해 넣어 주세요.");
    const f = $("laCouponForm"); f.elements.title.value = r.text.replace(/\s*(쿠폰)?\s*(넣어\s*줘|주세요|해\s*줘)\.?$/, "").trim() || r.text; f.scrollIntoView({ block: "center" }); f.elements.title.focus(); return true;
  }
  if (a === "crNo") { saveLotto({ reqs: { [id]: { status: "no" } } }, "거절로 표시했어요."); return true; }
  if (a === "crDel") { saveLotto({ reqs: { [id]: null } }, "요청을 지웠어요."); return true; }
  if (a === "scReveal") { scratchReveal(); return true; }
  if (a === "scAgain") { cancelGame(); closeDlg($("scratchDlg")); setTimeout(openScratch, 150); return true; }
  if (a === "scClose") { if (scratch && scratch.committed && !scratch.revealed) scratchReveal(); else { closeDlg($("scratchDlg")); scratch = null; } return true; }
  if (a === "liClose") { closeDlg($("lottoIntroDlg")); return true; }
  if (a === "cpFill" || (a === "cpUse" && S.wins.get(id) && S.wins.get(id).effect === "streak")) { openFill(id); return true; }
  if (a === "fillDo") {
    const fid = fillFor, w = fid && S.wins.get(fid), d = el.dataset.day; fillFor = null; closeDlg($("moveDlg"));
    if (!w || !(w.shield ? shieldOpen(w) : !w.usedAt) || !ready()) return true;
    act(E.backend.update("wins", fid, w.shield ? { fillDate: d } : { usedAt: t, fillDate: d }), `🛡️ ${shortDate(d)}, 실천한 날로 채웠어요! (↶로 되돌릴 수 있어요)`).catch(() => {}); return true;
  }
  if (a === "winOpen") { openWin(id); return true; }
  if (a === "winClose") { closeDlg($("winDlg")); return true; }
  if (a === "cpUse") { openProof(id); return true; }
  if (a === "pfOk") { proofDone(); return true; }
  if (a === "pfClose") { closeDlg($("proofDlg")); return true; }
  if (a === "pfView") { viewPic(id); return true; }
  if (a === "pfMore") { ui.picShown = (ui.picShown || 9) + 9; renderPics(); return true; }
  if (a === "penDone") { penDone(id); return true; }
  if (a === "laEff") { const v = (lotto().coupons || {})[id]; if (!v) return true; saveLotto({ coupons: { [id]: { effect: v.effect === "streak" ? null : "streak" } } }, v.effect === "streak" ? "🛡️ 효과를 껐어요." : "🛡️ 연속일 채우기 쿠폰으로 바꿨어요."); return true; }
  if (a === "laTab") { lsSet("ukjin-la-tab", el.dataset.k); if (el.dataset.k === "reqs") markCreqSeen(); renderLottoAdmin(); renderCouponReqs(); return true; }
  if (a === "laFilter") { ui.laTier = el.dataset.k; renderLottoAdmin(); return true; }
  if (a === "laDel") {
    if (el.dataset.armed !== "1") { el.dataset.armed = "1"; el.classList.add("armed"); el.textContent = "정말?"; setTimeout(() => { if (el.isConnected) { el.dataset.armed = ""; el.classList.remove("armed"); el.textContent = "삭제"; } }, 3000); return true; }
    saveLotto({ [el.dataset.k]: { [id]: null } }, "지웠어요."); return true;
  }
  if (a === "praiseDel") {
    if (el.dataset.armed !== "1") { el.dataset.armed = "1"; el.classList.add("armed"); el.textContent = "정말?"; setTimeout(() => { if (el.isConnected) { el.dataset.armed = ""; el.classList.remove("armed"); el.textContent = "지우기"; } }, 3000); return true; }
    saveLotto({ praises: { [id]: null } }, "칭찬을 지웠어요. (받은 점수도 빠져요)"); return true;
  }
  return false;
}

export { LOTTO_STAGES, PRAISE_DAYS, clearFill, couponReqs, laTab, lottoStage, markCreqSeen, maybeLottoIntro, maybePraise, openScratch, openWin, paintTicket, penDone, pendingPraises, praiseState, praises, renderCouponReqs, renderCoupons, renderLottoAdmin, sweepPens, syncPenTasks, ticketsLeft, untilText, viewPic };
