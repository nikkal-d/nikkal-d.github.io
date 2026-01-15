// js/ui.js
import {
  App,
  PRESETS,
  initCanvas,
  addText,
  addImageFromFile,
  addPage,
  duplicatePage,
  deletePage,
  prevPage,
  nextPage,
  exportPDF,
  fitToScreen,
  zoomIn,
  zoomOut,
  zoomReset,
  saveDraft,
  clearDraft,
  deleteSelected,
  bringForward,
  sendBackwards
} from "./core.js";

const $ = (id) => document.getElementById(id);
const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };

// ---------- Αρχικοποίηση ----------
document.addEventListener("DOMContentLoaded", async () => {
  // Ξεκινάμε τον καμβά με το preset που έχει το select
  await initCanvas({ preset: $("pageSizeSelect")?.value || "A4P" });

  // Σύνδεση Κουμπιών Σελίδων
  on("addPageBtn", "click", () => addPage());
  on("dupPageBtn", "click", () => duplicatePage());
  on("delPageBtn", "click", () => deletePage());
  on("prevPageBtn", "click", () => prevPage());
  on("nextPageBtn", "click", () => nextPage());

  // Σύνδεση Εργαλείων
  on("addTextBtn", "click", () => addText("Νέο Κείμενο"));
  on("deleteBtn", "click", () => deleteSelected());
  on("bringForwardBtn", "click", () => bringForward());
  on("sendBackwardBtn", "click", () => sendBackwards());

  // Zoom
  on("zoomInBtn", "click", () => zoomIn());
  on("zoomOutBtn", "click", () => zoomOut());
  on("fitScreenBtn", "click", () => fitToScreen());

  // Exports
  on("exportPdfBtn", "click", async () => {
    const btn = $("exportPdfBtn");
    btn.innerText = "Processing...";
    await exportPDF();
    btn.innerText = "Export PDF";
  });

  // Το κουμπί για το Flipbook
  on("previewFlipbookBtn", "click", () => {
    // Παίρνουμε τα thumbnails όλων των σελίδων
    const images = App.pages.map(p => {
        // Αν δεν έχει thumbnail, χρησιμοποιούμε το json (χρειάζεται προσοχή εδώ)
        return p.thumbnail || ""; 
    });
    openFlipbookPreview(images);
  });

  // Upload Εικόνας (imageInput)
  on("imageInput", "change", async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      document.body.style.cursor = "wait";
      await addImageFromFile(file);
      document.body.style.cursor = "default";
    }
    e.target.value = ""; 
  });
});

/**
 * Η ΣΥΝΑΡΤΗΣΗ ΠΟΥ ΖΗΤΗΣΕΣ: Flipbook με επιλογή για Download PDF
 */
export function openFlipbookPreview(images) {
  const frame = $("flipPreviewFrame");
  const modal = $("flipPreviewModal");
  if (!frame || !modal) return;

  const size = PRESETS[App.preset] || { w: 3508, h: 2480 };

  const html = `
<!doctype html>
<html>
<head>
  <style>
    body { margin:0; background:#111; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; }
    .nav { position:fixed; top:10px; right:10px; z-index:100; display:flex; gap:10px; }
    .btn { padding:10px 20px; border:none; border-radius:5px; cursor:pointer; font-weight:bold; color:white; }
    .btn-pdf { background:#27ae60; }
    .btn-close { background:#e74c3c; }
    .book { 
      aspect-ratio: ${size.w} / ${size.h};
      height: 80vh; max-width: 90vw;
      perspective: 2000px; position: relative;
    }
    .page { position:absolute; inset:0; background:#fff; transform-origin:left; transition:transform .8s ease; backface-visibility:hidden; }
    .page img { width:100%; height:100%; object-fit:fill; }
    .page.flipped { transform:rotateY(-180deg); }
    @media print {
      body { background:white; }
      .nav { display:none; }
      .book { height:auto; aspect-ratio:none; }
      .page { position:relative; display:block; page-break-after:always; transform:none !important; }
    }
  </style>
</head>
<body>
  <div class="nav">
    <button class="btn btn-pdf" onclick="window.print()">Download as PDF</button>
  </div>
  <div class="book" onclick="flip()">
    ${images.map((src, i) => `
      <div class="page" style="z-index:${images.length - i}">
        <img src="${src}">
      </div>
    `).join("")}
  </div>
  <script>
    let idx = 0;
    const pages = document.querySelectorAll('.page');
    function flip() {
      if (idx < pages.length) {
        pages[idx].classList.add('flipped');
        idx++;
      } else {
        pages.forEach(p => p.classList.remove('flipped'));
        idx = 0;
      }
    }
  </script>
</body>
</html>`;

  frame.srcdoc = html;
  modal.classList.add("open");
}
