// js/export.js
// ---------------------------------------------
// EXPORT SYSTEM (Cloud Upload + Local Download)
// ---------------------------------------------

import { auth, db, storage } from "../firebase-init.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  ref,
  uploadString,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ---------------------------------------------
// CLOUD UPLOAD
// ---------------------------------------------
export async function exportToCloud(pages, title, password = "") {
  const user = auth.currentUser;

  if (!user) {
    alert("Πρέπει να συνδεθείς για να ανεβάσεις το βιβλίο στο cloud.");
    return null;
  }

  try {
    // unique ID για το βιβλίο
    const bookId = crypto.randomUUID();

    const folderRef = ref(storage, `photobooks/${bookId}`);

    const uploadedPages = [];

    // -----------------------------------------
    // UPLOAD ΚΑΘΕ ΣΕΛΙΔΑ ΣΤΟ STORAGE
    // -----------------------------------------
    for (let i = 0; i < pages.length; i++) {
      const pageDataURL = pages[i];

      const pageRef = ref(folderRef, `page-${i}.png`);
      const uploadResult = await uploadString(pageRef, pageDataURL, "data_url");
      const url = await getDownloadURL(uploadResult.ref);

      uploadedPages.push(url);
    }

    // -----------------------------------------
    // SAVE METADATA στο Firestore
    // -----------------------------------------
    await setDoc(doc(db, "photobooks", bookId), {
      userId: user.uid,
      title: title || "Χωρίς τίτλο",
      pages: uploadedPages,
      isPublic: false,
      shareId: "",
      password: password || "",
      createdAt: serverTimestamp()
    });

    return bookId;

  } catch (err) {
    console.error("CLOUD EXPORT ERROR:", err);
    alert("Σφάλμα κατά την αποστολή στο cloud: " + err.message);
    return null;
  }
}
