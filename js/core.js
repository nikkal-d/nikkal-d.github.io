// js/core.js
// ===============================
// FABRIC CORE – STABLE BASE
// ===============================

let canvas;
let pages = [];
let currentPage = 0;

// ---------- INIT ----------
export function initCanvas() {
  canvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true
  });

  setPageSize("A4P");
  addPage(true);
  renderPage();

  console.log("✅ Canvas initialized");
}

// ---------- PAGE SIZES ----------
const PAGE_SIZES = {
  A4P: { w: 1240, h: 1754 },
  A4L: { w: 1754, h: 1240 },
  SQUARE: { w: 1400, h: 1400 },
  STORY: { w: 1080, h: 1920 },
  HD: { w: 1920, h: 1080 }
};

export function setPageSize(key) {
  const p = PAGE_SIZES[key];
  if (!p) return;

  canvas.setWidth(p.w);
  canvas.setHeight(p.h);
  canvas.setBackgroundColor("#ffffff", canvas.renderAll.bind(canvas));
  fitCanvas();
}

// ---------- FIT ----------
export function fitCanvas() {
  const host = document.getElementById("canvasHost");
  if (!host) return;

  const scale = Math.min(
    host.clientWidth / canvas.getWidth(),
    host.clientHeight / canvas.getHeight()
  );

  canvas.setZoom(scale * 0.9);
  canvas.viewportTransform[4] = 0;
  canvas.viewportTransform[5] = 0;
  canvas.requestRenderAll();
}

// ---------- ZOOM ----------
let zoom = 1;

export function zoomIn() {
  zoom = Math.min(3, zoom + 0.1);
  canvas.setZoom(zoom);
}
export function zoomOut() {
  zoom = Math.max(0.2, zoom - 0.1);
  canvas.setZoom(zoom);
}
export function resetZoom() {
  zoom = 1;
  canvas.setZoom(1);
}

// ---------- TEXT ----------
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
}

// ---------- IMAGE ----------
export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      img.scaleToWidth(canvas.getWidth() * 0.5);
      img.set({
        left: canvas.getWidth() / 2,
        top: canvas.getHeight() / 2,
        originX: "center",
        originY: "center"
      });
      canvas.add(img);
      canvas.setActiveObject(img);
    });
  };
  reader.readAsDataURL(file);
}

// ---------- PAGES ----------
export function addPage(initial = false) {
  if (!initial) savePage();

  pages.push(null);
  currentPage = pages.length - 1;
  canvas.clear();
}

function savePage() {
  pages[currentPage] = canvas.toJSON();
}

export function renderPage() {
  canvas.clear();
  if (!pages[currentPage]) return;

  canvas.loadFromJSON(pages[currentPage], () => {
    canvas.renderAll();
  });
}

export function nextPage() {
  if (currentPage >= pages.length - 1) return;
  savePage();
  currentPage++;
  renderPage();
}

export function prevPage() {
  if (currentPage <= 0) return;
  savePage();
  currentPage--;
  renderPage();
}

// ---------- FLIPBOOK EXPORT ----------
export function exportFlipbook() {
  const win = window.open("", "_blank");
  const imgs = pages.map(p => {
    canvas.loadFromJSON(p, () => {});
    return canvas.toDataURL("image/png");
  });

  win.document.write(`
    <html>
    <head>
      <title>Flipbook</title>
      <style>
        body{margin:0;background:#111;display:flex;justify-content:center}
        img{max-width:100vw;max-height:100vh}
      </style>
    </head>
    <body>
      ${imgs.map(i => `<img src="${i}"/>`).join("")}
    </body>
    </html>
  `);
}
