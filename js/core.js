// js/core.js
// Photobook core: Fabric canvas + pages + zoom/fit + export flipbook
// Uses global `fabric` from <script src="...fabric.min.js"></script>

export let fabricCanvas = null;

let pages = [];          // each page: { json }
let currentPage = 0;

let zoom = 1;
let isRestoring = false;

const DRAFT_KEY = "photobook_draft_v2";
let autosaveEnabled = true;
let warnedQuota = false;

// ---------- helpers ----------
function ensureFabric() {
  if (typeof window.fabric === "undefined") {
    throw new Error("Fabric not loaded. Ensure fabric.min.js is included BEFORE core.js.");
  }
}

function getHost() {
  return document.getElementById("canvasHost");
}

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

export function getZoom(){ return zoom; }
export function getPages(){ return pages; }
export function getCurrentPage(){ return currentPage; }

function blankPageJSON() {
  // A minimal Fabric JSON for an empty page
  return {
    version: window.fabric?.version || "5",
    objects: [],
    background: "#ffffff",
    backgroundColor: "#ffffff"
  };
}

function sanitizeBaseline(obj){
  // Fix any legacy/invalid values that trigger browser warnings.
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) { obj.forEach(sanitizeBaseline); return; }
  // Some old drafts have "alphabetical" (invalid). Use "alphabetic".
  if (obj.textBaseline === "alphabetical") obj.textBaseline = "alphabetic";
  // Fabric sometimes stores it under styles
  for (const k of Object.keys(obj)) sanitizeBaseline(obj[k]);
}

// Patch defaults so NEW text objects don't carry invalid baseline.
function patchFabricDefaults(){
  try{
    const f = window.fabric;
    if (f?.Text?.prototype) f.Text.prototype.textBaseline = "alphabetic";
    if (f?.IText?.prototype) f.IText.prototype.textBaseline = "alphabetic";
    if (f?.Textbox?.prototype) f.Textbox.prototype.textBaseline = "alphabetic";
  } catch {}
}

// ---------- init ----------
export function initCanvas() {
  ensureFabric();
  patchFabricDefaults();

  const el = document.getElementById("canvas");
  if (!el) throw new Error("Missing <canvas id='canvas'>");
  if (fabricCanvas) return fabricCanvas;

  fabricCanvas = new window.fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true
  }
setTimeout(fitCanvasToScreen, 0);
window.addEventListener("resize", fitCanvasToScreen);
);

  // Default page
  pages = [ { json: blankPageJSON() } ];
  currentPage = 0;

  // Apply initial size preset (A4 Portrait)
  setPageSizePreset("A4P");

  // Bind changes -> update page json + optional autosave
  ["object:added","object:modified","object:removed"].forEach(ev=>{
    fabricCanvas.on(ev, ()=>{
      if (isRestoring) return;
      saveCurrentPage();
      // Best-effort autosave; don't crash on quota.
      if (autosaveEnabled) saveDraft();
    });
  });

  // Mouse wheel zoom with Ctrl
  fabricCanvas.on("mouse:wheel", (opt) => {
    const e = opt.e;
    if (!e.ctrlKey) return;
    e.preventDefault();
    e.stopPropagation();
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    setZoom(zoom * factor, new window.fabric.Point(e.offsetX, e.offsetY));
  });

  // Load draft if exists (best-effort)
  loadDraft();

  // Render first page content
  renderPage(currentPage);

  console.log("✅ Canvas initialized");
  return fabricCanvas;
}

// ---------- sizing / fit / zoom ----------
const PRESETS = {
  A4P: { w: 1240, h: 1754 },
  A4L: { w: 1754, h: 1240 },
  SQUARE: { w: 1400, h: 1400 },
  STORY: { w: 1080, h: 1920 },
  HD: { w: 1920, h: 1080 }
};

export function setPageSizePreset(presetKey){
  const p = PRESETS[presetKey];
  if (!p || !fabricCanvas) return;
  setCanvasSize(p.w, p.h);
}

export function setCanvasSize(w, h){
  if (!fabricCanvas) return;
  const W = clamp(Number(w)||1240, 200, 4000);
  const H = clamp(Number(h)||1754, 200, 4000);
  fabricCanvas.setWidth(W);
  fabricCanvas.setHeight(H);
  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));
  // Keep current page content, just re-fit view
  fitToHost();
  saveCurrentPage();
  if (autosaveEnabled) saveDraft();
}

export function fitToHost(){
  if (!fabricCanvas) return;
  const host = getHost();
  if (!host) return;

  const pad = 32;
  const availW = Math.max(50, host.clientWidth - pad);
  const availH = Math.max(50, host.clientHeight - pad);

  // Compute zoom that fits canvas into host
  const s = Math.min(availW / fabricCanvas.getWidth(), availH / fabricCanvas.getHeight());
  zoom = clamp(s, 0.05, 4);

  // Reset viewport then apply centered zoom
  fabricCanvas.setViewportTransform([1,0,0,1,0,0]);
  const center = new window.fabric.Point(fabricCanvas.getWidth()/2, fabricCanvas.getHeight()/2);
  fabricCanvas.zoomToPoint(center, zoom);

  // Center inside host by translating viewport
  const vpt = fabricCanvas.viewportTransform;
  const contentW = fabricCanvas.getWidth() * zoom;
  const contentH = fabricCanvas.getHeight() * zoom;
  vpt[4] = (availW - contentW) / 2 + pad/2;
  vpt[5] = (availH - contentH) / 2 + pad/2;
  fabricCanvas.setViewportTransform(vpt);
  fabricCanvas.requestRenderAll();
}

export function setZoom(nextZoom, point=null){
  if (!fabricCanvas) return;
  const nz = clamp(Number(nextZoom)||1, 0.1, 4);
  zoom = nz;

  const pt = point || new window.fabric.Point(
    fabricCanvas.getWidth()/2,
    fabricCanvas.getHeight()/2
  );

  fabricCanvas.zoomToPoint(pt, zoom);

  // Keep it centered in host after zoom
  const host = getHost();
  if (host){
    const pad = 32;
    const availW = Math.max(50, host.clientWidth - pad);
    const availH = Math.max(50, host.clientHeight - pad);
    const vpt = fabricCanvas.viewportTransform;
    const contentW = fabricCanvas.getWidth() * zoom;
    const contentH = fabricCanvas.getHeight() * zoom;
    // If content smaller than host, keep centered; otherwise keep current pan
    if (contentW <= availW) vpt[4] = (availW - contentW)/2 + pad/2;
    if (contentH <= availH) vpt[5] = (availH - contentH)/2 + pad/2;
    fabricCanvas.setViewportTransform(vpt);
  }

  fabricCanvas.requestRenderAll();
}

export function resetZoom(){
  zoom = 1;
  if (!fabricCanvas) return;
  fabricCanvas.setViewportTransform([1,0,0,1,0,0]);
  fitToHost();
}

// ---------- objects ----------
export function addText(opts={}){
  if (!fabricCanvas) return;
  const f = window.fabric;
  const t = new f.Textbox(opts.text || "Text", {
    left: fabricCanvas.getWidth()/2,
    top: fabricCanvas.getHeight()/2,
    originX: "center",
    originY: "center",
    fontSize: opts.fontSize || 48,
    fill: opts.fill || "#111",
    fontFamily: opts.fontFamily || "Arial",
    textBaseline: "alphabetic"
  });
  // extra safety
  t.textBaseline = "alphabetic";
  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
}

export function addRect(){
  if (!fabricCanvas) return;
  const f = window.fabric;
  const r = new f.Rect({
    left: fabricCanvas.getWidth()/2,
    top: fabricCanvas.getHeight()/2,
    originX:"center", originY:"center",
    width: 260, height: 180,
    fill: "#ff0000"
  });
  fabricCanvas.add(r);
  fabricCanvas.setActiveObject(r);
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
}
export function addCircle(){
  if (!fabricCanvas) return;
  const f = window.fabric;
  const c = new f.Circle({
    left: fabricCanvas.getWidth()/2,
    top: fabricCanvas.getHeight()/2,
    originX:"center", originY:"center",
    radius: 90,
    fill: "#ff0000"
  });
  fabricCanvas.add(c);
  fabricCanvas.setActiveObject(c);
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
}
export function addLine(){
  if (!fabricCanvas) return;
  const f = window.fabric;
  const line = new f.Line([0,0,260,0], {
    left: fabricCanvas.getWidth()/2,
    top: fabricCanvas.getHeight()/2,
    originX:"center", originY:"center",
    stroke: "#111",
    strokeWidth: 6
  });
  fabricCanvas.add(line);
  fabricCanvas.setActiveObject(line);
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
}

export function addImageFromFile(file){
  if (!fabricCanvas || !file) return;
  const reader = new FileReader();
  reader.onload = () => {
    window.fabric.Image.fromURL(reader.result, (img) => {
      img.set({
        left: fabricCanvas.getWidth()/2,
        top: fabricCanvas.getHeight()/2,
        originX:"center",
        originY:"center"
      });
      const maxW = fabricCanvas.getWidth() * 0.7;
      if (img.width) img.scaleToWidth(maxW);
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.requestRenderAll();
      saveCurrentPage();
    }, { crossOrigin: "anonymous" });
  };
  reader.readAsDataURL(file);
}

// ---------- pages ----------
export function addPage(){
  if (!fabricCanvas) return;
  saveCurrentPage();
  pages.push({ json: blankPageJSON() });
  currentPage = pages.length - 1;
  renderPage(currentPage);
  updatePageUI();
  if (autosaveEnabled) saveDraft();
}

export function duplicatePage(){
  if (!fabricCanvas) return;
  saveCurrentPage();
  const src = pages[currentPage]?.json ? structuredClone(pages[currentPage].json) : blankPageJSON();
  pages.splice(currentPage+1, 0, { json: src });
  currentPage++;
  renderPage(currentPage);
  updatePageUI();
  if (autosaveEnabled) saveDraft();
}

export function deletePage(){
  if (pages.length <= 1) return;
  pages.splice(currentPage, 1);
  currentPage = clamp(currentPage, 0, pages.length-1);
  renderPage(currentPage);
  updatePageUI();
  if (autosaveEnabled) saveDraft();
}

export function goToPage(index){
  if (!fabricCanvas) return;
  const i = Number(index);
  if (!Number.isFinite(i) || i < 0 || i >= pages.length) return;
  saveCurrentPage();
  currentPage = i;
  renderPage(currentPage);
  updatePageUI();
  if (autosaveEnabled) saveDraft();
}

export function nextPage(){ goToPage(currentPage+1); }
export function prevPage(){ goToPage(currentPage-1); }

function renderPage(index){
  const pg = pages[index];
  const json = pg?.json || blankPageJSON();
  sanitizeBaseline(json);

  isRestoring = true;
  fabricCanvas.clear();
  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));

  fabricCanvas.loadFromJSON(json, () => {
    // Force baseline fix on loaded text objects
    fabricCanvas.getObjects().forEach(o => {
      if (o && typeof o === "object" && "textBaseline" in o) {
        if (o.textBaseline === "alphabetical") o.textBaseline = "alphabetic";
        if (!o.textBaseline) o.textBaseline = "alphabetic";
      }
    });
    fabricCanvas.requestRenderAll();
    isRestoring = false;
    fitToHost();
  });
}

export function saveCurrentPage(){
  if (!fabricCanvas) return;
  const json = fabricCanvas.toJSON(["selectable","evented"]);
  json.backgroundColor = fabricCanvas.backgroundColor || "#ffffff";
  sanitizeBaseline(json);
  pages[currentPage].json = json;
  updateThumbnails();
}

function updatePageUI(){
  const pageInfo = document.getElementById("pageInfo");
  if (pageInfo) pageInfo.textContent = `${currentPage+1} / ${pages.length}`;
  updateThumbnails();
}

function updateThumbnails(){
  const strip = document.getElementById("thumbStrip");
  if (!strip || !fabricCanvas) return;
  strip.innerHTML = "";
  pages.forEach((p, idx) => {
    const d = document.createElement("div");
    d.className = "thumb" + (idx===currentPage ? " active" : "");
    const img = document.createElement("img");
    // Render a small thumbnail from page json (avoid storing in localStorage)
    img.alt = `page ${idx+1}`;
    img.loading = "lazy";
    d.appendChild(img);
    d.addEventListener("click", () => goToPage(idx));
    strip.appendChild(d);

    // Async render thumbnail
    try{
      const tmp = document.createElement("canvas");
      tmp.width = 180; tmp.height = 240;
      const c = new window.fabric.StaticCanvas(tmp, { backgroundColor:"#fff" });
      const pj = structuredClone(p.json || blankPageJSON());
      sanitizeBaseline(pj);
      c.loadFromJSON(pj, () => {
        const s = Math.min(tmp.width / c.getWidth(), tmp.height / c.getHeight());
        c.setViewportTransform([s,0,0,s,0,0]);
        c.renderAll();
        img.src = tmp.toDataURL("image/png");
        c.dispose();
      });
    } catch {}
  });
}

// ---------- draft (localStorage) ----------
export function clearDraft(){
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

export function saveDraft(){
  if (!autosaveEnabled) return;
  try{
    // DO NOT store thumbnails; store only json + currentPage + size
    const payload = {
      pages: pages.map(p => ({ json: p.json })),
      currentPage,
      size: { w: fabricCanvas.getWidth(), h: fabricCanvas.getHeight() }
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch (e){
    if (!warnedQuota && String(e).includes("QuotaExceeded")) {
      warnedQuota = true;
      autosaveEnabled = false;
      console.warn("⚠️ Draft autosave disabled (localStorage quota exceeded). Use Clear Draft or export.");
    }
  }
}

export function loadDraft(){
  try{
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.pages) && data.pages.length){
      pages = data.pages.map(p => ({ json: p?.json || blankPageJSON() }));
      currentPage = clamp(Number(data.currentPage)||0, 0, pages.length-1);
      if (data.size?.w && data.size?.h && fabricCanvas){
        fabricCanvas.setWidth(clamp(data.size.w, 200, 4000));
        fabricCanvas.setHeight(clamp(data.size.h, 200, 4000));
      }
    }
  } catch {}
}

// ---------- flipbook export / preview ----------
function snapshotAllPages(){
  // returns array of data URLs (PNG) in page order
  const out = [];
  const tmpCanvasEl = document.createElement("canvas");
  const tmp = new window.fabric.StaticCanvas(tmpCanvasEl, { backgroundColor:"#fff" });

  for (let i=0;i<pages.length;i++){
    const pj = structuredClone(pages[i].json || blankPageJSON());
    sanitizeBaseline(pj);
    tmp.clear();
    tmp.setBackgroundColor("#ffffff", tmp.renderAll.bind(tmp));
    tmp.setWidth(fabricCanvas.getWidth());
    tmp.setHeight(fabricCanvas.getHeight());
    tmp.loadFromJSON(pj, () => {});
    // loadFromJSON is async; fabric staticcanvas doesn't block. We'll do a sync-ish wait by rendering in callback:
  }
  // Because loadFromJSON is async, do proper async sequence:
  tmp.dispose();
  return out;
}

async function renderPageToDataURL(pageJson, w, h){
  return await new Promise((resolve) => {
    const el = document.createElement("canvas");
    const c = new window.fabric.StaticCanvas(el, { backgroundColor:"#fff" });
    c.setWidth(w); c.setHeight(h);
    const pj = structuredClone(pageJson || blankPageJSON());
    sanitizeBaseline(pj);
    c.loadFromJSON(pj, () => {
      c.renderAll();
      const url = c.toDataURL({ format:"png", quality: 0.92 });
      c.dispose();
      resolve(url);
    });
  });
}

export async function buildFlipbookHTML(options={}){
  const w = fabricCanvas.getWidth();
  const h = fabricCanvas.getHeight();
  const imgs = [];
  for (let i=0;i<pages.length;i++){
    imgs.push(await renderPageToDataURL(pages[i].json, w, h));
  }

  const direction = options.direction || "horizontal"; // horizontal|vertical
  const title = options.title || "Flipbook";

  // Self-contained flipbook (no external libs)
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<style>
  html,body{height:100%;margin:0;background:#0b0f17;color:#e5e7eb;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial}
  .wrap{height:100%;display:flex;flex-direction:column}
  .bar{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:10px 12px;background:rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.12)}
  .btn{cursor:pointer;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:inherit;border-radius:10px;padding:8px 10px}
  .btn:active{transform:translateY(1px)}
  .stage{flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden}
  .book{position:relative; width:min(90vw, ${w}px); height:min(84vh, ${h}px); perspective:1600px;}
  .sheet{position:absolute; inset:0; transform-style:preserve-3d; transition:transform 650ms cubic-bezier(.2,.8,.2,1); }
  .sheet img{position:absolute; inset:0; width:100%; height:100%; object-fit:contain; background:white; border-radius:10px; box-shadow:0 18px 60px rgba(0,0,0,.55)}
  .sheet.turnH{transform:rotateY(-180deg);}
  .sheet.turnV{transform:rotateX(180deg);}
  .counter{opacity:.85;font-size:13px}
</style>
</head>
<body>
<div class="wrap">
  <div class="bar">
    <div style="display:flex;gap:10px;align-items:center">
      <button class="btn" id="prevBtn">Prev</button>
      <button class="btn" id="nextBtn">Next</button>
      <span class="counter" id="counter"></span>
    </div>
    <div style="display:flex;gap:10px;align-items:center">
      <label style="display:flex;gap:8px;align-items:center" class="counter">
        Turn:
        <select id="dirSel" class="btn" style="padding:6px 10px">
          <option value="horizontal">Horizontal</option>
          <option value="vertical">Vertical</option>
        </select>
      </label>
      <button class="btn" id="downloadBtn">Download HTML</button>
    </div>
  </div>
  <div class="stage">
    <div class="book" id="book"></div>
  </div>
</div>

<script>
  const IMAGES = ${json.dumps(imgs)};
  let idx = 0;
  let dir = ${json.dumps(direction)};
  const book = document.getElementById('book');

  function render(){
    book.innerHTML = '';
    const sheet = document.createElement('div');
    sheet.className = 'sheet';
    const img = document.createElement('img');
    img.src = IMAGES[idx];
    sheet.appendChild(img);
    book.appendChild(sheet);
    document.getElementById('counter').textContent = (idx+1) + ' / ' + IMAGES.length;
    document.getElementById('dirSel').value = dir;
  }

  function turn(next){
    if (next < 0 || next >= IMAGES.length) return;
    const sheet = book.querySelector('.sheet');
    if (!sheet) { idx = next; render(); return; }
    sheet.classList.add(dir === 'vertical' ? 'turnV' : 'turnH');
    setTimeout(()=>{ idx = next; render(); }, 520);
  }

  document.getElementById('prevBtn').onclick = () => turn(idx-1);
  document.getElementById('nextBtn').onclick = () => turn(idx+1);
  document.getElementById('dirSel').onchange = (e)=>{ dir = e.target.value; };
  document.addEventListener('keydown', (e)=>{
    if (e.key === 'ArrowLeft') turn(idx-1);
    if (e.key === 'ArrowRight') turn(idx+1);
  });

  document.getElementById('downloadBtn').onclick = () => {
    const html = document.documentElement.outerHTML;
    const blob = new Blob([html], {type:'text/html'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'flipbook.html';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 3000);
  };

  render();
</script>
</body>
</html>`;
}

export async function previewFlipbook(direction="horizontal"){
  const html = await buildFlipbookHTML({ direction });
  const modal = document.getElementById("flipPreviewModal");
  const frame = document.getElementById("flipPreviewFrame");
  if (frame) {
    // use srcdoc to avoid blob URL restrictions
    frame.srcdoc = html;
  }
  if (modal) modal.classList.add("open");
}

export function closeFlipPreview(){
  const modal = document.getElementById("flipPreviewModal");
  const frame = document.getElementById("flipPreviewFrame");
  if (frame) frame.srcdoc = "";
  if (modal) modal.classList.remove("open");
}

export async function exportFlipbookHTML(direction="horizontal"){
  const html = await buildFlipbookHTML({ direction });
  const blob = new Blob([html], {type:"text/html"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "flipbook.html";
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 3000);
}

export async function exportFlipbookLink(direction="horizontal"){
  // Creates a shareable *text* you can paste: instructions + downloadable HTML.
  // Without a backend we cannot create a permanent public URL automatically.
  const html = await buildFlipbookHTML({ direction });
  const b64 = btoa(unescape(encodeURIComponent(html)));
  const dataUrl = "data:text/html;base64," + b64;
  try{
    await navigator.clipboard.writeText(dataUrl);
    alert("Copied: data: link (paste in browser address bar to open). For real sharing, download flipbook.html and upload it to your hosting.");
  } catch {
    prompt("Copy this link:", dataUrl);
  }
}
// === CANVAS FIT / ZOOM SYSTEM ===
let currentZoom = 1;

export function fitCanvasToScreen() {
  const host = document.getElementById("canvasHost");
  if (!host || !canvas) return;

  const padding = 40;
  const scaleX = (host.clientWidth - padding) / canvas.getWidth();
  const scaleY = (host.clientHeight - padding) / canvas.getHeight();

  currentZoom = Math.min(scaleX, scaleY, 1);

  canvas.setZoom(currentZoom);
  canvas.setViewportTransform([currentZoom, 0, 0, currentZoom, 0, 0]);
  canvas.requestRenderAll();

  updateZoomLabel();
}

export function zoomCanvas(delta) {
  currentZoom = Math.max(0.1, Math.min(3, currentZoom + delta));
  canvas.setZoom(currentZoom);
  canvas.requestRenderAll();
  updateZoomLabel();
}

function updateZoomLabel() {
  const el = document.getElementById("zoomValue");
  if (el) el.textContent = Math.round(currentZoom * 100) + "%";
}

