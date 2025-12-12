// js/core.js
// ============================================================
// Core: canvas, CORRECT zoom (center zoom), pan, pages, thumbnails,
// draft save + deep sanitize to kill "alphabetical" warnings.
// ============================================================

export let fabricCanvas = null;

export let pages = []; // [{json, image}]
export let currentPage = 0;

const DRAFT_KEY = "pbs_draft_v3";

let undoStack = [];
let redoStack = [];
let restoring = false;

let zoom = 1;
let panMode = false;
let isPanning = false;
let panLast = { x: 0, y: 0 };

// ============================================================
// FABRIC FIX — Kill "alphabetical" textBaseline forever
// ============================================================
(function fixFabricTextBaseline() {
  if (typeof fabric === "undefined") return;

  const proto = fabric.Textbox.prototype;

  // force valid baseline
  Object.defineProperty(proto, "textBaseline", {
    get() {
      return "top";
    },
    set() {
      /* ignore */
    }
  });

  // also patch IText
  const ip = fabric.IText.prototype;
  Object.defineProperty(ip, "textBaseline", {
    get() {
      return "top";
    },
    set() {
      /* ignore */
    }
  });
})();



window.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById("canvas") || typeof fabric === "undefined") return;

  fabricCanvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true
  });

  setCanvasSizePreset("A4P");
  bindHistory();
  bindPanZoom();

  // initial page
  addPage(true);

  // load draft AFTER basic init
  loadDraft();

  // autosave
  setInterval(() => saveDraft(), 2500);
});

export function getZoom() {
  return zoom;
}

/**
 * Correct zoom: zoom around canvas CENTER, not top-left.
 * This fixes the "image moves but doesn't zoom properly" feeling.
 */
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
  fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  fabricCanvas.setZoom(1);
  fabricCanvas.requestRenderAll();
}

export function fitToScreen() {
  const host = document.getElementById("canvasHost");
  if (!host || !fabricCanvas) return;

  const pad = 28;
  const availW = host.clientWidth - pad;
  const availH = host.clientHeight - pad;

  // Reset transforms first
  resetZoom();

  const s = Math.min(
    availW / fabricCanvas.getWidth(),
    availH / fabricCanvas.getHeight()
  );

  // Zoom around center
  setZoom(s);

  // Center inside host by shifting viewport transform
  const vt = fabricCanvas.viewportTransform;
  const cx = (availW - fabricCanvas.getWidth() * s) / 2;
  const cy = (availH - fabricCanvas.getHeight() * s) / 2;
  vt[4] = cx;
  vt[5] = cy;
  fabricCanvas.setViewportTransform(vt);
  fabricCanvas.requestRenderAll();
}

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

  resetZoom();
  fitToScreen();

  saveHistory();
  saveCurrentPage();
}

export function setCanvasCustom(w, h) {
  if (!fabricCanvas) return;

  const W = Math.max(200, Math.min(4000, Number(w)));
  const H = Math.max(200, Math.min(4000, Number(h)));

  fabricCanvas.setWidth(W);
  fabricCanvas.setHeight(H);
  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));

  resetZoom();
  fitToScreen();

  saveHistory();
  saveCurrentPage();
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

export function duplicatePage() {
  saveCurrentPage();
  const src = pages[currentPage];
  const clone = src?.json ? structuredClone(src) : { json: null, image: null };
  pages.splice(currentPage + 1, 0, clone);
  currentPage++;
  loadPageToCanvas();
  refreshThumbnails();
  updatePageInfo();
  saveHistory();
}

export function deletePage() {
  if (pages.length <= 1) return alert("Πρέπει να υπάρχει τουλάχιστον 1 σελίδα.");
  pages.splice(currentPage, 1);
  currentPage = Math.max(0, currentPage - 1);
  loadPageToCanvas();
  refreshThumbnails();
  updatePageInfo();
  saveHistory();
}

export function nextPage() {
  if (currentPage >= pages.length - 1) return;
  switchPage(currentPage + 1);
}

export function prevPage() {
  if (currentPage <= 0) return;
  switchPage(currentPage - 1);
}

export function switchPage(index) {
  if (index < 0 || index >= pages.length) return;
  saveCurrentPage();
  currentPage = index;
  loadPageToCanvas();
  refreshThumbnails();
  updatePageInfo();
  saveHistory();
}

export function updatePageInfo() {
  const el = document.getElementById("pageInfo");
  if (el) el.textContent = `${currentPage + 1} / ${pages.length}`;
}

export function saveCurrentPage() {
  if (!pages[currentPage] || !fabricCanvas) return;

  const json = fabricCanvas.toJSON();
  sanitizeJSON(json);

  pages[currentPage].json = json;
  pages[currentPage].image = fabricCanvas.toDataURL({ format: "png", quality: 0.92 });
}

export function loadPageToCanvas() {
  const pg = pages[currentPage];
  if (!pg || !pg.json) {
    fabricCanvas.clear();
    fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));
    return;
  }

  restoring = true;
  const clean = structuredClone(pg.json);
  sanitizeJSON(clean);

  fabricCanvas.loadFromJSON(clean, () => {
    fabricCanvas.renderAll();
    restoring = false;
  });
}

export function refreshThumbnails() {
  const strip = document.getElementById("thumbStrip");
  if (!strip) return;

  strip.innerHTML = "";
  pages.forEach((p, i) => {
    const d = document.createElement("div");
    d.className = "thumb" + (i === currentPage ? " active" : "");

    const img = document.createElement("img");
    img.src = p.image || "";
    img.alt = `page ${i + 1}`;
    d.appendChild(img);

    d.onclick = () => switchPage(i);
    strip.appendChild(d);
  });
}

// -------------------- HISTORY --------------------

function bindHistory() {
  saveHistory();

  ["object:added", "object:modified", "object:removed"].forEach(ev => {
    fabricCanvas.on(ev, () => {
      if (restoring) return;
      saveHistory();
    });
  });
}

function saveHistory() {
  if (!fabricCanvas) return;

  const json = fabricCanvas.toJSON();
  sanitizeJSON(json);

  undoStack.push(json);
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
}

export function undo() {
  if (undoStack.length < 2) return;

  const cur = undoStack.pop();
  redoStack.push(cur);
  const prev = undoStack[undoStack.length - 1];

  restoring = true;
  const clean = structuredClone(prev);
  sanitizeJSON(clean);

  fabricCanvas.loadFromJSON(clean, () => {
    fabricCanvas.renderAll();
    restoring = false;
    saveCurrentPage();
    refreshThumbnails();
  });
}

export function redo() {
  if (!redoStack.length) return;

  const next = redoStack.pop();
  undoStack.push(next);

  restoring = true;
  const clean = structuredClone(next);
  sanitizeJSON(clean);

  fabricCanvas.loadFromJSON(clean, () => {
    fabricCanvas.renderAll();
    restoring = false;
    saveCurrentPage();
    refreshThumbnails();
  });
}

// -------------------- PAN / ZOOM --------------------

function bindPanZoom() {
  // Space to pan
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") panMode = true;
  });
  document.addEventListener("keyup", (e) => {
    if (e.code === "Space") panMode = false;
  });

  fabricCanvas.on("mouse:down", (opt) => {
    if (!panMode) return;
    isPanning = true;
    const evt = opt.e;
    panLast = { x: evt.clientX, y: evt.clientY };
  });

  fabricCanvas.on("mouse:move", (opt) => {
    if (!isPanning) return;
    const evt = opt.e;
    const vpt = fabricCanvas.viewportTransform;
    vpt[4] += evt.clientX - panLast.x;
    vpt[5] += evt.clientY - panLast.y;
    fabricCanvas.setViewportTransform(vpt);
    panLast = { x: evt.clientX, y: evt.clientY };
  });

  fabricCanvas.on("mouse:up", () => {
    isPanning = false;
  });

  // Ctrl + wheel zoom (around pointer)
  fabricCanvas.on("mouse:wheel", (opt) => {
    const e = opt.e;
    if (!e.ctrlKey) return;
    e.preventDefault();
    e.stopPropagation();

    const delta = e.deltaY;
    const factor = delta > 0 ? 0.95 : 1.05;
    const next = Math.max(0.2, Math.min(4, zoom * factor));
    zoom = next;

    const pt = new fabric.Point(e.offsetX, e.offsetY);
    fabricCanvas.zoomToPoint(pt, zoom);
    fabricCanvas.requestRenderAll();
  });
}

// -------------------- DRAFT --------------------

export function saveDraft() {
  try {
    saveCurrentPage();
    const payload = { pages, currentPage };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {}
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;

    const data = JSON.parse(raw);
    pages = data.pages || pages;
    currentPage = Math.max(0, Math.min((data.currentPage ?? 0), pages.length - 1));

    // deep sanitize legacy BEFORE loadFromJSON
    pages.forEach(p => p?.json && sanitizeJSON(p.json));

    loadPageToCanvas();
    refreshThumbnails();
    updatePageInfo();
  } catch {}
}

// -------------------- SANITIZE (DEEP) --------------------

/**
 * Deep sanitize any "textBaseline":"alphabetical" anywhere in JSON tree.
 * This kills the Fabric warning permanently even for old drafts.
 */
function sanitizeJSON(json) {
  if (!json) return;

  const walk = (node) => {
    if (!node || typeof node !== "object") return;

    // If this node has textBaseline
    if (node.textBaseline === "alphabetical") node.textBaseline = "top";

    // Walk arrays
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    // Walk object keys
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (k === "textBaseline" && v === "alphabetical") node[k] = "top";
      walk(v);
    }
  };

  walk(json);
}
