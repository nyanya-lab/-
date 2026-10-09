// Firebase 연결 설정 (ukjin-207a3 웹 앱). 공개돼도 괜찮은 값이고, 데이터는 비밀번호로 지켜져요.
export const firebaseConfig = {
  apiKey: "AIzaSyB0aGdOx_rFUpGCxDdT1fxe0FR8A5Oq5ow",
  authDomain: "ukjin-207a3.firebaseapp.com",
  projectId: "ukjin-207a3",
  storageBucket: "ukjin-207a3.firebasestorage.app",
  messagingSenderId: "318941907079",
  appId: "1:318941907079:web:bd3a15eb3dcedaf5c81022",
  // Realtime Database → 데이터 탭 맨 위에 보이는 주소 (https://ukjin-207a3-default-rtdb....)
  databaseURL: "https://ukjin-207a3-default-rtdb.firebaseio.com"
};

// 구글 캘린더 연결용 OAuth 클라이언트 ID (Google Cloud 콘솔 → 클라이언트). 공개돼도 되는 값이에요.
export const GOOGLE_CLIENT_ID = "965328211009-i7n0ggab508j44k22csd82ljvkhklr4k.apps.googleusercontent.com";
