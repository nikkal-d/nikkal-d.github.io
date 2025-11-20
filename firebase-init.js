import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDElieLeqhEnwo91VdWMDmQWvPRYw75P3M",
  authDomain: "photobook-studio.firebaseapp.com",
  projectId: "photobook-studio",
  storageBucket: "photobook-studio.appspot.com",
  messagingSenderId: "179092092652",
  appId: "1:179092092652:web:25f8602451fd4f29fbd7c9",
  measurementId: "G-WK2E8XG98K"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
