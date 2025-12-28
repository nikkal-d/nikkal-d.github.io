// js/core.js
let canvas;
let pages = [];
let currentPage = 0;
let zoom = 1;

const PAGE_SIZES = {
  A4P: { w: 2480, h: 3508 },
  A4L: { w: 3508, h: 2480 },
  SQUARE: { w: 3000, h: 3000 },
  HD: { w: 1920, h: 1080 }
};

export function initCanvas(size = "A4P") {
  const s = PAGE_SIZES[size];
  canvas = new fabric.Canvas("canvas", {
    width: s.w,
    height: s.h,
    backgroundColor: "#fff",
    preserveObjectStacking: true
  });

  pages = [canvas.toJSON()];
  renderPage(0);
  centerCanvas();
}

function renderPage(index) {
  canvas.loadFromJSON(pages[index], () => {
    canvas.renderAll();
  });
}

function saveCurrentPage() {
  pages[currentPage] = canvas.toJSON();
}

export function addPage() {
  saveCurrentPage();
  pages.push({ objects: [], background: "#fff" });
  currentPage = pages.length - 1;
  renderPage(currentPage);
}

export function prevPage() {
  if (currentPage === 0) return;
  saveCurrentPage();
  currentPage--;
  renderPage(currentPage);
}

export function nextPage() {
  if (currentPage === pages.length - 1) return;
  saveCurrentPage();
  currentPage++;
  renderPage(currentPage);
}

export function addText() {
  const t = new fabric.Textbox("Text", {
    left: canvas.width / 2,
    top: canvas.height / 2,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111"
  });
  canvas.add(t);
  canvas.setActiveObject(t);
}

export function setZoom(val) {
  zoom = Math.max(0.2, Math.min(3, val));
  canvas.setZoom(zoom);
  centerCanvas();
}

export function getZoom() {
  return zoom;
}

export function resetZoom() {
  setZoom(1);
}

function centerCanvas() {
  const frame = document.getElementById("canvasFrame");
  frame.style.transform = `scale(${zoom})`;
}

export function exportFlipbook() {
  saveCurrentPage();
  const images = pages.map(p => {
    const c = new fabric.StaticCanvas(null, {
      width: canvas.width,
      height: canvas.height
    });
    c.loadFromJSON(p);
    return c.toDataURL({ format: "png" });
  });

  const w = window.open();
  w.document.write(`
    <style>
      body{margin:0;background:#111;display:flex;justify-content:center}
      img{max-width:90vw;box-shadow:0 0 40px #000}
    </style>
    ${images.map(i => `<img src="${i}">`).join("")}
  `);
}
