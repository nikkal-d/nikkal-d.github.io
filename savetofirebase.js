import { db, storage } from "./firebase-init.js";
import { collection, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ref, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

export async function uploadPhotobook(pages, options = {}) {
  const imageUrls = [];
  const folder = `books/${Date.now()}`;

  for (let i = 0; i < pages.length; i++) {
    const dataUrl = pages[i].editedDataUrl || pages[i].imageUrl;
    const storageRef = ref(storage, `${folder}/page-${i+1}.png`);
    await uploadString(storageRef, dataUrl, 'data_url');
    imageUrls.push(await getDownloadURL(storageRef));
  }

  const docRef = await addDoc(collection(db, "photobooks"), {
    createdAt: Timestamp.now(),
    pageCount: pages.length,
    pages: imageUrls,
    password: options.password || null
  });

  return docRef.id;
}
