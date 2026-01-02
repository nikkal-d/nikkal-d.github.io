// core.js
// ============================================================
// Fabric canvas + pages + zoom (viewport) + exports
// ============================================================

export let fabricCanvas = null;

// Draft (store JSON only to avoid quota blowups)
const DRAFT_KEY = "photobook_draft_v2";

let pages = []; // [{ json: FabricJSON|null, thumb: dataURL|null }]
let currentPage = 0;

let zoom = 1;
let _restoring = false;
let _autosaveHandle = null;
let _quotaWarned = false;

// ---------- Utils ----------
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const deepClone = (o) => (o ? JSON.parse(JSON.stringify(o)) : o);

function $(id){ return document.getElementById(id); }

function updatePageInfo(){
  const el = $("pageInfo") || $("pageIndicator");
  if (el) el.textContent = `${currentPage+1} / ${pages.length}`;
}

function sanitizeJSON(json){
  // Kill any legacy invalid baseline
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.textBaseline === "alphabetical") node.textBaseline = "alphabetic";
    for (const k of Object.keys(node)){
      if (k === "textBaseline" && node[k] === "alphabetical") node[k] = "alphabetic";
      walk(node[k]);
    }
  };
  walk(json);
}

// ---------- Canvas init ----------
export function initCanvas(){
  if (typeof fabric === "undefined") {
    console.error("Fabric not loaded");
    return;
  }
  const el = $("canvas");
  if (!el) return;

  fabricCanvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true
  });

  // default size
  setCanvasSizePreset("A4P");

  // page 1
  pages = [{ json: null, thumb: null }];
  currentPage = 0;
  updatePageInfo();
  refreshThumbnails();

  // history-ish: update thumbs on changes
  ["object:added","object:modified","object:removed"].forEach(ev => {
    fabricCanvas.on(ev, () => {
      if (_restoring) return;
      saveCurrentPage();
      refreshThumbnails();
      scheduleDraftSave();
    });
  });

  // load draft if exists
  loadDraft();

  // ctrl+wheel zoom around pointer
  fabricCanvas.on("mouse:wheel", (opt) => {
    const e = opt.e;
    if (!e.ctrlKey) return;
    e.preventDefault();
    e.stopPropagation();
    const factor = e.deltaY > 0 ? 0.95 : 1.05;
    setZoom(zoom * factor, { x: e.offsetX, y: e.offsetY });
  });

  // initial fit
  fitToScreen();

  console.log("✅ Canvas initialized");
}

// ---------- Sizes ----------
const PRESETS = {
  A4P: { w: 1240, h: 1754, label: "A4 Portrait" },
  A4L: { w: 1754, h: 1240, label: "A4 Landscape" },
  SQUARE: { w: 1400, h: 1400, label: "Square" },
  STORY: { w: 1080, h: 1920, label: "Story" },
  HD: { w: 1920, h: 1080, label: "HD" }
};

export function setCanvasSizePreset(preset){
  const p = PRESETS[preset];
  if (!p || !fabricCanvas) return;
  fabricCanvas.setWidth(p.w);
  fabricCanvas.setHeight(p.h);
  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));
  resetZoom();
  fitToScreen();
  saveCurrentPage();
  refreshThumbnails();
  scheduleDraftSave();
}

export function setCanvasCustom(w,h){
  if (!fabricCanvas) return;
  const W = clamp(Number(w)||1240, 200, 4000);
  const H = clamp(Number(h)||1754, 200, 4000);
  fabricCanvas.setWidth(W);
  fabricCanvas.setHeight(H);
  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));
  resetZoom();
  fitToScreen();
  saveCurrentPage();
  refreshThumbnails();
  scheduleDraftSave();
}

// ---------- Zoom (viewport) ----------
export function getZoom(){ return zoom; }

export function setZoom(value, point){
  if (!fabricCanvas) return;
  zoom = clamp(Number(value)||1, 0.2, 4);
  const pt = point
    ? new fabric.Point(point.x, point.y)
    : new fabric.Point(fabricCanvas.getWidth()/2, fabricCanvas.getHeight()/2);
  fabricCanvas.zoomToPoint(pt, zoom);
  fabricCanvas.requestRenderAll();
}

export function zoomIn(){ setZoom(zoom + 0.1); }
export function zoomOut(){ setZoom(zoom - 0.1); }

export function resetZoom(){
  if (!fabricCanvas) return;
  zoom = 1;
  fabricCanvas.setViewportTransform([1,0,0,1,0,0]);
  fabricCanvas.requestRenderAll();
}

export function fitToScreen(){
  const host = $("canvasHost");
  if (!host || !fabricCanvas) return;

  // Reset transforms first
  resetZoom();

  const pad = 24;
  const availW = Math.max(100, host.clientWidth - pad);
  const availH = Math.max(100, host.clientHeight - pad);

  const s = Math.min(availW / fabricCanvas.getWidth(), availH / fabricCanvas.getHeight());
  setZoom(s);

  // center inside host by shifting viewport
  const vt = fabricCanvas.viewportTransform;
  vt[4] = (availW - fabricCanvas.getWidth()*s)/2;
  vt[5] = (availH - fabricCanvas.getHeight()*s)/2;
  fabricCanvas.setViewportTransform(vt);
  fabricCanvas.requestRenderAll();
}

// ---------- Page management ----------
export function addPage(){
  if (!fabricCanvas) return;
  saveCurrentPage();
  pages.splice(currentPage+1, 0, { json: null, thumb: null });
  currentPage += 1;
  clearCanvasForNewPage();
  updatePageInfo();
  refreshThumbnails();
  scheduleDraftSave();
}

export function duplicatePage(){
  if (!fabricCanvas) return;
  saveCurrentPage();
  const src = pages[currentPage];
  const clone = { json: src?.json ? deepClone(src.json) : null, thumb: src?.thumb || null };
  pages.splice(currentPage+1, 0, clone);
  currentPage += 1;
  loadPageToCanvas();
  updatePageInfo();
  refreshThumbnails();
  scheduleDraftSave();
}

export function deletePage(){
  if (pages.length <= 1) { alert("Πρέπει να υπάρχει τουλάχιστον 1 σελίδα."); return; }
  pages.splice(currentPage, 1);
  currentPage = clamp(currentPage, 0, pages.length-1);
  loadPageToCanvas();
  updatePageInfo();
  refreshThumbnails();
  scheduleDraftSave();
}

export function nextPage(){
  if (currentPage >= pages.length-1) return;
  goToPage(currentPage+1);
}
export function prevPage(){
  if (currentPage <= 0) return;
  goToPage(currentPage-1);
}

export function goToPage(index){
  if (index < 0 || index >= pages.length) return;
  saveCurrentPage();
  currentPage = index;
  loadPageToCanvas();
  updatePageInfo();
  refreshThumbnails();
  scheduleDraftSave();
}

function clearCanvasForNewPage(){
  fabricCanvas.clear();
  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));
  resetZoom();
  fitToScreen();
}

export function saveCurrentPage(){
  if (!fabricCanvas || !pages[currentPage]) return;
  const json = fabricCanvas.toJSON(["selectable","evented","lockMovementX","lockMovementY","lockScalingX","lockScalingY","lockRotation"]);
  sanitizeJSON(json);
  pages[currentPage].json = json;

  try {
    pages[currentPage].thumb = fabricCanvas.toDataURL({ format:"png", quality:0.6, multiplier:0.15 });
  } catch {
    pages[currentPage].thumb = null;
  }
}

export function loadPageToCanvas(){
  if (!fabricCanvas) return;
  const pg = pages[currentPage];
  if (!pg || !pg.json) {
    clearCanvasForNewPage();
    return;
  }
  _restoring = true;
  const clean = deepClone(pg.json);
  sanitizeJSON(clean);

  fabricCanvas.loadFromJSON(clean, () => {
    fabricCanvas.renderAll();
    _restoring = false;
    resetZoom();
    fitToScreen();
  });
}

export function refreshThumbnails(){
  const strip = $("thumbStrip");
  if (!strip) return;
  strip.innerHTML = "";
  pages.forEach((p,i) => {
    const d = document.createElement("div");
    d.className = "thumb" + (i===currentPage ? " active" : "");
    const img = document.createElement("img");
    img.alt = `page ${i+1}`;
    img.src = p.thumb || "";
    d.appendChild(img);
    d.addEventListener("click", () => goToPage(i));
    strip.appendChild(d);
  });
}

// ---------- Objects ----------
export function addText(opts={}){
  if (!fabricCanvas) return;
  const center = fabricCanvas.getCenter();
  const t = new fabric.Textbox(opts.text || "Text", {
    left: center.left,
    top: center.top,
    originX: "center",
    originY: "center",
    fontSize: Number(opts.fontSize) || 48,
    fontFamily: opts.fontFamily || "Arial",
    fill: opts.fill || "#111111",
    stroke: opts.stroke || null,
    strokeWidth: opts.strokeWidth || 0,
    opacity: (opts.opacity ?? 1)
  });
  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
  refreshThumbnails();
}

export function addImageFromFile(file){
  if (!fabricCanvas || !file) return;
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, (img) => {
      const maxW = fabricCanvas.getWidth()*0.6;
      img.scaleToWidth(maxW);
      const c = fabricCanvas.getCenter();
      img.set({ left: c.left, top: c.top, originX:"center", originY:"center" });
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.requestRenderAll();
      saveCurrentPage();
      refreshThumbnails();
      scheduleDraftSave();
    });
  };
  reader.readAsDataURL(file);
}

export function addRect(){
  if (!fabricCanvas) return;
  const c = fabricCanvas.getCenter();
  const r = new fabric.Rect({ left:c.left, top:c.top, originX:"center", originY:"center", width:280, height:180, fill:"#ef4444" });
  fabricCanvas.add(r); fabricCanvas.setActiveObject(r); fabricCanvas.requestRenderAll();
  saveCurrentPage(); refreshThumbnails();
}
export function addCircle(){
  if (!fabricCanvas) return;
  const c = fabricCanvas.getCenter();
  const o = new fabric.Circle({ left:c.left, top:c.top, originX:"center", originY:"center", radius:90, fill:"#3b82f6" });
  fabricCanvas.add(o); fabricCanvas.setActiveObject(o); fabricCanvas.requestRenderAll();
  saveCurrentPage(); refreshThumbnails();
}
export function addLine(){
  if (!fabricCanvas) return;
  const c = fabricCanvas.getCenter();
  const l = new fabric.Line([c.left-160,c.top,c.left+160,c.top], { stroke:"#111827", strokeWidth:6, selectable:true });
  fabricCanvas.add(l); fabricCanvas.setActiveObject(l); fabricCanvas.requestRenderAll();
  saveCurrentPage(); refreshThumbnails();
}

// ---------- Exports ----------
function downloadDataUrl(dataUrl, filename){
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function exportPNG(){
  if (!fabricCanvas) return;
  saveCurrentPage();
  try {
    const url = fabricCanvas.toDataURL({ format:"png", quality:1.0, multiplier:2 });
    downloadDataUrl(url, `page-${currentPage+1}.png`);
  } catch (e) {
    console.error(e);
    alert("Export PNG απέτυχε (πιθανό tainted canvas).");
  }
}

export function exportJPG(){
  if (!fabricCanvas) return;
  saveCurrentPage();
  try {
    const url = fabricCanvas.toDataURL({ format:"jpeg", quality:0.92, multiplier:2 });
    downloadDataUrl(url, `page-${currentPage+1}.jpg`);
  } catch (e) {
    console.error(e);
    alert("Export JPG απέτυχε (πιθανό tainted canvas).");
  }
}

export function exportPDF(){
  if (!fabricCanvas) return;
  saveCurrentPage();
  if (!window.jspdf?.jsPDF) {
    alert("jsPDF δεν είναι φορτωμένο. Βάλε το CDN στο photobook.html.");
    return;
  }
  const { jsPDF } = window.jspdf;
  // Use page pixel size; convert to points ~ 72dpi
  const W = fabricCanvas.getWidth();
  const H = fabricCanvas.getHeight();
  const pdf = new jsPDF({ orientation: W>H ? "landscape":"portrait", unit:"pt", format:[W, H] });

  pages.forEach((p, idx) => {
    const img = renderPageToDataURL(idx, 2);
    if (idx > 0) pdf.addPage([W,H], W>H ? "landscape":"portrait");
    pdf.addImage(img, "PNG", 0, 0, W, H);
  });

  pdf.save("photobook.pdf");
}

function renderPageToDataURL(index, multiplier=2){
  // Render JSON onto a temp canvas to avoid disturbing current viewport
  const holder = document.createElement("canvas");
  holder.width = fabricCanvas.getWidth();
  holder.height = fabricCanvas.getHeight();
  const temp = new fabric.StaticCanvas(holder, { backgroundColor:"#ffffff" });

  const pg = pages[index];
  if (pg?.json) {
    const clean = deepClone(pg.json);
    sanitizeJSON(clean);
    temp.loadFromJSON(clean, () => temp.renderAll());
  }

  temp.renderAll();
  const url = temp.toDataURL({ format:"png", quality:1, multiplier });
  temp.dispose();
  return url;
}

function buildFlipbookHTML(opts){
  const orientation = opts.orientation || "horizontal";
  const imgs = pages.map((_,i) => renderPageToDataURL(i, 1.6));
  const safeImgs = JSON.stringify(imgs);

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Flipbook</title>
<style>
  body{margin:0;background:#0b0f19;color:#fff;font-family:system-ui}
  .wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .book{position:relative;width:min(1000px,92vw);height:min(700px,86vh);perspective:1800px}
  .page{position:absolute;inset:0;transform-style:preserve-3d;transform-origin:${orientation==="vertical" ? "50% 0%" : "0% 50%"};transition:transform 700ms cubic-bezier(.2,.8,.2,1);box-shadow:0 18px 50px rgba(0,0,0,.35);border-radius:14px;overflow:hidden;background:#111}
  .page img{width:100%;height:100%;object-fit:contain;background:#fff}
  .controls{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);display:flex;gap:10px;background:rgba(0,0,0,.45);backdrop-filter:blur(8px);padding:10px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.15)}
  button{background:#fff;color:#111;border:0;border-radius:999px;padding:8px 12px;font-weight:700;cursor:pointer}
  button:disabled{opacity:.4;cursor:not-allowed}
</style>
</head>
<body>
<div class="wrap">
  <div class="book" id="book"></div>
</div>
<div class="controls">
  <button id="prev">Prev</button>
  <div id="info" style="padding:8px 10px;opacity:.9"></div>
  <button id="next">Next</button>
</div>
<script>
const imgs = ${safeImgs};
const book = document.getElementById('book');
let index = 0;

function render(){
  book.innerHTML='';
  const page = document.createElement('div');
  page.className='page';
  const img = document.createElement('img');
  img.src = imgs[index];
  page.appendChild(img);
  book.appendChild(page);
  document.getElementById('info').textContent = (index+1)+' / '+imgs.length;
  document.getElementById('prev').disabled = index===0;
  document.getElementById('next').disabled = index===imgs.length-1;
}

function animate(dir){
  const page = book.querySelector('.page');
  if (!page) return;
  const rot = ${orientation==="vertical" ? "dir>0 ? 'rotateX(-180deg)' : 'rotateX(180deg)'" : "dir>0 ? 'rotateY(-180deg)' : 'rotateY(180deg)'"};
  page.style.transform = rot;
  setTimeout(() => { index += dir; render(); }, 520);
}

document.getElementById('prev').onclick = () => { if(index>0) animate(-1); };
document.getElementById('next').onclick = () => { if(index<imgs.length-1) animate(1); };

render();
</script>
</body>
</html>`;
}

export function previewFlipbook({ orientation="horizontal" } = {}){
  const modal = $("flipPreviewModal");
  const frame = $("flipPreviewFrame");
  if (!modal || !frame) return;
  const html = buildFlipbookHTML({ orientation });
  frame.srcdoc = html;
  modal.classList.add("open");
}

export function closeFlipbookPreview(){
  const modal = $("flipPreviewModal");
  const frame = $("flipPreviewFrame");
  if (!modal || !frame) return;
  frame.srcdoc = "";
  modal.classList.remove("open");
}

export function exportFlipbook({ orientation="horizontal" } = {}){
  // Download standalone flipbook HTML (user can host on GitHub Pages)
  const html = buildFlipbookHTML({ orientation });
  const blob = new Blob([html], { type:"text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "flipbook.html";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
}

export function copyFlipbookDataLink({ orientation="horizontal" } = {}){
  // Shareable as a *data:* URL (very long). For real sharing, user should host the downloaded flipbook.html.
  const html = buildFlipbookHTML({ orientation });
  const dataUrl = "data:text/html;charset=utf-8," + encodeURIComponent(html);
  navigator.clipboard?.writeText(dataUrl).then(
    () => alert("Αντιγράφηκε link (data URL). Προσοχή: είναι πολύ μεγάλο. Για κανονικό link, κάνε upload το flipbook.html στο GitHub Pages."),
    () => alert("Δεν μπόρεσα να αντιγράψω στο clipboard.")
  );
}

// ---------- Draft save/load ----------
function scheduleDraftSave(){
  if (_autosaveHandle) clearTimeout(_autosaveHandle);
  _autosaveHandle = setTimeout(saveDraft, 700);
}

export function saveDraft(){
  try {
    const payload = {
      currentPage,
      pages: pages.map(p => ({ json: p.json || null }))
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch (e) {
    if (!_quotaWarned && String(e).includes("Quota")) {
      _quotaWarned = true;
      console.warn("Draft quota exceeded; autosave will be disabled.");
      alert("Γέμισε το localStorage (Quota). Απενεργοποιώ το autosave. Κάνε export ή καθάρισε draft.");
    }
  }
}

export function clearDraft(){
  localStorage.removeItem(DRAFT_KEY);
}

export function loadDraft(){
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.pages) && data.pages.length) {
      pages = data.pages.map(p => ({ json: p.json || null, thumb: null }));
      currentPage = clamp(Number(data.currentPage)||0, 0, pages.length-1);
      loadPageToCanvas();
      updatePageInfo();
      refreshThumbnails();
    }
  } catch {}
}
