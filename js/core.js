// js/core.js
// ============================================================
// Core: canvas, zoom (single source of truth), pan, pages,
// history, draft, deep sanitize for Fabric warnings
// ============================================================

if (window.fabric && fabric.Textbox) {
  fabric.Textbox.prototype.textBaseline = "top";
}

export let fabricCanvas = null;

export let pages = [];
export let currentPage = 0;

// -------------------- GLOBAL STATE --------------------

const DRAFT_KEY = "pbs_draft_v3";

let undoStack = [];
let redoStack = [];
let restoring = false;

let zoom = 1;                 // ✅ SINGLE zoom state
let panMode = false;
let isPanning = false;
let panLast = { x: 0, y: 0 };

// -------------------- INIT --------------------

window.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById("canvas") || typeof fabric === "undefined") return;

  fabricCanvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true
  });

  setCanvasSizePreset("A4P");
  bindHistory();
  bindPanZoom();

  addPage(true);
  loadDraft();

  setInterval(saveDraft, 2500);
});

// -------------------- ZOOM (CORRECT) --------------------

export function getZoom() {
  return zoom;
}

export function setZoom(value) {
  if (!fabricCanvas) return;

  zoom = Math.max(0.2, Math.min(4, Number(value) || 1));

  const center = new fabric.Point(
    fabricCanvas.getWidth() / 2,
    fabricCanvas.getHeight() / 2
  );

  fabricCanvas.zoomToPoint(center, zoom);
  fabricCanvas.requestRenderAll();
}

export function resetZoom() {
  if (!fabricCanvas) return;
  zoom = 1;

  const center = new fabric.Point(
    fabricCanvas.getWidth() / 2,
    fabricCanvas.getHeight() / 2
  );

  fabricCanvas.zoomToPoint(center, zoom);
  fabricCanvas.requestRenderAll();
}

export function fitToScreen() {
  const host = document.getElementById("canvasHost");
  if (!host || !fabricCanvas) return;

  const pad = 28;
  const availW = host.clientWidth - pad;
  const availH = host.clientHeight - pad;

  resetZoom();

  const s = Math.min(
    availW / fabricCanvas.getWidth(),
    availH / fabricCanvas.getHeight()
  );

  setZoom(s);

  const vt = fabricCanvas.viewportTransform;
  vt[4] = (availW - fabricCanvas.getWidth() * s) / 2;
  vt[5] = (availH - fabricCanvas.getHeight() * s) / 2;

  fabricCanvas.setViewportTransform(vt);
  fabricCanvas.requestRenderAll();
}

// -------------------- PAN + WHEEL ZOOM --------------------

function bindPanZoom() {
  document.addEventListener("keydown", e => {
    if (e.code === "Space") panMode = true;
  });

  document.addEventListener("keyup", e => {
    if (e.code === "Space") panMode = false;
  });

  fabricCanvas.on("mouse:down", opt => {
    if (!panMode) return;
    isPanning = true;
    panLast = { x: opt.e.clientX, y: opt.e.clientY };
  });

  fabricCanvas.on("mouse:move", opt => {
    if (!isPanning) return;
    const e = opt.e;
    const vpt = fabricCanvas.viewportTransform;
    vpt[4] += e.clientX - panLast.x;
    vpt[5] += e.clientY - panLast.y;
    fabricCanvas.setViewportTransform(vpt);
    panLast = { x: e.clientX, y: e.clientY };
  });

  fabricCanvas.on("mouse:up", () => {
    isPanning = false;
  });

  fabricCanvas.on("mouse:wheel", opt => {
    const e = opt.e;
    if (!e.ctrlKey) return;

    e.preventDefault();
    e.stopPropagation();

    const factor = e.deltaY > 0 ? 0.95 : 1.05;
    zoom = Math.max(0.2, Math.min(4, zoom * factor));

    const pt = new fabric.Point(e.offsetX, e.offsetY);
    fabricCanvas.zoomToPoint(pt, zoom);
    fabricCanvas.requestRenderAll();
  });
}

// -------------------- CANVAS SIZE --------------------

export function setCanvasSizePreset(preset) {
  const presets = {
    A4P: { w: 1240, h: 1754 },
    A4L: { w: 1754, h: 1240 },
    SQUARE: { w: 1400, h: 1400 },
    STORY: { w: 1080, h: 1920 },
    HD: { w: 1920, h: 1080 }
  };

  const p = presets[preset];
  if (!p || !fabricCanvas) return;

  fabricCanvas.setWidth(p.w);
  fabricCanvas.setHeight(p.h);
  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));

  fitToScreen();
  saveHistory();
  saveCurrentPage();
}

// -------------------- IMAGES --------------------

export function addImageFromFile(file) {
  if (!fabricCanvas || !file) return;

  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      img.scaleToWidth(fabricCanvas.getWidth() * 0.4);
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      saveHistory();
      saveCurrentPage();
    });
  };
  reader.readAsDataURL(file);
}

// -------------------- PAGES --------------------

export function addPage(isInitial = false) {
  pages.push({ json: null, image: null });
  currentPage = pages.length - 1;

  if (!isInitial) {
    fabricCanvas.clear();
    fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));
  }

  saveHistory();
  refreshThumbnails();
  updatePageInfo();
}

export function switchPage(index) {
  if (index < 0 || index >= pages.length) return;
  saveCurrentPage();
  currentPage = index;
  loadPageToCanvas();
  refreshThumbnails();
  updatePageInfo();
}

// -------------------- SAVE / LOAD --------------------

export function saveCurrentPage() {
  if (!pages[currentPage] || !fabricCanvas) return;
  const json = fabricCanvas.toJSON();
  sanitizeJSON(json);
  pages[currentPage].json = json;
  pages[currentPage].image = fabricCanvas.toDataURL({ format: "png", quality: 0.92 });
}

export function loadPageToCanvas() {
  const pg = pages[currentPage];
  if (!pg || !pg.json) return;

  restoring = true;
  const clean = structuredClone(pg.json);
  sanitizeJSON(clean);

  fabricCanvas.loadFromJSON(clean, () => {
    fabricCanvas.renderAll();
    restoring = false;
  });
}

// -------------------- HISTORY --------------------

function bindHistory() {
  saveHistory();
  ["object:added", "object:modified", "object:removed"].forEach(ev => {
    fabricCanvas.on(ev, () => {
      if (!restoring) saveHistory();
    });
  });
}

function saveHistory() {
  const json = fabricCanvas.toJSON();
  sanitizeJSON(json);
  undoStack.push(json);
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
}

// -------------------- DRAFT --------------------

function saveDraft() {
  try {
    saveCurrentPage();
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ pages, currentPage }));
  } catch {}
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    pages = data.pages || pages;
    currentPage = data.currentPage || 0;
    loadPageToCanvas();
    refreshThumbnails();
    updatePageInfo();
  } catch {}
}

// -------------------- HELPERS --------------------

function refreshThumbnails() {}
function updatePageInfo() {}

function sanitizeJSON(json) {
  if (!json) return;
  const walk = n => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach(walk);
    for (const k in n) {
      if (k === "textBaseline" && n[k] === "alphabetic") n[k] = "top";
      walk(n[k]);
    }
  };
  walk(json);
}
