// js/core.js
// Photobook core: Fabric canvas + pages + zoom + flipbook export
// No external imports here (Fabric is loaded via <script> in photobook.html)

export let canvas = null;

export const state = {
  pages: [],        // [{ json }]
  current: 0,
  size: { w: 1240, h: 1754 }, // A4 portrait default
  bg: "#ffffff",
  zoom: 1
};

const DRAFT_KEY = "photobook_draft_v2";
let restoring = false;
let undoStack = [];
let redoStack = [];

// ---------- init ----------
export function initCanvas() {
  const el = document.getElementById("canvas");
  if (!el || typeof fabric === "undefined") {
    console.error("Fabric or #canvas missing");
    return;
  }

  canvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true
  });

  // default background
  canvas.setBackgroundColor(state.bg, canvas.requestRenderAll.bind(canvas));

  // bind change -> history + autosave current page
  bindHistory();
  bindAutosave();
  bindWheelZoom();

  // initial state
  loadDraft(); // may set pages/current/size
  if (state.pages.length === 0) {
    state.pages.push({ json: emptyPageJSON() });
    state.current = 0;
  }

  applySize(state.size.w, state.size.h, /*keepObjects*/ true);
  loadPage(state.current);

  // Fit to screen once layout is ready
  requestAnimationFrame(() => fitToScreen());

  console.log("✅ Canvas initialized");
}

// ---------- pages ----------
function emptyPageJSON() {
  return { version: fabric.version, objects: [], background: state.bg };
}

export function addPage() {
  saveCurrentPage();
  state.pages.push({ json: emptyPageJSON() });
  state.current = state.pages.length - 1;
  loadPage(state.current, true);
  saveDraft();
  return state.current;
}

export function duplicatePage() {
  saveCurrentPage();
  const src = state.pages[state.current]?.json || emptyPageJSON();
  const clone = structuredClone(src);
  state.pages.splice(state.current + 1, 0, { json: clone });
  state.current++;
  loadPage(state.current, true);
  saveDraft();
  return state.current;
}

export function deletePage() {
  if (state.pages.length <= 1) return false;
  state.pages.splice(state.current, 1);
  state.current = Math.max(0, state.current - 1);
  loadPage(state.current, true);
  saveDraft();
  return true;
}

export function nextPage() {
  if (state.current >= state.pages.length - 1) return state.current;
  return goToPage(state.current + 1);
}

export function prevPage() {
  if (state.current <= 0) return state.current;
  return goToPage(state.current - 1);
}

export function goToPage(i) {
  if (i < 0 || i >= state.pages.length) return state.current;
  saveCurrentPage();
  state.current = i;
  loadPage(state.current, true);
  saveDraft();
  return state.current;
}

export function getPageInfo() {
  return { current: state.current, total: state.pages.length };
}

export function getThumbnails() {
  // create thumbnails from saved json by rendering offscreen would be heavy.
  // We'll use last rendered snapshot per page stored in draft cache when available.
  // Fallback: return nulls.
  return state.pages.map(p => p.thumb || null);
}

function loadPage(index, resetView = false) {
  const pg = state.pages[index];
  if (!pg) return;

  restoring = true;
  canvas.clear();

  // set bg
  canvas.setBackgroundColor(state.bg, canvas.requestRenderAll.bind(canvas));

  const clean = structuredClone(pg.json || emptyPageJSON());
  sanitizeJSON(clean);

  canvas.loadFromJSON(clean, () => {
    canvas.requestRenderAll();
    restoring = false;
    if (resetView) resetZoom();
    // refresh thumb for this page
    updateThumb(index);
    pushHistorySnapshot(); // new baseline for undo
  });
}

export function saveCurrentPage() {
  if (!canvas) return;
  const json = canvas.toJSON(["textBaseline"]);
  json.background = state.bg;
  sanitizeJSON(json);
  state.pages[state.current].json = json;

  // lightweight thumb (small) to keep storage small
  updateThumb(state.current);
}

function updateThumb(index) {
  if (!canvas) return;
  const dataUrl = canvas.toDataURL({ format: "png", multiplier: 0.18 });
  state.pages[index].thumb = dataUrl;
}

// ---------- objects tools ----------
export function addText() {
  if (!canvas) return;
  const { x, y } = getViewportCenter();

  const t = new fabric.Textbox("Text", {
    left: x, top: y,
    originX: "center", originY: "center",
    fontSize: 44,
    fill: "#111",
    fontFamily: "Arial",
    // IMPORTANT: valid baseline (prevents "alphabetical" warning on some legacy drafts)
    textBaseline: "alphabetic"
  });

  canvas.add(t);
  canvas.setActiveObject(t);
  canvas.requestRenderAll();
  saveCurrentPage();
}

export function addRect() {
  if (!canvas) return;
  const { x, y } = getViewportCenter();
  const r = new fabric.Rect({
    left: x, top: y, originX: "center", originY: "center",
    width: 260, height: 180,
    fill: "#eaeaea", stroke: "#111", strokeWidth: 2
  });
  canvas.add(r); canvas.setActiveObject(r); canvas.requestRenderAll();
  saveCurrentPage();
}

export function addImageFromFile(file) {
  if (!canvas || !file) return;

  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, (img) => {
      const { x, y } = getViewportCenter();
      img.set({ left: x, top: y, originX: "center", originY: "center" });

      // scale to reasonable size
      const maxW = state.size.w * 0.7;
      const maxH = state.size.h * 0.7;
      const s = Math.min(maxW / img.width, maxH / img.height, 1);
      img.scale(s);

      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
      saveCurrentPage();
    }, { crossOrigin: "anonymous" });
  };
  reader.readAsDataURL(file);
}

export function removeSelected() {
  if (!canvas) return;
  const obj = canvas.getActiveObject();
  if (!obj) return;
  canvas.remove(obj);
  canvas.discardActiveObject();
  canvas.requestRenderAll();
  saveCurrentPage();
}

// ---------- zoom / view ----------
export function getZoom() {
  return state.zoom;
}

export function setZoom(z) {
  if (!canvas) return;
  const next = Math.max(0.2, Math.min(4, Number(z) || 1));
  state.zoom = next;

  const center = new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
  canvas.zoomToPoint(center, state.zoom);
  canvas.requestRenderAll();
}

export function resetZoom() {
  if (!canvas) return;
  state.zoom = 1;
  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  canvas.requestRenderAll();
}

export function fitToScreen() {
  const host = document.getElementById("canvasHost");
  if (!host || !canvas) return;

  // reset first
  resetZoom();

  const pad = 40;
  const availW = host.clientWidth - pad;
  const availH = host.clientHeight - pad;

  const s = Math.min(availW / state.size.w, availH / state.size.h);
  setZoom(s);

  // center in host
  const vt = canvas.viewportTransform;
  vt[4] = (availW - state.size.w * s) / 2;
  vt[5] = (availH - state.size.h * s) / 2;
  canvas.setViewportTransform(vt);
  canvas.requestRenderAll();
}

export function getViewportCenter() {
  if (!canvas) return { x: state.size.w / 2, y: state.size.h / 2 };
  const inv = fabric.util.invertTransform(canvas.viewportTransform);
  const host = document.getElementById("canvasHost");
  const px = (host?.clientWidth || state.size.w) / 2;
  const py = (host?.clientHeight || state.size.h) / 2;
  const pt = fabric.util.transformPoint(new fabric.Point(px, py), inv);
  return { x: pt.x, y: pt.y };
}

// wheel zoom with ctrl
function bindWheelZoom() {
  canvas.on("mouse:wheel", (opt) => {
    const e = opt.e;
    if (!e.ctrlKey) return;
    e.preventDefault();
    e.stopPropagation();

    const factor = e.deltaY > 0 ? 0.95 : 1.05;
    const next = Math.max(0.2, Math.min(4, state.zoom * factor));
    state.zoom = next;

    const pt = new fabric.Point(e.offsetX, e.offsetY);
    canvas.zoomToPoint(pt, state.zoom);
    canvas.requestRenderAll();
  });
}

// ---------- size ----------
export function applyPreset(preset) {
  const presets = {
    A4P: { w: 1240, h: 1754 },
    A4L: { w: 1754, h: 1240 },
    SQUARE: { w: 1400, h: 1400 },
    HD: { w: 1920, h: 1080 }
  };
  const p = presets[preset];
  if (!p) return;
  applySize(p.w, p.h);
}

export function applySize(w, h, keepObjects = false) {
  if (!canvas) return;
  state.size = { w: Number(w), h: Number(h) };
  canvas.setWidth(state.size.w);
  canvas.setHeight(state.size.h);
  canvas.setBackgroundColor(state.bg, canvas.requestRenderAll.bind(canvas));
  if (!keepObjects) {
    canvas.clear();
    canvas.setBackgroundColor(state.bg, canvas.requestRenderAll.bind(canvas));
  }
  fitToScreen();
  saveCurrentPage();
  saveDraft();
}

// ---------- history (undo/redo) ----------
function bindHistory() {
  pushHistorySnapshot();
  ["object:added", "object:modified", "object:removed", "text:changed"].forEach(ev => {
    canvas.on(ev, () => {
      if (restoring) return;
      pushHistorySnapshot();
    });
  });
}

function pushHistorySnapshot() {
  if (!canvas) return;
  const json = canvas.toJSON(["textBaseline"]);
  sanitizeJSON(json);
  undoStack.push(json);
  if (undoStack.length > 80) undoStack.shift();
  redoStack = [];
}

export function undo() {
  if (!canvas || undoStack.length < 2) return;
  const cur = undoStack.pop();
  redoStack.push(cur);
  const prev = undoStack[undoStack.length - 1];
  restoring = true;
  const clean = structuredClone(prev);
  sanitizeJSON(clean);
  canvas.loadFromJSON(clean, () => {
    canvas.requestRenderAll();
    restoring = false;
    saveCurrentPage();
  });
}

export function redo() {
  if (!canvas || redoStack.length === 0) return;
  const next = redoStack.pop();
  undoStack.push(next);
  restoring = true;
  const clean = structuredClone(next);
  sanitizeJSON(clean);
  canvas.loadFromJSON(clean, () => {
    canvas.requestRenderAll();
    restoring = false;
    saveCurrentPage();
  });
}

// ---------- autosave draft (safe) ----------
function bindAutosave() {
  // save when leaving
  window.addEventListener("beforeunload", () => {
    try { saveDraft(); } catch {}
  });

  // periodic but small
  setInterval(() => {
    try { saveDraft(); } catch {}
  }, 4000);
}

export function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

function saveDraft(){
  try {
    // ❌ ΜΗΝ αποθηκεύεις images/base64
    const safePages = pages.map(p => ({
      json: p.json,
      // image: p.image ❌ ΤΟ ΑΦΑΙΡΟΥΜΕ
    }));

    localStorage.setItem(
      "photobook_draft_v2",
      JSON.stringify({
        pages: safePages,
        currentPage
      })
    );
  } catch (e) {
    console.warn("Draft not saved (quota)", e);
  }
}


export function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.pages)) state.pages = data.pages;
    if (Number.isInteger(data.current)) state.current = Math.max(0, Math.min(data.current, state.pages.length - 1));
    if (data.size?.w && data.size?.h) state.size = { w: data.size.w, h: data.size.h };
    if (data.bg) state.bg = data.bg;

    // sanitize legacy "alphabetical"
    state.pages.forEach(p => p?.json && sanitizeJSON(p.json));
  } catch {}
}

// ---------- sanitize ----------
function sanitizeJSON(json) {
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach(walk); return; }

    // Fix legacy invalid baseline
    if (node.textBaseline === "alphabetical") node.textBaseline = "alphabetic";

    for (const k of Object.keys(node)) {
      const v = node[k];
      if (k === "textBaseline" && v === "alphabetical") node[k] = "alphabetic";
      walk(v);
    }
  };
  walk(json);
}

// ---------- flipbook export / preview ----------
export function buildFlipbookHTML({ title = "My Flipbook", orientation = "horizontal" } = {}) {
  // Ensure current page saved + thumbnails updated
  saveCurrentPage();

  // Render each page as an image at export resolution
  // We need to render pages one by one synchronously (async loadFromJSON), so:
  // We'll use existing thumbs if available; for a better export, use full renders later.
  const imgs = state.pages.map((p, i) => p.thumb || "");
  const safeTitle = String(title).replace(/[<>]/g, "");

  const vertical = orientation === "vertical";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${safeTitle}</title>
<style>
  body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;background:#0b0b0f;color:#fff;display:flex;flex-direction:column;min-height:100vh}
  header{display:flex;align-items:center;gap:10px;padding:12px 14px;background:rgba(255,255,255,.06);backdrop-filter: blur(10px);position:sticky;top:0}
  header button{border:0;background:rgba(255,255,255,.12);color:#fff;padding:8px 12px;border-radius:10px;cursor:pointer}
  header button:hover{background:rgba(255,255,255,.18)}
  .wrap{flex:1;display:grid;place-items:center;padding:18px}
  .book{
    width:min(900px,92vw);
    aspect-ratio: ${vertical ? "3/4" : "4/3"};
    perspective: 2000px;
    position:relative;
  }
  .page{
    position:absolute; inset:0;
    border-radius:16px;
    overflow:hidden;
    background:#111;
    box-shadow: 0 20px 70px rgba(0,0,0,.55);
    transform-style:preserve-3d;
    transition: transform .75s cubic-bezier(.2,.8,.2,1);
  }
  .page img{width:100%;height:100%;object-fit:contain;background:#fff}
  .page::after{
    content:"";
    position:absolute; inset:0;
    background: linear-gradient(${vertical ? "to bottom" : "to right"}, rgba(0,0,0,.0), rgba(0,0,0,.25));
    pointer-events:none;
    opacity:.55;
  }
  .flipped{
    transform: rotate${vertical ? "X" : "Y"}(-180deg);
  }
  .counter{margin-left:auto;opacity:.9}
</style>
</head>
<body>
<header>
  <strong>${safeTitle}</strong>
  <button id="prev">Prev</button>
  <button id="next">Next</button>
  <button id="mode">Orientation: ${vertical ? "Vertical" : "Horizontal"}</button>
  <span class="counter" id="counter"></span>
</header>
<div class="wrap">
  <div class="book" id="book"></div>
</div>
<script>
  const PAGES = ${json.dumps(imgs)};
  let orientation = ${json.dumps(orientation)};
  let index = 0;

  const book = document.getElementById('book');
  const counter = document.getElementById('counter');

  function render(){
    book.innerHTML = '';
    // stack pages; current on top
    for(let i=PAGES.length-1;i>=0;i--){
      const d=document.createElement('div');
      d.className='page' + (i < index ? ' flipped' : '');
      const im=document.createElement('img');
      im.src=PAGES[i];
      d.appendChild(im);
      book.appendChild(d);
    }
    counter.textContent = (index+1) + ' / ' + PAGES.length;
  }

  function next(){ if(index < PAGES.length-1){ index++; render(); } }
  function prev(){ if(index > 0){ index--; render(); } }

  document.getElementById('next').onclick=next;
  document.getElementById('prev').onclick=prev;

  // simple orientation toggle (rebuild stylesheet by reloading page is overkill)
  document.getElementById('mode').onclick=()=>{
    orientation = (orientation === 'horizontal') ? 'vertical' : 'horizontal';
    alert('For full orientation change, re-export with the other option in the editor.');
  };

  document.addEventListener('keydown',(e)=>{
    if(e.key==='ArrowRight' || e.key==='ArrowDown') next();
    if(e.key==='ArrowLeft' || e.key==='ArrowUp') prev();
  });

  render();
</script>
</body>
</html>`;
}

// download helper
export function downloadFlipbookHTML({ title, orientation } = {}) {
  const html = buildFlipbookHTML({ title, orientation });
  const blob = new Blob([html], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (title || "flipbook") + ".html";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 8000);
  return html;
}


export function exportFlipbook(){
  const pagesData = pages.map((p, i) => {
    return `
      <div class="page">
        <img src="${p.image}" />
      </div>
    `;
  }).join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Flipbook</title>
<style>
body{margin:0;background:#222;display:flex;justify-content:center;}
.book{width:80vw;height:90vh;display:flex;overflow:hidden;}
.page{
  min-width:100%;
  transition:transform .6s;
}
.page img{width:100%;height:100%;object-fit:contain;}
</style>
</head>
<body>
<div class="book">${pagesData}</div>
<script>
let index=0;
const pages=[...document.querySelectorAll('.page')];
function show(){
  pages.forEach((p,i)=>p.style.transform=\`translateX(\${(i-index)*100}%)\`);
}
document.body.onclick=()=>{index=Math.min(index+1,pages.length-1);show();}
show();
</script>
</body>
</html>
`;

  const blob = new Blob([html], {type:"text/html"});
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}
