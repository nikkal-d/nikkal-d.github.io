/* ============================================================
   PHOTObook Studio — EXPORT MODULE
   PDF export • Flipbook HTML export • Cloud export (Firebase)
   ============================================================ */

import { pages, saveCurrentPage } from "./core.js";
import { auth, storage, db } from "../firebase-init.js";
import {
  ref,
  uploadString,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ------------------------------------------------------------
   Attach listeners μετά το DOM load
   ------------------------------------------------------------ */
window.addEventListener("DOMContentLoaded", () => {
  const pdfBtn = document.getElementById("exportPdfBtn");
  const flipBtn = document.getElementById("exportFlipbookBtn");
  const cloudBtn = document.getElementById("exportCloudBtn");

  if (pdfBtn) pdfBtn.onclick = handleExportPdf;
  if (flipBtn) flipBtn.onclick = handleExportFlipbook;
  if (cloudBtn) cloudBtn.onclick = handleExportCloud;
});

/* ============================================================
   PDF EXPORT
   ============================================================ */

async function handleExportCloud() {
  if (!pages || !pages.length) {
    alert("Δεν υπάρχουν σελίδες.");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    alert("Πρέπει πρώτα να συνδεθείς (πάνω δεξιά).");
    return;
  }

  saveCurrentPage();

  const title = prompt("Τίτλος Photobook:", "Το Photobook μου") || "Untitled";
  const bookId = crypto.randomUUID();
  const shareId = crypto.randomUUID();  // <— για public share links

  try {
    const folderRef = ref(storage, `photobooks/${user.uid}/${bookId}`);
    const uploadedPageURLs = [];

    // Upload pages
    for (let i = 0; i < pages.length; i++) {
      const pg = pages[i];
      if (!pg.image) continue;

      const fileRef = ref(folderRef, `page-${i + 1}.png`);
      const snap = await uploadString(fileRef, pg.image, "data_url");
      const url = await getDownloadURL(snap.ref);
      uploadedPageURLs.push(url);
    }

    // Add document to Firestore — ΝΕΟ SCHEMA
    const docRef = await addDoc(collection(db, "photobooks"), {
      userId: user.uid,
      bookId,
      title,
      pages: uploadedPageURLs,
      createdAt: serverTimestamp(),
      
      // NEW FIELDS
      isPublic: false,     // αρχικά ιδιωτικό
      shareId: shareId     // unique public link id (αλλά private μέχρι να το ενεργοποιήσεις)
    });

    alert(
      "Το Photobook ανέβηκε επιτυχώς στο cloud.\n" +
      "Βρες το στο My Photobooks."
    );

  } catch (err) {
    console.error(err);
    alert("Σφάλμα στο ανέβασμα: " + err.message);
  }
}

/* ============================================================
   FLIPBOOK EXPORT (Standalone HTML)
   ============================================================ */

function handleExportFlipbook() {
  if (!pages || !pages.length) {
    alert("Δεν υπάρχουν σελίδες για εξαγωγή.");
    return;
  }

  saveCurrentPage();

  let pagesHtml = "";
  pages.forEach((pg, idx) => {
    const src = pg.image || "";
    pagesHtml += `
      <div class="fb-page${idx === 0 ? " fb-page-active" : ""}">
        <img src="${src}" alt="Page ${idx + 1}">
      </div>`;
  });

  const flipHtml = `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="UTF-8">
<title>Photobook Flipbook</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body {
    margin: 0;
    background: radial-gradient(circle at top, #0f172a, #020617);
    font-family: system-ui,-apple-system,BlinkMacSystemFont,"Poppins",sans-serif;
    color: #e5e7eb;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
  header {
    padding: 0.5rem 1rem;
    display:flex;
    justify-content:space-between;
    align-items:center;
    background:rgba(15,23,42,0.95);
    border-bottom:1px solid #1f2937;
  }
  main {
    flex: 1;
    display:flex;
    align-items:center;
    justify-content:center;
  }
  .fb-container {
    width:90vw;
    max-width:960px;
    height:80vh;
    background:#020617;
    border-radius:16px;
    border:1px solid #1f2937;
    overflow:hidden;
    position:relative;
    box-shadow:0 25px 45px rgba(0,0,0,0.7);
  }
  .fb-page {
    position:absolute;
    inset:0;
    opacity:0;
    transform-origin:left center;
    transform:rotateY(90deg);
    transition:transform .6s ease, opacity .6s ease;
    display:flex;
    align-items:center;
    justify-content:center;
    backface-visibility:hidden;
    background:#020617;
  }
  .fb-page img {
    max-width:100%;
    max-height:100%;
    object-fit:contain;
    border-radius:12px;
    box-shadow:0 12px 30px rgba(0,0,0,0.6);
  }
  .fb-page-active {
    opacity:1;
    transform:rotateY(0deg);
  }
  .fb-controls {
    position:absolute;
    inset-inline:0;
    bottom:0.75rem;
    display:flex;
    justify-content:center;
    gap:0.5rem;
    pointer-events:none;
  }
  .fb-btn {
    pointer-events:auto;
    border-radius:999px;
    border:1px solid #1f2937;
    background:rgba(15,23,42,0.92);
    color:#e5e7eb;
    padding:0.3rem 0.9rem;
    font-size:0.9rem;
    cursor:pointer;
  }
  .fb-btn:hover {
    background:#1f2937;
  }
</style>
</head>
<body>
<header>
  <div>📖 Photobook Flipbook</div>
  <div id="fb-indicator">1 / ${pages.length}</div>
</header>
<main>
  <div class="fb-container">
    ${pagesHtml}
    <div class="fb-controls">
      <button class="fb-btn" id="fb-prev">‹ Προηγούμενη</button>
      <button class="fb-btn" id="fb-next">Επόμενη ›</button>
    </div>
  </div>
</main>
<script>
  const pagesEls = Array.from(document.querySelectorAll(".fb-page"));
  let index = 0;
  const indicator = document.getElementById("fb-indicator");

  function showPage(i) {
    if (i < 0 || i >= pagesEls.length) return;
    pagesEls[index].classList.remove("fb-page-active");
    index = i;
    pagesEls[index].classList.add("fb-page-active");
    indicator.textContent = (index+1) + " / " + pagesEls.length;
  }

  document.getElementById("fb-prev").onclick = () => showPage(index - 1);
  document.getElementById("fb-next").onclick = () => showPage(index + 1);

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") showPage(index - 1);
    if (e.key === "ArrowRight") showPage(index + 1);
  });
</script>
</body>
</html>
`;

  const blob = new Blob([flipHtml], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "photobook-flipbook.html";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

/* ============================================================
   CLOUD EXPORT (Firebase Storage + Firestore)
   ============================================================ */

async function handleExportCloud() {
  if (!pages || !pages.length) {
    alert("Δεν υπάρχουν σελίδες.");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    alert("Πρέπει πρώτα να συνδεθείς (Σύνδεση πάνω δεξιά).");
    return;
  }

  saveCurrentPage();

  const title = prompt("Τίτλος Photobook:", "Το Photobook μου") || "Untitled";
  const bookId = crypto.randomUUID();

  try {
    const folderRef = ref(storage, `photobooks/${user.uid}/${bookId}`);
    const pageUrls = [];

    // Ανεβάζουμε ΚΑΘΕ σελίδα ως PNG στο Storage
    for (let i = 0; i < pages.length; i++) {
      const pg = pages[i];
      if (!pg.image) continue;

      const fileRef = ref(folderRef, `page-${i + 1}.png`);
      const snap = await uploadString(fileRef, pg.image, "data_url");
      const url = await getDownloadURL(snap.ref);
      pageUrls.push(url);
    }

    // Γράφουμε metadata στο Firestore
    const docRef = await addDoc(collection(db, "photobooks"), {
      userId: user.uid,
      bookId,
      title,
      pages: pageUrls,
      createdAt: serverTimestamp()
    });

    const linkInfo =
      `Photobook ανέβηκε!\n\nID: ${docRef.id}\nBookId: ${bookId}\nΣελίδες: ${pageUrls.length}`;

    alert(linkInfo);

    console.log("Photobook saved:", {
      docId: docRef.id,
      bookId,
      pageUrls
    });

  } catch (err) {
    console.error(err);
    alert("Σφάλμα στο Cloud export: " + err.message);
  }
}
