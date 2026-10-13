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
  쓰는 법이 바뀌면 `docs/index.html`의 사용 설명서(`#helpGuide`)도 같이 고치기.

## 파일

```
docs/index.html        화면 마크업 + 작은 창(dialog)들
docs/style.css         색 토큰(밝은 타일 색: 파랑·코랄·민트·노랑·보라), 다크 모드
docs/app.js            모든 화면 로직 (상태 S, 저장소 backend, render 함수들)
docs/firebase-config.js  Firebase 웹 설정 (공개돼도 되는 값)
docs/changes.js        업데이트 내역 CHANGES (설명서 탭 + 새 버전 알림)
docs/google-sync.html  구글 캘린더 동기화 설정 안내 페이지
docs/apps-script/Code.gs       욱진이 Apps Script에 넣는 짧은 로더 (한 번만 붙여넣음)
docs/apps-script/sync-core.js  실제 구글 동기화 코드. 로더가 5분마다 받아서 실행 → 여기만 고치면 자동 적용
docs/manifest.webmanifest, *.png  홈 화면 앱 아이콘
```

## 데이터 (Firebase Realtime Database `ukjin-207a3`)

- 로그인 없음. **비밀번호 = 저장 위치**: `ukjin/{SHA-256("ukjin-board:"+비밀번호)}` 아래에 저장 (watch-log 방식).
  규칙: `ukjin/$room` 은 `$room.length === 64` 일 때만 읽기/쓰기.
- 모음(`COLS`): `goals`, `tasks`, `logs`(실천 기록), `money`, `accounts`(통장·카드·현금), `requests`(기능 요청), `wins`(긁은 복권: kind coupon{tier,title,expires,usedAt} | pen{title,left,deadline,days,doneAt} | miss — 긁은 장 수 = wins 개수, 긁을 때는 되돌리기 기록 안 남김). 그 외 `settings`, `_backup/{prev,daily,undo}`, `gevents`·`gsync`(Apps Script가 씀), `history`(↶↷ 되돌리기 기록 최근 30개, 모든 기기 공유: 묶음마다 keys `"모음|id"`, before/after 문서, label, date, dev, undone).
- 항목·칸 단위로 따로 저장해서 여러 기기가 서로 덮어쓰지 않음. 업데이트는 `flattenPaths`로 경로별 update.
- 할 일: `repeat` = `none`(date, done, doneDate) / `daily` / `weekly`(days 0=일…6=토, start, end, doneDates{날짜:true}).
  `subId` = 세부목표(선택). 목표 `goals/{id}/subs/{subId}` = {title, due, createdAt, doneAt}. 목표 달성은 `goals/{id}/achievedAt`(날짜). 진행률은 큰 목표만.
  `lateFrom`/`earlyFrom` = 다른 날 할 일을 오늘 체크해서 옮긴 원래 날짜 (확인 창에서 고름. 지난 일은 원래 날짜에 ❌ 흔적, 체크 풀면 원래 날짜로 돌아감).
  `minutes` = 할 시간(선택). 있으면 체크할 때 묻지 않고 그 시간으로 `logs`에 기록.
- 실천 기록 `logs`: 할 일 체크 때 기록한 시간은 `taskId`로 연결 (달력·구글에서 할 일 옆에 시간으로 표시).
- 포인트(⭐): 저장 안 하고 기록에서 계산 (`pointsLedger`). 실천 1분 1 · 세부목표 50 · 목표 300 · 연속 7/15/30/90일 30/100/250/1000, 그 뒤 30일마다 300 · 돈 기록 1(월급 30). 1000점 = 복권 1장. `settings.lotto` = {on(욱진이에게 공개), used(긁은 장 수), odds{big,mid,small,miss,pen}(기본 3/25/47/20/5), coupons{id:{tier big|mid|small, title, days}}, pens{id:{title, days}}} — 목록은 관리자 '🎟️ 복권 관리' 창에서만. 쿠폰 요청 `lotto.reqs{id:{text, at, status new|added|no}}` (욱진이가 쿠폰함에서 보냄). 관리자 기기에만 새 기능 요청·쿠폰 요청 N (localStorage `ukjin-req-seen`, `ukjin-creq-seen`). 공개 전에는 관리자 기기(`localStorage ukjin-admin`)에서만 보임.
- 관리자: `settings.adminHash` = SHA-256("ukjin-admin:"+비번). 맞게 넣은 기기는 `localStorage ukjin-admin=1` → 🧪 테스트 모드(지금 데이터를 복사한 메모리 보드, 저장 안 됨, 끝내면 새로고침) 버튼이 제목 옆에.
- 한 달 예산: `settings.budgets[YYYY-MM]` = {income, items{id:{cat, amount}}}. 예상 수입 − 예산 합계 = 여자친구에게 줄 돈(예상). `saveSettingsDeep`로 칸 하나씩 저장. 예산이 없는 달은 그 전 가장 가까운 달 예산을 이어 쓰고, 고치는 순간 그 달 것으로 옮겨 저장.
- 돈 `money.kind`: `income` / `expense` / `transfer`(여자친구에게 보낸 돈) / `move`(내 자산끼리 이체, 수입·지출 아님). `account`, `toAccount`.

## 화면

메뉴: 달력(첫 화면) · 목표 · 돈 관리 · 자격증 찾기 · 기능 요청 · ⚙ 설정(작은 창: 저장 상태, 백업 되돌리기, 구글 캘린더, 잠그기)
- 폰(≤720px) 달력: 칸엔 숫자+아이콘 2개까지(`cell-ic`), 날짜 누르면 창 대신 달력 아래 `#dayPanel`에 그 날 자세히 (기본 오늘). PC는 칸에 글자 + 날짜 창.
- 달력: 위 요약 4칸(폰은 한 줄), 아래는 목표 → 세부목표 → 할 일 (＋ 목표, ＋ 세부목표). 로고 = 강력 새로고침. 시간은 화면에 `1h 30m`, 입력은 [시간][분].
  칸 안 할 일 체크박스, 글자 누르면 편집 창, 빈 곳 누르면 그날 창([할 일]/[실천한 일]), 실천한 날 초록·안 한 지난 날 연한 빨강, 🔥 실천 목록, 구글 일정.
- 구글 캘린더 표시: 📌 할 일(파랑, 할 시간 있으면 `· 1h`) · 🔥 끝낸 일(노랑, 실천으로 봄. 시간 있으면 `· 1h`) · ❌ 지난 날 못 한 일(회색) · 🎯 D-DAY(빨강) · 🔥 실천(노랑). 반복은 반복 일정 하나.

## 기능 요청 받는 법

주인이 사이트 '기능 요청' 탭의 **열린 요청 복사하기** 글을 붙여넣으면, 그 목록대로 작업하고 끝나면 상태를 '완료'로 바꾸라고 안내하기.
