// js/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyA7_s-RdUl55RJZi1_QD_w4La-0jv0IOLA",
  authDomain: "photobook-studio-b1064.firebaseapp.com",
  projectId: "photobook-studio-b1064",
  storageBucket: "photobook-studio-b1064.firebasestorage.app",
  messagingSenderId: "275371063372",
  appId: "1:275371063372:web:92af7bba76a5d61373bc1b"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
