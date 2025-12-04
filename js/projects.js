/* ============================================================
   PHOTObook Studio — PROJECTS GALLERY + DELETE FEATURE
   ============================================================ */

import { 
  auth, 
  db,
  storage,
  onAuthStateChanged,
  signOut
} from "../firebase-init.js";

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  ref,
  listAll,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const galleryEl = document.getElementById("gallery");
const userLabel = document.getElementById("user-label");
const logoutBtn = document.getElementById("logout-btn");

/* ------------------------------------------------------------
   LOGOUT
   ------------------------------------------------------------ */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.reload();
};

/* ------------------------------------------------------------
   AUTH: LOAD PROJECTS
   ------------------------------------------------------------ */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    userLabel.textContent = "Δεν είσαι συνδεδεμένος.";
    galleryEl.innerHTML = `<p>🔒 Συνδέσου για να δεις τα photobooks σου.</p>`;
    return;
  }

  userLabel.textContent = user.email;
  logoutBtn.style.display = "inline-block";

  loadUserBooks(user.uid);
});

/* ============================================================
   LOAD USER PHOTObooks
   ============================================================ */
async function loadUserBooks(uid) {
  try {
    const q = query(
      collection(db, "photobooks"),
      where("userId", "==", uid)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      galleryEl.innerHTML = "<p>Δεν έχεις ακόμα photobooks.</p>";
      return;
    }

    galleryEl.innerHTML = "";

    snap.forEach((docSnap) => {
      const book = docSnap.data();

      const thumb = book.pages?.[0] || "";
      const title = book.title || "Untitled Book";

      const date = book.createdAt?.toDate
        ? book.createdAt.toDate().toLocaleDateString("el-GR")
        : "—";

      galleryEl.innerHTML += `
      <div class="card" id="card-${docSnap.id}">
        <img src="${thumb}" alt="thumbnail">
        <div class="card-body">
          <div class="card-title">${title}</div>
          <div class="card-date">📅 ${date}</div>

          <div class="card-actions">
            <a class="action-btn" href="viewer.html?id=${docSnap.id}">
              Προβολή
            </a>

            <button class="action-btn" onclick="deletePhotobook('${docSnap.id}', '${book.bookId}', '${book.userId}')">
              🗑 Διαγραφή
            </button>
          </div>
        </div>
      </div>`;
    });

  } catch (err) {
    console.error(err);
    galleryEl.innerHTML = "<p>Σφάλμα φόρτωσης δεδομένων.</p>";
  }
}

/* ============================================================
   DELETE PHOTObook
   Firestore + Storage
   ============================================================ */

// κάνουμε τη function global για να μπορεί να την καλέσει το HTML onclick
window.deletePhotobook = async (docId, bookId, uid) => {

  const ok = confirm("⚠️ Θέλεις σίγουρα να διαγράψεις αυτό το photobook;\n\nΗ ενέργεια είναι ΜΗ ΑΝΑΣΤΡΕΨΙΜΗ.");
  if (!ok) return;

  try {
    /* -----------------------------------------
       1. Delete all files from Firebase Storage
       ----------------------------------------- */
    const folderRef = ref(storage, `photobooks/${uid}/${bookId}`);

    const allFiles = await listAll(folderRef);

    for (const file of allFiles.items) {
      await deleteObject(file);
    }

    /* -----------------------------------------
       2. Delete metadata document from Firestore
       ----------------------------------------- */
    await deleteDoc(doc(db, "photobooks", docId));

    /* -----------------------------------------
       3. Remove the card from the UI
       ----------------------------------------- */
    const card = document.getElementById(`card-${docId}`);
    if (card) card.remove();

    alert("Το photobook διαγράφηκε επιτυχώς.");

  } catch (err) {
    console.error("DELETE ERROR:", err);
    alert("❌ Σφάλμα κατά τη διαγραφή: " + err.message);
  }
};
