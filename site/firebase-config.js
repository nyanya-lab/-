// Firebase 연결 설정
// Firebase 콘솔 → 프로젝트 설정(톱니) → 일반 → 내 앱(웹 </>) → "SDK 설정 및 구성"의 firebaseConfig를
// 아래 null 자리에 그대로 붙여넣으면 돼요. (이 값들은 공개돼도 괜찮은 값이고, 실제 보호는 Firestore 규칙이 해요.)
//
// 예시:
// export const firebaseConfig = {
//   apiKey: "AIza...",
//   authDomain: "내프로젝트.firebaseapp.com",
//   projectId: "내프로젝트",
//   storageBucket: "내프로젝트.appspot.com",
//   messagingSenderId: "1234567890",
//   appId: "1:1234567890:web:abcdef"
// };
export const firebaseConfig = null;

// Firestore 안에서 이 보드 데이터가 들어갈 위치: boards/{BOARD_ID}/...
// 기존 프로젝트의 다른 데이터와 섞이지 않게 따로 묶어 둬요.
export const BOARD_ID = "ukjin";
