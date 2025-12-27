// js/core.js
// =======================
// FABRIC CORE
// =======================

export let canvas;
export let pages = [];
export let currentPage = 0;

const DEFAULT_SIZE = { w: 1240, h: 1754 }; // A4 portrait
let zoom = 1;

// -----------------------
// INIT
// -----------------------
export function initCanvas() {
  canvas = new fabric.Canvas("canvas", {
    backgroundColor: "#ffffff",
    preserveObjectStacking: true
  });

  resizeCanvas(DEFAULT_SIZE.w, DEFAULT_SIZE.h);
  pages = [canvas.toJSON()];
  currentPage = 0;

  console.log("✅ Canvas initialized");
}

// -----------------------
// CANVAS SIZE + ZOOM
// -----------------------
export function resizeCanvas(w, h) {
  canvas.setWidth(w);
  canvas.setHeight(h);
  fitToScreen();
}

export function setZoom(z) {
  zoom = Math.max(0.1, Math.min(3, z));
  canvas.setZoom(zoom);
  canvas.requestRenderAll();
}

export function getZoom() {
  return zoom;
}

export function resetZoom() {
  zoom = 1;
  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  canvas.requestRenderAll();
}

export function fitToScreen() {
  const host = document.getElementById("canvasHost");
  if (!host) return;

  const scale = Math.min(
    host.clientWidth / canvas.width,
    host.clientHeight / canvas.height
  );

  zoom = scale;
  canvas.setZoom(scale);
  canvas.requestRenderAll();
}

// -----------------------
// TEXT
// -----------------------
export function addText() {
  const center = canvas.getCenter();
  const t = new fabric.Textbox("Text", {
    left: center.left,
    top: center.top,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111"
  });

  canvas.add(t);
  canvas.setActiveObject(t);
  canvas.requestRenderAll();
}

// -----------------------
// IMAGE
// -----------------------
export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    fabric.Image.fromURL(e.target.result, img => {
      img.scaleToWidth(canvas.width * 0.6);
      img.set({
        left: canvas.width / 2,
        top: canvas.height / 2,
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

// -----------------------
// PAGES
// -----------------------
export function savePage() {
  pages[currentPage] = canvas.toJSON();
}

export function addPage() {
  savePage();
  pages.push({ objects: [], background: "#ffffff" });
  currentPage = pages.length - 1;
  canvas.clear();
  canvas.setBackgroundColor("#ffffff", canvas.renderAll.bind(canvas));
}

export function goToPage(i) {
  if (i < 0 || i >= pages.length) return;
  savePage();
  currentPage = i;
  canvas.loadFromJSON(pages[i], () => canvas.renderAll());
}

export function pageInfo() {
  return { current: currentPage + 1, total: pages.length };
}

// -----------------------
// FLIPBOOK
// -----------------------
export function previewFlipbook() {
  savePage();

  const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Flipbook</title>
<style>
body{margin:0;background:#111;display:flex;align-items:center;justify-content:center}
img{max-width:90vw;max-height:90vh}
</style>
</head>
<body>
${pages.map(p => `<img src="${fabric.util.object.clone(p).backgroundImage?.src || ''}">`).join("")}
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  return URL.createObjectURL(blob);
}
