// js/core.js
// Fabric core – stable base (NO localStorage autosave, page-safe)

export let fabricCanvas = null;

let pages = [];
let currentPage = 0;

// --------------------
// INIT
// --------------------
export function initCanvas() {
  fabricCanvas = new fabric.Canvas("canvas", {
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
  return fabricCanvas.toJSON(["selectable", "evented"]);
}

function load(json) {
  fabricCanvas.loadFromJSON(json, () => {
    fabricCanvas.setViewportTransform([1,0,0,1,0,0]);
    fabricCanvas.renderAll();
  });
}

export function renderPage(index) {
  if (index < 0 || index >= pages.length) return;
  fabricCanvas.clear();
  fabricCanvas.backgroundColor = "#ffffff";
  load(pages[index]);
  currentPage = index;
}

export function saveCurrentPage() {
  pages[currentPage] = serialize();
}

export function addPage() {
  saveCurrentPage();
  pages.push(pages[currentPage]); // clone page
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

export function getPages() {
  return pages;
}

// --------------------
// TEXT
// --------------------
export function addText() {
  const t = new fabric.Textbox("Text", {
    left: fabricCanvas.width / 2,
    top: fabricCanvas.height / 2,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111",
    fontFamily: "Inter"
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
  const reader = new FileReader();
  reader.onload = e => {
    fabric.Image.fromURL(e.target.result, img => {
      img.scaleToWidth(400);
      img.set({
        left: fabricCanvas.width / 2,
        top: fabricCanvas.height / 2,
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
  const r = new fabric.Rect({
    width: 200,
    height: 120,
    fill: "#ff0000",
    left: 200,
    top: 200
  });
  fabricCanvas.add(r);
  saveCurrentPage();
}

export function addCircle() {
  const c = new fabric.Circle({
    radius: 60,
    fill: "#00aaee",
    left: 250,
    top: 250
  });
  fabricCanvas.add(c);
  saveCurrentPage();
}

export function addLine() {
  const l = new fabric.Line([0, 0, 200, 0], {
    stroke: "#000",
    strokeWidth: 4,
    left: 200,
    top: 300
  });
  fabricCanvas.add(l);
  saveCurrentPage();
}

// --------------------
// ZOOM (CANVAS, όχι αντικείμενο)
// --------------------
let zoom = 1;

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
}

// --------------------
// FLIPBOOK EXPORT (ALL PAGES)
// --------------------
export function exportFlipbook() {
  saveCurrentPage();

  const images = pages.map(p =>
    fabric.util.enlivenObjects(p.objects, () => {
      const c = document.createElement("canvas");
      c.width = fabricCanvas.width;
      c.height = fabricCanvas.height;
      const temp = new fabric.StaticCanvas(c);
      temp.loadFromJSON(p, () => temp.renderAll());
      return c.toDataURL("image/png");
    })
  );

  const html = `
  <html>
  <head>
    <style>
      body{margin:0;background:#111;display:flex;justify-content:center}
      .book{display:flex;gap:20px}
      img{max-height:90vh}
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
