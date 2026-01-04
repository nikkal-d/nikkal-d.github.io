import { saveProject, loadProject, uploadImage } from "./firebase-store.js";

export let canvas;
let pages = [];
let pageIndex = 0;
let zoom = 1;

export function initCanvas() {
  canvas = new fabric.Canvas("canvas", {
    width: 900,
    height: 1200,
    backgroundColor: "#fff",
    preserveObjectStacking: true
  });
  addPage();
  renderPage();
}

function serialize() {
  return canvas.toJSON();
}

function load(json) {
  canvas.loadFromJSON(json, () => canvas.renderAll());
}

export function addPage() {
  pages.push({ json: null });
  pageIndex = pages.length - 1;
  renderPage();
}

export function duplicatePage() {
  pages.splice(pageIndex + 1, 0, {
    json: pages[pageIndex].json
  });
  pageIndex++;
  renderPage();
}

export function prevPage() {
  if (pageIndex > 0) {
    saveCurrent();
    pageIndex--;
    renderPage();
  }
}

export function nextPage() {
  if (pageIndex < pages.length - 1) {
    saveCurrent();
    pageIndex++;
    renderPage();
  }
}

function saveCurrent() {
  pages[pageIndex].json = serialize();
  saveProject({ pages });
}

function renderPage() {
  canvas.clear();
  canvas.setBackgroundColor("#fff", canvas.renderAll.bind(canvas));
  if (pages[pageIndex].json) {
    load(pages[pageIndex].json);
  }
  updatePageInfo();
}

function updatePageInfo() {
  const el = document.getElementById("pageInfo");
  if (el) el.textContent = `${pageIndex + 1} / ${pages.length}`;
}

export function addText() {
  const t = new fabric.Textbox("Text", {
    left: 200,
    top: 200,
    fontSize: 40,
    fill: "#000"
  });
  canvas.add(t);
}

export function addRect() {
  canvas.add(new fabric.Rect({
    left: 100, top: 100, width: 200, height: 150, fill: "#f00"
  }));
}

export function addCircle() {
  canvas.add(new fabric.Circle({
    left: 150, top: 150, radius: 80, fill: "#00f"
  }));
}

export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = async e => {
    const url = await uploadImage(e.target.result);
    fabric.Image.fromURL(url, img => {
      img.scaleToWidth(300);
      canvas.add(img);
    }, { crossOrigin: "anonymous" });
  };
  reader.readAsDataURL(file);
}

export function zoomIn() {
  zoom = Math.min(zoom + 0.1, 2);
  canvas.setZoom(zoom);
  updateZoom();
}

export function zoomOut() {
  zoom = Math.max(zoom - 0.1, 0.4);
  canvas.setZoom(zoom);
  updateZoom();
}

function updateZoom() {
  document.getElementById("zoomValue").textContent =
    Math.round(zoom * 100) + "%";
}

export function exportFlipbook() {
  saveCurrent();
  const html = `
  <html><head>
  <script src="https://unpkg.com/page-flip/dist/js/page-flip.browser.js"></script>
  </head>
  <body>
  <div id="book"></div>
  <script>
  const pages = ${JSON.stringify(pages.map(p => p.json))};
  const flip = new St.PageFlip(document.getElementById('book'),{width:900,height:1200});
  const els = pages.map(p=>{
    const d=document.createElement('div');
    const c=document.createElement('canvas');
    d.appendChild(c);
    const cv=new fabric.Canvas(c,{width:900,height:1200});
    cv.loadFromJSON(p);
    return d;
  });
  flip.loadFromHTML(els);
  </script>
  </body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}
