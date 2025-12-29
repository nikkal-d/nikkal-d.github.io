// js/core.js

export let canvas = null;

// --------------------
// STATE
// --------------------
let pages = [];
let currentPage = 0;
let zoom = 1;

// --------------------
// INIT
// --------------------
export function initCanvas() {
  canvas = new fabric.Canvas("canvas", {
    backgroundColor: "#ffffff",
    preserveObjectStacking: true,
  });

  resizeCanvas(900, 1270); // A4 portrait πιο άνετο
  pages = [];
  saveCurrentPage(); // αρχική σελίδα
  loadPage(0);
  applyZoom(1);

  console.log("✅ Canvas initialized");
}

// --------------------
// PAGES
// --------------------
function saveCurrentPage() {
  pages[currentPage] = canvas.toJSON();
}

function loadPage(index) {
  canvas.clear();
  canvas.loadFromJSON(pages[index], () => {
    canvas.renderAll();
  });
}

export function addPage() {
  saveCurrentPage();
  pages.push({ objects: [] });
  currentPage = pages.length - 1;
  loadPage(currentPage);
}

export function prevPage() {
  if (currentPage === 0) return;
  saveCurrentPage();
  currentPage--;
  loadPage(currentPage);
}

export function nextPage() {
  if (currentPage >= pages.length - 1) return;
  saveCurrentPage();
  currentPage++;
  loadPage(currentPage);
}

export function getPageInfo() {
  return { current: currentPage + 1, total: pages.length };
}

// --------------------
// OBJECTS
// --------------------
export function addText() {
  const c = canvas.getCenter();
  const t = new fabric.Textbox("Text", {
    left: c.left,
    top: c.top,
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
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, (img) => {
      const c = canvas.getCenter();
      img.set({
        left: c.left,
        top: c.top,
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

// --------------------
// ZOOM (VIEWPORT)
// --------------------
export function applyZoom(value) {
  zoom = Math.max(0.25, Math.min(3, value));
  canvas.setZoom(zoom);

  const w = canvas.getWidth();
  const h = canvas.getHeight();
  const vpt = canvas.viewportTransform;

  vpt[4] = (w - w * zoom) / 2;
  vpt[5] = (h - h * zoom) / 2;

  canvas.requestRenderAll();
}

export function getZoom() {
  return zoom;
}

// --------------------
// CANVAS SIZE
// --------------------
export function resizeCanvas(w, h) {
  canvas.setWidth(w);
  canvas.setHeight(h);
  canvas.calcOffset();
  canvas.renderAll();
}
