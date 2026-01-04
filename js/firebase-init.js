// js/firebase-init.js
// Firebase init (modular v9)
// IMPORTANT: replace firebaseConfig with YOUR values (keep keys in client ok, but restrict rules!)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

export const firebaseConfig = window.FIREBASE_CONFIG || {
  apiKey: "AIzaSyA7_s-RdUl55RJZi1_QD_w4La-0jv0IOLA",
  authDomain: "photobook-studio-b1064.firebaseapp.com",
  projectId: "photobook-studio-b1064",
  storageBucket: "photobook-studio-b1064.firebasestorage.app",
  messagingSenderId: "275371063372",
  appId: "1:275371063372:web:92af7bba76a5d61373bc1b"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export async function ensureAuth() {
  if (auth.currentUser) return auth.currentUser;
  const res = await signInAnonymously(auth);
  return res.user;
}
