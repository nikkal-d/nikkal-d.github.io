// js/core.js
console.log("core.js loaded");

export let canvas;
export let pages = [];
export let currentPage = 0;
export let zoom = 1;

const BASE_WIDTH = 1240;
const BASE_HEIGHT = 1754;

/* ---------------- INIT ---------------- */

export function initCanvas() {
  canvas = new fabric.Canvas("canvas", {
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
    backgroundColor: "#ffffff",
    preserveObjectStacking: true
  });

  pages = [canvas.toJSON()];
  currentPage = 0;

  console.log("✅ Canvas initialized");
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
  canvas.requestRenderAll();
}

/* ---------------- IMAGE ---------------- */

export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      img.set({
        left: canvas.getWidth() / 2,
        top: canvas.getHeight() / 2,
        originX: "center",
        originY: "center",
        scaleX: 0.5,
        scaleY: 0.5
      });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
    });
  };
  reader.readAsDataURL(file);
}

/* ---------------- PAGES ---------------- */

export function savePage() {
  pages[currentPage] = canvas.toJSON();
}

export function addPage() {
  savePage();
  pages.push({});
  currentPage = pages.length - 1;
  canvas.clear();
  canvas.setBackgroundColor("#ffffff", canvas.requestRenderAll.bind(canvas));
}

export function goToPage(index) {
  if (index < 0 || index >= pages.length) return;
  savePage();
  canvas.clear();
  canvas.loadFromJSON(pages[index], () => {
    canvas.requestRenderAll();
  });
  currentPage = index;
}

/* ---------------- ZOOM (ΚΑΜΒΑΣ) ---------------- */

export function applyZoom(value) {
  zoom = value;

  canvas.setWidth(BASE_WIDTH * zoom);
  canvas.setHeight(BASE_HEIGHT * zoom);

  canvas.setZoom(zoom);
  canvas.requestRenderAll();
}

/* ---------------- CANVAS SIZE ---------------- */

export function setCanvasSize(w, h) {
  savePage();
  canvas.setWidth(w * zoom);
  canvas.setHeight(h * zoom);
  canvas.requestRenderAll();
}

/* ---------------- EXPORT ---------------- */

export function exportPagesAsImages() {
  savePage();

  return pages.map(page => {
    const temp = new fabric.StaticCanvas(null, {
      width: BASE_WIDTH,
      height: BASE_HEIGHT
    });
    temp.loadFromJSON(page, () => {});
    return temp.toDataURL({ format: "png" });
  });
}

/* ---------------- FLIPBOOK LINK ---------------- */

export function generateFlipbookLink() {
  savePage();
  const data = encodeURIComponent(JSON.stringify(pages));
  return `${location.origin}${location.pathname.replace("photobook.html","")}flipbook.html#data=${data}`;
}
