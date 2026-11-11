// 📖 설명서 · 🛠️ 기능 요청 · 🔎 자격증 찾기 — 실천 보드(app.js)에서 떼어 낸 코드 (2026-11-12). 보드 쪽 공통 함수·상태는 시작할 때 bindPages(env)로 받고, 값이 바뀌는 backend 는 E.backend 로 읽음
//   설명서: 사용 설명서 주제 탭·검색, 업데이트 내역(CHANGES는 app.js가 넘겨줌 — 우리 탭 내역을 섞는 건 app.js mergeChanges), 새 버전 알림 창
//   기능 요청: 목록·상태·메모·사진 붙이기·열린 요청 복사 / 자격증 찾기: CERTS 목록·검색 링크 (목표로 추가는 app.js addCert)
//   버튼(data-act)은 app.js 클릭 처리에서 pagesAction(a, el, id, t)으로 넘어옴. 화면 칸에 거는 것(폼·검색 칸)은 initPages()에서 한 번

let E = null;
let $, CHANGES, S, act, closeDlg, esc, fmtTime, lottoVisible, notifyNyanya, openDlg, ready, rows, shrinkPic, toast, today, ui;
export function bindPages(env) {
  E = env;
  ({ $, CHANGES, S, act, closeDlg, esc, fmtTime, lottoVisible, notifyNyanya, openDlg, ready, rows, shrinkPic, toast, today, ui } = env);
}
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
// ---------- 설명서: 사용 설명서 · 업데이트 내역, 새 버전이면 한 번 알려 주기 ----------
const NEWS_KEY = "ukjin-news-seen";
function newsSeen() { try { return localStorage.getItem(NEWS_KEY) || ""; } catch (e) { return ""; } }
// 본 표시 = "날짜#그 날 줄 수" → 같은 날 줄이 늘어도 새 소식으로 (예전 값엔 #가 없어서 그 날 묶음을 한 번 더 보여 줌)
function newsSplit() { const [d, n] = newsSeen().split("#"); return { d: d || "", n: Number(n) || 0 }; }
function hasNews() { const s = newsSplit(), top = CHANGES[0]; return !!top && (top.date > s.d || (top.date === s.d && top.items.length > s.n)); }
function chgHtml(list) { return list.map((c) => `<div class="chg-date">${esc(c.date.replace(/-/g, "."))}</div><ul>${c.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`).join(""); }
function renderHelp() {
  const tab = ui.helpTab || "guide";
  document.querySelectorAll("#helpSeg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === tab)));
  $("helpGuide").hidden = tab !== "guide"; $("helpChanges").hidden = tab !== "changes";
  // 설명서 주제 탭 (복권은 보일 때만, 이 기기에 기억)
  const lv = lottoVisible(); let topic = "start"; try { topic = localStorage.getItem("ukjin-help-topic") || "start"; } catch (e) { /* 무시 */ }
  if (!document.querySelector(`[data-help="${topic}"]`) || (topic === "lotto" && !lv)) topic = "start";
  $("helpLottoBtn").hidden = !lv;
  document.querySelectorAll("#helpTopics button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === topic)));
  document.querySelectorAll("[data-help]").forEach((el) => { el.hidden = el.dataset.help !== topic; });
  helpSearch(lv);
  $("helpChanges").innerHTML = chgHtml(CHANGES);
  $("newsBadge").hidden = !hasNews();
}
// 🔍 설명서 검색: 글자가 있으면 주제 탭 대신 모든 주제에서 맞는 줄만 (띄어 쓴 낱말은 다 들어 있어야), 찾은 글자는 노랗게
function helpSearch(lv) {
  const words = ($("helpQ").value || "").trim().toLowerCase().split(/\s+/).filter(Boolean), on = words.length > 0;
  const has = (el) => { const t = el.textContent.toLowerCase(); return words.every((w) => t.includes(w)); };
  $("helpTopics").hidden = on;
  let hits = 0;
  document.querySelectorAll("#helpGuide [data-help]").forEach((sec) => {
    let from = sec.querySelector(":scope > .help-from");
    if (!from) { from = document.createElement("div"); from.className = "help-from"; from.textContent = document.querySelector(`#helpTopics [data-k="${sec.dataset.help}"]`).textContent; sec.prepend(from); }
    from.hidden = !on;
    sec.querySelectorAll(".hs-off").forEach((el) => el.classList.remove("hs-off"));
    if (!on) return;
    let n = 0;
    if (sec.dataset.help !== "lotto" || lv) sec.querySelectorAll(":scope > h3").forEach((h) => {
      const ul = h.nextElementSibling, all = has(h);
      let m = 0;
      ul.querySelectorAll(":scope > li").forEach((li) => { const ok = all || has(li); li.classList.toggle("hs-off", !ok); if (ok) m++; });
      h.classList.toggle("hs-off", !m); ul.classList.toggle("hs-off", !m); n += m;
    });
    sec.hidden = !n; hits += n;
  });
  $("helpNone").hidden = !on || hits > 0;
  if (on) $("helpNone").textContent = `'${$("helpQ").value.trim()}' 설명을 못 찾았어요. 다른 낱말로 찾아보세요.`;
  // 찾은 글자 칠하기 (지원하는 브라우저만, 화면 글은 그대로 둠)
  if (!window.CSS || !CSS.highlights || typeof Highlight === "undefined") return;
  CSS.highlights.delete("help-hit");
  if (!on) return;
  const ranges = [], tw = document.createTreeWalker($("helpGuide"), NodeFilter.SHOW_TEXT);
  for (let nd = tw.nextNode(); nd; nd = tw.nextNode()) {
    if (nd.parentElement.closest(".hs-off, [hidden], .help-from, #helpTopics")) continue;
    const t = nd.textContent.toLowerCase();
    words.forEach((w) => { for (let i = t.indexOf(w); i >= 0; i = t.indexOf(w, i + w.length)) { const r = new Range(); r.setStart(nd, i); r.setEnd(nd, i + w.length); ranges.push(r); } });
  }
  CSS.highlights.set("help-hit", new Highlight(...ranges));
}
function markNewsSeen() { try { localStorage.setItem(NEWS_KEY, CHANGES[0].date + "#" + CHANGES[0].items.length); } catch (e) { /* 무시 */ } renderHelp(); }
function maybeShowNews() {
  if (!hasNews()) return;
  // 처음 여는 기기는 가장 최근 묶음만, 아니면 못 본 것 (최대 3일치, 같은 날은 새로 더한 줄만)
  const s = newsSplit();
  $("nwBody").innerHTML = chgHtml(s.d ? CHANGES.filter((c) => c.date >= s.d).map((c) => c.date === s.d && s.n ? { ...c, items: c.items.slice(0, c.items.length - s.n) } : c).filter((c) => c.items.length).slice(0, 3) : CHANGES.slice(0, 1));
  openDlg($("newsDlg"));
}
// ---------- 기능 요청 ----------
const REQ_STATUS = { todo: "요청", doing: "진행 중", done: "완료" };
const REQ_AREAS = ["달력", "목표", "가계부", "자격증 찾기", "구글 캘린더", "기타"];
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
      (Array.isArray(r.images) && r.images.length ? `<div class="req-pics">${r.images.filter((p) => typeof p === "string" && p.startsWith("data:image/")).map((p, i) => `<button type="button" class="req-pic" data-act="picOpen" data-id="${esc(r.id)}" data-i="${i}" aria-label="사진 크게 보기"><img src="${p}" alt="요청 사진 ${i + 1}" loading="lazy"></button>`).join("")}</div>` : "") +
      `<label class="f">메모·답변<textarea data-req-note="${esc(r.id)}" maxlength="1000" rows="2" placeholder="예: 10/12에 넣었어요">${esc(r.note || "")}</textarea></label></article>`;
  }).join("") : `<div class="panel muted">${ui.reqFilter === "done" ? "아직 완료된 요청이 없어요." : "아직 요청이 없어요. 위에 적어 보세요."}</div>`;
}
function requestsText() {
  const open = rows(S.requests).filter((r) => r.status !== "done").sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  if (!open.length) return "";
  return "욱진 실천 보드 기능 요청 (" + today() + ")\n" + open.map((r, i) =>
    `${i + 1}. [${r.area || "기타"}] ${(r.text || "").trim()} (${REQ_STATUS[r.status || "todo"]}${r.createdAt ? ", " + fmtTime(r.createdAt) : ""})${Array.isArray(r.images) && r.images.length ? ` (사진 ${r.images.length}장, 사이트에서 보기)` : ""}${r.note ? "\n   메모: " + r.note.trim() : ""}`).join("\n");
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
// 📷 요청 사진: 붙여넣기(Ctrl+V)·고르기 → 긴 쪽 1280px JPEG로 줄여서 요청 문서에 같이 저장 (requests.images = [dataURL…], 최대 4장)
const REQ_PIC_MAX = 4;
let reqPics = [];
async function addReqPics(files) {
  const imgs = [...files].filter((f) => f && f.type && f.type.startsWith("image/"));
  if (!imgs.length) return false;
  for (const f of imgs) {
    if (reqPics.length >= REQ_PIC_MAX) { toast(`사진은 ${REQ_PIC_MAX}장까지예요.`); break; }
    try { reqPics.push(await shrinkPic(f)); } catch (e) { toast("그림을 못 읽었어요."); }
  }
  renderReqPics(); return true;
}
function renderReqPics() {
  $("reqPics").innerHTML = reqPics.map((p, i) => `<span class="req-pic"><img src="${p}" alt="붙인 사진 ${i + 1}"><button type="button" data-act="reqPicDel" data-i="${i}" aria-label="사진 빼기">✕</button></span>`).join("");
}
// 메모·답변은 입력을 멈추면 저장
let reqNoteTimer = null;

// 화면 칸에 거는 것들 (bindPages 뒤에 한 번)
export function initPages() {
$("reqText").addEventListener("paste", (ev) => {
  const files = [...(ev.clipboardData && ev.clipboardData.items || [])].filter((it) => it.kind === "file").map((it) => it.getAsFile());
  if (files.some((f) => f && f.type.startsWith("image/"))) { ev.preventDefault(); addReqPics(files); }
});
$("reqFile").addEventListener("change", (ev) => { addReqPics(ev.target.files); ev.target.value = ""; });
$("reqForm").addEventListener("submit", (ev) => {
  ev.preventDefault();
  if (!ready()) return;
  const text = $("reqText").value.trim(); if (!text) return;
  const doc = { text, area: ui.reqArea, status: "todo", note: "", createdAt: Date.now() };
  if (reqPics.length) doc.images = reqPics.slice();
  act(E.backend.add("requests", doc), "요청을 남겼어요.")
    .then(() => { $("reqText").value = ""; reqPics = []; renderReqPics(); ui.reqFilter = "open"; }).catch(() => {});
  notifyNyanya("req", text);
});
document.addEventListener("input", (ev) => {
  const id = ev.target.dataset && ev.target.dataset.reqNote; if (!id) return;
  clearTimeout(reqNoteTimer);
  reqNoteTimer = setTimeout(() => { if (ready() && S.requests.has(id)) act(E.backend.update("requests", id, { note: ev.target.value })).catch(() => {}); }, 800);
});
$("certSearch").addEventListener("submit", (ev) => { ev.preventDefault(); ui.certQ = $("certQ").value; ui.certTag = "전체"; renderCerts(); });
$("helpQ").addEventListener("input", () => renderHelp());
$("certQ").addEventListener("input", () => { ui.certQ = $("certQ").value; renderCerts(); });
}

// 버튼 누름 (app.js 클릭 처리에서 넘어옴). 여기서 처리했으면 true
export function pagesAction(a, el, id, t) {
  if (a === "helpTab") { ui.helpTab = el.dataset.k; if (ui.helpTab === "changes") markNewsSeen(); renderHelp(); return true; }
  if (a === "newsClose") { closeDlg($("newsDlg")); markNewsSeen(); return true; }
  if (a === "newsAll") { closeDlg($("newsDlg")); markNewsSeen(); ui.helpTab = "changes"; renderHelp(); return true; }
  if (a === "helpTopic") { try { localStorage.setItem("ukjin-help-topic", el.dataset.k); } catch (e) { /* 무시 */ } renderHelp(); return true; }
  if (a === "reqPicDel") { reqPics.splice(Number(el.dataset.i), 1); renderReqPics(); return true; }
  if (a === "picOpen") { const r = S.requests.get(id), p = r && Array.isArray(r.images) && r.images[Number(el.dataset.i)]; if (!p) return true; $("picImg").src = p; openDlg($("picDlg")); return true; }
  if (a === "reqArea") { ui.reqArea = el.dataset.k; renderRequests(); return true; }
  if (a === "reqFilter") { ui.reqFilter = el.dataset.k; renderRequests(); return true; }
  if (a === "reqStatus") { if (!ready()) return true; const r = S.requests.get(id); if (r) act(E.backend.update("requests", id, { status: REQ_NEXT[r.status || "todo"] })).catch(() => {}); return true; }
  if (a === "copyReqs") {
    const text = requestsText();
    if (!text) { toast("열린 요청이 없어요."); return true; }
    const done = () => toast("복사했어요. Claude와 대화할 때 붙여넣으면 돼요.");
    const fallback = () => { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); done(); } catch (e) { toast("복사하지 못했어요."); } ta.remove(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    return true;
  }
  if (a === "certTag") { ui.certTag = el.dataset.t; renderCerts(); return true; }
  return false;
}

export { CERTS, maybeShowNews, renderCerts, renderHelp, renderRequests };
