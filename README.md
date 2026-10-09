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

## 비밀번호 방식 (watch-log와 같은 구조)

- 로그인 기능 없이 **비밀번호 하나**로 열어요. 비밀번호가 곧 데이터 저장 위치(방 이름)라서, 비밀번호를 모르면 데이터에 닿을 수 없어요.
- 비밀번호 원문은 서버에 안 가요. 해시(64자)로 바꿔서 Firestore `boards/{해시}/...`에 저장돼요.
- 처음 넣는 비밀번호면 "새 보드를 만들까요?"라고 한 번 더 물어봐요 (오타로 빈 보드가 생기지 않게).
- 한 번 열면 그 기기에서는 **잠그기** 전까지 바로 열려요.
- 비밀번호를 잊으면 데이터를 찾을 수 없으니 꼭 기억해 두기.

## Firebase 설정 (ukjin-207a3, 한 번만)

1. **Firestore 규칙 추가**: Firestore Database → 규칙 → 기존 규칙은 두고 `firestore-rules-snippet.txt`의 블록을 `match /databases/{database}/documents {` 바로 아래에 붙여넣고 게시
2. **배포** (Firebase Hosting, 기존 사이트와 별도인 새 사이트로)
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase hosting:sites:create ukjin-board
   firebase deploy --only hosting
   ```
   → `https://ukjin-board.web.app` 에서 열림 (이름이 이미 쓰였으면 다른 이름으로 만들고 `firebase.json`의 `site`도 같이 바꾸기)

로컬에서 미리 보기: `cd site && python3 -m http.server` 후 `http://localhost:8000`
