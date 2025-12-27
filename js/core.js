// js/core.js
// ===============================
// SINGLE SOURCE OF TRUTH
// ===============================

export let canvas = null;

let zoom = 1;
let pages = [];
let currentPage = 0;

// ---------------- INIT ----------------
window.addEventListener("DOMContentLoaded", () => {
  canvas = new fabric.Canvas("canvas", {
    backgroundColor: "#ffffff",
    preserveObjectStacking: true
  });

  setCanvasSize("A4P");
  addPage(true);

  console.log("✅ Canvas initialized");
});

// ---------------- CANVAS SIZE ----------------
export function setCanvasSize(preset) {
  const sizes = {
    A4P: [1240, 1754],
    A4L: [1754, 1240],
    SQUARE: [1400, 1400],
    HD: [1920, 1080]
  };

  const [w, h] = sizes[preset] || sizes.A4P;
  canvas.setWidth(w);
  canvas.setHeight(h);
  canvas.requestRenderAll();
}

// ---------------- ZOOM (CANVAS) ----------------
export function setZoom(value) {
  zoom = Math.min(3, Math.max(0.2, value));

  const center = new fabric.Point(
    canvas.getWidth() / 2,
    canvas.getHeight() / 2
  );

  canvas.zoomToPoint(center, zoom);
  canvas.requestRenderAll();
}

export function zoomIn() {
  setZoom(zoom + 0.1);
}
export function zoomOut() {
  setZoom(zoom - 0.1);
}
export function resetZoom() {
  zoom = 1;
  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  canvas.requestRenderAll();
}
export function getZoom() {
  return zoom;
}

// ---------------- TEXT ----------------
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
  canvas.requestRenderAll();

  console.log("✅ Text added");
}

// ---------------- IMAGE ----------------
export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      img.scaleToWidth(canvas.getWidth() * 0.6);
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
    });
  };
  reader.readAsDataURL(file);
}

// ---------------- PAGES ----------------
export function addPage(isFirst = false) {
  if (!isFirst) savePage();

  pages.push(canvas.toJSON());
  currentPage = pages.length - 1;
  updatePageInfo();
}

export function goToPage(index) {
  if (index < 0 || index >= pages.length) return;
  savePage();
  currentPage = index;

  canvas.loadFromJSON(pages[currentPage], () => {
    canvas.requestRenderAll();
  });

  updatePageInfo();
}

function savePage() {
  pages[currentPage] = canvas.toJSON();
}

function updatePageInfo() {
  const el = document.getElementById("pageInfo");
  if (el) el.textContent = `${currentPage + 1} / ${pages.length}`;
}
