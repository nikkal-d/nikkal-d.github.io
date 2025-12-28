// js/core.js
let canvas;
let pages = [];
let currentPageIndex = 0;
let zoom = 1;

// ================= INIT =================
export function initCanvas() {
  canvas = new fabric.Canvas("canvas", {
    backgroundColor: "#ffffff",
    preserveObjectStacking: true,
  });

  pages = [emptyPage()];
  renderPage(0);

  console.log("✅ Canvas initialized");
}

// ================= PAGES =================
function emptyPage() {
  return { json: null };
}

function saveCurrentPage() {
  pages[currentPageIndex].json = canvas.toJSON();
}

export function addPage() {
  saveCurrentPage();
  pages.push(emptyPage());
  currentPageIndex = pages.length - 1;
  renderPage(currentPageIndex);
}

export function goToPage(index) {
  if (index < 0 || index >= pages.length) return;
  saveCurrentPage();
  currentPageIndex = index;
  renderPage(index);
}

function renderPage(index) {
  canvas.clear();
  canvas.setBackgroundColor("#ffffff", canvas.renderAll.bind(canvas));

  const page = pages[index];
  if (page.json) {
    canvas.loadFromJSON(page.json, () => {
      canvas.renderAll();
      applyZoom();
    });
  } else {
    canvas.renderAll();
    applyZoom();
  }
}

export function getPageInfo() {
  return {
    current: currentPageIndex + 1,
    total: pages.length,
  };
}

// ================= ZOOM (CANVAS, ΟΧΙ OBJECT) =================
export function zoomIn() {
  zoom = Math.min(zoom + 0.1, 3);
  applyZoom();
}

export function zoomOut() {
  zoom = Math.max(zoom - 0.1, 0.2);
  applyZoom();
}

export function resetZoom() {
  zoom = 1;
  applyZoom();
}

function applyZoom() {
  canvas.setZoom(zoom);
  canvas.requestRenderAll();
}

export function getZoom() {
  return zoom;
}

// ================= CANVAS SIZE =================
export function setCanvasSize(w, h) {
  canvas.setWidth(w);
  canvas.setHeight(h);
  applyZoom();
}

// ================= TEXT =================
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
}
