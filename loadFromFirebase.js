import { db } from "./firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function loadPhotobook(id){
  const snap = await getDoc(doc(db, "photobooks", id));
  if(!snap.exists()) throw new Error("Not found");
  return snap.data();
}
