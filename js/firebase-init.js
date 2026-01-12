// js/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

export const firebaseConfig = {
  apiKey: "AIzaSyBGt4Lsvk0ouISEtNbDbFirdY-XqmbHeSo",
  authDomain: "photobook-studio-b1064.firebaseapp.com",
  projectId: "photobook-studio-b1064",
  storageBucket: "photobook-studio-b1064.firebasestorage.app",
  messagingSenderId: "287968637580",
  appId: "1:287968637580:web:42311227a5df7b79ab81a9",
  measurementId: "G-75L68JM346"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export async function ensureAuth() {
  try {
    if (auth.currentUser) return auth.currentUser;
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (e) {
    console.warn("Firebase auth not available (enable Anonymous auth or adjust rules).", e);
    return null;
  }
}
