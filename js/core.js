// js/core.js
import { fabric } from "https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js";

let canvas;
let pages = [];
let currentPage = 0;
let zoom = 1;

const DRAFT_KEY = "photobook_draft_v2";
const MAX_PAGES_FOR_DRAFT = 12; // ⬅️ αποφυγή quota error

// ---------------- INIT ----------------
export function initCanvas(){
  canvas = new fabric.Canvas("canvas", {
    backgroundColor: "#fff",
    preserveObjectStacking: true
  });

  canvas.setWidth(1240);
  canvas.setHeight(1754);

  pages = [{ json: null, thumb: null }];
  currentPage = 0;

  loadDraft();
  saveCurrentPage();
  console.log("✅ Canvas initialized");
}

// ---------------- TEXT ----------------
export function addText(){
  const center = canvas.getCenter();
  const t = new fabric.Textbox("Text", {
    left: center.left,
    top: center.top,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111"
  });
  canvas.add(t);
  canvas.setActiveObject(t);
  canvas.requestRenderAll();
  saveCurrentPage();
}

// ---------------- IMAGE ----------------
export function addImageFromFile(file){
  const reader = new FileReader();
  reader.onload = e => {
    fabric.Image.fromURL(e.target.result, img => {
      img.scaleToWidth(canvas.getWidth() * 0.5);
      img.center();
      canvas.add(img);
      canvas.setActiveObject(img);
      saveCurrentPage();
    });
  };
  reader.readAsDataURL(file);
}

// ---------------- ZOOM (CANVAS) ----------------
export function getZoom(){ return zoom; }

export function setZoom(z){
  zoom = Math.min(3, Math.max(0.2, z));
  canvas.setZoom(zoom);
  canvas.requestRenderAll();
}

export function resetZoom(){
  zoom = 1;
  canvas.setViewportTransform([1,0,0,1,0,0]);
  canvas.requestRenderAll();
}

export function fitToScreen(){
  const wrap = document.getElementById("canvasWrap");
  if(!wrap) return;

  const scale = Math.min(
    wrap.clientWidth / canvas.getWidth(),
    wrap.clientHeight / canvas.getHeight()
  );
  setZoom(scale);
}

// ---------------- CANVAS SIZE ----------------
export function applyPreset(preset){
  const map = {
    A4P: [1240,1754],
    A4L: [1754,1240],
    SQUARE: [1400,1400],
    STORY: [1080,1920]
  };
  if(map[preset]) applySize(...map[preset]);
}

export function applySize(w,h, keep=true){
  canvas.setWidth(w);
  canvas.setHeight(h);
  if(!keep) canvas.clear();
  fitToScreen();
  saveCurrentPage();
}

// ---------------- PAGES ----------------
export function addPage(){
  saveCurrentPage();
  pages.push({ json:null, thumb:null });
  currentPage = pages.length - 1;
  canvas.clear();
}

export function goToPage(i){
  if(!pages[i]) return;
  saveCurrentPage();
  currentPage = i;
  canvas.loadFromJSON(pages[i].json || {}, ()=> canvas.renderAll());
}

export function getPageInfo(){
  return { current: currentPage, total: pages.length };
}

export function getThumbnails(){
  return pages.map(p => p.thumb);
}

// ---------------- SAVE (NO QUOTA ERROR) ----------------
export function saveCurrentPage(){
  pages[currentPage].json = canvas.toJSON();
  pages[currentPage].thumb = canvas.toDataURL({ format:"png", quality:0.5 });

  if(pages.length <= MAX_PAGES_FOR_DRAFT){
    try{
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        pages,
        currentPage
      }));
    }catch(e){
      console.warn("⚠️ Draft not saved (quota)");
    }
  }
}

function loadDraft(){
  try{
    const raw = localStorage.getItem(DRAFT_KEY);
    if(!raw) return;
    const d = JSON.parse(raw);
    pages = d.pages || pages;
    currentPage = d.currentPage || 0;
    goToPage(currentPage);
  }catch{}
}

// ---------------- FLIPBOOK ----------------
export function buildFlipbookHTML({ title="Flipbook", orientation="horizontal" }){
  const imgs = pages.map(p=>p.thumb).filter(Boolean);
  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
body{margin:0;background:#111;display:flex;justify-content:center}
.book{display:flex;gap:10px;overflow:auto}
.page{background:#fff}
.page img{display:block;max-height:95vh}
</style>
</head>
<body>
<div class="book ${orientation}">
${imgs.map(i=>`<div class="page"><img src="${i}"></div>`).join("")}
</div>
</body>
</html>`;
}

export function downloadFlipbookHTML(opts){
  const html = buildFlipbookHTML(opts);
  const blob = new Blob([html], {type:"text/html"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "flipbook.html";
  a.click();
}
