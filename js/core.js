// js/core.js
// ===== FABRIC CANVAS CORE =====

export let canvas = null;

let pages = [];
let currentPage = 0;
let zoom = 1;

// ---------- INIT ----------
export function initCanvas() {
  canvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true
  });

  setPageSize(1240, 1754); // A4 portrait
  pages = [{ json: null }];
  renderPage(0);

  console.log("✅ Canvas initialized");
}

// ---------- PAGE SIZE ----------
export function setPageSize(w, h) {
  canvas.setWidth(w);
  canvas.setHeight(h);
  canvas.setBackgroundColor("#ffffff", canvas.renderAll.bind(canvas));
  fitToScreen();
}

// ---------- ZOOM (CANVAS, ΟΧΙ OBJECT) ----------
export function fitToScreen() {
  const host = document.getElementById("canvasHost");
  if (!host) return;

  const scale = Math.min(
    host.clientWidth / canvas.getWidth(),
    host.clientHeight / canvas.getHeight()
  );

  zoom = Math.min(scale, 1);
  canvas.setViewportTransform([zoom, 0, 0, zoom, 0, 0]);
  updateZoomLabel();
}

export function zoomIn() {
  zoom = Math.min(3, zoom + 0.1);
  canvas.setZoom(zoom);
  updateZoomLabel();
}

export function zoomOut() {
  zoom = Math.max(0.1, zoom - 0.1);
  canvas.setZoom(zoom);
  updateZoomLabel();
}

function updateZoomLabel() {
  const el = document.getElementById("zoomValue");
  if (el) el.textContent = Math.round(zoom * 100) + "%";
}

// ---------- OBJECTS ----------
export function addText() {
  const t = new fabric.Textbox("Text", {
    left: canvas.getWidth() / 2,
    top: canvas.getHeight() / 2,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111",
    textBaseline: "alphabetic"
  });
  canvas.add(t);
  canvas.setActiveObject(t);
  savePage();
}

export function addRect() {
  const r = new fabric.Rect({
    width: 300,
    height: 200,
    fill: "#ff0000",
    left: canvas.getWidth() / 2,
    top: canvas.getHeight() / 2,
    originX: "center",
    originY: "center"
  });
  canvas.add(r);
  canvas.setActiveObject(r);
  savePage();
}

export function addCircle() {
  const c = new fabric.Circle({
    radius: 100,
    fill: "#00aaff",
    left: canvas.getWidth() / 2,
    top: canvas.getHeight() / 2,
    originX: "center",
    originY: "center"
  });
  canvas.add(c);
  canvas.setActiveObject(c);
  savePage();
}

// ---------- IMAGES ----------
export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      img.scaleToWidth(canvas.getWidth() * 0.6);
      img.set({
        left: canvas.getWidth() / 2,
        top: canvas.getHeight() / 2,
        originX: "center",
        originY: "center"
      });
      canvas.add(img);
      canvas.setActiveObject(img);
      savePage();
    });
  };
  reader.readAsDataURL(file);
}

// ---------- PAGES ----------
export function addPage() {
  savePage();
  pages.push({ json: null });
  currentPage = pages.length - 1;
  renderPage(currentPage);
}

export function prevPage() {
  if (currentPage === 0) return;
  savePage();
  currentPage--;
  renderPage(currentPage);
}

export function nextPage() {
  if (currentPage >= pages.length - 1) return;
  savePage();
  currentPage++;
  renderPage(currentPage);
