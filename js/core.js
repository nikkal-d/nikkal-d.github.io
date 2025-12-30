// js/core.js
// ============================================================
// Photobook Core (Fabric.js global build)
// - Canvas init + fit-to-screen zoom (canvas zoom, not object)
// - Pages: add/dup/del/prev/next + thumbnails
// - Canvas size presets + custom size
// - Export: PNG/JPG + Flipbook (self-contained HTML) + Preview
// - Draft: best-effort localStorage (auto-disables on quota)
// ============================================================

export let fabricCanvas = null;

export const state = {
  pages: [],           // [{ json:FabricJSON|null, thumb:string|null }]
  currentPage: 0,
  sizePreset: "A4P",
  bg: "#ffffff",
  zoom: 1,
  draftEnabled: true,
};

const DRAFT_KEY = "photobook_draft_v2";

// ------------------------------
// Fabric baseline warning guard
// ------------------------------
// Some drafts (or older Fabric) may contain textBaseline:"alphabetical".
// We sanitize on save/load and also normalize new Textbox objects.
function normalizeTextBaseline(obj) {
  if (!obj) return;
  // valid values: top, hanging, middle, alphabetic, ideographic, bottom
  if (obj.textBaseline === "alphabetical") obj.textBaseline = "alphabetic";
  if (obj.textBaseline === "alphabetic") return;
  // leave other valid values
}
function deepSanitizeJSON(node) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) return node.forEach(deepSanitizeJSON);

  if (node.textBaseline === "alphabetical") node.textBaseline = "alphabetic";
  for (const k of Object.keys(node)) deepSanitizeJSON(node[k]);
}

// ------------------------------
// Init
// ------------------------------
export function initCanvas() {
  if (fabricCanvas) return fabricCanvas;

  const el = document.getElementById("canvas");
  if (!el) throw new Error("Canvas element #canvas not found.");
  if (typeof fabric === "undefined") throw new Error("Fabric.js not loaded (global 'fabric' missing).");

  fabricCanvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true,
  });

  setCanvasSizePreset(state.sizePreset, { save: false });
  bindCanvasEvents();
  ensureAtLeastOnePage();
  loadDraft();
  renderPage();
  fitToScreen();

  console.log("✅ Canvas initialized");
  return fabricCanvas;
}

function ensureAtLeastOnePage() {
  if (!state.pages.length) state.pages.push({ json: null, thumb: null });
  state.currentPage = Math.max(0, Math.min(state.currentPage, state.pages.length - 1));
}

function bindCanvasEvents() {
  // Update thumbnail + draft on changes (debounced)
  let t = null;
  const schedule = () => {
    clearTimeout(t);
    t = setTimeout(() => {
      try {
        saveCurrentPage();
        refreshThumbnails();
        saveDraft();
      } catch (e) {
        // never crash editing
        console.warn("autosave failed", e);
      }
    }, 250);
  };

  ["object:added", "object:modified", "object:removed", "text:changed"].forEach(ev => {
    fabricCanvas.on(ev, () => schedule());
  });
}

// ------------------------------
// Canvas sizing + fit
// ------------------------------
const PRESETS = {
  A4P:   { w: 1240, h: 1754, label: "A4 Portrait" },
  A4L:   { w: 1754, h: 1240, label: "A4 Landscape" },
  SQUARE:{ w: 1400, h: 1400, label: "Square" },
  STORY: { w: 1080, h: 1920, label: "Story" },
  HD:    { w: 1920, h: 1080, label: "HD" },
};

export function getCanvasSizePreset() {
  return state.sizePreset;
}

export function setCanvasSizePreset(preset, opts = { save: true }) {
  const p = PRESETS[preset];
  if (!p || !fabricCanvas) return;

  state.sizePreset = preset;
  fabricCanvas.setWidth(p.w);
  fabricCanvas.setHeight(p.h);
  fabricCanvas.setBackgroundColor(state.bg, fabricCanvas.renderAll.bind(fabricCanvas));

  // Reset viewport then fit
  resetZoom(false);
  fitToScreen();

  if (opts.save) {
    saveCurrentPage();
    refreshThumbnails();
    saveDraft();
  }
}

export function setCanvasCustomSize(w, h) {
  if (!fabricCanvas) return;
  const W = Math.max(200, Math.min(4000, Number(w) || 0));
  const H = Math.max(200, Math.min(4000, Number(h) || 0));
  if (!W || !H) return;

  state.sizePreset = "custom";
  fabricCanvas.setWidth(W);
  fabricCanvas.setHeight(H);
  fabricCanvas.setBackgroundColor(state.bg, fabricCanvas.renderAll.bind(fabricCanvas));

  resetZoom(false);
  fitToScreen();

  saveCurrentPage();
  refreshThumbnails();
  saveDraft();
}

export function setCanvasBackground(color) {
  state.bg = color || "#ffffff";
  if (!fabricCanvas) return;
  fabricCanvas.setBackgroundColor(state.bg, fabricCanvas.renderAll.bind(fabricCanvas));
  saveCurrentPage();
  refreshThumbnails();
  saveDraft();
}

export function fitToScreen() {
  if (!fabricCanvas) return;
  const host = document.getElementById("canvasHost");
  if (!host) return;

  const pad = 32;
  const availW = Math.max(10, host.clientWidth - pad);
  const availH = Math.max(10, host.clientHeight - pad);

  // scale to fit, then center
  const cw = fabricCanvas.getWidth();
  const ch = fabricCanvas.getHeight();
  const s = Math.max(0.05, Math.min(4, Math.min(availW / cw, availH / ch)));

  // reset
  fabricCanvas.setViewportTransform([1,0,0,1,0,0]);
  fabricCanvas.setZoom(1);
  state.zoom = 1;

  // zoom around center
  const center = new fabric.Point(cw / 2, ch / 2);
  fabricCanvas.zoomToPoint(center, s);
  state.zoom = s;

  // center in host
  const vt = fabricCanvas.viewportTransform;
  vt[4] = (availW - cw * s) / 2;
  vt[5] = (availH - ch * s) / 2;
  fabricCanvas.setViewportTransform(vt);
  fabricCanvas.requestRenderAll();
}

export function getZoom() {
  return state.zoom || 1;
}

export function setZoom(nextZoom) {
  if (!fabricCanvas) return;
  const host = document.getElementById("canvasHost");
  const cw = fabricCanvas.getWidth();
  const ch = fabricCanvas.getHeight();

  const z = Math.max(0.1, Math.min(4, Number(nextZoom) || 1));
  state.zoom = z;

  // Keep center anchored
  const center = new fabric.Point(cw / 2, ch / 2);
  fabricCanvas.zoomToPoint(center, z);

  // Keep it roughly centered in host
  if (host) {
    const pad = 32;
    const availW = Math.max(10, host.clientWidth - pad);
    const availH = Math.max(10, host.clientHeight - pad);
    const vt = fabricCanvas.viewportTransform;
    vt[4] = (availW - cw * z) / 2;
    vt[5] = (availH - ch * z) / 2;
    fabricCanvas.setViewportTransform(vt);
  }

  fabricCanvas.requestRenderAll();
}

export function resetZoom(alsoFit = true) {
  if (!fabricCanvas) return;
  fabricCanvas.setViewportTransform([1,0,0,1,0,0]);
  fabricCanvas.setZoom(1);
  state.zoom = 1;
  fabricCanvas.requestRenderAll();
  if (alsoFit) fitToScreen();
}

// ------------------------------
// Pages
// ------------------------------
export function getPages() {
  return state.pages;
}

export function getCurrentPageIndex() {
  return state.currentPage;
}

export function goToPage(index) {
  if (!fabricCanvas) return;
  if (index < 0 || index >= state.pages.length) return;

  saveCurrentPage();
  state.currentPage = index;
  renderPage();
  refreshThumbnails();
  saveDraft();
}

export function nextPage() {
  goToPage(state.currentPage + 1);
}

export function prevPage() {
  goToPage(state.currentPage - 1);
}

export function addPage() {
  if (!fabricCanvas) return;
  saveCurrentPage();
  state.pages.push({ json: null, thumb: null });
  state.currentPage = state.pages.length - 1;
  renderPage(true);
  refreshThumbnails();
  saveDraft();
}

export function duplicatePage() {
  if (!fabricCanvas) return;
  saveCurrentPage();
  const src = state.pages[state.currentPage];
  const clone = { json: src?.json ? structuredClone(src.json) : null, thumb: null };
  state.pages.splice(state.currentPage + 1, 0, clone);
  state.currentPage++;
  renderPage();
  refreshThumbnails();
  saveDraft();
}

export function deletePage() {
  if (state.pages.length <= 1) return;
  saveCurrentPage();
  state.pages.splice(state.currentPage, 1);
  state.currentPage = Math.max(0, state.currentPage - 1);
  renderPage();
  refreshThumbnails();
  saveDraft();
}

function renderPage(clearIfEmpty = false) {
  if (!fabricCanvas) return;
  const pg = state.pages[state.currentPage];

  fabricCanvas.off("path:created"); // safety if you add drawing later

  if (!pg || !pg.json) {
    fabricCanvas.clear();
    fabricCanvas.setBackgroundColor(state.bg, fabricCanvas.renderAll.bind(fabricCanvas));
    if (clearIfEmpty) fabricCanvas.requestRenderAll();
    updatePageInfo();
    fitToScreen();
    return;
  }

  const clean = structuredClone(pg.json);
  deepSanitizeJSON(clean);

  fabricCanvas.loadFromJSON(clean, () => {
    fabricCanvas.setBackgroundColor(state.bg, fabricCanvas.renderAll.bind(fabricCanvas));
    fabricCanvas.requestRenderAll();
    updatePageInfo();
    fitToScreen();
  });
}

export function saveCurrentPage() {
  if (!fabricCanvas) return;
  const json = fabricCanvas.toJSON(["selectable", "evented"]);
  deepSanitizeJSON(json);
  state.pages[state.currentPage].json = json;

  // thumbnail (small)
  try {
    const prevZoom = getZoom();
    // temporarily render at 0.18 zoom for thumb without moving user's view
    const data = fabricCanvas.toDataURL({ format: "png", multiplier: 0.15 });
    state.pages[state.currentPage].thumb = data;
    setZoom(prevZoom); // restore
  } catch {
    // ignore
  }

  updatePageInfo();
}

export function refreshThumbnails() {
  const strip = document.getElementById("thumbStrip");
  if (!strip) return;

  strip.innerHTML = "";
  state.pages.forEach((p, i) => {
    const d = document.createElement("div");
    d.className = "thumb" + (i === state.currentPage ? " active" : "");
    const img = document.createElement("img");
    img.alt = `page ${i + 1}`;
    img.src = p.thumb || "";
    d.appendChild(img);
    d.addEventListener("click", () => goToPage(i));
    strip.appendChild(d);
  });
}

export function updatePageInfo() {
  const el = document.getElementById("pageInfo");
  if (el) el.textContent = `${state.currentPage + 1} / ${state.pages.length}`;
}

// ------------------------------
// Insert helpers
// ------------------------------
export function addText(opts = {}) {
  if (!fabricCanvas) return;

  const t = new fabric.Textbox(opts.text || "Text", {
    left: fabricCanvas.getWidth() / 2,
    top: fabricCanvas.getHeight() / 2,
    originX: "center",
    originY: "center",
    fontSize: opts.fontSize || 48,
    fontFamily: opts.fontFamily || "Arial",
    fill: opts.fill || "#111111",
    textBaseline: "alphabetic",
    editable: true,
  });

  normalizeTextBaseline(t);
  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
  fabricCanvas.requestRenderAll();
}

export function addImageFromFile(file) {
  if (!fabricCanvas || !file) return;

  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, (img) => {
      const maxW = fabricCanvas.getWidth() * 0.6;
      img.scaleToWidth(maxW);
      img.set({
        left: fabricCanvas.getWidth() / 2,
        top: fabricCanvas.getHeight() / 2,
        originX: "center",
        originY: "center",
      });
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.requestRenderAll();
    }, { crossOrigin: "anonymous" });
  };
  reader.readAsDataURL(file);
}

export function addRect() {
  if (!fabricCanvas) return;
  const r = new fabric.Rect({
    left: fabricCanvas.getWidth() / 2,
    top: fabricCanvas.getHeight() / 2,
    originX: "center",
    originY: "center",
    width: 320,
    height: 220,
    fill: "#ff4d4d",
  });
  fabricCanvas.add(r);
  fabricCanvas.setActiveObject(r);
  fabricCanvas.requestRenderAll();
}

export function addCircle() {
  if (!fabricCanvas) return;
  const c = new fabric.Circle({
    left: fabricCanvas.getWidth() / 2,
    top: fabricCanvas.getHeight() / 2,
    originX: "center",
    originY: "center",
    radius: 140,
    fill: "#4d7cff",
  });
  fabricCanvas.add(c);
  fabricCanvas.setActiveObject(c);
  fabricCanvas.requestRenderAll();
}

export function addLine() {
  if (!fabricCanvas) return;
  const l = new fabric.Line([0, 0, 420, 0], {
    left: fabricCanvas.getWidth() / 2,
    top: fabricCanvas.getHeight() / 2,
    originX: "center",
    originY: "center",
    stroke: "#111",
    strokeWidth: 6,
  });
  fabricCanvas.add(l);
  fabricCanvas.setActiveObject(l);
  fabricCanvas.requestRenderAll();
}

// ------------------------------
// Export: images
// ------------------------------
export function exportPNG() {
  if (!fabricCanvas) return null;
  saveCurrentPage();
  return fabricCanvas.toDataURL({ format: "png", multiplier: 2 });
}

export function exportJPG() {
  if (!fabricCanvas) return null;
  saveCurrentPage();
  return fabricCanvas.toDataURL({ format: "jpeg", quality: 0.92, multiplier: 2 });
}

// ------------------------------
// Flipbook (self-contained HTML)
// ------------------------------
function renderAllPagesAsImages(multiplier = 1.5) {
  if (!fabricCanvas) return [];
  saveCurrentPage();

  const currentIdx = state.currentPage;
  const images = [];

  // Render each page by loading it, exporting, then restoring current
  for (let i = 0; i < state.pages.length; i++) {
    const pg = state.pages[i];
    if (!pg?.json) {
      // blank page
      images.push(null);
      continue;
    }
    const clean = structuredClone(pg.json);
    deepSanitizeJSON(clean);

    // synchronous-ish: loadFromJSON is async; we use a small helper
    // NOTE: We'll render sequentially via a Promise in export functions.
    images.push(clean);
  }

  // return JSONs; actual rasterization happens in async export
  return images;
}

async function rasterizePageJSON(json, multiplier) {
  return new Promise((resolve) => {
    if (!fabricCanvas) return resolve(null);
    fabricCanvas.loadFromJSON(json || { objects: [], version: "5.3.0" }, () => {
      fabricCanvas.setBackgroundColor(state.bg, fabricCanvas.renderAll.bind(fabricCanvas));
      const url = fabricCanvas.toDataURL({ format: "png", multiplier });
      resolve(url);
    });
  });
}

function flipbookHTML(pageImages, opts) {
  const direction = opts.direction || "horizontal"; // horizontal | vertical
  const title = (opts.title || "Photobook").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const json = JSON.stringify(pageImages);
  const dir = direction === "vertical" ? "vertical" : "horizontal";

  // Keep it self-contained: embed images as data URLs
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title} - Flipbook</title>
<style>
  :root{--bg:#0b0f1a;--paper:#fff;--shadow:rgba(0,0,0,.35);--accent:#7c3aed}
  body{margin:0;background:var(--bg);color:#e8e8e8;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial}
  .top{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.1)}
  .top h1{font-size:14px;margin:0;opacity:.9}
  .controls{display:flex;gap:10px;align-items:center}
  button{cursor:pointer;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#fff;padding:8px 10px;border-radius:10px}
  button:hover{border-color:rgba(255,255,255,.3)}
  .stage{display:grid;place-items:center;min-height:calc(100vh - 58px);padding:18px}
  .book{position:relative;perspective:1400px}
  .pageWrap{position:relative;transform-style:preserve-3d}
  .page{
    width:min(900px,92vw);
    height:auto;
    box-shadow:0 20px 60px var(--shadow);
    border-radius:10px;
    overflow:hidden;
    background:var(--paper);
    transform-style:preserve-3d;
  }
  .page img{display:block;width:100%;height:auto}
  .counter{opacity:.85;font-size:12px}
  /* flip animation */
  .flip-h{animation:flipH .55s ease-in-out}
  .flip-v{animation:flipV .55s ease-in-out}
  @keyframes flipH{
    0%{transform:rotateY(0deg)}
    40%{transform:rotateY(-75deg)}
    100%{transform:rotateY(0deg)}
  }
  @keyframes flipV{
    0%{transform:rotateX(0deg)}
    40%{transform:rotateX(75deg)}
    100%{transform:rotateX(0deg)}
  }
  .hint{font-size:12px;opacity:.75;margin-left:8px}
</style>
</head>
<body data-dir="${dir}">
  <div class="top">
    <h1>${title}</h1>
    <div class="controls">
      <button id="prevBtn">◀</button>
      <div class="counter" id="counter"></div>
      <button id="nextBtn">▶</button>
      <span class="hint">Use arrow keys</span>
    </div>
  </div>

  <div class="stage">
    <div class="book">
      <div class="pageWrap" id="pageWrap">
        <div class="page" id="page">
          <img id="img" alt="page"/>
        </div>
      </div>
    </div>
  </div>

<script>
  const PAGES = ${json};
  let i = 0;
  const img = document.getElementById('img');
  const counter = document.getElementById('counter');
  const wrap = document.getElementById('page');
  const dir = document.body.dataset.dir;

  function show(idx, animate=true){
    i = Math.max(0, Math.min(idx, PAGES.length-1));
    img.src = PAGES[i] || "";
    counter.textContent = (i+1) + " / " + PAGES.length;

    if (animate){
      wrap.classList.remove('flip-h','flip-v');
      void wrap.offsetWidth;
      wrap.classList.add(dir === 'vertical' ? 'flip-v' : 'flip-h');
    }
  }

  document.getElementById('prevBtn').onclick = () => show(i-1, true);
  document.getElementById('nextBtn').onclick = () => show(i+1, true);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(i-1, true);
    if (e.key === 'ArrowRight') show(i+1, true);
    if (e.key === 'ArrowUp' && dir==='vertical') show(i-1, true);
    if (e.key === 'ArrowDown' && dir==='vertical') show(i+1, true);
  });

  show(0,false);
</script>
</body>
</html>`;
}

export async function buildFlipbookHTML(opts = {}) {
  if (!fabricCanvas) return "";
  saveCurrentPage();

  const jsons = renderAllPagesAsImages(opts.multiplier || 1.5);
  const currentIdx = state.currentPage;
  const currentVt = fabricCanvas.viewportTransform ? fabricCanvas.viewportTransform.slice() : [1,0,0,1,0,0];
  const currentZoom = state.zoom;

  const images = [];
  for (const j of jsons) {
    if (!j) {
      // blank: render a blank page at current size
      const blank = { version: "5.3.0", objects: [] };
      images.push(await rasterizePageJSON(blank, opts.multiplier || 1.5));
    } else {
      images.push(await rasterizePageJSON(j, opts.multiplier || 1.5));
    }
  }

  // restore current editor page
  state.currentPage = currentIdx;
  renderPage();
  // restore zoom/transform (best effort)
  try {
    fabricCanvas.setViewportTransform(currentVt);
    state.zoom = currentZoom;
    fabricCanvas.requestRenderAll();
  } catch {}

  return flipbookHTML(images, opts);
}

export async function previewFlipbook(opts = {}) {
  const html = await buildFlipbookHTML(opts);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  return url; // caller can assign to iframe.src
}

export async function exportFlipbookHTML(opts = {}) {
  const html = await buildFlipbookHTML(opts);
  const blob = new Blob([html], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (opts.filename || "photobook_flipbook") + ".html";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function makeFlipbookLink(localURL) {
  // NOTE: Blob URLs are local to THIS browser session.
  // For a shareable public link you need upload hosting.
  return localURL;
}

// ------------------------------
// Draft (best effort, no crashes)
// ------------------------------
export function saveDraft() {
  if (!state.draftEnabled) return;

  try {
    // Save only JSONs (thumbs removed) to reduce size
    const payload = {
      sizePreset: state.sizePreset,
      bg: state.bg,
      currentPage: state.currentPage,
      pages: state.pages.map(p => ({ json: p.json || null })),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch (e) {
    // quota exceeded: disable autosave but keep app running
    console.warn("⚠️ Draft disabled (storage quota).", e);
    state.draftEnabled = false;
  }
}

export function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

export function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;

    const data = JSON.parse(raw);
    state.sizePreset = data.sizePreset || state.sizePreset;
    state.bg = data.bg || state.bg;
    state.pages = (data.pages || []).map(p => ({ json: p.json || null, thumb: null }));
    state.currentPage = Math.max(0, Math.min(data.currentPage || 0, state.pages.length - 1));

    ensureAtLeastOnePage();

    // thumbnails will be regenerated
    renderPage();
    refreshThumbnails();
    updatePageInfo();
  } catch (e) {
    console.warn("draft load failed", e);
  }
}
