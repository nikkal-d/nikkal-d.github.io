// js/core.js
// Core engine: Fabric canvas + pages + zoom(viewport) + export flipbook + draft (quota-safe)

export let fabricCanvas = null;

const DRAFT_KEY = "photobook_draft_v2"; // quota-safe (no thumbnails/dataURLs)
export let pages = [];         // [{ json }]
export let currentPage = 0;

let zoom = 1;

// ---------------------------
// Init
// ---------------------------
window.addEventListener("DOMContentLoaded", () => {
  if (typeof fabric === "undefined") {
    console.error("Fabric not loaded");
    return;
  }

  // Create canvas
  fabricCanvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true
  });

  // Default size
  setCanvasSizePreset("A4P");
  resetZoom();

  // First page
  pages = [{ json: null }];
  currentPage = 0;

  bindAutosave();

  // Load draft (if any)
  loadDraft();

  // Render first page
  loadPageToCanvas();

  // Update UI bits
  refreshThumbnails();
  updatePageInfo();

  // Keep thumbnails updated
  ["object:added","object:modified","object:removed"].forEach(ev => {
    fabricCanvas.on(ev, () => {
      saveCurrentPage();
      refreshThumbnails();
      updateLayersList();
    });
  });

  fabricCanvas.on("selection:created", updateLayersList);
  fabricCanvas.on("selection:updated", updateLayersList);
  fabricCanvas.on("selection:cleared", updateLayersList);

  console.log("✅ Canvas initialized");
});

// ---------------------------
// Canvas size presets + custom
// ---------------------------
const PRESETS = {
  A4P: { w: 1240, h: 1754 },
  A4L: { w: 1754, h: 1240 },
  SQUARE: { w: 1400, h: 1400 },
  STORY: { w: 1080, h: 1920 },
  HD: { w: 1920, h: 1080 },
};

export function setCanvasSizePreset(preset) {
  if (!fabricCanvas) return;
  const p = PRESETS[preset];
  if (!p) return;

  fabricCanvas.setWidth(p.w);
  fabricCanvas.setHeight(p.h);
  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.requestRenderAll.bind(fabricCanvas));

  // ensure visible in host
  fitToScreen();
  saveCurrentPage();
  refreshThumbnails();
  updatePageInfo();
}

export function setCanvasCustom(w, h) {
  if (!fabricCanvas) return;
  const W = Math.max(200, Math.min(6000, Number(w)));
  const H = Math.max(200, Math.min(6000, Number(h)));
  fabricCanvas.setWidth(W);
  fabricCanvas.setHeight(H);
  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.requestRenderAll.bind(fabricCanvas));
  fitToScreen();
  saveCurrentPage();
  refreshThumbnails();
  updatePageInfo();
}

export function setCanvasBackground(color) {
  if (!fabricCanvas) return;
  fabricCanvas.setBackgroundColor(color || "#ffffff", fabricCanvas.requestRenderAll.bind(fabricCanvas));
  saveCurrentPage();
  refreshThumbnails();
}

// ---------------------------
// Zoom (viewport transform)
// ---------------------------
export function getZoom() { return zoom; }

export function setZoom(next) {
  if (!fabricCanvas) return;
  zoom = Math.max(0.15, Math.min(4, Number(next) || 1));

  const center = new fabric.Point(fabricCanvas.getWidth()/2, fabricCanvas.getHeight()/2);
  fabricCanvas.zoomToPoint(center, zoom);
  fabricCanvas.requestRenderAll();
}

export function resetZoom() {
  if (!fabricCanvas) return;
  zoom = 1;
  fabricCanvas.setViewportTransform([1,0,0,1,0,0]);
  fabricCanvas.setZoom(1);
  fabricCanvas.requestRenderAll();
}

export function fitToScreen() {
  if (!fabricCanvas) return;
  const host = document.getElementById("canvasHost");
  if (!host) return;

  // reset
  zoom = 1;
  fabricCanvas.setViewportTransform([1,0,0,1,0,0]);
  fabricCanvas.setZoom(1);

  const pad = 28;
  const availW = Math.max(100, host.clientWidth - pad);
  const availH = Math.max(100, host.clientHeight - pad);

  const s = Math.min(availW / fabricCanvas.getWidth(), availH / fabricCanvas.getHeight());
  setZoom(s);

  // Center by shifting viewport
  const vt = fabricCanvas.viewportTransform;
  vt[4] = (availW - fabricCanvas.getWidth() * s) / 2;
  vt[5] = (availH - fabricCanvas.getHeight() * s) / 2;
  fabricCanvas.setViewportTransform(vt);
  fabricCanvas.requestRenderAll();
}

// Ctrl+wheel zoom around pointer
window.addEventListener("wheel", (e) => {
  if (!fabricCanvas) return;
  const overCanvas = e.target && (e.target.id === "canvas" || (e.target.closest && e.target.closest(".canvas-container")));
  if (!overCanvas) return;

  if (!e.ctrlKey) return;
  e.preventDefault();

  const factor = e.deltaY > 0 ? 0.95 : 1.05;
  zoom = Math.max(0.15, Math.min(4, zoom * factor));

  const rect = fabricCanvas.upperCanvasEl.getBoundingClientRect();
  const pt = new fabric.Point(e.clientX - rect.left, e.clientY - rect.top);
  fabricCanvas.zoomToPoint(pt, zoom);
  fabricCanvas.requestRenderAll();
}, { passive:false });

// Space+drag pan
let panMode = false;
let isPanning = false;
let panLast = {x:0,y:0};

document.addEventListener("keydown",(e)=>{ if(e.code==="Space") panMode=true; });
document.addEventListener("keyup",(e)=>{ if(e.code==="Space") panMode=false; });

function bindPan() {
  if (!fabricCanvas) return;
  fabricCanvas.on("mouse:down",(opt)=>{
    if(!panMode) return;
    isPanning=true;
    const ev=opt.e;
    panLast={x:ev.clientX,y:ev.clientY};
  });
  fabricCanvas.on("mouse:move",(opt)=>{
    if(!isPanning) return;
    const ev=opt.e;
    const vpt=fabricCanvas.viewportTransform;
    vpt[4]+=ev.clientX-panLast.x;
    vpt[5]+=ev.clientY-panLast.y;
    fabricCanvas.setViewportTransform(vpt);
    panLast={x:ev.clientX,y:ev.clientY};
  });
  fabricCanvas.on("mouse:up",()=>{ isPanning=false; });
}
bindPan();

// ---------------------------
// Objects
// ---------------------------
export function addText(opts={}) {
  if (!fabricCanvas) return;
  const t = new fabric.Textbox(opts.text ?? "Text", {
    left: fabricCanvas.getWidth()/2,
    top: fabricCanvas.getHeight()/2,
    originX: "center",
    originY: "center",
    fontFamily: opts.fontFamily ?? "Arial",
    fontSize: Number(opts.fontSize ?? 48),
    fill: opts.fill ?? "#111111",
    fontWeight: opts.fontWeight ?? "normal",
    fontStyle: opts.fontStyle ?? "normal",
    underline: !!opts.underline
  });
  // Force safe baseline to avoid browser warning noise
  t.set("textBaseline", "alphabetic");
  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
}

export function addRect() {
  if (!fabricCanvas) return;
  const r = new fabric.Rect({ left:200, top:200, width:260, height:180, fill:"#3b82f6" });
  fabricCanvas.add(r); fabricCanvas.setActiveObject(r);
  fabricCanvas.requestRenderAll(); saveCurrentPage();
}
export function addCircle() {
  if (!fabricCanvas) return;
  const c = new fabric.Circle({ left:240, top:240, radius:90, fill:"#22c55e" });
  fabricCanvas.add(c); fabricCanvas.setActiveObject(c);
  fabricCanvas.requestRenderAll(); saveCurrentPage();
}
export function addLine() {
  if (!fabricCanvas) return;
  const l = new fabric.Line([120,120,520,220], { stroke:"#ef4444", strokeWidth:6 });
  fabricCanvas.add(l); fabricCanvas.setActiveObject(l);
  fabricCanvas.requestRenderAll(); saveCurrentPage();
}

export function addImageFromFile(file) {
  if (!fabricCanvas || !file) return;
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      img.set({ originX:"center", originY:"center" });
      img.scaleToWidth(fabricCanvas.getWidth()*0.5);
      img.left = fabricCanvas.getWidth()/2;
      img.top = fabricCanvas.getHeight()/2;
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.requestRenderAll();
      saveCurrentPage();
      refreshThumbnails();
    }, { crossOrigin: "anonymous" });
  };
  reader.readAsDataURL(file);
}

// ---------------------------
// Pages
// ---------------------------
export function updatePageInfo() {
  const el = document.getElementById("pageInfo");
  if (el) el.textContent = `${currentPage+1} / ${pages.length}`;
}

export function saveCurrentPage() {
  if (!fabricCanvas || !pages[currentPage]) return;
  pages[currentPage].json = fabricCanvas.toJSON();
}

export function loadPageToCanvas() {
  if (!fabricCanvas) return;
  const pg = pages[currentPage];
  fabricCanvas.clear();
  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.requestRenderAll.bind(fabricCanvas));

  if (pg && pg.json) {
    fabricCanvas.loadFromJSON(pg.json, () => {
      fabricCanvas.requestRenderAll();
      updateLayersList();
    });
  } else {
    fabricCanvas.requestRenderAll();
    updateLayersList();
  }
}

export function goToPage(index) {
  if (index < 0 || index >= pages.length) return;
  saveCurrentPage();
  currentPage = index;
  loadPageToCanvas();
  refreshThumbnails();
  updatePageInfo();
  saveDraft();
}

export function nextPage() { goToPage(Math.min(pages.length-1, currentPage+1)); }
export function prevPage() { goToPage(Math.max(0, currentPage-1)); }

export function addPage() {
  saveCurrentPage();
  pages.push({ json: null });
  currentPage = pages.length-1;
  loadPageToCanvas();
  refreshThumbnails();
  updatePageInfo();
  saveDraft();
}

export function duplicatePage() {
  saveCurrentPage();
  const src = pages[currentPage]?.json ? structuredClone(pages[currentPage].json) : null;
  pages.splice(currentPage+1, 0, { json: src });
  currentPage++;
  loadPageToCanvas();
  refreshThumbnails();
  updatePageInfo();
  saveDraft();
}

export function deletePage() {
  if (pages.length <= 1) return alert("Πρέπει να υπάρχει τουλάχιστον 1 σελίδα.");
  pages.splice(currentPage, 1);
  currentPage = Math.max(0, currentPage-1);
  loadPageToCanvas();
  refreshThumbnails();
  updatePageInfo();
  saveDraft();
}

// Thumbnails: render a small PNG per page ON DEMAND (not stored in draft)
export async function refreshThumbnails() {
  const strip = document.getElementById("thumbStrip");
  if (!strip || !fabricCanvas) return;

  strip.innerHTML = "";

  const makeThumb = async (pageIndex) => {
    // render in offscreen static canvas
    const tmpEl = document.createElement("canvas");
    tmpEl.width = 220;
    tmpEl.height = 300;

    const tmp = new fabric.StaticCanvas(tmpEl, { backgroundColor: "#ffffff" });
    const pg = pages[pageIndex];

    if (pg?.json) {
      await new Promise(res => tmp.loadFromJSON(pg.json, () => { tmp.renderAll(); res(); }));
    } else {
      tmp.renderAll();
    }

    // fit inside
    const scale = Math.min(220 / fabricCanvas.getWidth(), 300 / fabricCanvas.getHeight());
    // NOTE: tmp already rendered at original size; use dataURL from tmp without scaling to keep simple
    const url = tmp.toDataURL({ format:"png", quality:0.7 });

    tmp.dispose();
    return url;
  };

  for (let i=0;i<pages.length;i++){
    const d = document.createElement("div");
    d.className = "thumb" + (i===currentPage ? " active" : "");
    const img = document.createElement("img");
    img.alt = `page ${i+1}`;
    img.src = await makeThumb(i);
    d.appendChild(img);
    d.addEventListener("click", () => goToPage(i));
    strip.appendChild(d);
  }
}

// ---------------------------
// Layers (simple list)
// ---------------------------
export function updateLayersList() {
  const list = document.getElementById("layersList");
  if (!list || !fabricCanvas) return;
  list.innerHTML = "";

  const objs = fabricCanvas.getObjects().slice().reverse();
  if (!objs.length) {
    list.innerHTML = `<div class="hint">No layers</div>`;
    return;
  }

  const active = fabricCanvas.getActiveObject();

  objs.forEach((obj, idx) => {
    const row = document.createElement("div");
    row.className = "layerRow" + (obj === active ? " active" : "");
    const name = obj.type === "textbox" ? "Text" : obj.type;
    row.textContent = `${objs.length-idx}. ${name}`;
    row.addEventListener("click", () => {
      fabricCanvas.setActiveObject(obj);
      fabricCanvas.requestRenderAll();
      updateLayersList();
    });
    list.appendChild(row);
  });
}

export function bringForward() {
  const obj = fabricCanvas?.getActiveObject();
  if (!obj) return;
  fabricCanvas.bringForward(obj);
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
  updateLayersList();
}
export function sendBackwards() {
  const obj = fabricCanvas?.getActiveObject();
  if (!obj) return;
  fabricCanvas.sendBackwards(obj);
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
  updateLayersList();
}
export function deleteActive() {
  const obj = fabricCanvas?.getActiveObject();
  if (!obj) return;
  fabricCanvas.remove(obj);
  fabricCanvas.discardActiveObject();
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
  updateLayersList();
}

// ---------------------------
// Draft (quota-safe)
// ---------------------------
function bindAutosave() {
  setInterval(() => saveDraft(), 2500);
}

export function saveDraft() {
  try {
    saveCurrentPage();
    const payload = {
      pages,
      currentPage,
      size: { w: fabricCanvas?.getWidth() ?? 1240, h: fabricCanvas?.getHeight() ?? 1754 }
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch (e) {
    // quota exceeded -> keep app running, just stop saving
    console.warn("Draft not saved (quota?)", e?.message || e);
  }
}

export function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.pages) && data.pages.length) pages = data.pages;
    if (typeof data.currentPage === "number") currentPage = Math.max(0, Math.min(data.currentPage, pages.length-1));
    if (data.size && typeof data.size.w === "number" && typeof data.size.h === "number" && fabricCanvas) {
      fabricCanvas.setWidth(data.size.w);
      fabricCanvas.setHeight(data.size.h);
      fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.requestRenderAll.bind(fabricCanvas));
      fitToScreen();
    }
  } catch (e) {
    console.warn("Draft load failed", e?.message || e);
  }
}

// ---------------------------
// Export: Flipbook (HTML) + Preview
// ---------------------------
async function pagesToImages() {
  // Render each page as image at current canvas size
  const imgs = [];
  for (let i=0;i<pages.length;i++){
    const tmpEl = document.createElement("canvas");
    tmpEl.width = fabricCanvas.getWidth();
    tmpEl.height = fabricCanvas.getHeight();

    const tmp = new fabric.StaticCanvas(tmpEl, { backgroundColor: "#ffffff" });
    const pg = pages[i];
    if (pg?.json) {
      await new Promise(res => tmp.loadFromJSON(pg.json, () => { tmp.renderAll(); res(); }));
    } else {
      tmp.renderAll();
    }
    imgs.push(tmp.toDataURL({ format:"png", quality:0.92 }));
    tmp.dispose();
  }
  return imgs;
}

function buildFlipbookHTML(images, opts) {
  const dir = opts?.direction === "vertical" ? "vertical" : "horizontal";
  const title = opts?.title || "Photobook Flipbook";
  const w = opts?.w || 900;
  const h = opts?.h || 600;

  // minimal flip engine (no libs)
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(title)}</title>
<style>
  :root{--bg:#0b1020;--card:#0f172a;--line:rgba(255,255,255,.12);--txt:#e5e7eb}
  body{margin:0;background:var(--bg);color:var(--txt);font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial}
  header{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--line);background:rgba(0,0,0,.25);backdrop-filter:blur(10px)}
  .btn{appearance:none;border:1px solid var(--line);background:rgba(255,255,255,.06);color:var(--txt);padding:10px 12px;border-radius:12px;cursor:pointer}
  .wrap{display:flex;align-items:center;justify-content:center;min-height:calc(100vh - 60px);padding:18px}
  .book{width:min(${w}px,94vw);height:min(${h}px,82vh);position:relative;perspective:1800px}
  .page{position:absolute;inset:0;border-radius:16px;overflow:hidden;background:#111;border:1px solid var(--line);box-shadow:0 10px 30px rgba(0,0,0,.45);transform-style:preserve-3d}
  .page img{width:100%;height:100%;object-fit:contain;background:#fff}
  .page .front,.page .back{position:absolute;inset:0;backface-visibility:hidden}
  .page .back{transform:rotateY(180deg)}
  /* flip axes */
  .page.flipH{transform-origin:left center}
  .page.flippedH{transform:rotateY(-180deg)}
  .page.flipV{transform-origin:center top}
  .page.flippedV{transform:rotateX(180deg)}
  .page.flipV .back{transform:rotateX(180deg)}
  .page .badge{position:absolute;left:12px;top:12px;padding:6px 10px;border-radius:999px;background:rgba(0,0,0,.55);border:1px solid var(--line);font-size:12px}
</style>
</head>
<body>
<header>
  <div style="font-weight:800">${escapeHtml(title)}</div>
  <div style="display:flex;gap:10px;align-items:center">
    <button class="btn" id="prevBtn">Prev</button>
    <div id="counter" style="opacity:.9"></div>
    <button class="btn" id="nextBtn">Next</button>
  </div>
</header>

<div class="wrap">
  <div class="book" id="book"></div>
</div>

<script>
const IMAGES = ${JSON.stringify(images)};
const dir = ${JSON.stringify(dir)};
const book = document.getElementById('book');
let idx = 0;

function makePage(src, n){
  const p = document.createElement('div');
  p.className = 'page ' + (dir==='vertical'?'flipV':'flipH');
  p.style.zIndex = String(1000 - n);

  const front = document.createElement('div');
  front.className='front';
  const img = document.createElement('img');
  img.src = src;
  front.appendChild(img);

  const badge = document.createElement('div');
  badge.className='badge';
  badge.textContent = (n+1) + ' / ' + IMAGES.length;
  front.appendChild(badge);

  p.appendChild(front);
  return p;
}

function render(){
  book.innerHTML='';
  // show current page only (simple) with flip animation between pages
  const p = makePage(IMAGES[idx], idx);
  book.appendChild(p);
  document.getElementById('counter').textContent = (idx+1) + ' / ' + IMAGES.length;
}

function go(next){
  const old = book.querySelector('.page');
  if(!old){ idx = next; render(); return; }
  old.classList.add(dir==='vertical'?'flippedV':'flippedH');
  // after animation, swap
  setTimeout(()=>{
    idx = next;
    render();
  }, 420);
}

document.getElementById('prevBtn').onclick = ()=>{
  if(idx<=0) return;
  go(idx-1);
};
document.getElementById('nextBtn').onclick = ()=>{
  if(idx>=IMAGES.length-1) return;
  go(idx+1);
};

render();
</script>
</body>
</html>`;
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

// Export flipbook HTML file (download)
export async function exportFlipbook(options={}) {
  const images = await pagesToImages();
  const html = buildFlipbookHTML(images, options);
  const blob = new Blob([html], { type:"text/html" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "flipbook.html";
  document.body.appendChild(a);
  a.click();
  a.remove();

  // small delay then revoke
  setTimeout(()=>URL.revokeObjectURL(url), 4000);
  return { url, html };
}

// Preview flipbook inside modal iframe (no black screen, uses srcdoc)
export async function previewFlipbook(options={}) {
  const images = await pagesToImages();
  const html = buildFlipbookHTML(images, options);
  return { html };
}

// Link export (best-effort): creates a sharable "data link" (may be long) in URL hash.
// Works best for small projects.
export function makeFlipbookLink(options={}) {
  // store flipbook HTML in a compressed-ish base64 (no compression lib, so keep plain)
  // NOTE: can get large; still useful for short demos.
  const payload = { type:"flipbook", options, pages };
  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return `${location.origin}${location.pathname.replace(/[^/]+$/,'')}viewer.html#pb=${b64}`;
}
