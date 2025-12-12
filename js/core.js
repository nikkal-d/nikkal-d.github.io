// js/core.js
// ============================================================
// Core editor engine (canvas, pages, undo/redo, draft)
// SANITIZES legacy textBaseline = 'alphabetical'
// ============================================================

export let fabricCanvas = null;
export let pages = [];
export let currentPage = 0;

/* ============================================================
   HISTORY
   ============================================================ */

let undoStack = [];
let redoStack = [];
let restoring = false;

/* ============================================================
   INIT
   ============================================================ */

window.addEventListener("DOMContentLoaded", () => {
  const canvasEl = document.getElementById("canvas");
  if (!canvasEl || typeof fabric === "undefined") return;

  fabricCanvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true
  });

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  bindHistory();
  initPages();
  loadDraft();
});

/* ============================================================
   CANVAS
   ============================================================ */

function resizeCanvas() {
  const wrap = document.getElementById("canvas-wrapper");
  if (!wrap || !fabricCanvas) return;

  fabricCanvas.setWidth(wrap.clientWidth - 20);
  fabricCanvas.setHeight(wrap.clientHeight - 20);
  fabricCanvas.requestRenderAll();
}

/* ============================================================
   HISTORY
   ============================================================ */

function bindHistory() {
  const events = ["object:added", "object:modified", "object:removed"];
  events.forEach(ev => {
    fabricCanvas.on(ev, () => {
      if (!restoring) saveHistory();
    });
  });
}

function saveHistory() {
  undoStack.push(fabricCanvas.toJSON());
  if (undoStack.length > 50) undoStack.shift();
  redoStack = [];
}

export function undo() {
  if (undoStack.length < 2) return;

  const curr = undoStack.pop();
  redoStack.push(curr);

  restoring = true;
  loadFromJSONSafe(undoStack[undoStack.length - 1], () => {
    restoring = false;
  });
}

export function redo() {
  if (!redoStack.length) return;

  const next = redoStack.pop();
  undoStack.push(next);

  restoring = true;
  loadFromJSONSafe(next, () => {
    restoring = false;
  });
}

/* ============================================================
   PAGES
   ============================================================ */

function initPages() {
  addPage();
}

export function addPage() {
  pages.push({ json: null, image: null });
  currentPage = pages.length - 1;
  fabricCanvas.clear();
  saveHistory();
}

export function saveCurrentPage() {
  if (!pages[currentPage]) return;

  pages[currentPage].json = fabricCanvas.toJSON();
  pages[currentPage].image = fabricCanvas.toDataURL({
    format: "png",
    quality: 0.9
  });
}

/* ============================================================
   SAFE LOAD (SANITIZE)
   ============================================================ */

function sanitizeObject(obj) {
  if (obj.textBaseline === "alphabetical") {
    obj.textBaseline = "top";
  }
  return obj;
}

function sanitizeJSON(json) {
  if (!json || !json.objects) return json;

  json.objects = json.objects.map(obj => sanitizeObject(obj));
  return json;
}

function loadFromJSONSafe(json, cb) {
  const clean = sanitizeJSON(structuredClone(json));

  fabricCanvas.loadFromJSON(clean, () => {
    fabricCanvas.renderAll();
    cb?.();
  });
}

/* ============================================================
   DRAFT SAVE / LOAD
   ============================================================ */

function draftKey() {
  return "photobook_draft_v2";
}

export function saveDraft() {
  saveCurrentPage();
  localStorage.setItem(
    draftKey(),
    JSON.stringify({ pages, currentPage })
  );
}

function loadDraft() {
  const raw = localStorage.getItem(draftKey());
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    pages = data.pages || [];
    currentPage = data.currentPage || 0;

    if (!pages.length) return;

    restoring = true;
    loadFromJSONSafe(pages[currentPage].json, () => {
      restoring = false;
      saveHistory();
    });
  } catch {
    console.warn("Draft corrupted, ignoring");
  }
}
