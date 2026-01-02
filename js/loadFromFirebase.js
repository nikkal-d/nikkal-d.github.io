import { db } from "./firebase-init.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function loadPhotobook(docId) {
  const ref = doc(db, "photobooks", docId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error("Το photobook δεν βρέθηκε.");
  }

  const data = snap.data();
  // επιστρέφουμε τις πληροφορίες (τίτλος, σελίδες, κλπ)
  return {
    id: snap.id,
    ...data
  };
}
