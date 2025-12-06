// firebase-init.js
// Firebase v10 ES Modules config – root file

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// 🔑 ΔΙΚΟ ΣΟΥ CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyBGt4Lsvk0ouISEtNbDbFirdY-XqmbHeSo",
  authDomain: "photobook-studio-b1064.firebaseapp.com",
  projectId: "photobook-studio-b1064",
  storageBucket: "photobook-studio-b1064.firebasestorage.app",
  messagingSenderId: "287968637580",
  appId: "1:287968637580:web:42311227a5df7b79ab81a9",
  measurementId: "G-75L68JM346"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export {
  app,
  auth,
  db,
  storage,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
};
