// js/firebase-store.js
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { app } from "./firebase-init.js";

const db = getFirestore(app);

export async function saveProject(userId, data) {
  await setDoc(doc(db, "projects", userId), {
    data,
    updated: Date.now()
  });
}

export async function loadProject(userId) {
  const snap = await getDoc(doc(db, "projects", userId));
  return snap.exists() ? snap.data().data : null;
}
