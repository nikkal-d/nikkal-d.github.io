/* ============================================================
   PHOTObook Studio — EXPORT MODULE
   PDF • Flipbook HTML • Cloud (Firebase)
   ============================================================ */

import { pages, saveCurrentPage } from "./core.js";
import { auth, db, storage } from "../firebase-init.js";

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
   Attach listeners
------------------------------------------------------------- */
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
async function handleExportPdf() {
  if (!pages || !pages.length) {
    alert("Δεν υπάρχουν σελίδες για εξαγωγή.");
    return;
  }

  saveCurrentPage();

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "pt", "a4");

  for (let i = 0; i < pages.length; i++) {
    const pg = pages[i];
    if (!pg.image) continue;

    if (i > 0) pdf.addPage();

    await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const ratio = Math.min(
          pageWidth / img.width,
          pageHeight / img.height
        );

        const w = img.width * ratio;
        const h = img.height * ratio;
        const x = (pageWidth - w) / 2;
        const y = (pageHeight - h) / 2;

        pdf.addImage(pg.image, "PNG", x, y, w, h);
        resolve();
      };
      img.src = pg.image;
    });
  }

  pdf.save("photobook.pdf");
}

/* ============================================================
   FLIPBOOK EXPORT (standalone HTML)
   ============================================================ */
function handleExportFlipbook() {
  if (!pages || !pages.length) {
    alert("Δεν υπάρχουν σελίδες.");
    return;
  }

  saveCurrentPage();

  const base64Pages = pages.map(p => p.image).filter(Boolean);

  const flipHtml = `
<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="UTF-8">
<title>Photobook Flipbook</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body {
  margin:0;
  background:#020617;
  color:#e5e7eb;
  font-family:system-ui,sans-serif;
  display:flex;
  flex-direction:column;
  align-items:center;
  padding-top:30px;
}
#page {
  max-width:900px;
  max-height:600px;
  box-shadow:0 0 24px rgba(0,0,0,0.6);
  border-radius:12px;
  overflow:hidden;
}
#page img {
  width:100%;
  height:100%;
  object-fit:contain;
}
.controls {
  margin-top:12px;
  display:flex;
  gap:6px;
}
button {
  padding:8px 14px;
  border-radius:8px;
  border:none;
  cursor:pointer;
  background:#1f2937;
  color:#e5e7eb;
}
button:hover { background:#374151; }
</style>
</head>
<body>
<div id="page"></div>
<div class="controls">
  <button onclick="prevPage()">⬅ Προηγούμενη</button>
  <button onclick="nextPage()">Επόμενη ➡</button>
</div>
<script>
const pages = ${JSON.stringify(base64Pages)};
let index = 0;

function render() {
  const box = document.getElementById("page");
  box.innerHTML = '<img src="' + pages[index] + '">';
}
function prevPage(){
  if(index>0){index--;render();}
}
function nextPage(){
  if(index<pages.length-1){index++;render();}
}
document.addEventListener("keydown", e=>{
  if(e.key==="ArrowLeft") prevPage();
  if(e.key==="ArrowRight") nextPage();
});

window.onload = render;
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
    alert("Πρέπει πρώτα να συνδεθείς (πάνω δεξιά).");
    return;
  }

  saveCurrentPage();

  const title = prompt("Τίτλος Photobook:", "Το Photobook μου") || "Untitled";
  const bookId = crypto.randomUUID();
  const shareId = crypto.randomUUID();

  try {
    const folderRef = ref(storage, `photobooks/${user.uid}/${bookId}`);
    const uploadedPageURLs = [];

    for (let i = 0; i < pages.length; i++) {
      const pg = pages[i];
      if (!pg.image) continue;

      const fileRef = ref(folderRef, `page-${i + 1}.png`);
      const snap = await uploadString(fileRef, pg.image, "data_url");
      const url = await getDownloadURL(snap.ref);
      uploadedPageURLs.push(url);
    }

    await addDoc(collection(db, "photobooks"), {
      userId: user.uid,
      bookId,
      title,
      pages: uploadedPageURLs,
      createdAt: serverTimestamp(),
      isPublic: false,
      shareId: shareId
    });

    alert("Το Photobook ανέβηκε στο cloud. Θα το βρεις στο My Photobooks.");

  } catch (err) {
    console.error(err);
    alert("Σφάλμα στο ανέβασμα: " + err.message);
  }
}
