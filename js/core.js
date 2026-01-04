// js/core.js
// STABLE CORE – canvas size fixed, pages safe, flipbook OK

export let fabricCanvas = null;

const PAGE_WIDTH = 794;   // A4 @ 96dpi
const PAGE_HEIGHT = 1123;

let pages = [];
let currentPage = 0;
let zoom = 1;

// --------------------
// INIT
// --------------------
export function initCanvas() {
  fabricCanvas = new fabric.Canvas("canvas", {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    backgroundColor: "#ffffff",
    preserveObjectStacking: true
  });

  pages = [serialize()];
  currentPage = 0;

  renderPage(0);
  console.log("✅ Canvas initialized");
}

// --------------------
// PAGE SYSTEM
// --------------------
function serialize() {
  return fabricCanvas.toJSON();
}

function load(json) {
  fabricCanvas.loadFromJSON(json, () => {
    fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    fabricCanvas.renderAll();
  });
}

export function renderPage(index) {
  if (index < 0 || index >= pages.length) return;
  fabricCanvas.clear();
  fabricCanvas.setBackgroundColor("#fff", () => {});
  load(pages[index]);
  currentPage = index;
}

export function saveCurrentPage() {
  pages[currentPage] = serialize();
}

export function addPage() {
  saveCurrentPage();
  pages.push(JSON.parse(JSON.stringify(pages[currentPage]))); // clone
  currentPage = pages.length - 1;
  renderPage(currentPage);
}

export function nextPage() {
  saveCurrentPage();
  if (currentPage < pages.length - 1) renderPage(currentPage + 1);
}

export function prevPage() {
  saveCurrentPage();
  if (currentPage > 0) renderPage(currentPage - 1);
}

// --------------------
// TEXT
// --------------------
export function addText() {
  const t = new fabric.Textbox("Text", {
    left: PAGE_WIDTH / 2,
    top: PAGE_HEIGHT / 2,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111",
    fontFamily: "Arial"
  });

  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
  fabricCanvas.renderAll();
  saveCurrentPage();
}

export function setFontFamily(font) {
  const o = fabricCanvas.getActiveObject();
  if (!o || o.type !== "textbox") return;
  o.set("fontFamily", font);
  fabricCanvas.renderAll();
  saveCurrentPage();
}

export function setFontSize(size) {
  const o = fabricCanvas.getActiveObject();
  if (!o || o.type !== "textbox") return;
  o.set("fontSize", size);
  fabricCanvas.renderAll();
  saveCurrentPage();
}

export function setTextColor(color) {
  const o = fabricCanvas.getActiveObject();
  if (!o) return;
  o.set("fill", color);
  fabricCanvas.renderAll();
  saveCurrentPage();
}

// --------------------
// IMAGES
// --------------------
export function addImageFromFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    fabric.Image.fromURL(e.target.result, img => {
      img.scaleToWidth(400);
      img.set({
        left: PAGE_WIDTH / 2,
        top: PAGE_HEIGHT / 2,
        originX: "center",
        originY: "center"
      });
      fabricCanvas.add(img);
      fabricCanvas.renderAll();
      saveCurrentPage();
    });
  };
  reader.readAsDataURL(file);
}

// --------------------
// SHAPES
// --------------------
export function addRect() {
  fabricCanvas.add(new fabric.Rect({
    width: 200,
    height: 120,
    fill: "#ff5252",
    left: 200,
    top: 200
  }));
  saveCurrentPage();
}

export function addCircle() {
  fabricCanvas.add(new fabric.Circle({
    radius: 60,
    fill: "#42a5f5",
    left: 300,
    top: 300
  }));
  saveCurrentPage();
}

export function addLine() {
  fabricCanvas.add(new fabric.Line([0, 0, 200, 0], {
    stroke: "#000",
    strokeWidth: 4,
    left: 250,
    top: 400
  }));
  saveCurrentPage();
}

// --------------------
// ZOOM (CANVAS)
// --------------------
export function zoomIn() {
  zoom *= 1.1;
  fabricCanvas.setZoom(zoom);
}

export function zoomOut() {
  zoom /= 1.1;
  fabricCanvas.setZoom(zoom);
}

export function zoomReset() {
  zoom = 1;
  fabricCanvas.setZoom(1);
  fabricCanvas.setViewportTransform([1,0,0,1,0,0]);
}

// --------------------
// FLIPBOOK EXPORT (ALL PAGES)
// --------------------
export function exportFlipbook() {
  saveCurrentPage();

  const images = pages.map(page => {
    const c = document.createElement("canvas");
    c.width = PAGE_WIDTH;
    c.height = PAGE_HEIGHT;
    const temp = new fabric.StaticCanvas(c);
    temp.loadFromJSON(page, () => temp.renderAll());
    return c.toDataURL("image/png");
  });

  const html = `
  <html>
  <head>
    <style>
      body{margin:0;background:#111;display:flex;justify-content:center}
      .book{display:flex;gap:20px;padding:20px}
      img{max-height:90vh;box-shadow:0 10px 30px rgba(0,0,0,.5)}
    </style>
  </head>
  <body>
    <div class="book">
      ${images.map(i => `<img src="${i}">`).join("")}
    </div>
  </body>
  </html>`;

  const w = window.open();
  w.document.write(html);
}
