// js/core.js
// Photobook core (Fabric + pages + zoom + exports + Firebase save)
// Requirements: fabric loaded globally via <script src="...fabric.min.js"></script>

import { ensureAuth, saveProject, loadProject, uploadImage } from "../firebase-store.js";

const fabric = window.fabric;
if (!fabric) console.error("Fabric not found. Did you load fabric.min.js before core.js?");

export let fabricCanvas = null;

const DRAFT_VERSION = "v4";
const DRAFT_KEY = `photobook_draft_${DRAFT_VERSION}`;
let autosaveEnabled = true;
let autosaveTimer = null;

const PAGE_SIZES = {
  A4P: { w: 2480, h: 3508, name: "A4 Portrait" },
  A4L: { w: 3508, h: 2480, name: "A4 Landscape" },
  SQUARE: { w: 2500, h: 2500, name: "Square" },
  STORY: { w: 1080, h: 1920, name: "Story" },
  HD: { w: 1920, h: 1080, name: "HD" },
};

let state = {
  sizeKey: "A4P",
  size: { ...PAGE_SIZES.A4P },
  bg: "#ffffff",
  zoom: 1,
  currentPage: 0,
  pages: [], // [{ json }]
};

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function $(id){ return document.getElementById(id); }

function getHostSize(){
  const host = $("canvasHost") || $("canvasFrame") || document.body;
  const r = host.getBoundingClientRect();
  return { w: Math.max(200, r.width), h: Math.max(200, r.height) };
}

function updatePageInfoUI(){
  const el = $("pageInfo");
  if (!el) return;
  el.textContent = `${state.currentPage + 1} / ${state.pages.length}`;
}

function updateZoomUI(){
  const el = $("zoomValue");
  if (!el) return;
  el.textContent = `${Math.round(state.zoom * 100)}%`;
}

function safeToStore(jsonStr){
  // keep below ~3.5MB to avoid quota variance
  return jsonStr.length < 3_500_000;
}

function tryLocalSave(){
  try{
    const payload = JSON.stringify({
      ...state,
      // do NOT store thumbnails; only json
    });
    if (!safeToStore(payload)) {
      autosaveEnabled = false;
      console.warn("Draft too large, autosave disabled.");
      return;
    }
    localStorage.setItem(DRAFT_KEY, payload);
  }catch(e){
    autosaveEnabled = false;
    console.warn("Draft too large, autosave disabled.");
  }
}

async function tryFirebaseSave(){
  // Save current project to Firestore (metadata + pages json),
  // and images are stored in Firebase Storage via uploadImage().
  try{
    await ensureAuth();
    await saveProject("default", {
      sizeKey: state.sizeKey,
      size: state.size,
      bg: state.bg,
      pages: state.pages,
      updatedAt: Date.now(),
    });
  }catch(e){
    // permission / rules issues shouldn't break editor
    console.warn("Firebase save failed:", e?.message || e);
  }
}

function scheduleAutosave(){
  if (!autosaveEnabled) return;
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    tryLocalSave();
    // also attempt firebase in background
    tryFirebaseSave();
  }, 600);
}

function enrichObject(obj){
  // include custom props in serialization
  const extraProps = ["pbSrc", "crossOrigin", "locked"];
  const originalToObject = obj.toObject;
  obj.toObject = function(props){
    return originalToObject.call(this, (props||[]).concat(extraProps));
  };
  return obj;
}

function applyLock(obj, locked){
  obj.locked = !!locked;
  obj.lockMovementX = locked;
  obj.lockMovementY = locked;
  obj.lockScalingX = locked;
  obj.lockScalingY = locked;
  obj.lockRotation = locked;
  obj.hasControls = !locked;
  obj.selectable = true;
}

function normalizeLoadedObjects(){
  // Fix: some text appears flipped after page switching if zoom/transform got weird.
  const objs = fabricCanvas.getObjects();
  for (const o of objs){
    if (o.type === "textbox" || o.type === "text"){
      // ensure not flipped
      o.flipX = false; o.flipY = false;
      if (o.scaleX < 0) o.scaleX *= -1;
      if (o.scaleY < 0) o.scaleY *= -1;
    }
    if (o.locked) applyLock(o, true);
  }
}

export function initCanvas(){
  if (!fabric) throw new Error("Fabric missing");
  const el = $("canvas");
  if (!el) throw new Error("Canvas element #canvas not found");

  fabricCanvas = new fabric.Canvas(el, {
    preserveObjectStacking: true,
    selection: true,
  });

  // default size
  setPageSize(state.sizeKey, false);

  fabricCanvas.on("object:added", () => { refreshLayers(); scheduleAutosave(); });
  fabricCanvas.on("object:modified", () => { refreshLayers(); scheduleAutosave(); });
  fabricCanvas.on("object:removed", () => { refreshLayers(); scheduleAutosave(); });
  fabricCanvas.on("selection:created", () => { refreshLayers(); });
  fabricCanvas.on("selection:updated", () => { refreshLayers(); });
  fabricCanvas.on("selection:cleared", () => { refreshLayers(); });

  // pages init
  state.pages = [{ json: emptyPageJSON() }];
  state.currentPage = 0;
  renderPage(0);

  // try restore
  restoreDraft().finally(() => {
    updatePageInfoUI();
    refreshThumbnails();
    refreshLayers();
  });

  console.log("✅ Canvas initialized");
}

function emptyPageJSON(){
  const base = {
    version: fabric.version || "5",
    objects: [],
    background: state.bg,
  };
  return base;
}

async function restoreDraft(){
  // Prefer Firebase if available, else local
  try{
    await ensureAuth();
    const proj = await loadProject("default");
    if (proj && proj.pages && proj.pages.length){
      state.sizeKey = proj.sizeKey || state.sizeKey;
      state.size = proj.size || state.size;
      state.bg = proj.bg || state.bg;
      state.pages = proj.pages;
      state.currentPage = 0;
      setPageSize(state.sizeKey, false);
      renderPage(0);
      refreshThumbnails();
      updatePageInfoUI();
      return;
    }
  }catch(_e){}

  try{
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data.pages) return;
    state = { ...state, ...data };
    setPageSize(state.sizeKey || "A4P", false);
    renderPage(clamp(state.currentPage||0, 0, data.pages.length-1));
  }catch(e){
    console.warn("Draft restore failed:", e);
  }
}

export function saveCurrentPage(){
  if (!fabricCanvas) return;
  const json = fabricCanvas.toJSON(["pbSrc", "crossOrigin", "locked"]);
  // Replace huge data URLs with pbSrc (downloadURL) when possible
  if (Array.isArray(json.objects)){
    for (const o of json.objects){
      if (o.type === "image"){
        if (o.pbSrc && typeof o.src === "string" && o.src.startsWith("data:")){
          o.src = o.pbSrc;
        }
        o.crossOrigin = "anonymous";
      }
    }
  }
  state.pages[state.currentPage].json = json;
  scheduleAutosave();
}

export function goToPage(idx){
  saveCurrentPage();
  state.currentPage = clamp(idx, 0, state.pages.length-1);
  renderPage(state.currentPage);
  updatePageInfoUI();
  refreshThumbnails();
}

export function nextPage(){
  if (state.currentPage < state.pages.length-1) goToPage(state.currentPage+1);
}
export function prevPage(){
  if (state.currentPage > 0) goToPage(state.currentPage-1);
}

export function addPage(){
  saveCurrentPage();
  state.pages.push({ json: emptyPageJSON() });
  goToPage(state.pages.length-1);
}

export function duplicatePage(){
  saveCurrentPage();
  const src = state.pages[state.currentPage]?.json || emptyPageJSON();
  // deep clone
  const cloned = JSON.parse(JSON.stringify(src));
  state.pages.splice(state.currentPage+1, 0, { json: cloned });
  goToPage(state.currentPage+1);
}

export function deletePage(){
  if (state.pages.length <= 1) return;
  saveCurrentPage();
  state.pages.splice(state.currentPage, 1);
  state.currentPage = clamp(state.currentPage, 0, state.pages.length-1);
  renderPage(state.currentPage);
  updatePageInfoUI();
  refreshThumbnails();
}

export function setPageSize(key, rerender=true){
  const def = PAGE_SIZES[key] || PAGE_SIZES.A4P;
  state.sizeKey = key in PAGE_SIZES ? key : "A4P";
  state.size = { w: def.w, h: def.h, name: def.name };
  if (!fabricCanvas) return;
  fabricCanvas.setWidth(def.w);
  fabricCanvas.setHeight(def.h);
  fabricCanvas.setBackgroundColor(state.bg, fabricCanvas.requestRenderAll.bind(fabricCanvas));
  // Fit to host
  fitToScreen();
  if (rerender) {
    // rerender current page at new size
    renderPage(state.currentPage);
    refreshThumbnails();
  }
  scheduleAutosave();
}

export function setCanvasBackground(color){
  state.bg = color || "#ffffff";
  if (!fabricCanvas) return;
  fabricCanvas.setBackgroundColor(state.bg, fabricCanvas.requestRenderAll.bind(fabricCanvas));
  scheduleAutosave();
}

function renderPage(idx){
  const page = state.pages[idx];
  const json = page?.json || emptyPageJSON();
  fabricCanvas.off("after:render");
  fabricCanvas.clear();
  fabricCanvas.setBackgroundColor(state.bg, () => {});
  fabricCanvas.loadFromJSON(json, () => {
    normalizeLoadedObjects();
    fabricCanvas.requestRenderAll();
    // Reset zoom/pan per page to avoid weird transforms
    fitToScreen();
    refreshLayers();
  }, (o, obj) => {
    // Reviver: ensure our props applied
    if (obj){
      enrichObject(obj);
      if (obj.type === "image") obj.crossOrigin = "anonymous";
      if (obj.locked) applyLock(obj, true);
    }
  });
}

export function refreshThumbnails(){
  const strip = $("thumbStrip");
  if (!strip) return;
  strip.innerHTML = "";
  state.pages.forEach((p, i) => {
    const t = document.createElement("div");
    t.className = "thumb" + (i === state.currentPage ? " active" : "");
    t.title = `Page ${i+1}`;
    t.addEventListener("click", () => goToPage(i));
    // lightweight thumbnail: use current canvas for current page; else placeholder index
    const label = document.createElement("div");
    label.className = "thumbLabel";
    label.textContent = String(i+1);
    t.appendChild(label);
    strip.appendChild(t);
  });
}

export function refreshLayers(){
  const list = $("layersList");
  if (!list || !fabricCanvas) return;
  list.innerHTML = "";
  const objs = fabricCanvas.getObjects().slice().reverse(); // top first
  objs.forEach((obj, idx) => {
    const row = document.createElement("div");
    row.className = "layerRow";
    const name = document.createElement("div");
    name.className = "layerName";
    name.textContent = `${obj.type}`;
    const lock = document.createElement("button");
    lock.className = "btn ghost mini";
    lock.textContent = obj.locked ? "🔒" : "🔓";
    lock.addEventListener("click", (e) => {
      e.stopPropagation();
      applyLock(obj, !obj.locked);
      fabricCanvas.requestRenderAll();
      saveCurrentPage();
      refreshLayers();
    });
    row.appendChild(lock);
    row.appendChild(name);
    row.addEventListener("click", () => {
      fabricCanvas.setActiveObject(obj);
      fabricCanvas.requestRenderAll();
    });
    list.appendChild(row);
  });
}

function viewportCenter(){
  const center = fabricCanvas.getCenter();
  // transform-aware center
  const vpt = fabricCanvas.viewportTransform;
  const inv = fabric.util.invertTransform(vpt);
  const p = fabric.util.transformPoint(new fabric.Point(center.left, center.top), inv);
  return { x: p.x, y: p.y };
}

export function setZoom(z){
  if (!fabricCanvas) return;
  state.zoom = clamp(z, 0.1, 4);
  const center = fabricCanvas.getCenter();
  fabricCanvas.zoomToPoint(new fabric.Point(center.left, center.top), state.zoom);
  fabricCanvas.requestRenderAll();
  updateZoomUI();
}

export function zoomIn(){ setZoom(state.zoom * 1.1); }
export function zoomOut(){ setZoom(state.zoom / 1.1); }
export function resetZoom(){ setZoom(1); fitToScreen(); }

export function fitToScreen(){
  if (!fabricCanvas) return;
  const { w: hostW, h: hostH } = getHostSize();
  const pad = 40;
  const scale = Math.min((hostW - pad) / state.size.w, (hostH - pad) / state.size.h);
  state.zoom = clamp(scale, 0.05, 2.5);
  // reset transform then apply
  fabricCanvas.setViewportTransform([1,0,0,1,0,0]);
  const center = fabricCanvas.getCenter();
  fabricCanvas.zoomToPoint(new fabric.Point(center.left, center.top), state.zoom);
  // center canvas in host by translating
  const vpt = fabricCanvas.viewportTransform;
  vpt[4] = (hostW - state.size.w * state.zoom) / 2;
  vpt[5] = (hostH - state.size.h * state.zoom) / 2;
  fabricCanvas.requestRenderAll();
  updateZoomUI();
}

function addObj(obj){
  if (!fabricCanvas) return;
  enrichObject(obj);
  const { x, y } = viewportCenter();
  obj.set({ left: x, top: y, originX: "center", originY: "center" });
  fabricCanvas.add(obj);
  fabricCanvas.setActiveObject(obj);
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
}

export function addText(text="Text", opts={}){
  const t = new fabric.Textbox(text, {
    fontSize: 48,
    fill: "#111",
    fontFamily: "Arial",
    ...opts,
  });
  addObj(t);
}

export async function addImageFromFile(file){
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    const dataUrl = String(reader.result || "");
    const img = await new Promise((resolve) => {
      fabric.Image.fromURL(dataUrl, (i) => resolve(i), { crossOrigin: "anonymous" });
    });
    img.crossOrigin = "anonymous";
    enrichObject(img);

    // upload to Firebase in background to avoid localStorage bloat
    try{
      await ensureAuth();
      const url = await uploadImage(file);
      if (url) img.pbSrc = url;
    }catch(_e){}

    addObj(img);
  };
  reader.readAsDataURL(file);
}

export function addRect(){
  addObj(new fabric.Rect({ width: 300, height: 200, fill: "rgba(0,0,0,0.08)", stroke: "#111", strokeWidth: 2 }));
}
export function addCircle(){
  addObj(new fabric.Circle({ radius: 120, fill: "rgba(0,0,0,0.08)", stroke: "#111", strokeWidth: 2 }));
}
export function addLine(){
  const { x, y } = viewportCenter();
  const l = new fabric.Line([x-150, y, x+150, y], { stroke: "#111", strokeWidth: 4, originX: "center", originY: "center" });
  enrichObject(l);
  fabricCanvas.add(l);
  fabricCanvas.setActiveObject(l);
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
}

// --------------------
// Text style helpers
// --------------------
function activeObject(){ return fabricCanvas?.getActiveObject() || null; }

export function setActiveFill(color){
  const o = activeObject();
  if (!o) return;
  o.set("fill", color);
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
}
export function setActiveStroke(color){
  const o = activeObject();
  if (!o) return;
  o.set("stroke", color);
  o.set("strokeWidth", o.strokeWidth || 2);
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
}
export function setActiveOpacity(val){
  const o = activeObject();
  if (!o) return;
  o.set("opacity", clamp(val, 0, 1));
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
}
export function setActiveFontFamily(font){
  const o = activeObject();
  if (!o || (o.type !== "textbox" && o.type !== "text")) return;
  o.set("fontFamily", font);
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
}
export function setActiveFontSize(size){
  const o = activeObject();
  if (!o || (o.type !== "textbox" && o.type !== "text")) return;
  o.set("fontSize", clamp(Number(size)||48, 8, 220));
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
}

// --------------------
// Crop selected image (simple numeric crop)
// --------------------
export function cropSelected(){
  const obj = activeObject();
  if (!obj || obj.type !== "image") { alert("Επίλεξε εικόνα."); return; }
  const w = obj.width || 0, h = obj.height || 0;
  const cropX = Number(prompt(`cropX (0-${w})`, String(obj.cropX || 0)) ?? obj.cropX || 0);
  const cropY = Number(prompt(`cropY (0-${h})`, String(obj.cropY || 0)) ?? obj.cropY || 0);
  const cropW = Number(prompt(`cropW (min 10, max ${w})`, String(obj.width || w)) ?? obj.width || w);
  const cropH = Number(prompt(`cropH (min 10, max ${h})`, String(obj.height || h)) ?? obj.height || h);
  obj.set({ cropX: clamp(cropX, 0, w), cropY: clamp(cropY, 0, h) });
  obj.set({ width: clamp(cropW, 10, w), height: clamp(cropH, 10, h) });
  obj.setCoords();
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
}

// --------------------
// Simple BG removal for "solid background" photos (offline heuristic)
// --------------------
export async function removeBgSelected(){
  const obj = activeObject();
  if (!obj || obj.type !== "image") { alert("Επίλεξε εικόνα."); return; }
  const el = obj._element;
  if (!el) { alert("Δεν βρέθηκε image element."); return; }

  const c = document.createElement("canvas");
  const w = el.naturalWidth || el.width;
  const h = el.naturalHeight || el.height;
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  ctx.drawImage(el, 0, 0);

  const imgData = ctx.getImageData(0,0,w,h);
  const d = imgData.data;

  // sample corners
  function sample(px,py){
    const i = (py*w + px)*4;
    return [d[i], d[i+1], d[i+2]];
  }
  const c1 = sample(2,2), c2 = sample(w-3,2), c3=sample(2,h-3), c4=sample(w-3,h-3);
  const bg = [
    Math.round((c1[0]+c2[0]+c3[0]+c4[0])/4),
    Math.round((c1[1]+c2[1]+c3[1]+c4[1])/4),
    Math.round((c1[2]+c2[2]+c3[2]+c4[2])/4),
  ];
  const tol = 28;
  for (let i=0;i<d.length;i+=4){
    const dr = d[i]-bg[0], dg=d[i+1]-bg[1], db=d[i+2]-bg[2];
    const dist = Math.sqrt(dr*dr+dg*dg+db*db);
    if (dist < tol){
      d[i+3]=0;
    }
  }
  ctx.putImageData(imgData,0,0);
  const out = c.toDataURL("image/png");

  const left=obj.left, top=obj.top, angle=obj.angle, sx=obj.scaleX, sy=obj.scaleY, ox=obj.originX, oy=obj.originY;
  const pbSrc = obj.pbSrc;
  const img2 = await new Promise((resolve) => {
    fabric.Image.fromURL(out, (i) => resolve(i), { crossOrigin:"anonymous" });
  });
  img2.set({ left, top, angle, scaleX:sx, scaleY:sy, originX:ox, originY:oy });
  img2.crossOrigin="anonymous";
  img2.pbSrc = pbSrc; // keep remote pointer if exists
  enrichObject(img2);

  fabricCanvas.remove(obj);
  fabricCanvas.add(img2);
  fabricCanvas.setActiveObject(img2);
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
}

// --------------------
// Export helpers
// --------------------
async function renderJSONToDataURL(json, w, h){
  const sc = new fabric.StaticCanvas(null, { width: w, height: h });
  sc.setBackgroundColor(state.bg, () => {});
  return await new Promise((resolve) => {
    sc.loadFromJSON(json, () => {
      sc.requestRenderAll();
      // multiplier 1 for quality; could be 2 if needed
      const url = sc.toDataURL({ format:"png" });
      sc.dispose();
      resolve(url);
    }, (o, obj) => {
      if (obj && obj.type==="image") obj.crossOrigin="anonymous";
    });
  });
}

export async function exportFlipbook(){
  saveCurrentPage();
  const imgs = [];
  for (let i=0;i<state.pages.length;i++){
    imgs.push(await renderJSONToDataURL(state.pages[i].json, state.size.w, state.size.h));
  }
  const html = buildFlipbookHTML(imgs);
  downloadTextFile(html, "photobook-flipbook.html", "text/html");
}

export async function previewFlipbook(){
  saveCurrentPage();
  const frame = $("flipPreviewFrame");
  const modal = $("flipPreviewModal");
  if (!frame || !modal) return;
  const imgs = [];
  for (let i=0;i<state.pages.length;i++){
    imgs.push(await renderJSONToDataURL(state.pages[i].json, state.size.w, state.size.h));
  }
  const html = buildFlipbookHTML(imgs);
  const blob = new Blob([html], { type:"text/html" });
  const url = URL.createObjectURL(blob);
  frame.src = url;
  modal.classList.add("open");
}

export function closeFlipbookPreview(){
  const frame = $("flipPreviewFrame");
  const modal = $("flipPreviewModal");
  if (frame) frame.src = "about:blank";
  if (modal) modal.classList.remove("open");
}

export async function exportFlipbookLink(){
  // Shareable blob link (copyable). Real hosted link needs hosting.
  saveCurrentPage();
  const imgs = [];
  for (let i=0;i<state.pages.length;i++){
    imgs.push(await renderJSONToDataURL(state.pages[i].json, state.size.w, state.size.h));
  }
  const html = buildFlipbookHTML(imgs);
  const blob = new Blob([html], { type:"text/html" });
  const url = URL.createObjectURL(blob);
  return url;
}

export async function exportPrintablePDF(){
  // Opens a print window with rendered pages. User can Save as PDF.
  saveCurrentPage();
  const imgs = [];
  for (let i=0;i<state.pages.length;i++){
    imgs.push(await renderJSONToDataURL(state.pages[i].json, state.size.w, state.size.h));
  }
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<html><head><title>Print PDF</title>
  <style>
    body{margin:0;background:#111;display:flex;flex-direction:column;align-items:center;gap:16px;padding:16px;}
    img{max-width:95vw;max-height:95vh;box-shadow:0 10px 30px rgba(0,0,0,.5);background:#fff}
    @media print{body{background:#fff;padding:0} img{max-width:100vw;max-height:100vh;page-break-after:always;box-shadow:none}}
  </style></head><body>
  ${imgs.map(u=>`<img src="${u}" />`).join("")}
  <script>setTimeout(()=>{window.print();},300);</script>
  </body></html>`);
  w.document.close();
}

function downloadTextFile(text, filename, mime){
  const blob = new Blob([text], { type: mime || "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function buildFlipbookHTML(pageImages){
  // simple 3D book flip
  const pages = pageImages.map((src, i) => `
    <div class="p ${i===0?'is-front':''}" style="--i:${i}; background-image:url('${src}')"></div>
  `).join("");
  return `<!doctype html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Flipbook</title>
<style>
:root{--w: min(92vw, 980px); --h: calc(var(--w)*1.414);} /* A4 ratio */
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0b0b;color:#fff;font-family:system-ui}
.wrap{display:flex;flex-direction:column;gap:10px;align-items:center}
.controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:center}
button,select{padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#fff}
.book{position:relative;width:var(--w);height:var(--h);perspective:2400px;}
.p{position:absolute;inset:0;background-size:cover;background-position:center;transform-origin:left center;transform-style:preserve-3d;backface-visibility:hidden;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.6);transition:transform .75s cubic-bezier(.2,.8,.2,1)}
.p::after{content:"";position:absolute;inset:0;background:#fff;border-radius:12px;transform:translateZ(-1px);opacity:.04}
.p.flipped{transform:rotateY(-180deg)}
.hv-vertical .p{transform-origin:center top}
.hv-vertical .p.flipped{transform:rotateX(180deg)}
.badge{opacity:.8;font-size:12px}
</style></head>
<body>
<div class="wrap">
  <div class="controls">
    <button id="prev">◀</button>
    <div class="badge" id="info"></div>
    <button id="next">▶</button>
    <select id="mode">
      <option value="horizontal" selected>Horizontal</option>
      <option value="vertical">Vertical</option>
    </select>
  </div>
  <div class="book" id="book">${pages}</div>
</div>
<script>
const book=document.getElementById('book');
const pages=[...book.querySelectorAll('.p')];
let idx=0;
const info=document.getElementById('info');
function render(){
  info.textContent=(idx+1)+' / '+pages.length;
  pages.forEach((p,i)=>{ p.classList.toggle('flipped', i<idx); });
}
document.getElementById('next').onclick=()=>{ if(idx<pages.length-1){ idx++; render(); } };
document.getElementById('prev').onclick=()=>{ if(idx>0){ idx--; render(); } };
document.getElementById('mode').onchange=(e)=>{
  book.classList.toggle('hv-vertical', e.target.value==='vertical');
};
render();
</script>
</body></html>`;
}
