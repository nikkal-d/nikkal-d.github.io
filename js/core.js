// js/core.js
// Fabric core: canvas, zoom (viewport), pages, sizes, flipbook export+preview, safe draft save.

export let fabricCanvas = null;

// -------------------- page state --------------------
let pages = []; // each: { json: object }
let currentPage = 0;

// -------------------- zoom state --------------------
let zoom = 1;

// Draft storage key (JSON only)
const DRAFT_KEY = "photobook_draft_v2_jsononly";

// -------------------- helpers --------------------
function ensureFabric() {
  if (!window.fabric) throw new Error("Fabric not loaded. Check fabric.min.js <script> tag.");
}

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function deepSanitizeTextBaseline(obj){
  // Fix legacy bad value "alphabetical" -> "alphabetic"
  const walk = (n) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    for (const k of Object.keys(n)) {
      if (k === "textBaseline" && n[k] === "alphabetical") n[k] = "alphabetic";
      walk(n[k]);
    }
  };
  walk(obj);
  return obj;
}

function getCanvasCenter(){
  const w = fabricCanvas.getWidth();
  const h = fabricCanvas.getHeight();
  return new fabric.Point(w/2, h/2);
}

function getViewportCenter(){
  // returns point in *canvas coords* corresponding to center of current viewport
  const vpt = fabricCanvas.viewportTransform;
  const inv = fabric.util.invertTransform(vpt);
  const cx = fabricCanvas.getWidth()/2;
  const cy = fabricCanvas.getHeight()/2;
  const p = fabric.util.transformPoint(new fabric.Point(cx, cy), inv);
  return { x: p.x, y: p.y };
}

// -------------------- init --------------------
export function initCanvas(){
  ensureFabric();
  const el = document.getElementById("canvas");
  if (!el) return;

  fabricCanvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true,
  });

  // default A4 portrait
  setPageSize("A4P");

  // initial page
  pages = [{ json: null }];
  currentPage = 0;
  updatePageInfo();

  bindCanvasEvents();
  loadDraftSafe();

  fitToHost();
  window.addEventListener("resize", () => fitToHost());

  console.log("✅ Canvas initialized");
}

function bindCanvasEvents(){
  if (!fabricCanvas) return;

  const markDirty = () => {
    saveCurrentPage();
    refreshThumbnails();
    safeSaveDraft();
  };

  ["object:added","object:modified","object:removed"].forEach(ev=>{
    fabricCanvas.on(ev, () => markDirty());
  });

  fabricCanvas.on("selection:created", refreshLayers);
  fabricCanvas.on("selection:updated", refreshLayers);
  fabricCanvas.on("selection:cleared", refreshLayers);
}

// -------------------- zoom (viewport) --------------------
export function getZoom(){ return zoom; }

export function setZoom(z){
  if (!fabricCanvas) return;
  zoom = clamp(Number(z) || 1, 0.2, 4);
  const center = getCanvasCenter(); // zoom around canvas center
  fabricCanvas.zoomToPoint(center, zoom);
  fitToHost(false); // only recenter wrapper/padding
  updateZoomLabel();
}

export function zoomIn(){ setZoom(zoom + 0.1); }
export function zoomOut(){ setZoom(zoom - 0.1); }
export function resetZoom(){
  zoom = 1;
  if (!fabricCanvas) return;
  fabricCanvas.setViewportTransform([1,0,0,1,0,0]);
  fabricCanvas.setZoom(1);
  fitToHost(true);
  updateZoomLabel();
}

function updateZoomLabel(){
  const el = document.getElementById("zoomValue");
  if (el) el.textContent = Math.round(zoom*100) + "%";
}

export function fitToHost(resetVpt=true){
  const host = document.getElementById("canvasHost");
  const frame = document.getElementById("canvasFrame");
  if (!host || !frame || !fabricCanvas) return;

  // Keep page always visible: compute scale to fit frame area
  const pad = 40; // matches css padding-ish
  const availW = host.clientWidth - pad;
  const availH = host.clientHeight - pad;

  const cw = fabricCanvas.getWidth();
  const ch = fabricCanvas.getHeight();

  if (resetVpt){
    // reset to identity before calculating
    fabricCanvas.setViewportTransform([1,0,0,1,0,0]);
    zoom = 1;
  }

  const scaleFit = clamp(Math.min(availW/cw, availH/ch), 0.05, 1);
  // set zoom to fit *page* on screen but keep user zoom if already smaller
  if (resetVpt) zoom = scaleFit;
  // apply zoom around center
  fabricCanvas.zoomToPoint(getCanvasCenter(), zoom);

  // center in host by translating viewport
  const vt = fabricCanvas.viewportTransform;
  const scaledW = cw * zoom;
  const scaledH = ch * zoom;
  vt[4] = (availW - scaledW)/2;
  vt[5] = (availH - scaledH)/2;
  fabricCanvas.setViewportTransform(vt);

  fabricCanvas.requestRenderAll();
  updateZoomLabel();
}

// -------------------- sizes --------------------
const PRESETS = {
  A4P: { w: 1240, h: 1754 },
  A4L: { w: 1754, h: 1240 },
  SQUARE: { w: 1400, h: 1400 },
  STORY: { w: 1080, h: 1920 },
  HD: { w: 1920, h: 1080 },
};

export function setPageSize(preset){
  if (!fabricCanvas) return;
  const p = PRESETS[preset];
  if (!p) return;
  fabricCanvas.setWidth(p.w);
  fabricCanvas.setHeight(p.h);
  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));
  // after resizing, reload current page content (Fabric clears some internals)
  renderPage();
  fitToHost(true);
  refreshThumbnails();
  safeSaveDraft();
}

export function setCustomSize(w,h){
  if (!fabricCanvas) return;
  const W = clamp(Number(w)||1240, 200, 4000);
  const H = clamp(Number(h)||1754, 200, 4000);
  fabricCanvas.setWidth(W);
  fabricCanvas.setHeight(H);
  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));
  renderPage();
  fitToHost(true);
  refreshThumbnails();
  safeSaveDraft();
}

// -------------------- add objects --------------------
export function addText(opts={}){
  if (!fabricCanvas) return;
  ensureFabric();
  const { x, y } = getViewportCenter();

  const t = new fabric.Textbox(opts.text ?? "Text", {
    left: x,
    top: y,
    originX: "center",
    originY: "center",
    fontSize: opts.fontSize ?? 48,
    fontFamily: opts.fontFamily ?? "Arial",
    fill: opts.fill ?? "#111111",
    stroke: opts.stroke ?? null,
    strokeWidth: opts.strokeWidth ?? 0,
    opacity: opts.opacity ?? 1,
    // IMPORTANT: do NOT set "alphabetical" anywhere
    textBaseline: "alphabetic",
  });

  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
  fabricCanvas.requestRenderAll();
}

export function addImageFromFile(file){
  if (!fabricCanvas || !file) return;
  ensureFabric();
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, (img) => {
      const { x, y } = getViewportCenter();
      img.set({ left:x, top:y, originX:"center", originY:"center" });

      // scale to reasonable size
      const maxW = fabricCanvas.getWidth() * 0.6;
      if (img.width) {
        const s = Math.min(1, maxW / img.width);
        img.scale(s);
      }
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.requestRenderAll();
    }, { crossOrigin: "anonymous" });
  };
  reader.readAsDataURL(file);
}

export function addRect(){
  const { x, y } = getViewportCenter();
  const r = new fabric.Rect({ left:x, top:y, originX:"center", originY:"center", width:240, height:160, fill:"#ef4444" });
  fabricCanvas.add(r); fabricCanvas.setActiveObject(r); fabricCanvas.requestRenderAll();
}
export function addCircle(){
  const { x, y } = getViewportCenter();
  const c = new fabric.Circle({ left:x, top:y, originX:"center", originY:"center", radius:90, fill:"#22c55e" });
  fabricCanvas.add(c); fabricCanvas.setActiveObject(c); fabricCanvas.requestRenderAll();
}
export function addLine(){
  const { x, y } = getViewportCenter();
  const l = new fabric.Line([x-140,y, x+140,y], { stroke:"#111", strokeWidth:6 });
  fabricCanvas.add(l); fabricCanvas.setActiveObject(l); fabricCanvas.requestRenderAll();
}

// -------------------- pages --------------------
export function addPage(){
  saveCurrentPage();
  pages.push({ json: null });
  currentPage = pages.length - 1;
  fabricCanvas.clear();
  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));
  updatePageInfo();
  refreshThumbnails();
  safeSaveDraft();
}

export function duplicatePage(){
  saveCurrentPage();
  const src = pages[currentPage]?.json ? structuredClone(pages[currentPage]) : { json:null };
  pages.splice(currentPage+1,0, src);
  currentPage++;
  renderPage();
  updatePageInfo();
  refreshThumbnails();
  safeSaveDraft();
}

export function deletePage(){
  if (pages.length <= 1) return alert("Πρέπει να υπάρχει τουλάχιστον 1 σελίδα.");
  pages.splice(currentPage,1);
  currentPage = clamp(currentPage, 0, pages.length-1);
  renderPage();
  updatePageInfo();
  refreshThumbnails();
  safeSaveDraft();
}

export function nextPage(){
  if (currentPage >= pages.length-1) return;
  goToPage(currentPage+1);
}
export function prevPage(){
  if (currentPage <= 0) return;
  goToPage(currentPage-1);
}
export function goToPage(i){
  if (i<0 || i>=pages.length) return;
  saveCurrentPage();
  currentPage = i;
  renderPage();
  updatePageInfo();
  refreshThumbnails();
  safeSaveDraft();
}

function updatePageInfo(){
  const el = document.getElementById("pageInfo");
  if (el) el.textContent = `${currentPage+1} / ${pages.length}`;
}

function renderPage(){
  if (!fabricCanvas) return;
  const pg = pages[currentPage];
  fabricCanvas.clear();
  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));
  if (!pg || !pg.json) { fabricCanvas.requestRenderAll(); refreshLayers(); return; }

  const clean = deepSanitizeTextBaseline(structuredClone(pg.json));
  fabricCanvas.loadFromJSON(clean, () => {
    fabricCanvas.requestRenderAll();
    refreshLayers();
  });
}

export function saveCurrentPage(){
  if (!fabricCanvas || !pages[currentPage]) return;
  const json = deepSanitizeTextBaseline(fabricCanvas.toJSON());
  pages[currentPage].json = json;
}

// thumbnails without storing in draft (avoid quota)
export function refreshThumbnails(){
  const strip = document.getElementById("thumbStrip");
  if (!strip || !fabricCanvas) return;

  strip.innerHTML = "";
  pages.forEach((p, i) => {
    const d = document.createElement("div");
    d.className = "thumb" + (i===currentPage ? " active":"");
    d.title = `Page ${i+1}`;

    const img = document.createElement("img");
    if (p?.json) {
      // generate thumb from json quickly (no huge storage)
      try{
        const tmp = document.createElement("canvas");
        tmp.width = 320; tmp.height = 240;
        const sc = new fabric.StaticCanvas(tmp, { backgroundColor:"#fff" });
        const clean = deepSanitizeTextBaseline(structuredClone(p.json));
        sc.loadFromJSON(clean, () => {
          // fit
          const s = Math.min(tmp.width / sc.getWidth(), tmp.height / sc.getHeight());
          sc.setZoom(s);
          sc.renderAll();
          img.src = sc.toDataURL({format:"png", quality:0.7});
          sc.dispose();
        });
      }catch{
        img.src = "";
      }
    } else {
      img.src = "";
    }
    d.appendChild(img);
    d.addEventListener("click", () => goToPage(i));
    strip.appendChild(d);
  });
}

// -------------------- layers --------------------
export function refreshLayers(){
  const list = document.getElementById("layersList");
  if (!list || !fabricCanvas) return;

  list.innerHTML = "";
  const objs = fabricCanvas.getObjects().slice().reverse();
  const active = fabricCanvas.getActiveObject();

  objs.forEach((o, idx) => {
    const row = document.createElement("div");
    row.className = "layerRow";
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.padding = "8px 10px";
    row.style.border = "1px solid rgba(0,0,0,0)";
    row.style.borderRadius = "12px";
    row.style.cursor = "pointer";

    const name = o.type === "textbox" ? "Text" : o.type;
    const left = document.createElement("div");
    left.textContent = `${name}`;
    left.style.opacity = ".9";

    const eye = document.createElement("button");
    eye.className = "btn ghost";
    eye.style.padding = "6px 10px";
    eye.textContent = o.visible === false ? "🙈" : "👁";
    eye.onclick = (e) => {
      e.stopPropagation();
      o.visible = !o.visible;
      fabricCanvas.requestRenderAll();
      refreshLayers();
      safeSaveDraft();
    };

    if (active && active === o) {
      row.style.background = "rgba(239,68,68,.12)";
      row.style.borderColor = "rgba(239,68,68,.35)";
    }

    row.onclick = () => {
      fabricCanvas.setActiveObject(o);
      fabricCanvas.requestRenderAll();
      refreshLayers();
    };

    row.appendChild(left);
    row.appendChild(eye);
    list.appendChild(row);
  });
}

export function bringForward(){
  const o = fabricCanvas?.getActiveObject();
  if (!o) return;
  fabricCanvas.bringForward(o);
  fabricCanvas.requestRenderAll();
  refreshLayers();
}
export function sendBackwards(){
  const o = fabricCanvas?.getActiveObject();
  if (!o) return;
  fabricCanvas.sendBackwards(o);
  fabricCanvas.requestRenderAll();
  refreshLayers();
}
export function deleteActive(){
  const o = fabricCanvas?.getActiveObject();
  if (!o) return;
  fabricCanvas.remove(o);
  fabricCanvas.discardActiveObject();
  fabricCanvas.requestRenderAll();
  refreshLayers();
}

// -------------------- colors --------------------
export function setCanvasBg(hex){
  if (!fabricCanvas) return;
  fabricCanvas.setBackgroundColor(hex || "#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));
  safeSaveDraft();
}
export function setActiveFill(hex){
  const o = fabricCanvas?.getActiveObject();
  if (!o) return;
  o.set("fill", hex);
  fabricCanvas.requestRenderAll();
  safeSaveDraft();
}
export function updateActiveTextStyle(style){
  const o = fabricCanvas?.getActiveObject();
  if (!o) return;
  const isText = o.type === "textbox" || o.type === "i-text" || o.type === "text";
  if (!isText) return;

  Object.entries(style || {}).forEach(([k,v]) => o.set(k, v));
  fabricCanvas.requestRenderAll();
  safeSaveDraft();
}

// -------------------- flipbook export/preview/link --------------------
function pagePNGs(){
  // create raster of each page at current page size
  // We render using StaticCanvas to avoid viewport issues.
  ensureFabric();
  const out = [];
  const w = fabricCanvas.getWidth();
  const h = fabricCanvas.getHeight();

  pages.forEach((p, idx) => {
    const tmpEl = document.createElement("canvas");
    tmpEl.width = w; tmpEl.height = h;
    const sc = new fabric.StaticCanvas(tmpEl, { backgroundColor:"#fff" });
    if (p?.json) {
      const clean = deepSanitizeTextBaseline(structuredClone(p.json));
      sc.loadFromJSON(clean, () => {
        sc.renderAll();
      });
    } else {
      sc.renderAll();
    }
    out.push(tmpEl.toDataURL("image/png"));
    sc.dispose();
  });
  return out;
}

function buildFlipbookHTML(imgs, direction="horizontal"){
  const safeImgs = (imgs||[]).map(s => String(s));
  const dir = direction === "vertical" ? "vertical" : "horizontal";

  // very light 3D page turn animation (CSS) + prev/next
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Flipbook</title>
<style>
  html,body{height:100%;margin:0;background:#0b0f19;color:#e5e7eb;font-family:system-ui}
  .wrap{height:100%;display:flex;align-items:center;justify-content:center;padding:18px}
  .book{position:relative;width:min(920px,92vw);height:min(640px,92vh);perspective:1200px}
  .page{
    position:absolute; inset:0;
    display:flex; align-items:center; justify-content:center;
    transform-style:preserve-3d;
    border-radius:14px;
    overflow:hidden;
    box-shadow: 0 18px 60px rgba(0,0,0,.4);
    background:#fff;
  }
  .page img{width:100%;height:100%;object-fit:contain;background:#fff}
  .controls{
    position:fixed; left:50%; bottom:16px; transform:translateX(-50%);
    display:flex; gap:10px; align-items:center;
    background:rgba(0,0,0,.35); border:1px solid rgba(255,255,255,.18);
    padding:10px 12px; border-radius:999px; backdrop-filter: blur(8px);
  }
  button{
    font:inherit; color:inherit; cursor:pointer;
    border-radius:999px; padding:8px 12px;
    border:1px solid rgba(255,255,255,.18);
    background:rgba(255,255,255,.08);
  }
  button:hover{background:rgba(255,255,255,.12)}
  .pill{font-size:12px;opacity:.9}
  /* flip animation */
  .flip-next{animation: flipNext .55s ease both}
  .flip-prev{animation: flipPrev .55s ease both}
  @keyframes flipNext{
    from{transform: rotate${dir==="horizontal"?"Y":"X"}(0deg)}
    to{transform: rotate${dir==="horizontal"?"Y":"X"}(-180deg)}
  }
  @keyframes flipPrev{
    from{transform: rotate${dir==="horizontal"?"Y":"X"}(0deg)}
    to{transform: rotate${dir==="horizontal"?"Y":"X"}(180deg)}
  }
</style>
</head>
<body>
<div class="wrap">
  <div class="book">
    <div class="page" id="page"></div>
  </div>
</div>
<div class="controls">
  <button id="prev">← Prev</button>
  <div class="pill" id="lbl"></div>
  <button id="next">Next →</button>
</div>
<script>
  const IMGS = ${JSON.stringify(safeImgs)};
  let i = 0;
  const page = document.getElementById('page');
  const lbl = document.getElementById('lbl');

  function render(anim){
    page.classList.remove('flip-next','flip-prev');
    if (anim) page.classList.add(anim);
    page.innerHTML = '<img alt="page" src="'+IMGS[i]+'"/>';
    lbl.textContent = (i+1)+' / '+IMGS.length;
  }
  document.getElementById('next').onclick = () => { if(i<IMGS.length-1){ i++; render('flip-next'); } };
  document.getElementById('prev').onclick = () => { if(i>0){ i--; render('flip-prev'); } };
  window.addEventListener('keydown', (e)=>{ if(e.key==='ArrowRight') document.getElementById('next').click(); if(e.key==='ArrowLeft') document.getElementById('prev').click(); });
  render();
</script>
</body>
</html>`;
}

export function exportFlipbook(direction="horizontal"){
  const imgs = pagePNGs();
  const html = buildFlipbookHTML(imgs, direction);
  const blob = new Blob([html], { type:"text/html" });
  const url = URL.createObjectURL(blob);
  return { url, html };
}

export function previewFlipbook(direction="horizontal"){
  const modal = document.getElementById("flipPreviewModal");
  const frame = document.getElementById("flipPreviewFrame");
  if (!modal || !frame) return;

  const { url } = exportFlipbook(direction);
  frame.src = url;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden","false");
}

export function closeFlipPreview(){
  const modal = document.getElementById("flipPreviewModal");
  const frame = document.getElementById("flipPreviewFrame");
  if (!modal || !frame) return;
  frame.src = "about:blank";
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden","true");
}

export async function copyFlipbookLink(direction="horizontal"){
  const imgs = pagePNGs();
  const html = buildFlipbookHTML(imgs, direction);
  const dataUrl = "data:text/html;charset=utf-8," + encodeURIComponent(html);
  await navigator.clipboard.writeText(dataUrl);
  return dataUrl;
}

// Very basic PDF: prints images into a single HTML and triggers browser print-to-pdf.
// (Real PDF library can be added later)
export function exportPdf(direction="horizontal"){
  const imgs = pagePNGs();
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>PDF Export</title>
  <style>body{margin:0} img{width:100%;page-break-after:always}</style></head><body>
  ${imgs.map(s=>`<img src="${s}">`).join("")}
  <script>setTimeout(()=>{window.print()},250);</script>
  </body></html>`;
  const blob = new Blob([html], { type:"text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

// -------------------- draft save (JSON only) --------------------
function safeSaveDraft(){
  try{
    saveCurrentPage();
    const payload = { pages, currentPage, size: { w: fabricCanvas.getWidth(), h: fabricCanvas.getHeight() } };
    const json = JSON.stringify(payload);

    // guard: if too big, don't store (avoid QuotaExceeded)
    if (json.length > 2_000_000) return; // ~2MB
    localStorage.setItem(DRAFT_KEY, json);
  }catch(e){
    // ignore quota + private mode
  }
}

function loadDraftSafe(){
  try{
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) { refreshThumbnails(); return; }
    const data = JSON.parse(raw);
    if (data?.size?.w && data?.size?.h) {
      fabricCanvas.setWidth(data.size.w);
      fabricCanvas.setHeight(data.size.h);
      fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));
    }
    pages = Array.isArray(data.pages) && data.pages.length ? data.pages : pages;
    currentPage = clamp(Number(data.currentPage)||0, 0, pages.length-1);

    // sanitize legacy baselines
    pages.forEach(p => p?.json && deepSanitizeTextBaseline(p.json));

    renderPage();
    updatePageInfo();
    refreshThumbnails();
    fitToHost(true);
  }catch{
    refreshThumbnails();
  }
}
