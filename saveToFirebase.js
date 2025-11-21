// SAVE TO FIREBASE — WORKING VERSION

import { db, storage } from "./firebase-init.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  ref,
  uploadString,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

/**
 * Upload Photobook to Firebase Storage + save metadata to Firestore
 */
export async function uploadPhotobook(pages, title, password) {
  try {
    const id = crypto.randomUUID();
    const folderRef = ref(storage, `photobooks/${id}`);

    const uploadedPages = [];

    // Upload each page
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const pagePath = ref(folderRef, `page-${i}.png`);
      const result = await uploadString(pagePath, page, "data_url");
      const url = await getDownloadURL(result.ref);

      uploadedPages.push(url);
    }

    // Save metadata
    await addDoc(collection(db, "photobooks"), {
      id,
      pages: uploadedPages,
      title: title || "Untitled Photobook",
      password: password || null,
      createdAt: serverTimestamp()
    });

    return id;

  } catch (err) {
    console.error("ERROR uploading photobook:", err);
    throw err;
  }
}
