import { app } from "./firebase-init.js";
import {
  getFirestore, doc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage, ref, uploadString, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const db = getFirestore(app);
const storage = getStorage(app);

export async function saveProject(data) {
  await setDoc(doc(db, "projects", "demo"), data);
}

export async function uploadImage(dataUrl) {
  const r = ref(storage, "images/" + Date.now() + ".png");
  await uploadString(r, dataUrl, "data_url");
  return await getDownloadURL(r);
}
