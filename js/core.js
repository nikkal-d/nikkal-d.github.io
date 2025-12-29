// js/core.js
// STABLE CORE – pages, zoom on canvas, flipbook export

export let fabricCanvas = null;

let pages = [];
let currentPage = 0;
let zoom = 1;
let restoring = false;

// ---------------- INIT ----------------
export function initCanvas(){
  if (!window.fabric) throw new Error("Fabric not loaded");

  fabricCanvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true
  });

  setPageSizePreset("A4P");

  pages = [{ json: blankPage() }];
  renderPage(0);

  fabricCanvas.on("object:added", saveCurrentPage);
  fabricCanvas.on("object:modified", saveCurrentPage);
  fabricCanvas.on("object:removed", saveCurrentPage);

  fitToHost();
  console.log("✅ Canvas initialized");
}

// ---------------- PAGE SYSTEM ----------------
function blankPage(){
  return { objects: [], backgroundColor: "#ffffff" };
}

function saveCurrentPage(){
  if (restoring) return;
  pages[currentPage].json = fabricCanvas.toJSON();
}

function renderPage(i){
  restoring = true;
  fabricCanvas.clear();
  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));

  const json = pages[i]?.json || blankPage();
  fabricCanvas.loadFromJSON(json, () => {
    fabricCanvas.renderAll();
    restoring = false;
    fitToHost();
  });
}

export function addPage(){
  saveCurrentPage();
  pages.push({ json: blankPage() });
  currentPage = pages.length - 1;
  renderPage(currentPage);
  updatePageInfo();
}

export function nextPage(){
  if (currentPage >= pages.length - 1) return;
  saveCurrentPage();
  currentPage++;
  renderPage(currentPage);
  updatePageInfo();
}

export function prevPage(){
  if (currentPage <= 0) return;
  saveCurrentPage();
  currentPage--;
  renderPage(currentPage);
  updatePageInfo();
}

function updatePageInfo(){
  const el = document.getElementById("pageInfo");
  if (el) el.textContent = `${currentPage+1} / ${pages.length}`;
}

// ---------------- ZOOM ON CANVAS ----------------
export function getZoom(){ return zoom; }

export function setZoom(z){
  zoom = Math.max(0.1, Math.min(4, z));
  const center = new fabric.Point(
    fabricCanvas.getWidth()/2,
    fabricCanvas.getHeight()/2
  );
  fabricCanvas.zoomToPoint(center, zoom);
  fabricCanvas.requestRenderAll();
}

export function resetZoom(){
  zoom = 1;
  fabricCanvas.setViewportTransform([1,0,0,1,0,0]);
  fitToHost();
}

export function fitToHost(){
  const host = document.getElementById("canvasHost");
  if (!host) return;

  const pad = 40;
  const scale = Math.min(
    (host.clientWidth - pad) / fabricCanvas.getWidth(),
    (host.clientHeight - pad) / fabricCanvas.getHeight()
  );

  setZoom(scale);
}

// ---------------- PAGE SIZE ----------------
const PRESETS = {
  A4P:{w:1240,h:1754},
  A4L:{w:1754,h:1240},
  SQUARE:{w:1400,h:1400},
  STORY:{w:1080,h:1920},
  HD:{w:1920,h:1080}
};

export function setPageSizePreset(k){
  const p = PRESETS[k];
  if (!p) return;
  fabricCanvas.setWidth(p.w);
  fabricCanvas.setHeight(p.h);
  fitToHost();
}

// ---------------- OBJECTS ----------------
export function addText(opts={}){
  const t = new fabric.Textbox(opts.text||"Text",{
    left:fabricCanvas.getWidth()/2,
    top:fabricCanvas.getHeight()/2,
    originX:"center",
    originY:"center",
    fontSize:opts.fontSize||48,
    fill:opts.fill||"#111",
    fontFamily:opts.fontFamily||"Arial"
  });
  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
}

export function addImageFromFile(file){
  const r = new FileReader();
  r.onload = () => {
    fabric.Image.fromURL(r.result, img=>{
      img.scaleToWidth(fabricCanvas.getWidth()*0.6);
      img.set({
        left:fabricCanvas.getWidth()/2,
        top:fabricCanvas.getHeight()/2,
        originX:"center",
        originY:"center"
      });
      fabricCanvas.add(img);
    });
  };
  r.readAsDataURL(file);
}

// ---------------- FLIPBOOK ----------------
export async function previewFlipbook(){
  const html = await buildFlipbookHTML();
  document.getElementById("flipPreviewFrame").srcdoc = html;
  document.getElementById("flipPreviewModal").classList.add("open");
}

export async function exportFlipbookHTML(){
  const html = await buildFlipbookHTML();
  const blob = new Blob([html],{type:"text/html"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "flipbook.html";
  a.click();
}

async function buildFlipbookHTML(){
  const imgs = [];
  for (const p of pages){
    imgs.push(await pageToImage(p.json));
  }
  return `
<!doctype html>
<body style="margin:0;background:#000">
${imgs.map(i=>`<img src="${i}" style="width:100vw;height:100vh;object-fit:contain">`).join("")}
</body>`;
}

function pageToImage(json){
  return new Promise(res=>{
    const c = new fabric.StaticCanvas(null,{backgroundColor:"#fff"});
    c.setWidth(fabricCanvas.getWidth());
    c.setHeight(fabricCanvas.getHeight());
    c.loadFromJSON(json,()=>{
      c.renderAll();
      res(c.toDataURL("png"));
    });
  });
}
