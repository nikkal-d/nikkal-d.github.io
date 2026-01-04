// firebase-init.js (root)
// Initialize Firebase (Auth + Firestore + Storage)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyD65Khx_U2kKa-zzJeG9PJ51e_BOT4OKX0",
  authDomain: "photobook-studio-b1064.firebaseapp.com",
  projectId: "photobook-studio-b1064",
  // IMPORTANT: bucket name is usually *.appspot.com
  storageBucket: "photobook-studio-b1064.appspot.com",
  messagingSenderId: "892812056520",
  appId: "1:892812056520:web:a7de52b53d4795dcbb2376",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export function ensureAuth(){
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (user) return resolve(user);
      try{
        const cred = await signInAnonymously(auth);
        resolve(cred.user);
      }catch(e){
        reject(e);
      }
    });
  });
}
