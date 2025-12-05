/* ============================================================
   PHOTObook Studio — PROJECTS GALLERY
   DELETE • RENAME • DUPLICATE
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
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  ref,
  listAll,
  deleteObject,
  getDownloadURL,
  uploadString
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const galleryEl = document.getElementById("gallery");
const userLabel = document.getElementById("user-label");
const logoutBtn = document.getElementById("logout-btn");

logoutBtn.onclick = async () => {
  await signOut(auth);
  location.reload();
};

/* ============================================================
   AUTH → LOAD PROJECTS
   ============================================================ */
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
   LOAD USER BOOKS
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
      addBookCard(docSnap.id, book);
    });

  } catch (err) {
    console.error(err);
    galleryEl.innerHTML = "<p>Σφάλμα φόρτωσης δεδομένων.</p>";
  }
}

/* ============================================================
   CREATE CARD HTML
   ============================================================ */
function addBookCard(docId, book) {
  const thumb = book.pages?.[0] || "";
  const title = book.title || "Untitled Book";
  const date = book.createdAt?.toDate
    ? book.createdAt.toDate().toLocaleDateString("el-GR")
    : "—";

  galleryEl.innerHTML += `
  <div class="card" id="card-${docId}">
    <img src="${thumb}">
    <div class="card-body">
      <div class="card-title" id="title-${docId}">${title}</div>
      <div class="card-date">📅 ${date}</div>

      <div class="card-actions">

        <a class="action-btn" href="viewer.html?id=${docId}">
          Προβολή
        </a>

        <button class="action-btn" onclick="renamePhotobook('${docId}')">
          ✏️ Μετονομασία
        </button>

        <button class="action-btn" onclick="duplicatePhotobook('${docId}', '${book.bookId}', '${book.userId}')">
          📄 Αντιγραφή
        </button>

        <button class="action-btn" onclick="deletePhotobook('${docId}', '${book.bookId}', '${book.userId}')">
          🗑 Διαγραφή
        </button>

      </div>
    </div>
  </div>`;
}

/* ============================================================
   RENAME PHOTObook
   ============================================================ */
window.renamePhotobook = async (docId) => {
  try {
    const newName = prompt("Νέος τίτλος:");
    if (!newName) return;

    const refDoc = doc(db, "photobooks", docId);
    await updateDoc(refDoc, { title: newName });

    // Update UI immediately
    const titleEl = document.getElementById(`title-${docId}`);
    if (titleEl) titleEl.textContent = newName;

    alert("Ο τίτλος ενημερώθηκε.");
  } catch (err) {
    alert("Σφάλμα: " + err.message);
  }
};

/* ============================================================
   DUPLICATE PHOTObook
   ============================================================ */
window.duplicatePhotobook = async (docId, oldBookId, uid) => {

  const newTitle = prompt("Τίτλος για το αντίγραφο:", "Αντίγραφο Photobook");
  if (newTitle === null) return;

  try {
    // 1. Load original book
    const originalRef = doc(db, "photobooks", docId);
    const snap = await getDoc(originalRef);
    const original = snap.data();

    const newBookId = crypto.randomUUID();
    const oldFolder = ref(storage, `photobooks/${uid}/${oldBookId}`);
    const newFolder = ref(storage, `photobooks/${uid}/${newBookId}`);

    // 2. Copy each file
    const list = await listAll(oldFolder);
    const newPageURLs = [];

    for (const item of list.items) {
      const url = await getDownloadURL(item);

      // Fetch → convert to base64 → upload as new file
      const blob = await fetch(url).then(r => r.blob());
      const base64 = await blobToBase64(blob);

      const newFileRef = ref(newFolder, item.name);

      await uploadString(newFileRef, base64, "data_url");
      const newURL = await getDownloadURL(newFileRef);
      newPageURLs.push(newURL);
    }

    // 3. Create new Firestore document
    const newDocRef = await addDoc(collection(db, "photobooks"), {
      userId: uid,
      bookId: newBookId,
      title: newTitle,
      pages: newPageURLs,
      createdAt: serverTimestamp()
    });

    // 4. Add the card to UI
    addBookCard(newDocRef.id, {
      userId: uid,
      bookId: newBookId,
      title: newTitle,
      pages: newPageURLs,
      createdAt: { toDate: () => new Date() }
    });

    alert("Το αντίγραφο δημιουργήθηκε!");

  } catch (err) {
    console.error(err);
    alert("Σφάλμα αντιγραφής: " + err.message);
  }
};

isPublic: false,
shareId: null,


/* Utility: blob → base64 */
function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

/* ============================================================
   DELETE (παραμένει όπως ήταν)
   ============================================================ */
window.deletePhotobook = async (docId, bookId, uid) => {

  const ok = confirm("⚠️ Θέλεις σίγουρα να διαγράψεις αυτό το photobook;\nΗ ενέργεια είναι ΜΗ ΑΝΑΣΤΡΕΨΙΜΗ.");
  if (!ok) return;

  try {
    const folderRef = ref(storage, `photobooks/${uid}/${bookId}`);
    const allFiles = await listAll(folderRef);

    for (const file of allFiles.items) {
      await deleteObject(file);
    }

    await deleteDoc(doc(db, "photobooks", docId));

    const card = document.getElementById(`card-${docId}`);
    if (card) card.remove();

    alert("Το photobook διαγράφηκε.");

  } catch (err) {
    console.error(err);
    alert("❌ Σφάλμα διαγραφής: " + err.message);
  }
};

/* ============================================================
   PUBLIC / PRIVATE — SHARE LINK + QR CODE
   ============================================================ */

// Καλείται από το κουμπί "🌐 Κοινή χρήση"
window.togglePublic = async function (docId) {
  const refDoc = doc(db, "photobooks", docId);
  const snap = await getDoc(refDoc);

  if (!snap.exists()) {
    alert("Το photobook δεν βρέθηκε.");
    return;
  }

  const book = snap.data();
  const isNowPublic = !book.isPublic;

  // 1. Update Firestore
  await updateDoc(refDoc, {
    isPublic: isNowPublic
  });

  // 2. Update badge in UI
  updatePublicBadge(docId, isNowPublic);

  // 3. Show/hide share panel
  const panel = document.getElementById(`share-${docId}`);
  if (isNowPublic) {
    panel.style.display = "block";
    generateShareBlock(docId, book.shareId);
  } else {
    panel.style.display = "none";
  }

  alert(isNowPublic ? "Το photobook είναι πλέον Δημόσιο!" :
                      "Το photobook έγινε Ιδιωτικό.");
};


/* ============================================================
   UPDATE BADGE ON CARD
   ============================================================ */
function updatePublicBadge(docId, isPublic) {
  let card = document.getElementById(`card-${docId}`);
  if (!card) return;

  let badge = card.querySelector(".public-badge");

  if (!badge) {
    badge = document.createElement("div");
    badge.className = "public-badge";
    card.prepend(badge);
  }

  if (isPublic) {
    badge.textContent = "🌐 PUBLIC";
    badge.style.background = "#10b981";
  } else {
    badge.textContent = "🔒 PRIVATE";
    badge.style.background = "#ef4444";
  }
}


/* ============================================================
   GENERATE SHARE LINK + QR CODE
   ============================================================ */
function generateShareBlock(docId, shareId) {
  const input = document.getElementById(`share-input-${docId}`);
  const qrBox = document.getElementById(`qr-${docId}`);

  const link = `${location.origin}/viewer.html?share=${shareId}`;

  input.value = link;

  // QR
  qrBox.innerHTML = "";
  new QRCode(qrBox, {
    text: link,
    width: 120,
    height: 120
  });
}


/* ============================================================
   COPY LINK BUTTON
   ============================================================ */
window.copyShareLink = async function (docId) {
  const input = document.getElementById(`share-input-${docId}`);

  try {
    await navigator.clipboard.writeText(input.value);
    alert("Το link αντιγράφηκε!");
  } catch (err) {
    console.error(err);
  }
};

