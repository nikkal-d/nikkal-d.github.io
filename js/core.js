// js/core.js

let canvas;
let pages = [];
let currentPage = 0;

window.__PB_ZOOM__ = 1;

/* ---------- INIT ---------- */
window.addEventListener("DOMContentLoaded", () => {
  canvas = new fabric.Canvas("canvas", {
    backgroundColor: "#ffffff",
    preserveObjectStacking: true
  });

  console.log("✅ Canvas initialized");

  pages.push(canvas.toJSON());
});

/* ---------- TEXT ---------- */
export function addText() {
  const center = canvas.getCenter();
  const text = new fabric.Textbox("Text", {
    left: center.left,
    top: center.top,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111"
  });

  canvas.add(text);
  canvas.setActiveObject(text);
  canvas.requestRenderAll();
}

/* ---------- IMAGE ---------- */
export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, (img) => {
      img.scaleToWidth(canvas.getWidth() * 0.5);
      img.set({
        left: canvas.getCenter().left,
        top: canvas.getCenter().top,
        originX: "center",
        originY: "center"
      });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
    });
  };
  reader.readAsDataURL(file);
}

/* ---------- ZOOM (CANVAS) ---------- */
export function zoomIn() {
  setZoom(window.__PB_ZOOM__ + 0.1);
}
export function zoomOut() {
  setZoom(window.__PB_ZOOM__ - 0.1);
}
export function resetZoom() {
  setZoom(1);
}

function setZoom(z) {
  window.__PB_ZOOM__ = Math.max(0.2, Math.min(4, z));
  canvas.setZoom(window.__PB_ZOOM__);
  canvas.requestRenderAll();
}

/* ---------- PAGES ---------- */
export function addPage() {
  pages[currentPage] = canvas.toJSON();
  canvas.clear();
  canvas.setBackgroundColor("#ffffff", canvas.renderAll.bind(canvas));
  pages.push(canvas.toJSON());
  currentPage = pages.length - 1;
}

export function prevPage() {
  if (currentPage === 0) return;
  savePage();
  currentPage--;
  loadPage();
}

export function nextPage() {
  if (currentPage >= pages.length - 1) return;
  savePage();
  currentPage++;
  loadPage();
}

function savePage() {
  pages[currentPage] = canvas.toJSON();
}

function loadPage() {
  canvas.loadFromJSON(pages[currentPage], () => {
    canvas.renderAll();
  });
}

/* ---------- EXPORT FLIPBOOK ---------- */
export function exportFlipbook() {
  savePage();

  const win = window.open("", "_blank");
  const pagesHTML = pages
    .map(
      (p) =>
        `<div class="page"><img src="${canvas.toDataURL({
          format: "png"
        })}"></div>`
    )
    .join("");

  win.document.write(`
    <html>
    <head>
      <style>
        body{margin:0;background:#111;display:flex;justify-content:center}
        .book{display:flex;gap:20px;padding:40px}
        .page img{max-width:400px;box-shadow:0 10px 30px rgba(0,0,0,.4)}
      </style>
    </head>
    <body>
      <div class="book">${pagesHTML}</div>
    </body>
    </html>
  `);
}
