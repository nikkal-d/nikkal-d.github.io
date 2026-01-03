// js/core.js
// Photobook Editor Core (Fabric + Pages + Export + IndexedDB draft + optional Firebase)
// Requires: <script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js"></script>

import {
  firebaseReady,
  ensureAuth,
  saveProjectToFirestore,
  loadProjectFromFirestore,
  uploadDataUrlToStorage,
  uploadTextToStorage
} from "./firebase-store.js";

/* -----------------------------
   Small IndexedDB helper
-------------------------------- */
const IDB_DB = "photobook_db_v1";
const IDB_STORE = "drafts";

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbSet(key, value) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function idbGet(key) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/* -----------------------------
   Fabric setup
-------------------------------- */
const fabric = window.fabric;
if (!fabric) throw new Error("fabric.js not loaded. Include fabric.min.js before core.js");

export let fabricCanvas = null;

const state = {
  pageW: 794,   // A4 portrait @ 96dpi-ish
  pageH: 1123,
  zoom: 1,
  pages: [],    // each is { json, thumbDataUrl? }
  index: 0,
  projectId: null,   // optional
  draftKey: "photobook_draft_v3",
  _saveTimer: null,
  _lastPreviewUrl: null
};

function uid() {
  let id = localStorage.getItem("pb_uid");
  if (!id) {
    id = "u_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("pb_uid", id);
  }
  return id;
}

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function canvasEl() { return document.getElementById("canvas"); }
function canvasFrameEl() { return document.getElementById("canvasFrame"); }

function setDomCanvasSize(w, h) {
  const el = canvasEl();
  if (!el) return;
  el.width = Math.round(w);
  el.height = Math.round(h);
  el.style.width = `${Math.round(w)}px`;
  el.style.height = `${Math.round(h)}px`;
  const frame = canvasFrameEl();
  if (frame) {
    frame.style.width = `${Math.round(w)}px`;
    frame.style.height = `${Math.round(h)}px`;
  }
}

export function initCanvas() {
  const el = canvasEl();
  if (!el) throw new Error("Canvas element #canvas not found");

  // Create Fabric canvas
  fabricCanvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true,
    backgroundColor: "#ffffff"
  });

  // Ensure baseline valid (avoid 'alphabetical' warning from older code)
  fabricCanvas.contextContainer.textBaseline = "alphabetic";

  setCanvasSize(state.pageW, state.pageH);
  wireCanvasEvents();

  // Init 1st page
  if (state.pages.length === 0) {
    state.pages.push({ json: emptyPageJSON() });
    state.index = 0;
  }
  renderPage(state.index);

  // try load draft
  loadDraft().catch(() => {});

  console.log("✅ Canvas initialized");
  return fabricCanvas;
}

function wireCanvasEvents() {
  if (!fabricCanvas) return;

  const schedule = () => scheduleDraftSave();

  fabricCanvas.on("object:added", schedule);
  fabricCanvas.on("object:modified", schedule);
  fabricCanvas.on("object:removed", schedule);
  fabricCanvas.on("selection:created", () => dispatchSelection());
  fabricCanvas.on("selection:updated", () => dispatchSelection());
  fabricCanvas.on("selection:cleared", () => dispatchSelection());
}

function dispatchSelection() {
  const obj = fabricCanvas?.getActiveObject() || null;
  window.dispatchEvent(new CustomEvent("pb:selection", { detail: { object: obj } }));
}

function emptyPageJSON() {
  return {
    version: fabric.version,
    objects: [],
    background: "#ffffff"
  };
}

/* -----------------------------
   Pages
-------------------------------- */
export function getPageCount() { return state.pages.length; }
export function getPageIndex() { return state.index; }
export function getPageSize() { return { w: state.pageW, h: state.pageH }; }

export function addPage() {
  saveCurrentPage();
  state.pages.splice(state.index + 1, 0, { json: emptyPageJSON() });
  state.index += 1;
  renderPage(state.index);
  scheduleDraftSave(true);
  dispatchPages();
}

export function duplicatePage() {
  saveCurrentPage();
  const src = state.pages[state.index]?.json || emptyPageJSON();
  const clone = JSON.parse(JSON.stringify(src)); // deep copy
  state.pages.splice(state.index + 1, 0, { json: clone });
  state.index += 1;
  renderPage(state.index);
  scheduleDraftSave(true);
  dispatchPages();
}

export function deletePage() {
  if (state.pages.length <= 1) return;
  state.pages.splice(state.index, 1);
  state.index = clamp(state.index, 0, state.pages.length - 1);
  renderPage(state.index);
  scheduleDraftSave(true);
  dispatchPages();
}

export function goToPage(i) {
  saveCurrentPage();
  state.index = clamp(i, 0, state.pages.length - 1);
  renderPage(state.index);
  dispatchPages();
}

export function nextPage() { goToPage(state.index + 1); }
export function prevPage() { goToPage(state.index - 1); }

function dispatchPages() {
  window.dispatchEvent(new CustomEvent("pb:pages", {
    detail: { index: state.index, count: state.pages.length }
  }));
}

/* -----------------------------
   Render / Save page
-------------------------------- */
function normalizeAfterLoad() {
  // Fix occasional flipped text due to negative scale artifacts
  fabricCanvas.getObjects().forEach(o => {
    if ((o.type === "textbox" || o.type === "text" || o.type === "i-text") && (o.scaleX < 0 || o.scaleY < 0)) {
      o.set({ scaleX: Math.abs(o.scaleX || 1), scaleY: Math.abs(o.scaleY || 1) });
    }
    if (o.type === "image") {
      // ensure CORS ok for export when src is remote
      if (!o.crossOrigin) o.set({ crossOrigin: "anonymous" });
    }
  });
}

async function renderPage(i) {
  if (!fabricCanvas) return;

  // Reset viewport, then reapply zoom (prevents odd flips)
  fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

  fabricCanvas.clear();
  fabricCanvas.backgroundColor = state.pages[i]?.json?.background || "#ffffff";

  const json = state.pages[i]?.json || emptyPageJSON();

  await new Promise((resolve) => {
    fabricCanvas.loadFromJSON(json, () => resolve(), (o, obj) => {
      // reviver
      if (obj?.type === "image") {
        obj.crossOrigin = "anonymous";
      }
    });
  });

  normalizeAfterLoad();
  applyZoom(state.zoom, false);

  fabricCanvas.requestRenderAll();
  dispatchPages();
  dispatchSelection();
}

export function saveCurrentPage() {
  if (!fabricCanvas) return;
  // save background + objects, but NOT viewportTransform
  const json = fabricCanvas.toDatalessJSON(["id", "locked", "src", "crossOrigin"]);
  json.background = fabricCanvas.backgroundColor || "#ffffff";
  state.pages[state.index].json = json;
}

function scheduleDraftSave(immediate = false) {
  if (state._saveTimer) clearTimeout(state._saveTimer);
  state._saveTimer = setTimeout(() => saveDraft().catch(() => {}), immediate ? 0 : 450);
}

async function saveDraft() {
  saveCurrentPage();
  const payload = {
    v: 3,
    updatedAt: Date.now(),
    pageW: state.pageW,
    pageH: state.pageH,
    zoom: state.zoom,
    index: state.index,
    pages: state.pages
  };
  // IndexedDB (no quota issues like localStorage)
  await idbSet(state.draftKey, payload);

  // optional firebase autosave (best-effort)
  try {
    if (firebaseReady()) {
      await ensureAuth(); // anonymous ok
      await saveProjectToFirestore(uid(), payload);
    }
  } catch (e) {
    // silent: user might not have rules set yet
    console.warn("Firebase autosave skipped:", e?.message || e);
  }
}

async function loadDraft() {
  const local = await idbGet(state.draftKey);
  if (!local) return;

  state.pageW = local.pageW || state.pageW;
  state.pageH = local.pageH || state.pageH;
  state.zoom = local.zoom || 1;
  state.pages = Array.isArray(local.pages) && local.pages.length ? local.pages : state.pages;
  state.index = clamp(local.index || 0, 0, state.pages.length - 1);

  setCanvasSize(state.pageW, state.pageH);
  await renderPage(state.index);
}

/* -----------------------------
   Canvas size + zoom (viewport)
-------------------------------- */
export function setCanvasSize(w, h) {
  state.pageW = Math.round(w);
  state.pageH = Math.round(h);
  setDomCanvasSize(state.pageW, state.pageH);

  if (fabricCanvas) {
    fabricCanvas.setWidth(state.pageW);
    fabricCanvas.setHeight(state.pageH);
    fabricCanvas.calcOffset();
    fabricCanvas.requestRenderAll();
  }
  scheduleDraftSave(true);
  window.dispatchEvent(new CustomEvent("pb:pagesize", { detail: { w: state.pageW, h: state.pageH } }));
}

export function setPagePreset(preset) {
  const map = {
    A4P: { w: 794, h: 1123 },
    A4L: { w: 1123, h: 794 },
    SQUARE: { w: 1000, h: 1000 },
    STORY: { w: 1080, h: 1920 },
    HD: { w: 1280, h: 720 }
  };
  const s = map[preset] || map.A4P;
  setCanvasSize(s.w, s.h);
}

export function applyZoom(z, save = true) {
  if (!fabricCanvas) return;
  state.zoom = clamp(z, 0.1, 4);

  // zoom around center
  const center = new fabric.Point(state.pageW / 2, state.pageH / 2);
  fabricCanvas.zoomToPoint(center, state.zoom);

  fabricCanvas.requestRenderAll();
  window.dispatchEvent(new CustomEvent("pb:zoom", { detail: { zoom: state.zoom } }));
  if (save) scheduleDraftSave(false);
}

export function zoomIn() { applyZoom(state.zoom * 1.1); }
export function zoomOut() { applyZoom(state.zoom / 1.1); }
export function zoomReset() { applyZoom(1); }

export function zoomFitToHost() {
  const host = document.getElementById("canvasHost");
  if (!host) return;
  const pad = 40;
  const w = host.clientWidth - pad;
  const h = host.clientHeight - pad;
  const z = Math.min(w / state.pageW, h / state.pageH);
  applyZoom(z);
}

/* -----------------------------
   Add objects
-------------------------------- */
function getViewportCenter() {
  const vpt = fabricCanvas.viewportTransform;
  const inv = fabric.util.invertTransform(vpt);
  const pt = fabric.util.transformPoint(
    new fabric.Point(fabricCanvas.getWidth() / 2, fabricCanvas.getHeight() / 2),
    inv
  );
  return { x: pt.x, y: pt.y };
}

export function addText(opts = {}) {
  if (!fabricCanvas) return;
  const { x, y } = getViewportCenter();
  const t = new fabric.Textbox(opts.text || "Text", {
    left: x,
    top: y,
    originX: "center",
    originY: "center",
    fontFamily: opts.fontFamily || "Arial",
    fontSize: Number(opts.fontSize || 48),
    fill: opts.fill || "#111111",
    stroke: opts.stroke || null,
    strokeWidth: opts.strokeWidth || 0,
    opacity: (opts.opacity == null ? 1 : opts.opacity),
    textAlign: opts.textAlign || "left"
  });
  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
  fabricCanvas.requestRenderAll();
  scheduleDraftSave(false);
}

export async function addImageFromFile(file) {
  if (!fabricCanvas || !file) return;
  const dataUrl = await fileToDataUrl(file);

  // Optional: upload to Firebase Storage to avoid huge JSON; fallback to dataUrl
  let src = dataUrl;
  try {
    if (firebaseReady()) {
      await ensureAuth();
      const path = `users/${uid()}/images/${Date.now()}_${file.name.replace(/\s+/g,"_")}`;
      const url = await uploadDataUrlToStorage(path, dataUrl);
      if (url) src = url;
    }
  } catch (e) {
    console.warn("Storage upload skipped:", e?.message || e);
  }

  await new Promise((resolve) => {
    fabric.Image.fromURL(src, (img) => {
      const { x, y } = getViewportCenter();
      img.set({
        left: x,
        top: y,
        originX: "center",
        originY: "center",
        crossOrigin: "anonymous"
      });

      // Fit to ~60% of page width
      const maxW = state.pageW * 0.6;
      if (img.width && img.width > 0) {
        const s = Math.min(1, maxW / img.width);
        img.scale(s);
      }

      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.requestRenderAll();
      scheduleDraftSave(false);
      resolve();
    }, { crossOrigin: "anonymous" });
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function addRect() {
  if (!fabricCanvas) return;
  const { x, y } = getViewportCenter();
  const r = new fabric.Rect({
    left: x, top: y,
    originX: "center", originY: "center",
    width: 240, height: 160,
    fill: "#ff3b30"
  });
  fabricCanvas.add(r);
  fabricCanvas.setActiveObject(r);
  fabricCanvas.requestRenderAll();
  scheduleDraftSave(false);
}

export function addCircle() {
  if (!fabricCanvas) return;
  const { x, y } = getViewportCenter();
  const c = new fabric.Circle({
    left: x, top: y,
    originX: "center", originY: "center",
    radius: 90,
    fill: "#34c759"
  });
  fabricCanvas.add(c);
  fabricCanvas.setActiveObject(c);
  fabricCanvas.requestRenderAll();
  scheduleDraftSave(false);
}

export function addLine() {
  if (!fabricCanvas) return;
  const { x, y } = getViewportCenter();
  const l = new fabric.Line([x - 160, y, x + 160, y], {
    stroke: "#111111",
    strokeWidth: 6
  });
  fabricCanvas.add(l);
  fabricCanvas.setActiveObject(l);
  fabricCanvas.requestRenderAll();
  scheduleDraftSave(false);
}

export function addTriangle() {
  if (!fabricCanvas) return;
  const { x, y } = getViewportCenter();
  const t = new fabric.Triangle({
    left: x, top: y,
    originX: "center", originY: "center",
    width: 220, height: 200,
    fill: "#0a84ff"
  });
  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
  fabricCanvas.requestRenderAll();
  scheduleDraftSave(false);
}

/* -----------------------------
   Object styling helpers
-------------------------------- */
export function setCanvasBackground(color) {
  if (!fabricCanvas) return;
  fabricCanvas.backgroundColor = color;
  fabricCanvas.requestRenderAll();
  scheduleDraftSave(false);
}

export function setActiveFill(color) {
  const o = fabricCanvas?.getActiveObject();
  if (!o) return;
  o.set("fill", color);
  fabricCanvas.requestRenderAll();
  scheduleDraftSave(false);
}

export function setActiveTextStyle(style) {
  const o = fabricCanvas?.getActiveObject();
  if (!o) return;
  if (o.type !== "textbox" && o.type !== "text" && o.type !== "i-text") return;

  if (style.fontFamily != null) o.set("fontFamily", style.fontFamily);
  if (style.fontSize != null) o.set("fontSize", Number(style.fontSize));
  if (style.fill != null) o.set("fill", style.fill);
  if (style.stroke != null) o.set("stroke", style.stroke);
  if (style.strokeWidth != null) o.set("strokeWidth", Number(style.strokeWidth));
  if (style.opacity != null) o.set("opacity", Number(style.opacity));
  if (style.fontWeight != null) o.set("fontWeight", style.fontWeight);
  if (style.fontStyle != null) o.set("fontStyle", style.fontStyle);
  if (style.underline != null) o.set("underline", !!style.underline);
  if (style.textAlign != null) o.set("textAlign", style.textAlign);

  fabricCanvas.requestRenderAll();
  scheduleDraftSave(false);
}

export function deleteActive() {
  const o = fabricCanvas?.getActiveObject();
  if (!o) return;
  fabricCanvas.remove(o);
  fabricCanvas.requestRenderAll();
  scheduleDraftSave(false);
}

export function bringForward() {
  const o = fabricCanvas?.getActiveObject();
  if (!o) return;
  fabricCanvas.bringForward(o);
  fabricCanvas.requestRenderAll();
  scheduleDraftSave(false);
}
export function sendBackwards() {
  const o = fabricCanvas?.getActiveObject();
  if (!o) return;
  fabricCanvas.sendBackwards(o);
  fabricCanvas.requestRenderAll();
  scheduleDraftSave(false);
}
export function toggleLockActive() {
  const o = fabricCanvas?.getActiveObject();
  if (!o) return;
  const locked = !(o.selectable !== false);
  o.set({
    selectable: locked,
    evented: locked,
    lockMovementX: !locked,
    lockMovementY: !locked,
    lockScalingX: !locked,
    lockScalingY: !locked,
    lockRotation: !locked
  });
  o.locked = !locked;
  fabricCanvas.discardActiveObject();
  fabricCanvas.requestRenderAll();
  scheduleDraftSave(false);
  dispatchSelection();
}

/* -----------------------------
   Crop + simple BG removal (white)
-------------------------------- */
export function cropSelected() {
  const obj = fabricCanvas?.getActiveObject();
  if (!obj || obj.type !== "image") {
    alert("Επίλεξε μια εικόνα πρώτα.");
    return;
  }
  const w = obj.width || 0;
  const h = obj.height || 0;
  const cropX = Number(prompt(`cropX (0-${w})`, String(obj.cropX || 0)) || 0);
  const cropY = Number(prompt(`cropY (0-${h})`, String(obj.cropY || 0)) || 0);
  const cropW = Number(prompt(`cropW (min 10, max ${w})`, String(obj.width || w)) || w);
  const cropH = Number(prompt(`cropH (min 10, max ${h})`, String(obj.height || h)) || h);

  obj.set({ cropX: clamp(cropX, 0, w), cropY: clamp(cropY, 0, h) });
  obj.set({ width: clamp(cropW, 10, w), height: clamp(cropH, 10, h) });
  obj.setCoords();
  fabricCanvas.requestRenderAll();
  scheduleDraftSave(false);
}

export async function removeBgSelected() {
  const obj = fabricCanvas?.getActiveObject();
  if (!obj || obj.type !== "image") {
    alert("Επίλεξε μια εικόνα πρώτα.");
    return;
  }

  // Render image to offscreen and remove near-white pixels
  const imgEl = obj._element;
  if (!imgEl) {
    alert("Δεν βρέθηκε το image element.");
    return;
  }

  const c = document.createElement("canvas");
  c.width = imgEl.naturalWidth || imgEl.width;
  c.height = imgEl.naturalHeight || imgEl.height;
  const ctx = c.getContext("2d");
  ctx.drawImage(imgEl, 0, 0);
  const imgData = ctx.getImageData(0, 0, c.width, c.height);
  const d = imgData.data;

  const thr = 245; // white threshold
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (r >= thr && g >= thr && b >= thr) d[i + 3] = 0;
  }
  ctx.putImageData(imgData, 0, 0);
  const out = c.toDataURL("image/png");

  // replace keeping transform
  const left = obj.left, top = obj.top, angle = obj.angle;
  const sx = obj.scaleX, sy = obj.scaleY;
  const ox = obj.originX, oy = obj.originY;

  await new Promise((resolve) => {
    fabric.Image.fromURL(out, (img) => {
      img.set({ left, top, angle, scaleX: sx, scaleY: sy, originX: ox, originY: oy, crossOrigin: "anonymous" });
      fabricCanvas.remove(obj);
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.requestRenderAll();
      scheduleDraftSave(false);
      resolve();
    }, { crossOrigin: "anonymous" });
  });
}

/* -----------------------------
   Export: Flipbook + PNG/JPG/PDF
-------------------------------- */
function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 5000);
}

async function renderPageToDataUrl(pageJson, { multiplier = 2 } = {}) {
  // offscreen fabric canvas for clean export
  const off = document.createElement("canvas");
  off.width = state.pageW;
  off.height = state.pageH;

  const c = new fabric.StaticCanvas(off, {
    backgroundColor: pageJson.background || "#ffffff"
  });

  // Important: load images with anonymous
  await new Promise((resolve) => {
    c.loadFromJSON(pageJson, () => resolve(), (o, obj) => {
      if (obj?.type === "image") obj.crossOrigin = "anonymous";
    });
  });

  // Ensure rendering complete
  c.renderAll();

  const url = c.toDataURL({ format: "png", multiplier });
  c.dispose();
  return url;
}

function flipbookHtml(pngs, opts) {
  const dir = opts.direction || "horizontal"; // horizontal|vertical
  const title = opts.title || "Photobook";

  // Very small "page flip" effect using CSS transforms
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title>
<style>
  body{margin:0;background:#111;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial}
  .wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .book{position:relative;${dir==="horizontal"?"width:min(1000px,92vw);height:min(700px,88vh);":"width:min(700px,92vw);height:min(1000px,88vh);"} perspective:2000px}
  .page{position:absolute;inset:0;background:#000;border-radius:12px;overflow:hidden;transform-style:preserve-3d;transition:transform .75s ease, opacity .3s ease;box-shadow:0 20px 60px rgba(0,0,0,.5)}
  .page img{width:100%;height:100%;object-fit:contain;background:#fff}
  .page.turn{transform:${dir==="horizontal"?"rotateY(-180deg)":"rotateX(180deg)"};opacity:0;pointer-events:none}
  .controls{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);display:flex;gap:10px;align-items:center}
  button{background:#fff;border:0;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer}
  .pill{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22);padding:10px 14px;border-radius:999px}
</style>
</head>
<body>
<div class="wrap">
  <div class="book" id="book"></div>
</div>
<div class="controls">
  <button id="prev">Prev</button>
  <div class="pill" id="info"></div>
  <button id="next">Next</button>
</div>
<script>
  const PAGES = ${JSON.stringify(pngs)};
  const book = document.getElementById('book');
  let idx = 0;

  function render(){
    book.innerHTML = '';
    const img1 = document.createElement('img'); img1.src = PAGES[idx];
    const p1 = document.createElement('div'); p1.className='page'; p1.appendChild(img1);
    book.appendChild(p1);

    if (idx+1 < PAGES.length){
      const img2 = document.createElement('img'); img2.src = PAGES[idx+1];
      const p2 = document.createElement('div'); p2.className='page'; p2.style.transform='translateZ(-1px)'; p2.appendChild(img2);
      book.appendChild(p2);
    }
    document.getElementById('info').textContent = (idx+1) + ' / ' + PAGES.length;
  }

  document.getElementById('next').onclick = () => {
    if (idx >= PAGES.length-1) return;
    idx++;
    render();
  };
  document.getElementById('prev').onclick = () => {
    if (idx <= 0) return;
    idx--;
    render();
  };

  // keyboard
  window.addEventListener('keydown', (e)=>{
    if (e.key==='ArrowRight') document.getElementById('next').click();
    if (e.key==='ArrowLeft') document.getElementById('prev').click();
  });

  render();
</script>
</body>
</html>`;
}

export async function exportFlipbook({ direction = "horizontal", mode = "download" } = {}) {
  saveCurrentPage();

  // Render all pages to PNG (includes images/shapes/text)
  const pngs = [];
  for (const p of state.pages) {
    pngs.push(await renderPageToDataUrl(p.json, { multiplier: 2 }));
  }

  const html = flipbookHtml(pngs, { direction, title: "Photobook" });
  const blob = new Blob([html], { type: "text/html" });

  if (mode === "download") {
    downloadBlob(blob, "photobook_flipbook.html");
    return { type: "download" };
  }

  // mode === "upload" (shareable link)
  try {
    if (!firebaseReady()) throw new Error("Firebase not ready");
    await ensureAuth();
    const path = `users/${uid()}/exports/flipbook_${Date.now()}.html`;
    const url = await uploadTextToStorage(path, html, "text/html");
    return { type: "url", url };
  } catch (e) {
    console.warn("Upload failed, fallback to download:", e?.message || e);
    downloadBlob(blob, "photobook_flipbook.html");
    return { type: "download" };
  }
}

export async function previewFlipbook({ direction = "horizontal" } = {}) {
  saveCurrentPage();
  const pngs = [];
  for (const p of state.pages) pngs.push(await renderPageToDataUrl(p.json, { multiplier: 1.5 }));
  const html = flipbookHtml(pngs, { direction, title: "Preview" });
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  if (state._lastPreviewUrl) URL.revokeObjectURL(state._lastPreviewUrl);
  state._lastPreviewUrl = url;

  window.dispatchEvent(new CustomEvent("pb:flippreview", { detail: { url } }));
  return url;
}

export function closeFlipbookPreview() {
  if (state._lastPreviewUrl) {
    URL.revokeObjectURL(state._lastPreviewUrl);
    state._lastPreviewUrl = null;
  }
}

export async function exportPNG() {
  saveCurrentPage();
  const url = await renderPageToDataUrl(state.pages[state.index].json, { multiplier: 2 });
  const blob = await (await fetch(url)).blob();
  downloadBlob(blob, `page_${state.index+1}.png`);
}

export async function exportJPG() {
  saveCurrentPage();
  // render png then convert to jpg via canvas
  const pngUrl = await renderPageToDataUrl(state.pages[state.index].json, { multiplier: 2 });
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise(r => { img.onload = r; img.src = pngUrl; });
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0,0,c.width,c.height);
  ctx.drawImage(img,0,0);
  const jpgUrl = c.toDataURL("image/jpeg", 0.92);
  const blob = await (await fetch(jpgUrl)).blob();
  downloadBlob(blob, `page_${state.index+1}.jpg`);
}

export async function exportPDF() {
  // Lightweight client-only PDF using images + jsPDF (loaded on demand)
  saveCurrentPage();
  const mod = await import("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.es.min.js");
  const { jsPDF } = mod;
  const pdf = new jsPDF({
    orientation: state.pageW >= state.pageH ? "landscape" : "portrait",
    unit: "px",
    format: [state.pageW, state.pageH]
  });
  for (let i = 0; i < state.pages.length; i++) {
    const url = await renderPageToDataUrl(state.pages[i].json, { multiplier: 2 });
    if (i > 0) pdf.addPage([state.pageW, state.pageH], state.pageW >= state.pageH ? "landscape" : "portrait");
    pdf.addImage(url, "PNG", 0, 0, state.pageW, state.pageH);
  }
  const blob = pdf.output("blob");
  downloadBlob(blob, "photobook.pdf");
}

/* -----------------------------
   PDF upload -> pages (basic, via pdf.js)
-------------------------------- */
async function loadPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.js";
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  // worker
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.js";
  return window.pdfjsLib;
}

export async function addPagesFromPDF(file) {
  if (!file) return;
  const pdfjsLib = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

  // Add pages after current (keeps current)
  saveCurrentPage();
  const insertAt = state.index + 1;

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 2 });
    const cnv = document.createElement("canvas");
    cnv.width = viewport.width;
    cnv.height = viewport.height;
    const ctx = cnv.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;
    const dataUrl = cnv.toDataURL("image/png");

    const pageJson = {
      version: fabric.version,
      background: "#ffffff",
      objects: [{
        type: "image",
        src: dataUrl,
        crossOrigin: "anonymous",
        left: state.pageW / 2,
        top: state.pageH / 2,
        originX: "center",
        originY: "center"
      }]
    };
    // We'll load it via fabric later to compute scaling; store raw then fix on render
    state.pages.splice(insertAt + (p - 1), 0, { json: pageJson });
  }

  state.index = insertAt;
  await renderPage(state.index);
  scheduleDraftSave(true);
}

/* -----------------------------
   Firebase manual load/save
-------------------------------- */
export async function saveToCloud() {
  saveCurrentPage();
  const payload = {
    v: 3,
    updatedAt: Date.now(),
    pageW: state.pageW,
    pageH: state.pageH,
    zoom: state.zoom,
    index: state.index,
    pages: state.pages
  };
  await ensureAuth();
  await saveProjectToFirestore(uid(), payload);
  return true;
}
export async function loadFromCloud() {
  await ensureAuth();
  const payload = await loadProjectFromFirestore(uid());
  if (!payload) return false;

  state.pageW = payload.pageW || state.pageW;
  state.pageH = payload.pageH || state.pageH;
  state.zoom = payload.zoom || 1;
  state.pages = payload.pages || state.pages;
  state.index = clamp(payload.index || 0, 0, state.pages.length - 1);

  setCanvasSize(state.pageW, state.pageH);
  await renderPage(state.index);
  scheduleDraftSave(true);
  return true;
}
