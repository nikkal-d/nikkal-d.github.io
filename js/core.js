// js/core.js
// ΣΤΑΘΕΡΟΣ ΠΥΡΗΝΑΣ – canvas, pages, zoom, export flipbook

window.pages = [];
window.currentPage = 0;
window.canvas = null;

const PAGE_SIZES = {
  A4P: { w: 1240, h: 1754 },
  A4L: { w: 1754, h: 1240 },
  SQUARE: { w: 1400, h: 1400 },
  HD: { w: 1920, h: 1080 },
};

function createCanvas(w, h) {
  const el = document.getElementById("canvas");
  el.width = w;
  el.height = h;

  window.canvas = new fabric.Canvas("canvas", {
    backgroundColor: "#ffffff",
    preserveObjectStacking: true,
  });

  centerCanvas();
}

function centerCanvas() {
  const frame = document.getElementById("canvasFrame");
  frame.style.width = canvas.width + "px";
  frame.style.height = canvas.height + "px";
}

function savePage(index) {
  pages[index] = canvas.toJSON();
}

function loadPage(index) {
  canvas.clear();
  canvas.loadFromJSON(pages[index], () => {
    canvas.renderAll();
  });
}

function addPage() {
  savePage(currentPage);
  pages.push({ version: "5.3.0", objects: [], background: "#ffffff" });
  currentPage = pages.length - 1;
  loadPage(currentPage);
  updatePageInfo();
}

function goToPage(i) {
  if (i < 0 || i >= pages.length) return;
  savePage(currentPage);
  currentPage = i;
  loadPage(currentPage);
  updatePageInfo();
}

function updatePageInfo() {
  const el = document.getElementById("pageInfo");
  if (el) el.textContent = `${currentPage + 1} / ${pages.length}`;
}

function setPageSize(key) {
  const s = PAGE_SIZES[key];
  if (!s) return;
  savePage(currentPage);
  canvas.setWidth(s.w);
  canvas.setHeight(s.h);
  centerCanvas();
  loadPage(currentPage);
}

// -------- ZOOM (ΚΑΜΒΑΣ, ΟΧΙ ΑΝΤΙΚΕΙΜΕΝΑ) --------
window.zoomLevel = 1;

function applyZoom(z) {
  zoomLevel = Math.max(0.2, Math.min(3, z));
  canvas.setZoom(zoomLevel);
  document.getElementById("zoomValue").textContent =
    Math.round(zoomLevel * 100) + "%";
}

// -------- TEXT --------
function addText() {
  const t = new fabric.Textbox("Text", {
    left: canvas.width / 2,
    top: canvas.height / 2,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111",
  });
  canvas.add(t);
  canvas.setActiveObject(t);
}

// -------- FLIPBOOK EXPORT --------
function exportFlipbook() {
  savePage(currentPage);

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
<meta charset="utf-8">
<title>Flipbook</title>
<style>
body{margin:0;background:#111;display:flex;justify-content:center}
.book{display:flex;gap:10px;padding:20px}
.page img{width:600px;background:#fff}
</style>
</head>
<body>
<div class="book">${pagesHTML}</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

function canvasToImage(json) {
  const c = new fabric.StaticCanvas(null, {
    width: canvas.width,
    height: canvas.height,
  });
  c.loadFromJSON(json, () => {});
  return c.toDataURL({ format: "png" });
}

// -------- INIT --------
window.addEventListener("DOMContentLoaded", () => {
  createCanvas(1240, 1754);
  pages.push(canvas.toJSON());
  updatePageInfo();
});

// EXPOSE
window.addPage = addPage;
window.goToPage = goToPage;
window.addText = addText;
window.applyZoom = applyZoom;
window.setPageSize = setPageSize;
window.exportFlipbook = exportFlipbook;
