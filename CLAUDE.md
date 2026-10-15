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
docs/app.js            모든 화면 로직 (상태 S, 저장소 backend, render 함수들)
docs/firebase-config.js  Firebase 웹 설정 (공개돼도 되는 값)
docs/changes.js        업데이트 내역 CHANGES (설명서 탭 + 새 버전 알림)
docs/lotto-presets.js  복권 추천 목록 (쿠폰 200 · 벌칙 50, 관리 창에서 한 번에 넣기)
docs/google-sync.html  구글 캘린더 동기화 설정 안내 페이지
docs/apps-script/Code.gs       욱진이 Apps Script에 넣는 짧은 로더 (한 번만 붙여넣음)
docs/apps-script/sync-core.js  실제 구글 동기화 코드. 로더가 5분마다 받아서 실행 → 여기만 고치면 자동 적용
docs/manifest.webmanifest, *.png  홈 화면 앱 아이콘
```

## 데이터 (Firebase Realtime Database `ukjin-207a3`)

- 로그인 없음. **비밀번호 = 저장 위치**: `ukjin/{SHA-256("ukjin-board:"+비밀번호)}` 아래에 저장 (watch-log 방식).
  규칙: `ukjin/$room` 은 `$room.length === 64` 일 때만 읽기/쓰기.
- 모음(`COLS`): `goals`, `tasks`, `logs`(실천 기록), `money`, `accounts`(통장·카드·현금), `requests`(기능 요청), `wins`(긁은 복권: kind coupon{tier,title,expires,usedAt} | pen{title,left,deadline,days,doneAt} | miss, 꽝·벌칙엔 `game{pts,date}` (🎯 타이밍 게임으로 돌려받은 포인트, 한 장에 한 번), 인증샷 `pics{사진id:날짜}` (벌칙 [했어요]·쿠폰 [쓰기]는 사진 필수, 🛡️ 쿠폰만 빼고) — 긁은 장 수 = wins 개수, 긁을 때는 되돌리기 기록 안 남김). `pics/{사진id}` = {full(긴 쪽 1280px), thumb(360px), win, kind, title, date, at} — 보드 열 때 안 받고 쿠폰함 📸 추억 탭에서 9장씩, 백업에도 안 넣음. 그 외 `settings`, `_backup/{prev,daily,undo}`, `gevents`·`gsync`(Apps Script가 씀), `history`(↶↷ 되돌리기 기록 최근 30개, 모든 기기 공유: 묶음마다 keys `"모음|id"`, before/after 문서, label, date, dev, undone).
- 항목·칸 단위로 따로 저장해서 여러 기기가 서로 덮어쓰지 않음. 업데이트는 `flattenPaths`로 경로별 update.
- 할 일: `repeat` = `none`(date, done, doneDate) / `daily` / `weekly`(days 0=일…6=토, start, end, doneDates{날짜:true}) / `nweek`(주 `times`번, 아무 요일: 그 주에 times번 체크하면 남은 날 안 보임, 지난 날 ❌ 없음, 못 채운 주는 토요일에만 ❌ — `nweekOn`/`nweekCount`).
  `subId` = 세부목표(선택). 목표 `goals/{id}/subs/{subId}` = {title, due, createdAt, doneAt}. 목표 달성은 `goals/{id}/achievedAt`(날짜). 진행률은 큰 목표만.
  `lateFrom`/`earlyFrom` = 다른 날 할 일을 오늘 체크해서 옮긴 원래 날짜 (확인 창에서 고름. 지난 일은 원래 날짜에 ❌ 흔적, 체크 풀면 원래 날짜로 돌아감).
  `penId` = 😈 벌칙 할 일 (wins id, 기한 마감일에 자동 생성·장 수/기한 따라감, 체크 = 벌칙 한 장 `penDone`).
  `mt-budget-YYYY-MM`(1일)·`mt-income-YYYY-MM`(15일) = 돈 할 일 자동 생성 (`syncMoneyTasks`, 이번·다음 달, `settings.autoTasks`에 만든 표시, 예산·수입 들어오면 저절로 체크). `noPractice` = 실천 시간으로 안 치고 시간도 안 물어봄.
  `minutes` = 할 시간(선택). 있으면 체크할 때 묻지 않고 그 시간으로 `logs`에 기록. 시간 없이 체크한 할 일은 ✅ 체크만(민트, 실천 아님 — 10/11 전에만 15분으로 침), 시간과 같이 끝낸 일은 🔥 실천(노랑).
- 실천 기록 `logs`: 할 일 체크 때 기록한 시간은 `taskId`로 연결 (달력·구글에서 할 일 옆에 시간으로 표시).
- 실천한 날 = 하루 60분 이상 (`PRACTICE_MIN`, 달력 초록). 2026-10-11 주부터(`WEEK_RULE_FROM`) 연속은 주 단위: 한 주(일~토)에 실천한 날 5일(`WEEK_GOAL`, 아무 요일)이면 성공, 성공한 주가 이어지면 연속 ○주 (`weekRuns`/`streak`, 이번 주는 끝날 때까지 안 끊김). 그 전 날짜는 예전 규칙(50분 · 날마다 연속 · 7/15/30/90일 보너스) 그대로. 1~59분 = 연한 노랑 `part`(40/60m), 0분 지난 날 = 연한 빨강. 달력 주 줄 위 `wk-bar` 도장판(`weekBar`: 목표 ■5칸 + 보너스 ☆2칸, 성공 초록·실패 빨강, 오른쪽 🔥 연속 ○주 +그 주 연속 보너스). 🛡️ = 그 주 실천한 날 +1. 포인트(⭐): 저장 안 하고 기록에서 계산 (`pointsLedger`). 실천 1분 1 · 세부목표 50 · 목표 300 · 연속 3/6/12/25주 30/100/250/1000, 그 뒤 5주마다 300 (그 주 4번째 실천한 날에) · 한 주 6번째 실천한 날 +15 · 7번째 +30 (`dayExtra`/`weekExtra`, 7일 = +45) (10/11 전은 7/15/30/90일) · 돈 기록 1(월급 30) · 👏 칭찬 30(`settings.lotto.praises{id:{text,at,date,pts,claim,got}}`, 관리자 복권 관리 탭에서. claim=1인 새 칭찬은 욱진이가 팝업·맨 위 띠의 [받기]를 눌러야 got=받은 날로 점수, 칭찬한 날 포함 3일째 밤까지 안 받으면 사라짐. claim 없는 예전 칭찬은 받은 걸로). 1000점 = 복권 1장. `settings.lotto` = {on(욱진이에게 공개), used(긁은 장 수), odds{big,mid,small,miss,pen}(기본 3/25/47/20/5), bonus{같은 키}(연속 6주+ 때 더하는 %p, 기본 +1/+2/0/−2/−1), coupons{id:{tier big|mid|small, title, days}}, pens{id:{title, days}}} — 목록은 관리자 '🎟️ 복권 관리' 탭(#lotto)에서만. 쿠폰 요청 `lotto.reqs{id:{text, at, status new|added|no}}` (욱진이가 쿠폰함에서 보냄). 관리자 기기에만 새 기능 요청·쿠폰 요청 N (localStorage `ukjin-req-seen`, `ukjin-creq-seen`). 공개 전에는 관리자 기기(`localStorage ukjin-admin`)에서만 보임.
- 관리자: `settings.adminHash` = SHA-256("ukjin-admin:"+비번). 맞게 넣은 기기는 `localStorage ukjin-admin=1` → 🧪 테스트 모드(지금 데이터를 복사한 메모리 보드, 저장 안 됨, 끝내면 새로고침) 버튼이 제목 옆에. 관리자 기기는 **열면 자동으로 테스트 모드** ([진짜 보드 보기] = 그 탭 세션 동안만 진짜, sessionStorage `ukjin-real`). 테스트 중에도 `saveLotto`(복권 관리·쿠폰 요청)와 관리자 비번은 `realBackend`에도 저장.
- 한 달 예산: `settings.budgets[YYYY-MM]` = {items{id:{cat, memo, amount}}, give(💝 줄 돈, 욱진이가 정함, 없으면 null)} (예전 `income`은 안 씀). 수입 = 이번 달 실제, 아직이면 지난달 실제(`incAuto`). 위 4칸: 수입 · 쓸 돈 · 줄 돈(보냄·남은) · 잔액(수입 − 쓸 돈 − 줄 돈). 실제 수입이 들어오면 욱진이 기기에 확인 띠(`settings.giveAck[월]` = 그때 수입). 15일이 되면 `syncGive`가 줄 돈 − 이미 보낸 돈을 `money/give-{YYYY-MM}` transfer(auto, 보내는 통장 `settings.giveFrom`)로 한 번 기록 → 💝 칸 '준 돈 ✅' + [고치기]. 줄 돈 확인 `settings.giveConfirm[월]={inc,give,at}` (관리자 [확인했어요], 진짜 보드에 저장). 맨 위 알림 띠 `renderNags`. `saveSettingsDeep`로 칸 하나씩 저장. 예산이 없는 달은 그 전 가장 가까운 달 예산을 이어 쓰고, 고치는 순간 그 달 것으로 옮겨 저장.
- 관리자 기기에선 돈 관리에서 지출·자산을 숨김 (`moneyAdminView`/`moneyShown`: 예산 금액 · 수입 · 보낸 돈만, 달력 날짜·검색도 같게).
- 돈 `money.kind`: `income` / `expense` / `transfer`(여자친구에게 보낸 돈) / `move`(내 자산끼리 이체, 수입·지출 아님). `account`, `toAccount`.
- 카드 `accounts/{id}.pay` = {day 결제일(31=말일), from 빠지는 통장, fm/fd ~ tm/td 이용기간(달 -2/-1/0 · 날), since 정한 날}. 결제일에 `syncCardPays`가 할 일 `tasks/cp-{카드}-{YYYY-MM}` '💳 카드값 이체하기 (예상 …원)'(noPractice, `cardPay{card,from,start,end}`) 생성. 체크 → 금액 확인 창(`openCardPay`, 이용기간 지출 합계, 고칠 수 있음) → [이체 기록하기]로 같은 id `money` move 기록. 체크 풀면 그 이체도 지움. 결제일 안 정한 카드는 욱진이 기기 맨 위 띠.

## 화면

메뉴: 달력(첫 화면) · 목표 · 돈 관리(탭 💰 예산 · 🧾 지출 · 🏦 자산 · 📊 통계, `data-mtab`, localStorage `ukjin-mtab`, 관리자는 예산·내역·통계) · 자격증 찾기 · 기능 요청 · 쿠폰함(탭: 쓸 쿠폰·벌칙·지난 것·요청) · 복권 관리(`#lotto`, 관리자 기기만) · ⚙ 설정(작은 창: 저장 상태, 백업 되돌리기, 구글 캘린더, 잠그기)
- 폰(≤720px) 달력: 칸엔 숫자+아이콘 2개까지(`cell-ic`), 날짜 누르면 창 대신 달력 아래 `#dayPanel`에 그 날 자세히 (기본 오늘). PC는 칸에 글자 + 날짜 창.
- 달력: 위 요약 4칸(폰은 한 줄), 아래는 목표 → 세부목표 → 할 일 (＋ 목표, ＋ 세부목표). 로고 = 강력 새로고침. 시간은 화면에 `1h 30m`, 입력은 [시간][분].
  칸 안 할 일 체크박스, 글자 누르면 편집 창, 빈 곳 누르면 그날 창([할 일]/[실천한 일]), 실천한 날 초록·안 한 지난 날 연한 빨강, 🔥 실천 목록, 구글 일정.
- 구글 캘린더 표시: 📌 할 일(파랑, 할 시간 있으면 `· 1h`) · 🔥 시간과 같이 끝낸 일(노랑, 실천. `· 1h`) · ✅ 시간 없이 체크만 한 일(초록, 실천 아님) · ❌ 지난 날 못 한 일(회색) · 🎯 D-DAY(빨강) · 🔥 실천(노랑). 반복은 반복 일정 하나.

## 기능 요청 받는 법

주인이 사이트 '기능 요청' 탭의 **열린 요청 복사하기** 글을 붙여넣으면, 그 목록대로 작업하고 끝나면 상태를 '완료'로 바꾸라고 안내하기.
