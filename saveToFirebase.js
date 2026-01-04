// js/saveToFirebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

import { firebaseConfig } from "../firebase-init.js";

/* =========================
   INIT
========================= */
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

/* =========================
   PROJECT SAVE / LOAD
========================= */
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

/* =========================
   IMAGE UPLOAD (Storage)
========================= */
export async function uploadImageFile(file) {
  const imgRef = storageRef(
    storage,
    `images/${Date.now()}_${file.name}`
  );

  await uploadBytes(imgRef, file);
  return await getDownloadURL(imgRef);
}
