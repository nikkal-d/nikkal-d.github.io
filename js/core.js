
// js/core.js
// Core engine: Fabric canvas + pages + real zoom (viewport) + flipbook export/preview.
// No external ES import of fabric (Fabric is loaded as a global script).

export const DRAFT_KEY = "photobook_draft_v2";

export let fabricCanvas = null;
export let pages = [];        // [{ json: object|null, thumb: string|null }]
export let currentPage = 0;

let zoom = 1;
let autosaveEnabled = true;

const presets = {
  A4P:   { w: 1240, h: 1754 },
  A4L:   { w: 1754, h: 1240 },
  SQUARE:{ w: 1400, h: 1400 },
  STORY: { w: 1080, h: 1920 },
  HD:    { w: 1920, h: 1080 }
};

// ------------------------------------------------------------
// Safe Fabric baseline fix: replace "alphabetical" -> "alphabetic"
// ------------------------------------------------------------
function sanitizeBaselineDeep(node){
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { node.forEach(sanitizeBaselineDeep); return; }
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (k === "textBaseline" && v === "alphabetical") node[k] = "alphabetic";
    sanitizeBaselineDeep(v);
  }
}
function patchFabricDefaults(){
  if (!window.fabric) return;
  try {
    // Only assign if property exists & writable; no defineProperty (can throw).
    if (fabric.Textbox && fabric.Textbox.prototype) {
      fabric.Textbox.prototype.textBaseline = "alphabetic";
    }
    if (fabric.IText && fabric.IText.prototype) {
      fabric.IText.prototype.textBaseline = "alphabetic";
    }
  } catch {}
}

// ------------------------------------------------------------
// Init
// ------------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  patchFabricDefaults();

  const canvasEl = document.getElementById("canvas");
  if (!canvasEl || !window.fabric) return;

  fabricCanvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true
  });

  // Default page size
  setCanvasSizePreset("A4P");

  // Pages
  pages = [{ json: null, thumb: null }];
  currentPage = 0;
  updatePageInfo();
  refreshThumbnails();

  // History/events (save + thumbs + layers hooks)
  fabricCanvas.on("object:added", () => { onCanvasChanged(); });
  fabricCanvas.on("object:modified", () => { onCanvasChanged(); });
  fabricCanvas.on("object:removed", () => { onCanvasChanged(); });

  // Wheel zoom (Ctrl+wheel)
  fabricCanvas.on("mouse:wheel", (opt) => {
    const e = opt.e;
    if (!e.ctrlKey) return;
    e.preventDefault();
    e.stopPropagation();
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    setZoom(zoom * factor, { x: e.offsetX, y: e.offsetY });
  });

  // Load draft (best-effort)
  loadDraft();

  // Fit by default (so objects appear)
  fitToScreen();

  // Autosave
  setInterval(() => { if (autosaveEnabled) saveDraft(); }, 2500);

  console.log("✅ Canvas initialized");
});

// ------------------------------------------------------------
// Canvas size
// ------------------------------------------------------------
export function setCanvasSizePreset(preset){
  const p = presets[preset];
  if (!p || !fabricCanvas) return;
  fabricCanvas.setWidth(p.w);
  fabricCanvas.setHeight(p.h);
  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));
  resetZoom();
  fitToScreen();
  saveCurrentPage();
  updatePageInfo();
  refreshThumbnails();
}

export function setCanvasCustom(w, h){
  if (!fabricCanvas) return;
  const W = Math.max(200, Math.min(4000, Number(w)));
  const H = Math.max(200, Math.min(4000, Number(h)));
  fabricCanvas.setWidth(W);
  fabricCanvas.setHeight(H);
  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));
  resetZoom();
  fitToScreen();
  saveCurrentPage();
  updatePageInfo();
  refreshThumbnails();
}

// ------------------------------------------------------------
// Zoom (real viewport zoom)
// ------------------------------------------------------------
export function getZoom(){ return zoom; }

export function setZoom(value, point){
  if (!fabricCanvas) return;
  const next = Math.max(0.15, Math.min(4, Number(value) || 1));
  zoom = next;

  const p = point
    ? new fabric.Point(point.x, point.y)
    : new fabric.Point(fabricCanvas.getWidth()/2, fabricCanvas.getHeight()/2);

  fabricCanvas.zoomToPoint(p, zoom);
  fabricCanvas.requestRenderAll();
}

export function zoomIn(){ setZoom(zoom + 0.1); }
export function zoomOut(){ setZoom(zoom - 0.1); }

export function resetZoom(){
  if (!fabricCanvas) return;
  zoom = 1;
  fabricCanvas.setViewportTransform([1,0,0,1,0,0]);
  fabricCanvas.setZoom(1);
  fabricCanvas.requestRenderAll();
}

export function fitToScreen(){
  const host = document.getElementById("canvasHost");
  if (!host || !fabricCanvas) return;

  // Reset transforms
  resetZoom();

  const pad = 36;
  const availW = Math.max(50, host.clientWidth - pad);
  const availH = Math.max(50, host.clientHeight - pad);

  const scale = Math.min(
    availW / fabricCanvas.getWidth(),
    availH / fabricCanvas.getHeight()
  );

  // Zoom around center
  setZoom(scale);

  // Center inside host (shift viewport transform)
  const vt = fabricCanvas.viewportTransform;
  vt[4] = (availW - fabricCanvas.getWidth() * scale) / 2;
  vt[5] = (availH - fabricCanvas.getHeight() * scale) / 2;
  fabricCanvas.setViewportTransform(vt);
  fabricCanvas.requestRenderAll();
}

// ------------------------------------------------------------
// Add objects
// ------------------------------------------------------------
function viewportCenter(){
  if (!fabricCanvas) return { x: 200, y: 200 };
  const vt = fabricCanvas.viewportTransform || [1,0,0,1,0,0];
  const cx = fabricCanvas.getWidth()/2;
  const cy = fabricCanvas.getHeight()/2;
  // convert viewport center to canvas coords
  const x = (cx - vt[4]) / vt[0];
  const y = (cy - vt[5]) / vt[3];
  return { x, y };
}

export function addText(opts = {}){
  if (!fabricCanvas || !window.fabric) return;

  const { x, y } = viewportCenter();
  const t = new fabric.Textbox(opts.text || "Text", {
    left: x,
    top: y,
    originX: "center",
    originY: "center",
    fontSize: Number(opts.fontSize) || 48,
    fill: opts.fill || "#111",
    fontFamily: opts.fontFamily || "Arial",
    fontWeight: opts.bold ? "bold" : "normal",
    fontStyle: opts.italic ? "italic" : "normal",
    underline: !!opts.underline,
    textAlign: opts.align || "left",
    textBaseline: "alphabetic"
  });

  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
  refreshThumbnails();
}

export function addImageFromFile(file){
  if (!fabricCanvas || !file || !window.fabric) return;

  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, (img) => {
      const { x, y } = viewportCenter();
      img.set({ left: x, top: y, originX:"center", originY:"center" });

      const maxW = fabricCanvas.getWidth() * 0.7;
      const maxH = fabricCanvas.getHeight() * 0.7;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      img.scale(scale);

      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.requestRenderAll();
      saveCurrentPage();
      refreshThumbnails();
    }, { crossOrigin: "anonymous" });
  };
  reader.readAsDataURL(file);
}

export function addRect(){
  if (!fabricCanvas || !window.fabric) return;
  const { x, y } = viewportCenter();
  const r = new fabric.Rect({ left:x, top:y, originX:"center", originY:"center", width:260, height:180, fill:"#4f46e5", rx:10, ry:10 });
  fabricCanvas.add(r); fabricCanvas.setActiveObject(r); fabricCanvas.requestRenderAll();
  saveCurrentPage(); refreshThumbnails();
}
export function addCircle(){
  if (!fabricCanvas || !window.fabric) return;
  const { x, y } = viewportCenter();
  const c = new fabric.Circle({ left:x, top:y, originX:"center", originY:"center", radius:90, fill:"#10b981" });
  fabricCanvas.add(c); fabricCanvas.setActiveObject(c); fabricCanvas.requestRenderAll();
  saveCurrentPage(); refreshThumbnails();
}
export function addLine(){
  if (!fabricCanvas || !window.fabric) return;
  const { x, y } = viewportCenter();
  const l = new fabric.Line([x-140,y, x+140,y], { stroke:"#111827", strokeWidth:6, selectable:true });
  fabricCanvas.add(l); fabricCanvas.setActiveObject(l); fabricCanvas.requestRenderAll();
  saveCurrentPage(); refreshThumbnails();
}

// ------------------------------------------------------------
// Pages
// ------------------------------------------------------------
export function updatePageInfo(){
  const el = document.getElementById("pageInfo");
  if (el) el.textContent = `${currentPage+1} / ${pages.length}`;
}

export function saveCurrentPage(){
  if (!fabricCanvas || !pages[currentPage]) return;
  const json = fabricCanvas.toJSON();
  sanitizeBaselineDeep(json);
  pages[currentPage].json = json;
  // thumb (keep in memory only)
  try {
    pages[currentPage].thumb = fabricCanvas.toDataURL({ format:"png", quality:0.85, multiplier:0.2 });
  } catch {
    pages[currentPage].thumb = null;
  }
  updatePageInfo();
}

export function loadCurrentPage(){
  if (!fabricCanvas) return;
  const pg = pages[currentPage];
  if (!pg || !pg.json) {
    fabricCanvas.clear();
    fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));
    return;
  }
  const clone = structuredClone(pg.json);
  sanitizeBaselineDeep(clone);
  fabricCanvas.loadFromJSON(clone, () => {
    fabricCanvas.renderAll();
  });
}

export function addPage(){
  saveCurrentPage();
  pages.push({ json: null, thumb: null });
  currentPage = pages.length - 1;
  fabricCanvas.clear();
  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));
  updatePageInfo();
  refreshThumbnails();
}

export function duplicatePage(){
  saveCurrentPage();
  const src = pages[currentPage];
  const clone = src?.json ? { json: structuredClone(src.json), thumb: src.thumb || null } : { json:null, thumb:null };
  pages.splice(currentPage+1, 0, clone);
  currentPage++;
  loadCurrentPage();
  updatePageInfo();
  refreshThumbnails();
}

export function deletePage(){
  if (pages.length <= 1) return alert("Πρέπει να υπάρχει τουλάχιστον 1 σελίδα.");
  pages.splice(currentPage, 1);
  currentPage = Math.max(0, currentPage-1);
  loadCurrentPage();
  updatePageInfo();
  refreshThumbnails();
}

export function goToPage(index){
  const i = Number(index);
  if (!Number.isFinite(i) || i < 0 || i >= pages.length) return;
  saveCurrentPage();
  currentPage = i;
  loadCurrentPage();
  updatePageInfo();
  refreshThumbnails();
}

export function nextPage(){ if (currentPage < pages.length-1) goToPage(currentPage+1); }
export function prevPage(){ if (currentPage > 0) goToPage(currentPage-1); }

export function refreshThumbnails(){
  const strip = document.getElementById("thumbStrip");
  if (!strip) return;
  strip.innerHTML = "";
  pages.forEach((p, i) => {
    const d = document.createElement("div");
    d.className = "thumb" + (i === currentPage ? " active" : "");
    const img = document.createElement("img");
    img.alt = `page ${i+1}`;
    img.src = p.thumb || "";
    d.appendChild(img);
    d.addEventListener("click", () => goToPage(i));
    strip.appendChild(d);
  });
}

// ------------------------------------------------------------
// Layers helpers (used by UI)
// ------------------------------------------------------------
export function getObjects(){
  return fabricCanvas ? fabricCanvas.getObjects() : [];
}
export function getActiveObject(){
  return fabricCanvas ? fabricCanvas.getActiveObject() : null;
}
export function deleteActiveObject(){
  const obj = getActiveObject();
  if (!obj || !fabricCanvas) return;
  fabricCanvas.remove(obj);
  fabricCanvas.discardActiveObject();
  fabricCanvas.requestRenderAll();
  saveCurrentPage(); refreshThumbnails();
}
export function bringForward(){
  const obj = getActiveObject();
  if (!obj || !fabricCanvas) return;
  fabricCanvas.bringForward(obj);
  fabricCanvas.requestRenderAll();
  saveCurrentPage(); refreshThumbnails();
}
export function sendBackwards(){
  const obj = getActiveObject();
  if (!obj || !fabricCanvas) return;
  fabricCanvas.sendBackwards(obj);
  fabricCanvas.requestRenderAll();
  saveCurrentPage(); refreshThumbnails();
}

// ------------------------------------------------------------
// Draft save/load (quota-safe)
// We DO NOT store thumbs (dataURLs) in localStorage.
// ------------------------------------------------------------
export function saveDraft(){
  if (!autosaveEnabled) return;
  try {
    saveCurrentPage();
    const payload = {
      v: 2,
      currentPage,
      size: { w: fabricCanvas?.getWidth() || presets.A4P.w, h: fabricCanvas?.getHeight() || presets.A4P.h },
      pages: pages.map(p => ({ json: p.json || null })) // NO thumbs
    };
    const str = JSON.stringify(payload);
    localStorage.setItem(DRAFT_KEY, str);
  } catch (e) {
    // QuotaExceeded: disable autosave to prevent breaking the app
    console.warn("Draft save disabled (quota)", e);
    autosaveEnabled = false;
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  }
}

export function loadDraft(){
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.pages)) return;

    pages = data.pages.map(p => ({ json: p.json || null, thumb: null }));
    currentPage = Math.max(0, Math.min(data.currentPage || 0, pages.length-1));

    // Apply size
    if (data.size && fabricCanvas) {
      fabricCanvas.setWidth(data.size.w);
      fabricCanvas.setHeight(data.size.h);
      fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));
    }

    // Sanitize baselines
    pages.forEach(p => p?.json && sanitizeBaselineDeep(p.json));

    loadCurrentPage();
    updatePageInfo();
    refreshThumbnails();
  } catch {}
}

// ------------------------------------------------------------
// Flipbook export / preview
// ------------------------------------------------------------
function flipbookHTML(images, direction="horizontal"){
  const safeImgs = images.map(s => s || "");
  const dir = direction === "vertical" ? "vertical" : "horizontal";
  const jsonImgs = JSON.stringify(safeImgs);

  // Simple 2-page spread with CSS "flip" animation.
  return `<!doctype html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Flipbook</title>
<style>
  :root{--bg:#0b0f17;--card:#111827;--line:rgba(255,255,255,.12);--txt:#e5e7eb}
  html,body{height:100%;margin:0;background:var(--bg);color:var(--txt);font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial}
  .wrap{height:100%;display:flex;flex-direction:column}
  .bar{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid var(--line);background:rgba(17,24,39,.7);backdrop-filter: blur(10px)}
  .btn{border:1px solid var(--line);background:rgba(255,255,255,.06);color:var(--txt);padding:8px 10px;border-radius:10px;cursor:pointer}
  .btn:active{transform:translateY(1px)}
  .stage{flex:1;display:flex;align-items:center;justify-content:center;padding:18px}
  .book{position:relative;width:min(980px,94vw);height:min(640px,86vh);perspective:1600px}
  .sheet{position:absolute;inset:0;display:flex;gap:0}
  .page{flex:1;background:#fff;border:1px solid rgba(0,0,0,.1);overflow:hidden;display:flex;align-items:center;justify-content:center}
  .page img{width:100%;height:100%;object-fit:contain;background:#fff}
  /* Flip layer */
  .flip{position:absolute;inset:0;transform-style:preserve-3d;transform-origin:${dir==="horizontal"?"left center":"center top"};transition:transform .55s ease}
  .flip.flipped{transform:${dir==="horizontal"?"rotateY(-180deg)":"rotateX(180deg)"}}
  .flip .front,.flip .back{position:absolute;inset:0;backface-visibility:hidden;display:flex}
  .flip .back{transform:${dir==="horizontal"?"rotateY(180deg)":"rotateX(180deg)"}}
  .hint{opacity:.8;font-size:12px}
</style>
</head>
<body>
<div class="wrap">
  <div class="bar">
    <div><strong>Flipbook</strong> <span class="hint" id="count"></span></div>
    <div>
      <button class="btn" id="prevBtn">Prev</button>
      <button class="btn" id="nextBtn">Next</button>
    </div>
  </div>
  <div class="stage">
    <div class="book" id="book">
      <div class="sheet" id="sheet">
        <div class="page"><img id="leftImg" alt="page left"></div>
        <div class="page"><img id="rightImg" alt="page right"></div>
      </div>
      <div class="flip" id="flip">
        <div class="front">
          <div class="page"><img id="fLeft" alt="front left"></div>
          <div class="page"><img id="fRight" alt="front right"></div>
        </div>
        <div class="back">
          <div class="page"><img id="bLeft" alt="back left"></div>
          <div class="page"><img id="bRight" alt="back right"></div>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
const IMAGES = ${jsonImgs};
let spread = 0; // spread index (0 => pages 0-1)
const flip = document.getElementById('flip');

function pageAt(i){ return IMAGES[i] || ""; }

function setImg(id, src){ const el=document.getElementById(id); if (el) el.src = src || ""; }

function renderInstant(){
  const p0 = spread*2;
  setImg('leftImg',  pageAt(p0));
  setImg('rightImg', pageAt(p0+1));
  document.getElementById('count').textContent = " ("+(p0+1)+"-"+(p0+2)+"/"+IMAGES.length+")";
}

function prepFlip(nextSpread){
  const from0 = spread*2;
  const to0 = nextSpread*2;

  // front = current spread, back = next spread
  setImg('fLeft',  pageAt(from0));
  setImg('fRight', pageAt(from0+1));
  setImg('bLeft',  pageAt(to0));
  setImg('bRight', pageAt(to0+1));
}

function doFlip(nextSpread){
  if (nextSpread < 0) return;
  if (nextSpread*2 >= IMAGES.length) return;

  prepFlip(nextSpread);
  flip.classList.add('flipped');
  setTimeout(() => {
    spread = nextSpread;
    flip.classList.remove('flipped');
    renderInstant();
  }, 560);
}

document.getElementById('prevBtn').onclick = () => doFlip(spread-1);
document.getElementById('nextBtn').onclick = () => doFlip(spread+1);

renderInstant();
</script>
</body></html>`;
}

function collectPageImages(){
  // Ensure current page saved
  saveCurrentPage();

  // Build images list: prefer thumb? no, need full-res.
  // We'll render each page JSON to a temp StaticCanvas for accurate output.
  const imgs = [];
  const W = fabricCanvas?.getWidth() || presets.A4P.w;
  const H = fabricCanvas?.getHeight() || presets.A4P.h;

  const makeImageFromJson = (json) => new Promise((resolve) => {
    if (!window.fabric) return resolve("");
    const tmpEl = document.createElement("canvas");
    tmpEl.width = W; tmpEl.height = H;
    const tmp = new fabric.StaticCanvas(tmpEl, { width: W, height: H });
    tmp.setBackgroundColor("#ffffff", tmp.renderAll.bind(tmp));

    if (!json) {
      tmp.renderAll();
      return resolve(tmp.toDataURL({ format:"png", quality:0.92 }));
    }
    const clone = structuredClone(json);
    sanitizeBaselineDeep(clone);

    tmp.loadFromJSON(clone, () => {
      tmp.renderAll();
      try { resolve(tmp.toDataURL({ format:"png", quality:0.92 })); }
      catch { resolve(""); }
      tmp.dispose && tmp.dispose();
    });
  });

  return (async () => {
    for (const p of pages) imgs.push(await makeImageFromJson(p.json));
    return imgs;
  })();
}

export async function previewFlipbook(direction="horizontal"){
  const modal = document.getElementById("flipPreviewModal");
  const frame = document.getElementById("flipPreviewFrame");
  if (!modal || !frame) return;

  const imgs = await collectPageImages();
  frame.srcdoc = flipbookHTML(imgs, direction);
  modal.classList.add("open");
}

export function closeFlipbookPreview(){
  const modal = document.getElementById("flipPreviewModal");
  const frame = document.getElementById("flipPreviewFrame");
  if (frame) frame.srcdoc = "";
  if (modal) modal.classList.remove("open");
}

export async function exportFlipbookHTML(direction="horizontal"){
  const imgs = await collectPageImages();
  return flipbookHTML(imgs, direction);
}

export async function downloadFlipbook(direction="horizontal"){
  const html = await exportFlipbookHTML(direction);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "flipbook.html";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 8000);
}

export async function exportFlipbookLink(direction="horizontal"){
  // Creates a temporary blob URL and copies it. (Not persistent across devices.)
  const html = await exportFlipbookHTML(direction);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  try {
    await navigator.clipboard.writeText(url);
    alert("Έγινε αντιγραφή προσωρινού link (blob). Για μόνιμο link: κατέβασε το flipbook.html και ανέβασέ το στο hosting σου.");
  } catch {
    prompt("Copy this temporary link:", url);
  }
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 600000);
}

// ------------------------------------------------------------
// Internal change handler
// ------------------------------------------------------------
function onCanvasChanged(){
  saveCurrentPage();
  refreshThumbnails();
}
