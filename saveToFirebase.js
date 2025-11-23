// SAVE TO FIREBASE — FINAL FIXED VERSION

import { db, storage } from "./firebase-init.js";
import {
  collection,
  addDoc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  ref,
  uploadString,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

/**
 * Upload Photobook to Firebase Storage + save metadata to Firestore
 *
 * @param {Array} pages - Array of dataURL strings (PNG pages)
 * @param {Object} options - { title, email, password }
 */
export async function uploadPhotobook(pages, options = {}) {
  try {
    const id = crypto.randomUUID();
    const folderRef = ref(storage, `photobooks/${id}`);

    const uploadedPages = [];

    // Upload κάθε σελίδα
    for (let i = 0; i < pages.length; i++) {
      const pageData = pages[i];

      const pageRef = ref(folderRef, `page-${i + 1}.png`);
      await uploadString(pageRef, pageData, "data_url");

      const url = await getDownloadURL(pageRef);
      uploadedPages.push(url);
    }

    // Save meta στο Firestore
    const docRef = await addDoc(collection(db, "photobooks"), {
      id,
      pages: uploadedPages,
      title: options.title || "Untitled Photobook",
      password: options.password || null,
      ownerEmail: options.email || null,   // 👈 κρατάμε email
      createdAt: Timestamp.now()
    });

    return id;

  } catch (err) {
    console.error("🔥 ERROR uploading photobook:", err);
    throw err;
  }
}
