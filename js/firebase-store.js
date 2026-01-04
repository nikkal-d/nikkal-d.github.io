// js/firebase-store.js
// Firestore persistence for project JSON (pages + currentPage).
// Storage uploads should be handled separately (next step).
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref as sRef, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { db, storage, ensureAuth } from "./firebase-init.js";

export async function ensureFirebaseAuth() {
  return ensureAuth();
}

export async function saveProjectToFirebase(projectId, data) {
  const user = await ensureAuth();
  const ref = doc(db, "users", user.uid, "projects", projectId);
  await setDoc(ref, data, { merge: true });
}

export async function loadProjectFromFirebase(projectId) {
  const user = await ensureAuth();
  const ref = doc(db, "users", user.uid, "projects", projectId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

// Optional helper for images (dataURL -> storage url)
export async function uploadImageDataUrl(dataUrl, path = null) {
  await ensureAuth();
  const name = path || `images/${Date.now()}_${Math.random().toString(16).slice(2)}.png`;
  const r = sRef(storage, name);
  await uploadString(r, dataUrl, "data_url");
  return await getDownloadURL(r);
}
