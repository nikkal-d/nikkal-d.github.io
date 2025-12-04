// firebase-init.js
// Χρησιμοποιούμε ES modules από το CDN της Firebase v10

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ΒΑΛΕ ΕΔΩ ΤΟ ΔΙΚΟ ΣΟΥ CONFIG από το Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBGt4Lsvk0ouISEtNbDbFirdY-XqmbHeSo",
  authDomain: "photobook-studio-b1064.firebaseapp.com",
  projectId: "photobook-studio-b1064",
  storageBucket: "photobook-studio-b1064.firebasestorage.app",
  messagingSenderId: "287968637580",
  appId: "1:287968637580:web:42311227a5df7b79ab81a9",
  measurementId: "G-75L68JM346"
};

// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
