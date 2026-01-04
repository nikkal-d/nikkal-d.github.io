// js/core.js
// Photobook Core (stable)
// - Fabric canvas init + correct viewport zoom/pan
// - Pages store as Fabric JSON (images preserved)
// - Flipbook export/preview (multi-page) using HTML+CSS animation
// - Optional Firebase persistence (Firestore + Storage) if firebase-store.js present

/* global fabric */

import { saveProjectToFirebase, loadProjectFromFirebase, ensureFirebaseAuth } from "./firebase-store.js";

export let fabricCanvas = null;

let zoom = 1;
let pages = [];          // [{ json, thumb }]
let currentPage = 0;

const DRAFT_KEY = "photobook_draft_v2";
let autosaveEnabled = true;
let autosaveTimer = null;

// -----------------------------
// Helpers
// -----------------------------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function safeStringify(obj) {
  try { return JSON.stringify(obj); } catch { return null; }
}

function deepSanitize(json) {
  // Fix Chrome CanvasTextBaseline enum spam: "alphabetical" -> "alphabetic"
  const walk = (n) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach(walk);
    for (const k of Object.keys(n)) {
      const v = n[k];
      if (k === "textBaseline" && v === "alphabetical") n[k] = "alphabetic";
      walk(v);
    }
  };
  walk(json);
}

function canvasCenterPoint() {
  if (!fabricCanvas) return { x: 0, y: 0 };
  const w = fabricCanvas.getWidth();
  const h = fabricCanvas.getHeight();
  return { x: w / 2, y: h / 2 };
}

function updateZoomLabel() {
  const el = document.getElementById("zoomValue");
  if (el) el.textContent = Math.round(zoom * 100) + "%";
}

function updatePageInfo() {
  const el = document.getElementById("pageInfo");
  if (el) el.textContent = `${currentPage + 1} / ${pages.length}`;
}

function makeThumb() {
  if (!fabricCanvas) return "";
  try {
    return fabricCanvas.toDataURL({ format: "png", quality: 0.7, multiplier: 0.2 });
  } catch {
    return "";
  }
}

export function refreshThumbnails() {
  const strip = document.getElementById("thumbStrip");
  if (!strip) return;
  strip.innerHTML = "";
  pages.forEach((p, i) => {
    const d = document.createElement("div");
    d.className = "thumb" + (i === currentPage ? " active" : "");
    const img = document.createElement("img");
    img.alt = `page ${i + 1}`;
    img.src = p.thumb || "";
    d.appendChild(img);
    d.addEventListener("click", () => goToPage(i));
    strip.appendChild(d);
  });
}

function saveCurrentPageToMemory() {
  if (!fabricCanvas) return;
  const json = fabricCanvas.toJSON(["selectable", "evented", "lockMovementX", "lockMovementY", "lockRotation", "lockScalingX", "lockScalingY", "lockSkewingX", "lockSkewingY", "lockUniScaling"]);
  deepSanitize(json);
  pages[currentPage] = pages[currentPage] || { json: null, thumb: null };
  pages[currentPage].json = json;
  pages[currentPage].thumb = makeThumb();
}

async function loadPageFromMemory() {
  if (!fabricCanvas) return;
  const p = pages[currentPage];
  fabricCanvas.clear();
  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));
  if (!p || !p.json) {
    fabricCanvas.requestRenderAll();
    return;
  }
  const clean = structuredClone(p.json);
  deepSanitize(clean);
  await new Promise((resolve) => {
    fabricCanvas.loadFromJSON(clean, () => {
      fabricCanvas.renderAll();
      resolve();
    });
  });
}

function draftTooBig(payloadStr) {
  // localStorage limits vary; keep safe
  return !payloadStr || payloadStr.length > 2_500_000; // ~2.5MB
}

function saveDraftLocal() {
  if (!autosaveEnabled) return;
  try {
    saveCurrentPageToMemory();
    const payload = { pages, currentPage, ts: Date.now() };
    const str = safeStringify(payload);
    if (draftTooBig(str)) {
      // stop autosave before quota error spams
      autosaveEnabled = false;
      console.warn("Draft too large, autosave disabled.");
      return;
    }
    localStorage.setItem(DRAFT_KEY, str);
  } catch (e) {
    autosaveEnabled = false;
    console.warn("Autosave disabled (quota/blocked).", e);
  }
}

function loadDraftLocal() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data?.pages?.length) return false;
    pages = data.pages;
    currentPage = clamp(Number(data.currentPage) || 0, 0, pages.length - 1);
    return true;
  } catch {
    return false;
  }
}

// -----------------------------
// Canvas init / sizing
// -----------------------------
export function initCanvas() {
  const el = document.getElementById("canvas");
  if (!el || typeof fabric === "undefined") {
    console.error("Fabric not loaded or canvas missing.");
    return;
  }

  fabricCanvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true
  });

  // Default size preset
  setCanvasPreset("A4P");

  // Track object changes to refresh layers/thumbs and save
  fabricCanvas.on("object:added", () => { onCanvasChanged(); });
  fabricCanvas.on("object:modified", () => { onCanvasChanged(); });
  fabricCanvas.on("object:removed", () => { onCanvasChanged(); });

  bindPanZoom();

  // Pages init
  if (!loadDraftLocal()) {
    pages = [{ json: null, thumb: "" }];
    currentPage = 0;
  }

  // Render current page
  loadPageFromMemory().then(() => {
    fitToScreen();
    saveCurrentPageToMemory();
    refreshThumbnails();
    updatePageInfo();
    updateZoomLabel();
  });

  // autosave timer
  if (autosaveTimer) clearInterval(autosaveTimer);
  autosaveTimer = setInterval(saveDraftLocal, 2500);

  console.log("✅ Canvas initialized");
}

function onCanvasChanged() {
  // update floating toolbar position (if any)
  updateFloatingToolbar();
  // keep page store fresh
  saveCurrentPageToMemory();
  refreshThumbnails();
  updatePageInfo();
}

// -----------------------------
// Zoom / Fit (canvas viewport)
// -----------------------------
export function getZoom() { return zoom; }

export function setZoom(next) {
  if (!fabricCanvas) return;
  zoom = clamp(Number(next) || 1, 0.2, 4);
  const center = new fabric.Point(fabricCanvas.getWidth() / 2, fabricCanvas.getHeight() / 2);
  fabricCanvas.zoomToPoint(center, zoom);
  fabricCanvas.requestRenderAll();
  updateZoomLabel();
}

export function zoomIn() { setZoom(zoom + 0.1); }
export function zoomOut() { setZoom(zoom - 0.1); }

export function resetZoom() {
  if (!fabricCanvas) return;
  zoom = 1;
  fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  fabricCanvas.setZoom(1);
  fabricCanvas.requestRenderAll();
  updateZoomLabel();
}

export function fitToScreen() {
  const host = document.getElementById("canvasHost");
  if (!host || !fabricCanvas) return;

  // reset transform
  fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  fabricCanvas.setZoom(1);

  const pad = 36;
  const availW = Math.max(100, host.clientWidth - pad);
  const availH = Math.max(100, host.clientHeight - pad);

  const s = Math.min(availW / fabricCanvas.getWidth(), availH / fabricCanvas.getHeight());
  zoom = clamp(s, 0.2, 4);

  const center = new fabric.Point(fabricCanvas.getWidth() / 2, fabricCanvas.getHeight() / 2);
  fabricCanvas.zoomToPoint(center, zoom);

  // center inside host
  const vt = fabricCanvas.viewportTransform;
  const cw = fabricCanvas.getWidth() * zoom;
  const ch = fabricCanvas.getHeight() * zoom;
  vt[4] = (availW - cw) / 2 + pad / 2;
  vt[5] = (availH - ch) / 2 + pad / 2;
  fabricCanvas.setViewportTransform(vt);
  fabricCanvas.requestRenderAll();
  updateZoomLabel();
}

function bindPanZoom() {
  let panMode = false;
  let isPanning = false;
  let last = { x: 0, y: 0 };

  document.addEventListener("keydown", (e) => { if (e.code === "Space") panMode = true; });
  document.addEventListener("keyup", (e) => { if (e.code === "Space") panMode = false; });

  fabricCanvas.on("mouse:down", (opt) => {
    if (!panMode) return;
    isPanning = true;
    last = { x: opt.e.clientX, y: opt.e.clientY };
  });

  fabricCanvas.on("mouse:move", (opt) => {
    if (!isPanning) return;
    const e = opt.e;
    const vpt = fabricCanvas.viewportTransform;
    vpt[4] += e.clientX - last.x;
    vpt[5] += e.clientY - last.y;
    fabricCanvas.setViewportTransform(vpt);
    last = { x: e.clientX, y: e.clientY };
  });

  fabricCanvas.on("mouse:up", () => { isPanning = false; });

  // Ctrl + wheel zoom around pointer
  fabricCanvas.on("mouse:wheel", (opt) => {
    const e = opt.e;
    if (!e.ctrlKey) return;
    e.preventDefault();
    e.stopPropagation();

    const factor = e.deltaY > 0 ? 0.95 : 1.05;
    zoom = clamp(zoom * factor, 0.2, 4);
    const pt = new fabric.Point(e.offsetX, e.offsetY);
    fabricCanvas.zoomToPoint(pt, zoom);
    fabricCanvas.requestRenderAll();
    updateZoomLabel();
  });
}

// -----------------------------
// Canvas size presets
// -----------------------------
const PRESETS = {
  A4P: { w: 1240, h: 1754 },
  A4L: { w: 1754, h: 1240 },
  SQUARE: { w: 1400, h: 1400 },
  STORY: { w: 1080, h: 1920 },
  HD: { w: 1920, h: 1080 }
};

export function setCanvasPreset(key) {
  const p = PRESETS[key];
  if (!p || !fabricCanvas) return;
  fabricCanvas.setWidth(p.w);
  fabricCanvas.setHeight(p.h);
  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));
  fitToScreen();
  saveCurrentPageToMemory();
  refreshThumbnails();
}

export function setCanvasCustom(w, h) {
  if (!fabricCanvas) return;
  const W = clamp(Number(w) || 800, 200, 4000);
  const H = clamp(Number(h) || 600, 200, 4000);
  fabricCanvas.setWidth(W);
  fabricCanvas.setHeight(H);
  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));
  fitToScreen();
  saveCurrentPageToMemory();
  refreshThumbnails();
}

// -----------------------------
// Add objects
// -----------------------------
export function addText(opts = {}) {
  if (!fabricCanvas) return;
  const { x, y } = canvasCenterPoint();
  const t = new fabric.Textbox(opts.text || "Text", {
    left: x,
    top: y,
    originX: "center",
    originY: "center",
    fontFamily: opts.fontFamily || "Arial",
    fontSize: opts.fontSize || 48,
    fill: opts.fill || "#111",
    stroke: opts.stroke || null,
    strokeWidth: opts.strokeWidth || 0,
    opacity: opts.opacity ?? 1
  });
  // baseline fix (avoid "alphabetical" spam)
  t.set("textBaseline", "alphabetic");

  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
  fabricCanvas.requestRenderAll();
}

export async function addImageFromFile(file) {
  if (!fabricCanvas || !file) return;
  const dataUrl = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  // add to canvas
  await new Promise((resolve) => {
    fabric.Image.fromURL(dataUrl, (img) => {
      const { x, y } = canvasCenterPoint();
      img.set({ left: x, top: y, originX: "center", originY: "center" });
      img.scaleToWidth(fabricCanvas.getWidth() * 0.55);
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.requestRenderAll();
      resolve();
    }, { crossOrigin: "anonymous" });
  });
}

export function addRect() {
  if (!fabricCanvas) return;
  const { x, y } = canvasCenterPoint();
  const r = new fabric.Rect({ left: x, top: y, originX: "center", originY: "center", width: 220, height: 140, fill: "#ff3b30" });
  fabricCanvas.add(r); fabricCanvas.setActiveObject(r); fabricCanvas.requestRenderAll();
}
export function addCircle() {
  if (!fabricCanvas) return;
  const { x, y } = canvasCenterPoint();
  const c = new fabric.Circle({ left: x, top: y, originX: "center", originY: "center", radius: 90, fill: "#34c759" });
  fabricCanvas.add(c); fabricCanvas.setActiveObject(c); fabricCanvas.requestRenderAll();
}
export function addLine() {
  if (!fabricCanvas) return;
  const { x, y } = canvasCenterPoint();
  const ln = new fabric.Line([x - 150, y, x + 150, y], { stroke: "#111", strokeWidth: 6 });
  fabricCanvas.add(ln); fabricCanvas.setActiveObject(ln); fabricCanvas.requestRenderAll();
}

// -----------------------------
// Pages
// -----------------------------
export function addPage() {
  saveCurrentPageToMemory();
  pages.push({ json: null, thumb: "" });
  currentPage = pages.length - 1;
  fabricCanvas.clear();
  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));
  fitToScreen();
  saveCurrentPageToMemory();
  refreshThumbnails();
  updatePageInfo();
  saveDraftLocal();
}

export function duplicatePage() {
  saveCurrentPageToMemory();
  const src = pages[currentPage]?.json ? structuredClone(pages[currentPage]) : { json: null, thumb: "" };
  pages.splice(currentPage + 1, 0, src);
  currentPage += 1;
  loadPageFromMemory().then(() => {
    fitToScreen();
    saveCurrentPageToMemory();
    refreshThumbnails();
    updatePageInfo();
    saveDraftLocal();
  });
}

export function deletePage() {
  if (pages.length <= 1) return alert("Πρέπει να υπάρχει τουλάχιστον 1 σελίδα.");
  pages.splice(currentPage, 1);
  currentPage = clamp(currentPage, 0, pages.length - 1);
  loadPageFromMemory().then(() => {
    fitToScreen();
    saveCurrentPageToMemory();
    refreshThumbnails();
    updatePageInfo();
    saveDraftLocal();
  });
}

export function nextPage() {
  if (currentPage >= pages.length - 1) return;
  goToPage(currentPage + 1);
}
export function prevPage() {
  if (currentPage <= 0) return;
  goToPage(currentPage - 1);
}

export function goToPage(idx) {
  const i = clamp(Number(idx) || 0, 0, pages.length - 1);
  if (i === currentPage) return;
  saveCurrentPageToMemory();
  currentPage = i;
  loadPageFromMemory().then(() => {
    fitToScreen();
    saveCurrentPageToMemory();
    refreshThumbnails();
    updatePageInfo();
    saveDraftLocal();
  });
}

// -----------------------------
// Export: multi-page flipbook + preview + link
// -----------------------------
async function renderPageToDataURL(pageIndex, { multiplier = 1 } = {}) {
  if (!fabricCanvas) return "";
  // save current state and load target page
  const prevIndex = currentPage;
  saveCurrentPageToMemory();
  currentPage = pageIndex;
  await loadPageFromMemory();

  // Important: render at 1:1 zoom/transform to export correctly
  fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  fabricCanvas.setZoom(1);
  fabricCanvas.requestRenderAll();

  const url = fabricCanvas.toDataURL({ format: "png", quality: 1, multiplier });

  // restore previous page
  currentPage = prevIndex;
  await loadPageFromMemory();
  fitToScreen();
  return url;
}

function buildFlipbookHtml(imageUrls, { direction = "horizontal" } = {}) {
  const vertical = direction === "vertical";
  const pagesHtml = imageUrls.map((src, i) => `
    <div class="pb-page ${i===0?'is-active':''}" data-i="${i}">
      <img src="${src}" alt="page ${i+1}" />
    </div>
  `).join("");

  // Simple page flip animation (book-like)
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Flipbook</title>
<style>
  html,body{height:100%;margin:0;background:#111;color:#fff;font-family:system-ui,Segoe UI,Arial}
  .wrap{height:100%;display:flex;align-items:center;justify-content:center;gap:16px;padding:16px;box-sizing:border-box}
  .book{
    width:min(980px,92vw); height:min(680px,92vh);
    position:relative; perspective:1600px;
  }
  .pb-page{
    position:absolute; inset:0;
    transform-style:preserve-3d;
    transform-origin:${vertical ? "center top" : "left center"};
    transition:transform 700ms ease, opacity 300ms ease;
    backface-visibility:hidden;
    border-radius:14px;
    overflow:hidden;
    box-shadow:0 18px 45px rgba(0,0,0,.45);
    background:#000;
    opacity:0;
    pointer-events:none;
  }
  .pb-page img{width:100%;height:100%;object-fit:contain;background:#000}
  .pb-page.is-active{opacity:1;pointer-events:auto}
  .pb-page.is-flipping{
    transform:${vertical ? "rotateX(-180deg)" : "rotateY(-180deg)"};
    opacity:0;
  }
  .bar{display:flex;gap:10px;align-items:center}
  .btn{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#fff;border-radius:10px;padding:10px 12px;cursor:pointer}
  .btn:disabled{opacity:.5;cursor:not-allowed}
  .count{opacity:.85}
</style>
</head>
<body>
<div class="wrap">
  <div class="bar">
    <button class="btn" id="prevBtn">◀</button>
    <span class="count" id="count"></span>
    <button class="btn" id="nextBtn">▶</button>
  </div>
  <div class="book" id="book">${pagesHtml}</div>
</div>
<script>
  const pages=[...document.querySelectorAll('.pb-page')];
  let idx=0;
  const count=document.getElementById('count');
  const prev=document.getElementById('prevBtn');
  const next=document.getElementById('nextBtn');

  function setActive(n){
    pages.forEach((p,i)=>p.classList.toggle('is-active', i===n));
    count.textContent=(n+1)+' / '+pages.length;
    prev.disabled = n<=0;
    next.disabled = n>=pages.length-1;
  }

  function flip(to){
    if(to<0 || to>=pages.length || to===idx) return;
    const current=pages[idx];
    current.classList.add('is-flipping');
    setTimeout(()=>{
      current.classList.remove('is-flipping');
      idx=to;
      setActive(idx);
    }, 650);
  }

  prev.addEventListener('click', ()=>flip(idx-1));
  next.addEventListener('click', ()=>flip(idx+1));
  document.addEventListener('keydown', (e)=>{
    if(e.key==='ArrowLeft') flip(idx-1);
    if(e.key==='ArrowRight') flip(idx+1);
  });

  setActive(0);
</script>
</body></html>`;
}

export async function exportFlipbook({ direction = "horizontal" } = {}) {
  // produce all pages, not only current
  const urls = [];
  for (let i = 0; i < pages.length; i++) {
    const u = await renderPageToDataURL(i, { multiplier: 1 });
    urls.push(u);
  }
  const html = buildFlipbookHtml(urls, { direction });
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  return { url, html };
}

export async function previewFlipbook({ direction = "horizontal" } = {}) {
  const modal = document.getElementById("flipPreviewModal");
  const frame = document.getElementById("flipPreviewFrame");
  if (!modal || !frame) return;
  const { url } = await exportFlipbook({ direction });
  frame.src = url;
  modal.classList.add("open");
}

export function closeFlipbookPreview() {
  const modal = document.getElementById("flipPreviewModal");
  const frame = document.getElementById("flipPreviewFrame");
  if (!modal || !frame) return;
  frame.src = "about:blank";
  modal.classList.remove("open");
}

export async function exportFlipbookLink({ direction = "horizontal" } = {}) {
  // Local "share link" (works only for your browser session). Real hosted link requires server.
  const { url } = await exportFlipbook({ direction });
  return url;
}

// -----------------------------
// Firebase persistence (safe, optional)
// -----------------------------
export async function saveProject(projectId = "default") {
  try {
    await ensureFirebaseAuth();
    saveCurrentPageToMemory();
    // store JSON only (images are dataURLs inside JSON - heavy). For now: store pages JSON, but
    // cap and fall back to local if too big.
    const payload = { pages, currentPage, updatedAt: Date.now() };
    const str = safeStringify(payload);
    if (draftTooBig(str)) {
      console.warn("Project too big to store as JSON; consider uploading images to Storage and storing URLs.");
    }
    await saveProjectToFirebase(projectId, payload);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function loadProject(projectId = "default") {
  try {
    await ensureFirebaseAuth();
    const data = await loadProjectFromFirebase(projectId);
    if (!data?.pages?.length) return false;
    pages = data.pages;
    currentPage = clamp(Number(data.currentPage) || 0, 0, pages.length - 1);
    await loadPageFromMemory();
    fitToScreen();
    saveCurrentPageToMemory();
    refreshThumbnails();
    updatePageInfo();
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

// -----------------------------
// Floating toolbar (minimal)
// -----------------------------
function updateFloatingToolbar() {
  const tb = document.getElementById("floatToolbar");
  if (!tb || !fabricCanvas) return;
  const obj = fabricCanvas.getActiveObject();
  if (!obj) { tb.hidden = true; return; }

  const host = document.getElementById("canvasHost");
  if (!host) return;

  const rect = host.getBoundingClientRect();
  // center top of host
  tb.style.left = (rect.left + rect.width / 2) + "px";
  tb.style.top = (rect.top + 12) + "px";
  tb.style.transform = "translateX(-50%)";
  tb.hidden = false;
}
