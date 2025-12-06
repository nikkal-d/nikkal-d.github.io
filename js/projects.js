// js/projects.js
// Διαχείριση λίστας Photobooks (My Photobooks)

import {
  auth,
  db,
  onAuthStateChanged
} from "../firebase-init.js";

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const gridEl = document.getElementById("projects-grid");
const emptyStateEl = document.getElementById("projects-empty");

// ----------------------------------------------
// Helper: format ημερομηνίας
// ----------------------------------------------
function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("el-GR", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

// ----------------------------------------------
// Φόρτωση βιβλίων χρήστη
// ----------------------------------------------
async function loadUserBooks(user) {
  if (!gridEl) return;

  gridEl.innerHTML = "";
  if (emptyStateEl) emptyStateEl.style.display = "none";

  if (!user) {
    if (emptyStateEl) {
      emptyStateEl.style.display = "block";
      emptyStateEl.textContent = "Συνδέσου για να δεις τα Photobooks σου.";
    }
    return;
  }

  try {
    const q = query(
      collection(db, "photobooks"),
      where("userId", "==", user.uid)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      if (emptyStateEl) {
        emptyStateEl.style.display = "block";
        emptyStateEl.textContent = "Δεν έχεις αποθηκευμένα Photobooks ακόμα.";
      }
      return;
    }

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      addBookCard(docSnap.id, data);
    });
  } catch (err) {
    console.error("Σφάλμα φόρτωσης βιβλίων:", err);
    if (emptyStateEl) {
      emptyStateEl.style.display = "block";
      emptyStateEl.textContent = "Προέκυψε σφάλμα κατά τη φόρτωση.";
    }
  }
}

// ----------------------------------------------
// Δημιουργία κάρτας Photobook
// ----------------------------------------------
function addBookCard(docId, book) {
  const card = document.createElement("div");
  card.className = "project-card";

  const cover = (book.pages && book.pages.length && book.pages[0]) || "";
  const isPublic = !!book.isPublic;
  const visibility = isPublic ? "Δημόσιο" : "Ιδιωτικό";

  card.innerHTML = `
    <div class="project-cover">
      ${
        cover
          ? `<img src="${cover}" alt="cover">`
          : `<div class="project-cover-placeholder">Χωρίς εξώφυλλο</div>`
      }
    </div>
    <div class="project-body">
      <h3 class="project-title">${book.title || "Χωρίς τίτλο"}</h3>
      <p class="project-meta">
        ${formatDate(book.createdAt)} •
        <span class="badge ${isPublic ? "badge-public" : "badge-private"}">
          ${visibility}
        </span>
      </p>
      <div class="card-actions">
        <button class="action-btn view-btn">👁 Προβολή</button>
        <button class="action-btn rename-btn">✏️ Μετονομασία</button>
        <button class="action-btn duplicate-btn">📄 Αντιγραφή</button>
        <button class="action-btn toggle-btn">${
          isPublic ? "🔒 Κάντο ιδιωτικό" : "🌐 Κάντο δημόσιο"
        }</button>
        <button class="action-btn share-btn">🔗 Αντιγραφή link</button>
        <button class="action-btn delete-btn">🗑 Διαγραφή</button>
      </div>
    </div>
  `;

  // κουμπιά
  const viewBtn = card.querySelector(".view-btn");
  const renameBtn = card.querySelector(".rename-btn");
  const duplicateBtn = card.querySelector(".duplicate-btn");
  const toggleBtn = card.querySelector(".toggle-btn");
  const shareBtn = card.querySelector(".share-btn");
  const deleteBtn = card.querySelector(".delete-btn");

  if (viewBtn) {
    viewBtn.addEventListener("click", () => {
      location.href = `viewer.html?id=${docId}`;
    });
  }

  if (renameBtn) {
    renameBtn.addEventListener("click", () => renamePhotobook(docId, book));
  }

  if (duplicateBtn) {
    duplicateBtn.addEventListener("click", () => duplicatePhotobook(docId, book));
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", async () => {
      await togglePublic(docId, book, toggleBtn);
    });
  }

  if (shareBtn) {
    shareBtn.addEventListener("click", () => sharePhotobook(docId, book));
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => deletePhotobook(docId, card));
  }

  gridEl.appendChild(card);
}

// ----------------------------------------------
// Μετονομασία
// ----------------------------------------------
async function renamePhotobook(docId, book) {
  const newTitle = prompt("Νέος τίτλος:", book.title || "");
  if (newTitle === null) return;

  try {
    await updateDoc(doc(db, "photobooks", docId), {
      title: newTitle.trim()
    });
    alert("Ο τίτλος ενημερώθηκε.");
    location.reload();
  } catch (err) {
    console.error(err);
    alert("Αποτυχία ενημέρωσης τίτλου.");
  }
}

// ----------------------------------------------
// Αντιγραφή (duplicate) — απλό αντίγραφο Firestore
// ----------------------------------------------
async function duplicatePhotobook(docId, book) {
  const ok = confirm("Θέλεις σίγουρα να δημιουργηθεί αντίγραφο αυτού του Photobook;");
  if (!ok) return;

  try {
    await addDoc(collection(db, "photobooks"), {
      userId: book.userId,
      bookId: book.bookId || docId,
      title: (book.title || "Χωρίς τίτλο") + " (αντίγραφο)",
      pages: book.pages || [],
      isPublic: false,
      shareId: "",
      createdAt: serverTimestamp()
    });

    alert("Δημιουργήθηκε αντίγραφο.");
    location.reload();
  } catch (err) {
    console.error(err);
    alert("Αποτυχία δημιουργίας αντιγράφου.");
  }
}

// ----------------------------------------------
// Δημόσιο / Ιδιωτικό
// ----------------------------------------------
async function togglePublic(docId, book, toggleBtn) {
  const newPublicState = !book.isPublic;
  let newShareId = book.shareId || "";

  if (newPublicState && !newShareId) {
    // αν γίνεται δημόσιο και δεν έχει shareId → φτιάχνουμε ένα
    newShareId = crypto.randomUUID();
  }
  if (!newPublicState) {
    // αν γίνεται ιδιωτικό → προαιρετικά μπορούμε να σβήσουμε το shareId
    // αλλά το κρατάμε για μελλοντική χρήση.
  }

  try {
    await updateDoc(doc(db, "photobooks", docId), {
      isPublic: newPublicState,
      shareId: newShareId
    });

    book.isPublic = newPublicState;
    book.shareId = newShareId;

    if (toggleBtn) {
      toggleBtn.textContent = newPublicState
        ? "🔒 Κάντο ιδιωτικό"
        : "🌐 Κάντο δημόσιο";
    }

    alert(newPublicState ? "Το Photobook είναι πλέον δημόσιο." : "Το Photobook είναι πλέον ιδιωτικό.");
  } catch (err) {
    console.error(err);
    alert("Αποτυχία ενημέρωσης κατάστασης δημοσίευσης.");
  }
}

// ----------------------------------------------
// Αντιγραφή link κοινοποίησης
// ----------------------------------------------
async function sharePhotobook(docId, book) {
  let shareId = book.shareId;

  // αν δεν υπάρχει shareId, τον δημιουργούμε (και κρατάμε public)
  if (!shareId) {
    shareId = crypto.randomUUID();
    try {
      await updateDoc(doc(db, "photobooks", docId), {
        shareId,
        isPublic: true
      });
      book.shareId = shareId;
      book.isPublic = true;
    } catch (err) {
      console.error(err);
      alert("Αποτυχία δημιουργίας share link.");
      return;
    }
  }

  const link = `${location.origin}/viewer.html?share=${shareId}`;

  try {
    await navigator.clipboard.writeText(link);
    alert("Το link αντιγράφηκε στο clipboard:\n" + link);
  } catch {
    prompt("Αντέγραψε το link:", link);
  }
}

// ----------------------------------------------
// Διαγραφή
// ----------------------------------------------
async function deletePhotobook(docId, cardEl) {
  const ok = confirm("Οριστική διαγραφή αυτού του Photobook;");
  if (!ok) return;

  try {
    await deleteDoc(doc(db, "photobooks", docId));
    if (cardEl && cardEl.parentNode) {
      cardEl.parentNode.removeChild(cardEl);
    }
    alert("Το Photobook διαγράφηκε.");
  } catch (err) {
    console.error(err);
    alert("Αποτυχία διαγραφής.");
  }
}

// ----------------------------------------------
// Αρχικοποίηση (ακροατής auth)
// ----------------------------------------------
onAuthStateChanged(auth, (user) => {
  loadUserBooks(user);
});
