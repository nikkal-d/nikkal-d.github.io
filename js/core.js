// js/core.js
// ===============================
// CANVAS + PAGES CORE
// ===============================

export let canvas = null;

// pages
let pages = [];
let currentPage = 0;

// zoom
let zoom = 1;

// -------------------------------
// INIT
// -------------------------------
export function initCanvas() {
  canvas = new fabric.Canvas("canvas", {
    backgroundColor: "#ffffff",
    preserveObjectStacking: true,
  });

  // αρχική σελίδα
  pages = [serializeCanvas()];
  currentPage = 0;

  resizeCanvas(800, 1130); // A4 portrait default
  applyZoom(1);

  console.log("✅ Canvas initialized");
}

// -------------------------------
// PAGES
// -------------------------------
function serializeCanvas() {
  return canvas.toJSON();
}

function loadPage(index) {
  canvas.clear();
  canvas.loadFromJSON(pages[index], () => {
    canvas.renderAll();
  });
}

export function addPage() {
  pages[currentPage] = serializeCanvas();
  pages.push(serializeCanvas());
  currentPage = pages.length - 1;
  loadPage(currentPage);
}

export function prevPage() {
  if (currentPage === 0) return;
  pages[currentPage] = serializeCanvas();
  currentPage--;
  loadPage(currentPage);
}

export function nextPage() {
  if (currentPage >= pages.length - 1) return;
  pages[currentPage] = serializeCanvas();
  currentPage++;
  loadPage(currentPage);
}

export function getPageInfo() {
  return { current: currentPage + 1, total: pages.length };
}

// -------------------------------
// OBJECTS
// -------------------------------
export function addText() {
  const center = canvas.getCenter();
  const t = new fabric.Textbox("Text", {
    left: center.left,
    top: center.top,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111",
  });
  canvas.add(t);
  canvas.setActiveObject(t);
  canvas.renderAll();
}

export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    fabric.Image.fromURL(e.target.result, (img) => {
      const center = canvas.getCenter();
      img.set({
        left: center.left,
        top: center.top,
        originX: "center",
        originY: "center",
      });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
    });
  };
  reader.readAsDataURL(file);
}

// -------------------------------
// ZOOM (VIEWPORT ONLY)
// -------------------------------
export function applyZoom(value) {
  zoom = Math.max(0.2, Math.min(3, value));
  canvas.setZoom(zoom);

  // κεντράρισμα viewport
  const vpt = canvas.viewportTransform;
  vpt[4] = (canvas.getWidth() - canvas.getWidth() * zoom) / 2;
  vpt[5] = (canvas.getHeight() - canvas.getHeight() * zoom) / 2;
  canvas.requestRenderAll();
}

export function getZoom() {
  return zoom;
}

// -------------------------------
// CANVAS SIZE
// -------------------------------
export function resizeCanvas(w, h) {
  canvas.setWidth(w);
  canvas.setHeight(h);
  canvas.calcOffset();
  canvas.renderAll();
}
