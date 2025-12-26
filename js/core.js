// core.js
let canvas;
let pages = [];
let currentPage = 0;
let zoomLevel = 1;

window.addEventListener("DOMContentLoaded", () => {
  canvas = new fabric.Canvas("canvas", {
    backgroundColor: "#fff",
    preserveObjectStacking: true
  });

  console.log("✅ Canvas initialized");

  createPage(); // πρώτη σελίδα
});

/* ---------------- PAGES ---------------- */

function createPage() {
  pages.push({
    json: null
  });
  currentPage = pages.length - 1;
  canvas.clear();
  canvas.setBackgroundColor("#fff", canvas.renderAll.bind(canvas));
}

function savePage() {
  pages[currentPage].json = canvas.toJSON();
}

function loadPage(index) {
  if (!pages[index]) return;
  savePage();
  currentPage = index;
  canvas.clear();
  if (pages[index].json) {
    canvas.loadFromJSON(pages[index].json, canvas.renderAll.bind(canvas));
  }
}

/* ---------------- TEXT ---------------- */

export function addText() {
  const t = new fabric.Textbox("Text", {
    left: canvas.getWidth() / 2,
    top: canvas.getHeight() / 2,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111"
  });
  canvas.add(t);
  canvas.setActiveObject(t);
  canvas.renderAll();
}

/* ---------------- IMAGE ---------------- */

export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    fabric.Image.fromURL(e.target.result, img => {
      img.set({
        left: canvas.getWidth() / 2,
        top: canvas.getHeight() / 2,
        originX: "center",
        originY: "center"
      });
      img.scaleToWidth(canvas.getWidth() * 0.6);
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
    });
  };
  reader.readAsDataURL(file);
}

/* ---------------- ZOOM (CANVAS) ---------------- */

export function setZoom(delta) {
  zoomLevel = Math.min(3, Math.max(0.2, zoomLevel + delta));
  canvas.setZoom(zoomLevel);
  canvas.renderAll();
}

export function resetZoom() {
  zoomLevel = 1;
  canvas.setZoom(1);
  canvas.renderAll();
}

/* ---------------- SIZE ---------------- */

export function setCanvasSize(w, h) {
  canvas.setWidth(w);
  canvas.setHeight(h);
  canvas.renderAll();
}

/* ---------------- FLIPBOOK EXPORT ---------------- */

export function exportFlipbook() {
  savePage();

  const pagesHTML = pages.map((p, i) => {
    return `
      <div class="page">
        <img src="${canvas.toDataURL({ format: "png" })}">
      </div>
    `;
  }).join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
<style>
body { background:#111; display:flex; justify-content:center; }
.book { display:flex; gap:20px; }
.page img { width:400px; box-shadow:0 0 20px #000; }
</style>
</head>
<body>
<div class="book">${pagesHTML}</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "flipbook.html";
  a.click();
}
