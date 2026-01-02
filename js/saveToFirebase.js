// js/saveToFirebase.js
import { db, storage } from "./firebase-init.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ref, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

export async function saveProject(projectId, pages) {
  await setDoc(doc(db, "projects", projectId), {
    pages,
    updatedAt: Date.now()
  });
}

export async function loadProject(projectId) {
  const snap = await getDoc(doc(db, "projects", projectId));
  return snap.exists() ? snap.data().pages : null;
}

export async function uploadImage(dataUrl, name) {
  const r = ref(storage, `images/${name}`);
  await uploadString(r, dataUrl, "data_url");
  return await getDownloadURL(r);
}
