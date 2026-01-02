import { db } from './firebase-init.js';
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function savePageToFirebase(pageIndex, pageData) {
  await setDoc(doc(db, "projects/demo/pages", String(pageIndex)), {
    data: pageData,
    updated: Date.now()
  });
}
