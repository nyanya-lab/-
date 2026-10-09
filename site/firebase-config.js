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
export const firebaseConfig = {
  apiKey: "AIzaSyB0aGdOx_rFUpGCxDdT1fxe0FR8A5Oq5ow",
  authDomain: "ukjin-207a3.firebaseapp.com",
  projectId: "ukjin-207a3",
  storageBucket: "ukjin-207a3.firebasestorage.app",
  messagingSenderId: "318941907079",
  appId: "1:318941907079:web:bd3a15eb3dcedaf5c81022"
};

// Firestore 안에서 이 보드 데이터가 들어갈 위치: boards/{BOARD_ID}/...
// 기존 프로젝트의 다른 데이터와 섞이지 않게 따로 묶어 둬요.
export const BOARD_ID = "ukjin";

// 보드 전용 로그인 계정. 화면에는 비밀번호 칸만 나오고, 이메일은 이 값으로 자동 입력돼요.
// 실제 메일 주소가 아니어도 돼요. Firebase 콘솔 → Authentication → 사용자 → '사용자 추가'에서
// 이 이메일 + 원하는 비밀번호로 계정을 하나 만들면, 그 비밀번호가 보드 비밀번호가 돼요.
export const LOGIN_EMAIL = "board@ukjin.app";
