// firebase-store.js (root)
// Firestore + Storage helpers for Photobook (safe: editor works even if Firebase fails)

import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { db, storage, ensureAuth } from "../firebase-init.js";

export { ensureAuth };

// Save project JSON under users/{uid}/projects/{projectId}
export async function saveProject(projectId, data){
  const user = await ensureAuth();
  const d = doc(db, "users", user.uid, "projects", projectId);
  await setDoc(d, data, { merge: true });
}

// Load project JSON
export async function loadProject(projectId){
  const user = await ensureAuth();
  const d = doc(db, "users", user.uid, "projects", projectId);
  const snap = await getDoc(d);
  return snap.exists() ? snap.data() : null;
}

// Upload a File to Storage and return download URL
export async function uploadImage(file, folder="images"){
  const user = await ensureAuth();
  const safeName = `${Date.now()}_${Math.random().toString(16).slice(2)}_${file.name || "image"}`.replace(/[^\w.\-]+/g,"_");
  const path = `${folder}/${user.uid}/${safeName}`;
  const r = ref(storage, path);
  await uploadBytes(r, file, { contentType: file.type || "application/octet-stream" });
  return await getDownloadURL(r);
}
