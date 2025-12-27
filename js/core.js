// js/core.js
/* GLOBAL FABRIC */
let canvas = null;

/* ===============================
   STATE
================================ */
let pages = [];
let currentPage = 0;
let zoom = 1;

/* ===============================
   INIT
================================ */
export function initCanvas() {
  canvas = new fabric.Canvas("canvas", {
    backgroundColor: "#ffffff",
    preserveObjectStacking: true,
  });

  setCanvasSize("A4P");
  addPage(); // πρώτη σελίδα
  renderPage();

  console.log("✅ Canvas initialized");
}

window.addEventListener("DOMContentLoaded", initCanvas);

/* ===============================
   CANVAS SIZE
================================ */
export function setCanvasSize(preset) {
  const sizes = {
    A4P: [1240, 1754],
    A4L: [1754, 1240],
    SQUARE: [1200, 1200],
    HD: [1920, 1080],
  };

  const [w, h] = sizes[preset] || sizes.A4P;

  canvas.setWidth(w);
  canvas.setHeight(h);
  canvas.calcOffset();
  canvas.requestRenderAll();
}

/* ===============================
   ZOOM (CANVAS)
================================ */
export function setZoom(value) {
  zoom = Math.max(0.25, Math.min(3, value));
  canvas.setZoom(zoom);
  canvas.requestRenderAll();
}

export function zoomIn() {
  setZoom(zoom + 0.1);
}
export function zoomOut() {
  setZoom(zoom - 0.1);
}
export function zoomReset() {
  setZoom(1);
}

/* ===============================
   PAGES
================================ */
export function addPage() {
  pages.push([]);
  currentPage = pages.length - 1;
}

export function goToPage(index) {
  if (index < 0 || index >= pages.length) return;
  saveCurrentPage();
  currentPage = index;
  renderPage();
}

function saveCurrentPage() {
  pages[currentPage] = canvas.toJSON();
}

function renderPage() {
  canvas.clear();
  canvas.backgroundColor = "#ffffff";

  const data = pages[currentPage];
  if (data) {
    canvas.loadFromJSON(data, () => {
      canvas.requestRenderAll();
    });
  }
}

/* ===============================
   OBJECTS
================================ */
export function addText() {
  const t = new fabric.Textbox("Text", {
    left: canvas.getWidth() / 2,
    top: canvas.getHeight() / 2,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111",
  });

  canvas.add(t);
  canvas.setActiveObject(t);
  canvas.requestRenderAll();
}

export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    fabric.Image.fromURL(e.target.result, (img) => {
      img.scaleToWidth(canvas.getWidth() * 0.6);
      img.set({
        left: canvas.getWidth() / 2,
        top: canvas.getHeight() / 2,
        originX: "center",
        originY: "center",
      });
      canvas.add(img);
      canvas.requestRenderAll();
    });
  };
  reader.readAsDataURL(file);
}

/* ===============================
   FLIPBOOK EXPORT
================================ */
export function exportFlipbookHTML() {
  saveCurrentPage();

  const pagesHTML = pages
    .map((p, i) => {
      return `
      <div class="page">
        <img src="${canvasToImage(p)}"/>
      </div>`;
    })
    .join("");

  const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Flipbook</title>
<style>
body{margin:0;background:#111;display:flex;justify-content:center}
.book{display:flex;gap:10px}
.page img{width:600px;background:#fff}
</style>
</head>
<body>
<div class="book">${pagesHTML}</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  return URL.createObjectURL(blob);
}

function canvasToImage(json) {
  const tmp = new fabric.StaticCanvas(null, {
    width: canvas.getWidth(),
    height: canvas.getHeight(),
  });

  tmp.loadFromJSON(json, () => {
    tmp.renderAll();
  });

  return tmp.toDataURL({ format: "png" });
}
