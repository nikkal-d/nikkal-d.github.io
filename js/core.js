// js/core.js
// Photobook core (Fabric.js 5.x global `fabric`)

// --------- State ---------
export let fabricCanvas = null;

let zoom = 1;
let pages = []; // [{ json }]
let currentPage = 0;

let undoStack = [];
let redoStack = [];
let restoring = false;

// Draft (keep it small to avoid quota errors)
const DRAFT_KEY = "photobook_draft_v2";
const MAX_HISTORY = 50;

// --------- Init ---------
function ensureFabric() {
  if (typeof window.fabric === "undefined") {
    console.error("Fabric not loaded");
    return false;
  }
  return true;
}

window.addEventListener("DOMContentLoaded", () => {
  if (!ensureFabric()) return;

  const el = document.getElementById("canvas");
  if (!el) return;

  fabricCanvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true
  });

  // Page preset (A4 portrait, but we "fit to screen" so it won't feel huge)
  setCanvasSize(1240, 1754);

  initPages();
  bindHistory();
  bindPanZoom();

  loadDraft();
  if (!pages.length) initPages();

  // Fit after layout
  setTimeout(() => fitToScreen(), 50);
  window.addEventListener("resize", () => fitToScreen());

  console.log("✅ Canvas initialized");
  window.dispatchEvent(new CustomEvent("pb:ready"));
});

// --------- Canvas size / fit / zoom ---------
export function setCanvasSize(w, h) {
  if (!fabricCanvas) return;
  fabricCanvas.setWidth(w);
  fabricCanvas.setHeight(h);
  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));
}

export function getZoom() {
  return zoom;
}

export function setZoom(value) {
  if (!fabricCanvas) return;
  const next = Math.max(0.2, Math.min(4, Number(value) || 1));
  zoom = next;

  const center = new fabric.Point(fabricCanvas.getWidth() / 2, fabricCanvas.getHeight() / 2);
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
  if (!fabricCanvas) return;
  const host = document.getElementById("canvasHost");
  if (!host) return;

  // Reset
  fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  fabricCanvas.setZoom(1);
  zoom = 1;

  const pad = 24;
  const availW = Math.max(200, host.clientWidth - pad);
  const availH = Math.max(200, host.clientHeight - pad);

  const s = Math.min(availW / fabricCanvas.getWidth(), availH / fabricCanvas.getHeight());
  zoom = Math.max(0.2, Math.min(4, s));

  const center = new fabric.Point(fabricCanvas.getWidth() / 2, fabricCanvas.getHeight() / 2);
  fabricCanvas.zoomToPoint(center, zoom);

  // Center in host
  const vt = fabricCanvas.viewportTransform;
  vt[4] = (availW - fabricCanvas.getWidth() * zoom) / 2;
  vt[5] = (availH - fabricCanvas.getHeight() * zoom) / 2;
  fabricCanvas.setViewportTransform(vt);

  fabricCanvas.requestRenderAll();
}

export function getViewportCenter() {
  if (!fabricCanvas) return { x: 0, y: 0 };
  const center = fabricCanvas.getCenter();
  const p = new fabric.Point(center.left, center.top);
  // Convert viewport -> canvas coordinates
  const inv = fabric.util.invertTransform(fabricCanvas.viewportTransform);
  const cp = fabric.util.transformPoint(p, inv);
  return { x: cp.x, y: cp.y };
}

// --------- Insert (Text / Image / Shapes) ---------
export function addText(text = "Text", opts = {}) {
  if (!fabricCanvas) return;
  const { x, y } = getViewportCenter();

  const t = new fabric.Textbox(text, {
    left: x,
    top: y,
    originX: "center",
    originY: "center",
    fontSize: opts.fontSize ?? 48,
    fill: opts.fill ?? "#111",
    fontFamily: opts.fontFamily ?? "Arial",
    // Avoid setting invalid baseline. Fabric uses "alphabetic" by default.
    textBaseline: "alphabetic"
  });

  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
  fabricCanvas.requestRenderAll();
  pushHistory();
  saveCurrentPage();
}

export function addImageFromFile(file) {
  if (!fabricCanvas || !file) return;

  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, (img) => {
      const { x, y } = getViewportCenter();

      img.set({
        left: x,
        top: y,
        originX: "center",
        originY: "center"
      });

      const targetW = fabricCanvas.getWidth() * 0.55;
      if (img.width) img.scaleToWidth(targetW);

      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.requestRenderAll();
      pushHistory();
      saveCurrentPage();
    }, { crossOrigin: "anonymous" });
  };
  reader.readAsDataURL(file);
}

export function addRect(style = {}) {
  if (!fabricCanvas) return;
  const { x, y } = getViewportCenter();
  const r = new fabric.Rect({
    left: x, top: y, originX: "center", originY: "center",
    width: 400, height: 260,
    fill: style.fill ?? "#ff4d4d",
    stroke: style.stroke ?? "#111",
    strokeWidth: style.strokeWidth ?? 2
  });
  fabricCanvas.add(r);
  fabricCanvas.setActiveObject(r);
  fabricCanvas.requestRenderAll();
  pushHistory(); saveCurrentPage();
}

export function addCircle(style = {}) {
  if (!fabricCanvas) return;
  const { x, y } = getViewportCenter();
  const c = new fabric.Circle({
    left: x, top: y, originX: "center", originY: "center",
    radius: 140,
    fill: style.fill ?? "#ff4d4d",
    stroke: style.stroke ?? "#111",
    strokeWidth: style.strokeWidth ?? 2
  });
  fabricCanvas.add(c);
  fabricCanvas.setActiveObject(c);
  fabricCanvas.requestRenderAll();
  pushHistory(); saveCurrentPage();
}

export function addLine(style = {}) {
  if (!fabricCanvas) return;
  const { x, y } = getViewportCenter();
  const ln = new fabric.Line([x - 220, y, x + 220, y], {
    stroke: style.stroke ?? "#111",
    strokeWidth: style.strokeWidth ?? 4
  });
  fabricCanvas.add(ln);
  fabricCanvas.setActiveObject(ln);
  fabricCanvas.requestRenderAll();
  pushHistory(); saveCurrentPage();
}

// --------- Selection helpers / layers ---------
export function getObjects() {
  return fabricCanvas ? fabricCanvas.getObjects() : [];
}

export function getActiveObject() {
  return fabricCanvas ? fabricCanvas.getActiveObject() : null;
}

export function bringForward() {
  const o = getActiveObject();
  if (!o || !fabricCanvas) return;
  fabricCanvas.bringForward(o);
  fabricCanvas.requestRenderAll();
  pushHistory(); saveCurrentPage();
}

export function sendBackwards() {
  const o = getActiveObject();
  if (!o || !fabricCanvas) return;
  fabricCanvas.sendBackwards(o);
  fabricCanvas.requestRenderAll();
  pushHistory(); saveCurrentPage();
}

export function bringToFront() {
  const o = getActiveObject();
  if (!o || !fabricCanvas) return;
  fabricCanvas.bringToFront(o);
  fabricCanvas.requestRenderAll();
  pushHistory(); saveCurrentPage();
}

export function sendToBack() {
  const o = getActiveObject();
  if (!o || !fabricCanvas) return;
  fabricCanvas.sendToBack(o);
  fabricCanvas.requestRenderAll();
  pushHistory(); saveCurrentPage();
}

// --------- Pages ---------
function initPages() {
  pages = [{ json: fabricCanvas ? fabricCanvas.toJSON() : null }];
  currentPage = 0;
  saveCurrentPage();
  window.dispatchEvent(new CustomEvent("pb:pages"));
}

export function getPageInfo() {
  return { currentPage, pageCount: pages.length };
}

export function addPage() {
  if (!fabricCanvas) return;
  saveCurrentPage();
  pages.push({ json: emptyPageJSON() });
  currentPage = pages.length - 1;
  loadCurrentPage();
  window.dispatchEvent(new CustomEvent("pb:pages"));
}

export function duplicatePage() {
  if (!fabricCanvas) return;
  saveCurrentPage();
  const src = pages[currentPage]?.json || emptyPageJSON();
  pages.splice(currentPage + 1, 0, { json: structuredClone(src) });
  currentPage++;
  loadCurrentPage();
  window.dispatchEvent(new CustomEvent("pb:pages"));
}

export function deletePage() {
  if (pages.length <= 1) return;
  pages.splice(currentPage, 1);
  currentPage = Math.max(0, currentPage - 1);
  loadCurrentPage();
  window.dispatchEvent(new CustomEvent("pb:pages"));
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
  if (!fabricCanvas) return;
  if (index < 0 || index >= pages.length) return;
  saveCurrentPage();
  currentPage = index;
  loadCurrentPage();
  window.dispatchEvent(new CustomEvent("pb:pages"));
}

function emptyPageJSON() {
  // minimal JSON structure Fabric understands
  return { version: fabric?.version || "5.x", objects: [], background: "#ffffff" };
}

export function saveCurrentPage() {
  if (!fabricCanvas || !pages[currentPage]) return;
  const json = fabricCanvas.toJSON();
  // sanitize legacy baseline
  sanitizeTextBaseline(json);
  pages[currentPage].json = json;
}

function loadCurrentPage() {
  if (!fabricCanvas) return;
  const pg = pages[currentPage];
  restoring = true;

  fabricCanvas.clear();
  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));

  const json = pg?.json ? structuredClone(pg.json) : emptyPageJSON();
  sanitizeTextBaseline(json);

  fabricCanvas.loadFromJSON(json, () => {
    fabricCanvas.renderAll();
    restoring = false;
    pushHistory(true);
    saveCurrentPage();
    fitToScreen();
    window.dispatchEvent(new CustomEvent("pb:pagechange"));
  });
}

export function getThumbnails() {
  if (!fabricCanvas) return [];
  // Render each page json to a tiny canvas for thumbnail (async-heavy, so do quick preview from stored json)
  // Here we return dataURLs generated lazily by cloning JSON into a temp StaticCanvas.
  return pages.map((p) => pageToThumb(p?.json));
}

function pageToThumb(json) {
  try {
    if (!json) return "";
    const sc = new fabric.StaticCanvas(null, { width: 240, height: 340 });
    sc.setBackgroundColor("#fff", () => {});
    sanitizeTextBaseline(json);
    sc.loadFromJSON(json, () => {
      sc.renderAll();
    });
    // NOTE: loadFromJSON is async; but on most browsers it finishes quickly.
    return sc.toDataURL({ format: "png", quality: 0.8 });
  } catch {
    return "";
  }
}

// --------- History (Undo/Redo) ---------
function bindHistory() {
  pushHistory(true);

  ["object:added", "object:modified", "object:removed"].forEach((ev) => {
    fabricCanvas.on(ev, () => {
      if (restoring) return;
      pushHistory();
      saveCurrentPage();
      window.dispatchEvent(new CustomEvent("pb:layers"));
    });
  });

  fabricCanvas.on("selection:created", () => window.dispatchEvent(new CustomEvent("pb:layers")));
  fabricCanvas.on("selection:updated", () => window.dispatchEvent(new CustomEvent("pb:layers")));
  fabricCanvas.on("selection:cleared", () => window.dispatchEvent(new CustomEvent("pb:layers")));
}

function pushHistory(silent = false) {
  if (!fabricCanvas) return;
  const json = fabricCanvas.toJSON();
  sanitizeTextBaseline(json);
  undoStack.push(json);
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack = [];
  if (!silent) window.dispatchEvent(new CustomEvent("pb:history"));
}

export function undo() {
  if (!fabricCanvas || undoStack.length < 2) return;
  const cur = undoStack.pop();
  redoStack.push(cur);
  const prev = undoStack[undoStack.length - 1];
  restoring = true;
  const clean = structuredClone(prev);
  sanitizeTextBaseline(clean);
  fabricCanvas.loadFromJSON(clean, () => {
    fabricCanvas.renderAll();
    restoring = false;
    saveCurrentPage();
    window.dispatchEvent(new CustomEvent("pb:layers"));
  });
}

export function redo() {
  if (!fabricCanvas || !redoStack.length) return;
  const next = redoStack.pop();
  undoStack.push(next);
  restoring = true;
  const clean = structuredClone(next);
  sanitizeTextBaseline(clean);
  fabricCanvas.loadFromJSON(clean, () => {
    fabricCanvas.renderAll();
    restoring = false;
    saveCurrentPage();
    window.dispatchEvent(new CustomEvent("pb:layers"));
  });
}

// --------- Pan/Zoom (Space to pan, Ctrl+wheel zoom) ---------
function bindPanZoom() {
  let panMode = false;
  let isPanning = false;
  let last = { x: 0, y: 0 };

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") panMode = true;
  });
  document.addEventListener("keyup", (e) => {
    if (e.code === "Space") panMode = false;
  });

  fabricCanvas.on("mouse:down", (opt) => {
    if (!panMode) return;
    isPanning = true;
    last = { x: opt.e.clientX, y: opt.e.clientY };
  });

  fabricCanvas.on("mouse:move", (opt) => {
    if (!isPanning) return;
    const vpt = fabricCanvas.viewportTransform;
    vpt[4] += opt.e.clientX - last.x;
    vpt[5] += opt.e.clientY - last.y;
    fabricCanvas.setViewportTransform(vpt);
    last = { x: opt.e.clientX, y: opt.e.clientY };
  });

  fabricCanvas.on("mouse:up", () => { isPanning = false; });

  fabricCanvas.on("mouse:wheel", (opt) => {
    const e = opt.e;
    if (!e.ctrlKey) return;
    e.preventDefault();
    e.stopPropagation();

    const factor = e.deltaY > 0 ? 0.95 : 1.05;
    setZoom(zoom * factor);
  });
}

// --------- Draft (localStorage, safe) ---------
export function saveDraft() {
  try {
    saveCurrentPage();
    const payload = {
      pages: pages.map(p => ({ json: p.json })),
      currentPage
    };
    // Keep small
    const raw = JSON.stringify(payload);
    if (raw.length > 2_000_000) return; // avoid quota (rough)
    localStorage.setItem(DRAFT_KEY, raw);
  } catch {}
}

export function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data?.pages?.length) return;

    pages = data.pages.map(p => ({ json: p.json || emptyPageJSON() }));
    currentPage = Math.max(0, Math.min(data.currentPage || 0, pages.length - 1));

    // load current
    loadCurrentPage();
  } catch {}
}

// --------- Export ---------
export function exportCurrentPNG() {
  if (!fabricCanvas) return;
  const url = fabricCanvas.toDataURL({ format: "png", quality: 0.95, multiplier: 1 });
  downloadBlob(dataURLToBlob(url), `page-${currentPage + 1}.png`);
}

export function exportFlipbookHTML() {
  if (!fabricCanvas) return;
  saveCurrentPage();

  // Render each page to PNG by temporarily loading JSON in a StaticCanvas
  const imgs = pages.map((p) => jsonToPNG(p.json));

  const html = buildFlipbookHTML(imgs);
  downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), "photobook-flipbook.html");
}

export function buildFlipbookPreviewURL() {
  if (!fabricCanvas) return "";
  saveCurrentPage();
  const imgs = pages.map((p) => jsonToPNG(p.json));
  const html = buildFlipbookHTML(imgs);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  return URL.createObjectURL(blob);
}

function jsonToPNG(json) {
  try {
    const sc = new fabric.StaticCanvas(null, {
      width: fabricCanvas.getWidth(),
      height: fabricCanvas.getHeight()
    });
    sc.setBackgroundColor("#fff", () => {});
    const clean = structuredClone(json || emptyPageJSON());
    sanitizeTextBaseline(clean);
    sc.loadFromJSON(clean, () => {
      sc.renderAll();
    });
    return sc.toDataURL({ format: "png", quality: 0.92 });
  } catch {
    // fallback to current canvas
    return fabricCanvas.toDataURL({ format: "png", quality: 0.92 });
  }
}

function buildFlipbookHTML(images) {
  const safeImgs = images.filter(Boolean);
  const payload = JSON.stringify(safeImgs);

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Photobook Flipbook</title>
<style>
  html,body{height:100%;margin:0;font-family:system-ui,Segoe UI,Arial;background:#111;color:#fff;}
  .wrap{height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;padding:16px;box-sizing:border-box;}
  .stage{width:min(92vw,900px);aspect-ratio: 1240/1754;background:#222;border-radius:14px;box-shadow:0 18px 60px rgba(0,0,0,.5);overflow:hidden;position:relative;}
  .page{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#222;transform-origin:left center;transition:transform .55s ease, opacity .55s ease;}
  .page img{width:100%;height:100%;object-fit:contain;background:#fff;}
  .page.flipped{transform:rotateY(-180deg);opacity:0;}
  .controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:center;}
  button{background:#fff;color:#111;border:0;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer;}
  button:disabled{opacity:.4;cursor:not-allowed;}
  .counter{opacity:.85}
</style>
</head>
<body>
<div class="wrap">
  <div class="stage" id="stage"></div>
  <div class="controls">
    <button id="prevBtn">Prev</button>
    <button id="nextBtn">Next</button>
    <div class="counter" id="counter"></div>
  </div>
  <div class="counter">Keyboard: ← →</div>
</div>

<script>
  const IMAGES = ${payload};
  const stage = document.getElementById('stage');
  const counter = document.getElementById('counter');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  let index = 0;

  function render() {
    stage.innerHTML = '';
    // stack pages up to current index
    for (let i=0;i<IMAGES.length;i++){
      const p = document.createElement('div');
      p.className = 'page' + (i < index ? ' flipped' : '');
      const img = document.createElement('img');
      img.src = IMAGES[i];
      p.appendChild(img);
      stage.appendChild(p);
    }
    counter.textContent = (index+1) + ' / ' + IMAGES.length;
    prevBtn.disabled = index <= 0;
    nextBtn.disabled = index >= IMAGES.length-1;
  }

  function next(){ if (index < IMAGES.length-1){ index++; render(); } }
  function prev(){ if (index > 0){ index--; render(); } }

  nextBtn.onclick = next;
  prevBtn.onclick = prev;
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
  });

  render();
</script>
</body>
</html>`;
}

function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 0);
}

function dataURLToBlob(dataURL) {
  const parts = dataURL.split(",");
  const mime = parts[0].match(/:(.*?);/)[1];
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8 = new Uint8Array(n);
  while (n--) u8[n] = bstr.charCodeAt(n);
  return new Blob([u8], { type: mime });
}

// --------- Baseline sanitize (kills "alphabetical" legacy) ---------
function sanitizeTextBaseline(json) {
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(walk);
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (k === "textBaseline" && v === "alphabetical") node[k] = "alphabetic";
      walk(v);
    }
  };
  walk(json);
}
