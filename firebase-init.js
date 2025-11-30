import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBGt4Lsvk0ouISEtNbDbFirdY-XqmbHeSo",
  authDomain: "photobook-studio-b1064.firebaseapp.com",
  projectId: "photobook-studio-b1064",
 storageBucket: "photobook-studio-b1064.appspot.com",
  messagingSenderId: "287968637580",
  appId: "1:287968637580:web:42311227a5df7b79ab81a9",
  measurementId: "G-75L68JM346"
};


export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
