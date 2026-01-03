// js/firebase-store.js
// Firestore + Storage helpers (anonymous auth). Safe fallbacks when rules not ready.

import { db, auth, storage } from "./firebase-init.js";
import {
  doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  signInAnonymously, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  ref as sRef, uploadString, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

let _authReady = false;
let _authPromise = null;

export function firebaseReady() {
  return !!db && !!storage && !!auth;
}

export async function ensureAuth() {
  if (!firebaseReady()) throw new Error("Firebase not initialized");

  if (_authReady && auth.currentUser) return auth.currentUser;

  if (_authPromise) return _authPromise;

  _authPromise = (async () => {
    // If already signed in, resolve
    if (auth.currentUser) {
      _authReady = true;
      return auth.currentUser;
    }

    // Wait a tick for existing auth state
    const existing = await new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, (u) => {
        unsub();
        resolve(u || null);
      });
      setTimeout(() => {
        try { unsub(); } catch {}
        resolve(auth.currentUser || null);
      }, 800);
    });
    if (existing) {
      _authReady = true;
      return existing;
    }

    // Anonymous sign-in
    const cred = await signInAnonymously(auth);
    _authReady = true;
    return cred.user;
  })();

  return _authPromise;
}

/* -----------------------------
   Firestore: one doc per user (simple)
-------------------------------- */
export async function saveProjectToFirestore(userKey, payload) {
  const u = await ensureAuth();
  const key = userKey || u.uid;
  const d = doc(db, "projects", key);
  await setDoc(d, payload, { merge: true });
}

export async function loadProjectFromFirestore(userKey) {
  const u = await ensureAuth();
  const key = userKey || u.uid;
  const d = doc(db, "projects", key);
  const snap = await getDoc(d);
  return snap.exists() ? snap.data() : null;
}

/* -----------------------------
   Storage uploads
-------------------------------- */
export async function uploadDataUrlToStorage(path, dataUrl) {
  await ensureAuth();
  const r = sRef(storage, path);
  // data_url keeps metadata; good for images
  const res = await uploadString(r, dataUrl, "data_url");
  return await getDownloadURL(res.ref);
}

export async function uploadTextToStorage(path, text, contentType="text/plain") {
  await ensureAuth();
  const r = sRef(storage, path);
  const blob = new Blob([text], { type: contentType });
  const res = await uploadBytes(r, blob, { contentType });
  return await getDownloadURL(res.ref);
}
