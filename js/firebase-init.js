import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export const app = initializeApp({
  apiKey: "YOUR_KEY",
  authDomain: "YOUR.firebaseapp.com",
  projectId: "photobook-studio-b1064",
  storageBucket: "photobook-studio-b1064.appspot.com"
});

const auth = getAuth(app);
signInAnonymously(auth);
