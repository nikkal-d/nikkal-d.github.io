// js/core.js
export const App = {
  canvas: null,
  pages: [],
  current: 0,
  preset: "A4P",
  zoom: 1,
  autosaveEnabled: true,
  autosaveKey: "photobook_draft_v3",
};

export const PRESETS = {
  A4P:    { w: 2480, h: 3508, label: "A4 Portrait" },
  A4L:    { w: 3508, h: 2480, label: "A4 Landscape" },
  SQUARE: { w: 2400, h: 2400, label: "Square" }
};

// --- IndexedDB Helpers ---
async function idbOpen() {
  return new Promise((res) => {
    const req = indexedDB.open("photobook_db", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("drafts");
    req.onsuccess = () => res(req.result);
  });
}
async function idbSet(key, val) {
  const db = await idbOpen();
  db.transaction("drafts", "readwrite").objectStore("drafts").put(val, key);
}
async function idbGet(key) {
  const db = await idbOpen();
  return new Promise((res) => {
    const req = db.transaction("drafts").objectStore("drafts").get(key);
    req.onsuccess = () => res(req.result);
  });
}

// --- Συναρτήσεις που κάνει Import το ui.js ---
export async function initCanvas({ preset = "A4P" } = {}) {
  App.preset = preset;
  const el = document.getElementById("canvas");
  App.canvas = new fabric.Canvas(el, { preserveObjectStacking: true, backgroundColor: "#fff" });

  // Διορθωμένη Διαγραφή
  window.addEventListener('keydown', (e) => {
    if ((e.key === "Delete" || e.key === "Backspace") && document.activeElement.tagName !== "INPUT") {
      App.canvas.getActiveObjects().forEach(obj => App.canvas.remove(obj));
      App.canvas.discardActiveObject().requestRenderAll();
      saveDraft();
    }
  });

  await loadDraft() || addPage();
}

export function addPage() {
  saveCurrentPage();
  App.pages.push({ json: JSON.stringify({ objects: [] }), preset: App.preset });
  App.current = App.pages.length - 1;
  App.canvas.clear();
  App.canvas.setBackgroundColor("#fff", () => App.canvas.renderAll());
  saveDraft();
}

export function duplicatePage() {
    saveCurrentPage();
    const currentPage = App.pages[App.current];
    App.pages.splice(App.current + 1, 0, JSON.parse(JSON.stringify(currentPage)));
    App.current++;
    renderCurrentPage();
    saveDraft();
}

export function deletePage() {
    if (App.pages.length <= 1) return;
    App.pages.splice(App.current, 1);
    App.current = Math.max(0, App.current - 1);
    renderCurrentPage();
    saveDraft();
}

export function prevPage() { if (App.current > 0) { saveCurrentPage(); App.current--; renderCurrentPage(); } }
export function nextPage() { if (App.current < App.pages.length - 1) { saveCurrentPage(); App.current++; renderCurrentPage(); } }

export async function renderCurrentPage() {
  const page = App.pages[App.current];
  App.canvas.loadFromJSON(page.json, () => App.canvas.renderAll());
}

export function saveCurrentPage() {
  if (App.canvas) App.pages[App.current].json = JSON.stringify(App.canvas.toJSON());
}

export async function saveDraft() {
  saveCurrentPage();
  await idbSet(App.autosaveKey, { pages: App.pages, current: App.current, preset: App.preset });
}

export async function loadDraft() {
  const data = await idbGet(App.autosaveKey);
  if (!data) return false;
  App.pages = data.pages; App.current = data.current; App.preset = data.preset;
  await renderCurrentPage();
  return true;
}

export async function exportPDF() {
  const { jsPDF } = window.jspdf;
  const size = PRESETS[App.preset];
  const pdf = new jsPDF({ orientation: size.w > size.h ? "l" : "p", unit: "px", format: [size.w, size.h] });

  for (let i = 0; i < App.pages.length; i++) {
    if (i > 0) pdf.addPage([size.w, size.h], size.w > size.h ? "l" : "p");
    // Εδώ ήταν το λάθος: Χρησιμοποιούμε App.canvas
    await new Promise(res => {
      App.canvas.loadFromJSON(App.pages[i].json, () => {
        App.canvas.renderAll();
        pdf.addImage(App.canvas.toDataURL({format:'jpeg', quality:0.8}), 'JPEG', 0, 0, size.w, size.h);
        res();
      });
    });
  }
  pdf.save("photobook.pdf");
  renderCurrentPage();
}

// Λείπουν οι βοηθητικές που καλεί το ui.js
export function addText(txt) { 
    const t = new fabric.IText(txt, { left: 100, top: 100 }); 
    App.canvas.add(t); 
    saveDraft(); 
}
export function deleteSelected() { 
    App.canvas.getActiveObjects().forEach(obj => App.canvas.remove(obj)); 
    App.canvas.discardActiveObject().requestRenderAll(); 
    saveDraft(); 
}
