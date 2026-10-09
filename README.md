# 욱진 실천 보드

욱진이의 계획·실천·돈 관리 웹사이트. 파일은 `site/` 폴더에 있어요.

| 메뉴 | 내용 |
|---|---|
| 오늘 | 오늘 할 일 체크, 매일 하는 일, 실천 기록(분·메모), 다가오는 할 일 |
| 목표 | 자격증 목표와 D-day, 진행률 |
| 기록 | 최근 26주 '타일 벽'(오래 할수록 진해짐), 연속 실천일 |
| 돈 관리 | 월급·수입 → 여자친구에게 보낸 돈 → 생활비 지출(예산·분류별) → 남은 돈, 최근 6개월 표 |
| 자격증 찾기 | 주방·인테리어·타일 관련 국가자격 목록, Q-Net·시험일정·기출·강의 링크 한 번에, 목표로 바로 추가 |
| 구글 캘린더 | 할 일·목표 옆 '캘린더' 버튼 → 구글 캘린더 일정 추가 (매일 하는 일은 반복 일정) |

Firebase 설정 전에는 그 브라우저에만 저장돼요.

## Firebase 연결 (기존 프로젝트 사용)

기존 데이터·규칙·사이트를 건드리지 않도록 구성돼 있어요.

1. **웹 앱 설정값 넣기**: Firebase 콘솔 → 프로젝트 설정 → 내 앱(웹) → `firebaseConfig` 복사 → `site/firebase-config.js`의 `null` 자리에 붙여넣기
2. **비밀번호 로그인 만들기**
   - Authentication → 로그인 방법 → **이메일/비밀번호** 사용 설정
   - Authentication → 사용자 → 사용자 추가: 이메일 `board@ukjin.app`(실제 메일 아니어도 됨) + 보드 비밀번호
   - 사이트에서는 비밀번호만 넣으면 열려요. 이메일을 바꾸려면 `site/firebase-config.js`의 `LOGIN_EMAIL`도 같이 바꾸기
3. **Firestore 규칙 추가**: `firestore-rules-snippet.txt`의 블록을 기존 규칙 안에 *추가* (기존 규칙 덮어쓰지 않기)
   - 데이터는 Firestore `boards/ukjin/...` 아래에만 저장돼요.
4. **배포** (Firebase Hosting, 기존 사이트와 별도인 새 사이트로)
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase use 기존-프로젝트-ID          # .firebaserc에 저장됨
   firebase hosting:sites:create ukjin-board
   firebase deploy --only hosting
   ```
   → `https://ukjin-board.web.app` 에서 열림 (이 이름이 이미 쓰였으면 다른 이름으로 바꾸고 `firebase.json`의 `site`도 같이 바꾸기)

로컬에서 미리 보기: `cd site && python3 -m http.server` 후 `http://localhost:8000`
