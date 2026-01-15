// js/ui.js
// Σύνδεση των UI controls με τις λειτουργίες του core.js

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
  previewFlipbook,
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

// Helper για εύκολη σύνδεση events
const on = (id, ev, fn) => { 
  const el = document.getElementById(id); 
  if (el) el.addEventListener(ev, fn); 
};

// ---------- Αρχικοποίηση μόλις φορτώσει η σελίδα ----------
document.addEventListener("DOMContentLoaded", async () => {
  // Ξεκινάμε τον καμβά
  const sizeSelect = document.getElementById("pageSizeSelect");
  await initCanvas({ preset: sizeSelect?.value || "A4P" });

  // --- Διαχείριση Σελίδων ---
  on("addPageBtn", "click", () => addPage());
  on("dupPageBtn", "click", () => duplicatePage());
  on("delPageBtn", "click", () => deletePage());
  on("prevPageBtn", "click", () => prevPage());
  on("nextPageBtn", "click", () => nextPage());

  // --- Εργαλεία Αντικειμένων ---
  on("addTextBtn", "click", () => addText("Νέο Κείμενο"));
  on("deleteBtn", "click", () => deleteSelected()); // Κουμπί διαγραφής στην οθόνη
  on("bringForwardBtn", "click", () => bringForward());
  on("sendBackwardBtn", "click", () => sendBackwards());

  // --- Zoom & View ---
  on("zoomInBtn", "click", () => zoomIn());
  on("zoomOutBtn", "click", () => zoomOut());
  on("zoomResetBtn", "click", () => zoomReset());
  on("fitScreenBtn", "click", () => fitToScreen());

  // --- Exports (Εξαγωγή) ---
  on("exportPdfBtn", "click", async () => {
    const btn = document.getElementById("exportPdfBtn");
    const originalText = btn.innerText;
    btn.innerText = "Παρακαλώ περιμένετε...";
    try {
      await exportPDF();
    } catch (err) {
      console.error(err);
      alert("Σφάλμα κατά την εξαγωγή PDF.");
    }
    btn.innerText = originalText;
  });

  on("previewFlipbookBtn", "click", () => {
    previewFlipbook();
  });

  // --- Draft Management ---
  on("clearDraftBtn", "click", () => {
    if(confirm("Είστε σίγουροι ότι θέλετε να διαγράψετε το προσχέδιο;")) {
      clearDraft();
    }
  });

  // --- Upload Εικόνας ---
  on("imageInput", "change", async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      document.body.style.cursor = "wait";
      // Καλεί τη συνάρτηση που μικραίνει την εικόνα αυτόματα
      await addImageFromFile(file); 
      document.body.style.cursor = "default";
    }
    e.target.value = ""; // Reset το input για να ξαναπαίρνει την ίδια εικόνα αν χρειαστεί
  });
});

/**
 * Μετατρέπει ένα αρχείο σε DataURL
 */
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Προσθήκη εικόνας στον καμβά με αυτόματο Resize για να μην κολλάει το σύστημα
 */
export async function addImageFromFile(file) {
  const dataUrl = await fileToDataURL(file);
  
  fabric.Image.fromURL(dataUrl, (img) => {
    // ΚΟΦΤΗΣ ΜΕΓΕΘΟΥΣ: Αν η εικόνα είναι τεράστια, την κατεβάζουμε στα 1500px.
    // Αυτό κάνει τον καμβά και το Flipbook να "πετάνε".
    const maxDimension = 1500;
    if (img.width > maxDimension || img.height > maxDimension) {
      const scale = maxDimension / Math.max(img.width, img.height);
      img.scale(scale);
    }

    img.set({
      left: 50,
      top: 50,
      cornerColor: "#00c3ff",
      cornerSize: 12,
      transparentCorners: false
    });

    App.canvas.add(img);
    App.canvas.setActiveObject(img);
    App.canvas.renderAll();
    saveDraft(); // Αποθήκευση αμέσως
  });
}
