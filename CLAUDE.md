# 욱진 실천 보드 — 작업 안내 (Claude용)

욱진이(남자친구)의 자격증·현장 실천, 할 일, 돈 관리를 보는 개인 웹사이트. 여자친구(저장소 주인, nyanya-lab)가 Claude와 대화하며 기능을 만든다.
사이트: https://nyanya-lab.github.io/-/ (GitHub Pages, `main` 브랜치의 `docs/` 폴더)

## 작업 규칙

- 한국어 **반말**로, 쉽게 설명하기 (개발 용어는 풀어서).
- PR은 **물어보지 말고 만든 뒤 바로 합치기** (주인이 요청함).
- 고칠 때마다 브라우저(Playwright 등)로 PC·폰 너비 둘 다 확인하고, 확인한 것과 못 한 것을 솔직히 말하기.
- 정적 파일을 바꾸면 `docs/index.html`·`docs/app.js`·`docs/google-sync.html` 안의 `?v=날짜문자` 값을 같이 올리기 (브라우저 캐시 때문).
- 빌드 도구 없음. 순수 HTML/CSS/JS (ES 모듈). 로컬 확인은 `cd docs && python -m http.server` → http://localhost:8000
  (모듈이라 파일을 더블클릭해서 열면 안 됨)
- 비밀번호·API 키 같은 비밀값은 저장소(공개)에 절대 넣지 않기.
- 욱진이가 보는 걸 바꾸면 `docs/changes.js` 맨 위(오늘 날짜 묶음)에 쉬운 말로 한 줄 추가하기 → 사이트 '설명서 → 업데이트 내역'과 새 버전 알림 창에 보임.
  쓰는 법이 바뀌면 `docs/index.html`의 사용 설명서(`#helpGuide`, 주제 탭마다 `data-help` 묶음)도 같이 고치기.

## 파일

```
docs/index.html        화면 마크업 + 작은 창(dialog)들
docs/style.css         색 토큰(밝은 타일 색: 파랑·코랄·민트·노랑·보라), 다크 모드
docs/app.js            보드 화면 로직 (상태 S, 저장소 backend, render 함수들, 시작할 때 money.js에 bindMoney(env)로 공통 함수 넘김)
docs/range.js          📅 기간 고르기 창 (냐냐 가계부와 같은 파일을 복사, CSS 안에 있음 rg-). 내역 탭 달 이름·[이번 달] → ui.txRange (txPick·txShift)
docs/money.js          💰 돈 관리(가계부) 코드: 예산·지출·자산·분류 색·원형·카드값·줄 돈 자동 (app.js가 import, 바뀌는 값은 E.backend·E.testMode)
docs/money.html        가계부 짧은 주소 → index.html?app=money (가계부 모드, money.webmanifest)
docs/calsum.js         📝 달력 아래 ○월 정리 (#calSum, renderCalendar가 calSummary(달, env)로 그림): 실천 시간 평소(앞 12달 평균)·지난달 비교 · 실천한 날 · 할 일 체크 · 주 목표·연속 · 많이 한 목표·일 · 놓친 할 일 · 포인트
docs/summary.js        📝 가계부 이번 달 정리 (냐냐 가계부 summary.js 옮김): 예산 탭 #sumPanel 한 줄 + 📑 보고서 '월간 정리' 카드·화면(report.js env.summary). 욱진용 = 💝 준 돈 따로(남은 돈 = 수입 − 준 돈 − 지출), 관리자 기기는 안 보임
docs/firebase-config.js  Firebase 웹 설정 (공개돼도 되는 값)
docs/changes.js        업데이트 내역 CHANGES (설명서 탭 + 새 버전 알림)
docs/lotto-presets.js  복권 추천 목록 (쿠폰 200 · 벌칙 50, 관리 창에서 한 번에 넣기)
docs/google-sync.html  구글 캘린더 동기화 설정 안내 페이지
docs/apps-script/Code.gs       욱진이 Apps Script에 넣는 짧은 로더 (한 번만 붙여넣음)
docs/apps-script/sync-core.js  실제 구글 동기화 코드. 로더가 5분마다 받아서 실행 → 여기만 고치면 자동 적용
docs/manifest.webmanifest, uk-*.png  실천 보드 아이콘 (욱진이 캐릭터 얼굴: PC 설치 앱·안드로이드 = 동그라미 uk-round-192/512(any) + 네모 uk-icon-512(maskable), 아이폰 홈 = 네모 uk-apple-touch-icon, 탭·제목 로고 = 동그라미 uk-favicon-64)
docs/money.webmanifest, icon-*.png, apple-touch-icon.png  가계부 아이콘 (욱진이 얼굴 + 금색 배경 + ₩ 동전, `python tools/make_coin_icon.py`로 만듦, index.html 머리 스크립트가 가계부 모드면 바꿔 끼움, 제목 로고 `.logo-coin`)
```

## 데이터 (Firebase Realtime Database `ukjin-207a3`)

- 로그인 없음. **비밀번호 = 저장 위치**: `ukjin/{SHA-256("ukjin-board:"+비밀번호)}` 아래에 저장 (watch-log 방식).
  규칙: `ukjin/$room` 은 `$room.length === 64` 일 때만 읽기/쓰기.
- 모음(`COLS`): `goals`, `tasks`, `logs`(실천 기록), `money`, `accounts`(통장·카드·현금), `requests`(기능 요청), `wins`(긁은 복권: kind coupon{tier,title,expires,usedAt} | pen{title,left,deadline,days,doneAt} | miss, 꽝·벌칙엔 `game{pts,date}` (🎯 타이밍 게임으로 돌려받은 포인트, 한 장에 한 번), 🥇 쿠폰엔 `shield:true`(덤 🛡️ 연속 채우기 1번, 2026-10-31~. 상품 `usedAt`과 따로 `fillDate`, 기한은 `expires` 같음, `shieldOpen`, [🛡️ 채우기] = cpFill. 그 쿠폰 자체가 🛡️면 안 붙음), 인증샷 `pics{사진id:날짜}` (벌칙 [했어요]·쿠폰 [쓰기]는 사진 필수, 🛡️ 쿠폰만 빼고) — 긁은 장 수 = wins 개수, 긁을 때는 되돌리기 기록 안 남김). `pics/{사진id}` = {full(긴 쪽 1280px), thumb(360px), win, kind, title, date, at} — 보드 열 때 안 받고 쿠폰함 📸 추억 탭에서 9장씩, 백업에도 안 넣음. 그 외 `settings`, `_backup/{prev,daily,undo}`, `gevents`·`gsync`(Apps Script가 씀), `history`(↶↷ 되돌리기 기록 최근 30개, 모든 기기 공유: 묶음마다 keys `"모음|id"`, before/after 문서, label, date, dev, undone).
- 항목·칸 단위로 따로 저장해서 여러 기기가 서로 덮어쓰지 않음. 업데이트는 `flattenPaths`로 경로별 update.
- 할 일: `repeat` = `none`(date, done, doneDate) / `daily` / `weekly`(days 0=일…6=토, start, end, doneDates{날짜:true}) / `nweek`(주 `times`번, 아무 요일: 그 주에 times번 체크하면 남은 날 안 보임, 지난 날 ❌ 없음, 못 채운 주는 토요일에만 ❌ — `nweekOn`/`nweekCount`).
  `subId` = 세부목표(선택). 목표 `goals/{id}/subs/{subId}` = {title, due, createdAt, doneAt}. 목표 달성은 `goals/{id}/achievedAt`(날짜). 진행률은 큰 목표만.
  `lateFrom`/`earlyFrom` = 다른 날 할 일을 오늘 체크해서 옮긴 원래 날짜 (확인 창에서 고름. 지난 일은 원래 날짜에 ❌ 흔적, 체크 풀면 원래 날짜로 돌아감).
  `penId` = 😈 벌칙 할 일 (wins id, 기한 마감일에 자동 생성·장 수/기한 따라감, 체크 = 벌칙 한 장 `penDone`).
  `mt-budget-YYYY-MM`(1일)·`mt-income-YYYY-MM`(15일) = 돈 할 일 자동 생성 (`syncMoneyTasks`, 이번·다음 달, `settings.autoTasks`에 만든 표시). 예산·수입이 들어오면 이름이 '🗓️ 10월 예산 760,000원'·'💰 10월 월급 2,600,000원'으로 바뀌며 체크, 지우면 원래 이름·체크 풀림. 체크박스 = 가계부 입력 칸으로(`goMoneyInput`, localStorage `ukjin-money-new`). 직접 넣은 그 달 '예산 입력…'·'수입 입력…' 할 일은 `mt{k,m}`로 바꿔 같이 다룸(붙은 시간 기록은 지움). 실천 아닌 할 일(noPractice)엔 시간 표시 안 함. `noPractice` = 실천 시간으로 안 치고 시간도 안 물어봄 (예전에 붙은 시간 기록도 실천·포인트에서 뺌 `noPracLog`). 끝낸 돈 할 일은 ✅ 대신 🗓️·💰·💳 (`moneyIcon`, 구글도 ✅ 없이 제목 그대로).
  `minutes` = 할 시간(선택). 있으면 체크할 때 묻지 않고 그 시간으로 `logs`에 기록. 시간 없이 체크한 할 일은 ✅ 체크만(민트, 실천 아님 — 10/11 전에만 15분으로 침), 시간과 같이 끝낸 일은 🔥 실천(노랑).
- ⏱ 타이머 `settings.timer` = {taskId, title, start(ms|null=멈춤), acc(ms)}: 한 번에 하나, 할 일 ▶ / 할 일 창 [▶ 타이머 시작], 맨 위 `#timerBar`(⏸ ▶ ■), [■ 끝] → 시간 확인 → 오늘 그 시간으로 체크(그날 기록에 더함, 지난·앞 날짜 일회성 할 일은 오늘로 옮김 lateFrom/earlyFrom). 5시간 넘으면 빨강. 돈·벌칙·카드값 할 일은 없음.
- 실천 기록 `logs`: 할 일 체크 때 기록한 시간은 `taskId`로 연결 (달력·구글에서 할 일 옆에 시간으로 표시).
- 실천한 날 = 하루 60분 이상 (`PRACTICE_MIN`, 달력 초록). 2026-10-11 주부터(`WEEK_RULE_FROM`) 연속은 주 단위: 한 주(일~토)에 실천한 날 5일(`WEEK_GOAL`, 아무 요일)이면 성공, 성공한 주가 이어지면 연속 ○주 (`weekRuns`/`streak`, 이번 주는 끝날 때까지 안 끊김). 그 전 날짜는 예전 규칙(50분 · 날마다 연속 · 7/15/30/90일 보너스) 그대로. 1~59분 = 연한 노랑 `part`(40/60m), 0분 지난 날 = 연한 빨강. 달력 주 줄 위 `wk-bar` 도장판(`weekBar`: 목표 ■5칸 + 보너스 ☆2칸, 성공 초록·실패 빨강, 오른쪽 🔥 연속 ○주 +그 주 연속 보너스). 🛡️ = 그 주 실천한 날 +1. 포인트(⭐): 저장 안 하고 기록에서 계산 (`pointsLedger`). 실천 1분 1 · 세부목표 50 · 목표 300 · 연속 3/6/12/25주 30/100/250/1000, 그 뒤 5주마다 300 (그 주 4번째 실천한 날에) · 한 주 6번째 실천한 날 +15 · 7번째 +30 (`dayExtra`/`weekExtra`, 7일 = +45) (10/11 전은 7/15/30/90일) · 돈 기록 1(월급 30) · 👏 칭찬(5점 단위, `settings.lotto.praises{id:{text,at,date,pts,claim,got}}`, pts < 0 = 😥 감점: claim 없이 바로 빠지고 욱진이 기기에 3일 띠, 관리자 복권 관리 탭에서. claim=1인 새 칭찬은 욱진이가 팝업·맨 위 띠의 [받기]를 눌러야 got=받은 날로 점수, 칭찬한 날 포함 3일째 밤까지 안 받으면 사라짐. claim 없는 예전 칭찬은 받은 걸로). 1000점 = 복권 1장. `settings.lotto` = {on(욱진이에게 공개), used(긁은 장 수), odds{big,mid,small,miss,pen}(기본 3/25/47/20/5), bonus{같은 키}(연속 6주+ 때 더하는 %p, 기본 +1/+2/0/−2/−1), coupons{id:{tier big|mid|small, title, days}}, pens{id:{title, days}}} — 목록은 관리자 '🎟️ 복권 관리' 탭(#lotto)에서만. 쿠폰 요청 `lotto.reqs{id:{text, at, status new|added|no}}` (욱진이가 쿠폰함에서 보냄). 관리자 기기에만 새 기능 요청·쿠폰 요청 N (localStorage `ukjin-req-seen`, `ukjin-creq-seen`). 공개 전에는 관리자 기기(`localStorage ukjin-admin`)에서만 보임.
- 관리자: `settings.adminHash` = SHA-256("ukjin-admin:"+비번). 맞게 넣은 기기는 `localStorage ukjin-admin=1` → 🧪 테스트 모드(지금 데이터를 복사한 메모리 보드, 저장 안 됨, 끝내면 새로고침) 버튼이 제목 옆에 (켜지면 노란 표시, 맨 위 띠는 없음. ⭐ +1000점 테스트 버튼 = 복권 관리 제목 옆 `#laTestPts`). 관리자 기기는 **열면 자동으로 테스트 모드** ([진짜 보드 보기] = 그 탭 세션 동안만 진짜, sessionStorage `ukjin-real`). 테스트 중에도 `saveLotto`(복권 관리·쿠폰 요청)와 관리자 비번은 `realBackend`에도 저장.
- 한 달 예산: `settings.budgets[YYYY-MM]` = {items{id:{cat, memo, amount}}, give(💝 줄 돈, 욱진이가 정함, 없으면 null)} (예전 `income`은 안 씀). 수입 = 이번 달 실제, 아직이면 지난달 실제(`incAuto`). 위 4칸: 수입 · 쓸 돈 · 줄 돈(보냄·남은) · 잔액(수입 − 쓸 돈 − 줄 돈). 실제 수입이 들어오면 욱진이 기기에 확인 띠(`settings.giveAck[월]` = 그때 수입). 15일이 되면 `syncGive`가 줄 돈 − 이미 보낸 돈을 `money/give-{YYYY-MM}` transfer(auto, 보내는 통장 `settings.giveFrom`)로 한 번 기록 → 💝 칸 '준 돈 ✅' + [고치기]. 줄 돈 확인 `settings.giveConfirm[월]={inc,give,at}` (관리자 [확인했어요], 진짜 보드에 저장). 맨 위 알림 띠 `renderNags`. `saveSettingsDeep`로 칸 하나씩 저장. 예산이 없는 달은 그 전 가장 가까운 달 예산을 이어 쓰고, 고치는 순간 그 달 것으로 옮겨 저장.
- 관리자 기기에선 돈 관리에서 지출·자산을 숨김 (`moneyAdminView`/`moneyShown`: 예산 금액 · 수입 · 보낸 돈만, 달력 날짜·검색도 같게).
- 돈 `money.kind`: `income` / `expense` / `transfer`(여자친구에게 보낸 돈) / `move`(내 자산끼리 이체, 수입·지출 아님). `account`, `toAccount`. `cat` 분류 · `sub` 소분류(고르는 칸, 목록 `settings.moneySubs[kind][catKey]`, 가계부 ⚙ 설정 탭 `#catEditor`) · `memo` 내용 · `note` 메모 · `pics{사진id:날짜}`(메모 사진, `pics/{id}`에 kind "money", money: 기록 id) · `cur` 화폐(없으면 원, 더한 화폐는 `settings.currencies`. 원이 아니면 합계·잔액에서 뺌 `isWon`, 금액 표시 `amtText`). 월급(income·월급) 기록은 명세서 사진 안내·없으면 확인.
- 카드 `accounts/{id}.pay` = {day 결제일(31=말일), from 빠지는 통장, fm/fd ~ tm/td 이용기간(달 -2/-1/0 · 날), since 정한 날}. 결제일에 `syncCardPays`가 할 일 `tasks/cp-{카드}-{YYYY-MM}` '💳 카드값 이체하기 (예상 …원)'(noPractice, `cardPay{card,from,start,end}`) 생성. 체크 → 금액 확인 창(`openCardPay`, 이용기간 지출 합계, 고칠 수 있음) → [이체 기록하기]로 같은 id `money` move 기록. 체크 풀면 그 이체도 지움. 결제일 안 정한 카드는 욱진이 기기 맨 위 띠. 자산 탭 카드 [💳 결제](`payCardNow`)도 같은 확인 창(`showCardPay`: 금액·날짜·빠지는 통장, 안 한 cp 할 일이 있으면 그 id로 기록·체크).

## 화면

메뉴: 달력(첫 화면) · 목표 · 🤝 우리(아래 참고) + 복권 그림 위 `#sideApp`(욱진이 보드 = 가계부 ↗ money.html, 가계부 모드 = 실천 보드 ↗, 관리자 보드엔 없음). ( 가계부 모드 메뉴 = 예산·지출·자산·통계: PC 옆 메뉴 `.m-nav`, 폰 아래 메뉴 `#mBottom`) · 예산(관리자 보드만: 보드 안 돈 화면 `#money` = 실제 수입 · 보낸 돈 · 나머지 3칸 작은 탭 둘 `#planTabs`(`ukjin-plan-tab`, 욱진이 가계부 예산 탭도 같음): 🗓️ 한 달 예산(달 넘기기 · 3칸 · `#planPanel` 분류·메모·금액 보기만, 실제 쓴 돈은 안 보임) / 📊 달마다 표(`#histPanel`)) (관리자 기기에서 money.html을 열면 보드 '예산'으로, 연습 가계부는 2026-10-31에 없앰) · 자격증 찾기 · 기능 요청 · 쿠폰함(탭: 쓸 쿠폰·벌칙·지난 것·요청) · 복권 관리(`#lotto`, 관리자 기기만) · ⚙ 설정(작은 창: 저장 상태, 백업 되돌리기, 구글 캘린더, 잠그기)
- 가계부 자산 탭(`#asGrid`): 왼쪽 묶음 목록(현금·통장·카드·저축, 접기 localStorage `ukjin-as-fold`, 고른 자산 `ukjin-as-sel`) + 오른쪽 자세히(그 달 입금·출금·합계·누적잔액, 최근 12달 SVG 그래프 `drawAsChart`, 내역 + 줄마다 그때 잔액). 1100px 이하는 목록 → 자세히(`ui.asOpen`). 결제일 정한 카드는 결제일 기준(`acctPeriod` = `cardPayPlan`: 달 = 결제 달, 낸 돈 = 지난 결제일 다음 날~이번 결제일), 목록엔 결제예정·미결제(`cardDue`). ＋(`.fab`) · 내역 줄 → 서랍 창 `#mDrawer` (지출 탭 `#moneyPanel`을 옮겨 와 쓰고 닫으면 제자리, `closeDrawer`).
- 가계부 메뉴(`mTab`): 예산 · 지출 · 달력(`renderMCal`, `ui.mcDay`·`ui.mcKind`) · 자산(처음엔 전체 `renderAssetAll`) · 통계(`renderStats`: 수입/지출, 주간·월간·연간·기간 `ui.stP`, 분류 `ui.stCat`) · 가계부 설정. 그래프는 `setChart(el, {bars, pts:[{lab,v,on,tip}]})`.
- 🔁 매월 반복 `settings.moneyRepeat/{id}` = {kind expense|income|move, amount(− = 환불처럼, 이체는 + 만), account, toAccount(이체만), cat, sub, memo, day, from "YYYY-MM", at, made{YYYY-MM:true}} (냐냐 가계부 repeat.js를 옮김, 가계부 설정 탭 `#repeatPanel`). `syncRepeat`: 그 달 day일(짧은 달은 말일)이 지났고 made에 없으면 `money/rp-{id}-{YYYYMM}` set + made 표시 (saveSettingsDeep). 지운 기록은 다시 안 생김, [그만하기] = 규칙만 지움. 욱진이 기기만 (테스트 모드·관리자 자동 테스트 직전엔 안 돎).
- 가계부 지출 탭 = 내역(`renderTx`): 요약 칸 전체·수입·지출·💝 준 돈(`ui.txKind`, 이체는 전체에서만 줄), 표 ☐·날짜·자산·분류·소분류·금액·내용·메모, ☐ 골라 [선택 삭제]. 기록 칸 `#moneyPanel`은 숨긴 집(`.m-form-home`)에 두고 ＋·줄 누름 → 서랍 창. ▦ 다건입력 `#bulkDlg`(줄 `bulkRowHtml`, 엑셀 붙여넣기 `bulkPaste`, [저장] = 줄마다 add).
- 폰(≤720px) 달력: 칸엔 숫자+아이콘 2개까지(`cell-ic`), 날짜 누르면 창 대신 달력 아래 `#dayPanel`에 그 날 자세히 (기본 오늘). PC는 칸에 글자 + 날짜 창.
- 달력: 위 요약 4칸(폰은 한 줄), 아래는 목표 → 세부목표 → 할 일 (＋ 목표, ＋ 세부목표). 로고 = 강력 새로고침. 시간은 화면에 `1h 30m`, 입력은 [시간][분].
  칸 안 할 일 체크박스, 글자 누르면 편집 창, 빈 곳 누르면 그날 창([할 일]/[실천한 일]), 실천한 날 초록·안 한 지난 날 연한 빨강, 🔥 실천 목록, 구글 일정.
- 구글 캘린더 표시: 📌 할 일(파랑, 할 시간 있으면 `· 1h`) · 🔥 시간과 같이 끝낸 일(노랑, 실천. `· 1h`) · ✅ 시간 없이 체크만 한 일(초록, 실천 아님) · ❌ 지난 날 못 한 일(회색) · 🎯 D-DAY(빨강) · 🔥 실천(노랑). 반복은 반복 일정 하나.

## 🤝 우리 탭 (냐냐 보드와 같이 쓰는 공간)

- 우리 탭 업데이트 내역은 냐냐 보드 `docs/uri/changes.js`(`URI_CHANGES`)에 적음 → `app.js` `mergeChanges`가 열 때 받아서 `CHANGES`에 섞음(5초 안에 못 받으면 빼고). 새 버전 알림은 그걸 받은 뒤에 확인(`uriNewsReady`).
- 코드는 **냐냐 보드 저장소**(`../nyanya-board/docs/uri/uri.js`)에 있고, 여기선 `app.js`의 `mountUriTab`이 `https://nyanya-lab.github.io/nyanya-board/uri/uri.js?v=(10분 단위)`를 처음 열 때 불러와 `#uriRoot`에 그림. 우리 탭 화면을 고치려면 냐냐 보드 쪽 uri.js를 고치기 (두 보드 다 적용).
- 저장은 이 보드 Firebase와 **따로**: 공통 저장소 `uri-board`의 `uri/{SHA-256("uri-board:"+공통 비밀번호)}`. 공통 비밀번호는 `localStorage["uri-board-pw"]`.
- `who` = 관리자 기기면 "nyanya", 아니면 "ukjin" (적은 사람·기본 '낸 사람'). 🧪 테스트 모드여도 우리 탭은 진짜 공통 저장소에 저장됨.

## 기능 요청 받는 법

주인이 사이트 '기능 요청' 탭의 **열린 요청 복사하기** 글을 붙여넣으면, 그 목록대로 작업하고 끝나면 상태를 '완료'로 바꾸라고 안내하기.
