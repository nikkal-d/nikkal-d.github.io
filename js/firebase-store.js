// js/firebase-store.js
import { db, storage, ensureAuth } from "./firebase-init.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref as sRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const PROJECTS_COL = "photobookProjects";

async function ready() {
  await ensureAuth();
}

export async function uploadImage(file) {
  await ready();
  const ts = Date.now();
  const safe = (file.name || "image").replace(/[^\w.\-]+/g, "_");
  const path = `images/${ts}_${safe}`;
  const r = sRef(storage, path);
  await uploadBytes(r, file, { contentType: file.type || "image/png" });
  return await getDownloadURL(r);
}

export async function saveProject(projectId, data) {
  await ready();
  const ref = doc(db, PROJECTS_COL, projectId);
  await setDoc(ref, { ...data, updatedAt: Date.now() }, { merge: true });
}

export async function loadProject(projectId) {
  await ready();
  const ref = doc(db, PROJECTS_COL, projectId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

window.FirebaseStore = { uploadImage, saveProject, loadProject };
