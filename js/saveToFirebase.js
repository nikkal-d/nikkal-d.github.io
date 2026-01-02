import { db, storage, auth } from "./firebase-init.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  ref,
  uploadString,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

/**
 * pages: array από dataURL (canvas.toDataURL)
 * options: { title, password }
 *
 * επιστρέφει το ID του photobook (για share link)
 */
export async function uploadPhotobook(pages, options = {}) {
  if (!Array.isArray(pages) || !pages.length) {
    throw new Error("Δεν υπάρχουν σελίδες για ανέβασμα.");
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error("Πρέπει να είσαι συνδεδεμένος για να αποθηκεύσεις στο cloud.");
  }

  const ownerUid = user.uid;
  const ownerEmail = user.email || null;

  const title = options.title || "Untitled Photobook";
  const password = options.password || null;

  // Δημιουργούμε τυχαίο id για το folder στο Storage
  const bookId = crypto.randomUUID();
  const folderRef = ref(storage, `photobooks/${ownerUid}/${bookId}`);

  const uploadedPages = [];

  // Ανεβάζουμε όλες τις σελίδες
  for (let i = 0; i < pages.length; i++) {
    const dataUrl = pages[i];
    const pageRef = ref(folderRef, `page-${i}.png`);
    const result = await uploadString(pageRef, dataUrl, "data_url");
    const url = await getDownloadURL(result.ref);
    uploadedPages.push(url);
  }

  // Thumbnail = πρώτη σελίδα
  const thumbUrl = uploadedPages[0];

  // Μεταδεδομένα στο Firestore
  const docRef = await addDoc(collection(db, "photobooks"), {
    ownerUid,
    ownerEmail,
    bookId,
    title,
    password: password || null,
    pages: uploadedPages,
    pageCount: uploadedPages.length,
    thumbUrl,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return docRef.id; // Firestore doc id (για viewer.html?id=...)
}
