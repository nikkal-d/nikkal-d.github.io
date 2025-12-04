/* ============================================================
   PHOTObook Studio — PROJECTS GALLERY
   Φόρτωση photobooks για τον συνδεδεμένο χρήστη
   ============================================================ */

import { 
  auth, 
  db,
  onAuthStateChanged,
  signOut
} from "../firebase-init.js";

import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ------------------------------------------------------------
   DOM Elements
   ------------------------------------------------------------ */
const galleryEl = document.getElementById("gallery");
const userLabel = document.getElementById("user-label");
const logoutBtn = document.getElementById("logout-btn");

/* ------------------------------------------------------------
   LOGOUT BUTTON
   ------------------------------------------------------------ */
logoutBtn.onclick = async () => {
  await signOut(auth);
  location.reload();
};

/* ------------------------------------------------------------
   ON AUTH STATE CHANGE
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
   LOAD PHOTObooks FROM FIRESTORE
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

    snap.forEach((doc) => {
      const book = doc.data();

      const thumb = book.pages?.[0] || "";
      const title = book.title || "Untitled Book";

      const date = book.createdAt?.toDate
        ? book.createdAt.toDate().toLocaleDateString("el-GR")
        : "—";

      galleryEl.innerHTML += `
      <div class="card">
        <img src="${thumb}" alt="thumbnail">
        <div class="card-body">
          <div class="card-title">${title}</div>
          <div class="card-date">📅 ${date}</div>

          <div class="card-actions">
            <a class="action-btn" href="viewer.html?id=${doc.id}">
              Προβολή
            </a>
            <button class="action-btn" onclick="alert('Delete soon!')">
              Διαγραφή
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
