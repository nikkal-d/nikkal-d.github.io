// core.js
// ===================================================
// FABRIC CORE (global fabric, no ES imports)
// ===================================================

export let canvas = null;
export let pages = [];
export let currentPage = 0;
let zoom = 1;

const DRAFT_KEY = "photobook_draft_v2";

// ---------------- INIT ----------------
export function initCanvas() {
  if (!window.fabric) {
    console.error("Fabric not loaded");
    return;
  }

  canvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true
  });

  setCanvasSize(1240, 1754);
  addPage(true);
  console.log("✅ Canvas initialized");
}

// ---------------- CANVAS SIZE ----------------
export function setCanvasSize(w, h) {
  canvas.setWidth(w);
  canvas.setHeight(h);
  canvas.setBackgroundColor("#fff", canvas.renderAll.bind(canvas));
  fitToScreen();
}

export function fitToScreen() {
  const host = document.getElementById("canvasHost");
  if (!host) return;

  const scale = Math.min(
    host.clientWidth / canvas.getWidth(),
    host.clientHeight / canvas.getHeight()
  );

  setZoom(scale);
}

// ---------------- ZOOM ----------------
export function setZoom(value) {
  zoom = Math.max(0.2, Math.min(4, value));
  const center = canvas.getCenter();
  canvas.zoomToPoint(new fabric.Point(center.left, center.top), zoom);
  canvas.requestRenderAll();
}

export function getZoom() {
  return zoom;
}

// ---------------- TEXT ----------------
export function addText() {
  const center = canvas.getCenter();
  const t = new fabric.Textbox("Text", {
    left: center.left,
    top: center.top,
    originX: "center",
    originY: "center",
    fontSize: 42,
    fill: "#111"
  });
  canvas.add(t);
  canvas.setActiveObject(t);
}

// ---------------- IMAGES ----------------
export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      img.scaleToWidth(canvas.getWidth() * 0.4);
      img.set({
        left: canvas.getCenter().left,
        top: canvas.getCenter().top,
        originX: "center",
        originY: "center"
      });
      canvas.add(img);
      canvas.setActiveObject(img);
    });
  };
  reader.readAsDataURL(file);
}

// ---------------- PAGES ----------------
export function addPage(initial = false) {
  pages.push({ json: null });
  currentPage = pages.length - 1;

  if (!initial) {
    canvas.clear();
    canvas.setBackgroundColor("#fff", canvas.renderAll.bind(canvas));
  }

  savePage();
}

export function savePage() {
  if (!pages[currentPage]) return;
  pages[currentPage].json = canvas.toJSON();
}

export function goToPage(index) {
  savePage();
  currentPage = index;
  canvas.loadFromJSON(pages[currentPage].json, () => {
    canvas.renderAll();
    fitToScreen();
  });
}

// ---------------- DRAFT (SAFE) ----------------
export function saveDraft() {
  try {
    savePage();
    const lightPages = pages.map(p => ({ json: p.json }));
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      pages: lightPages,
      currentPage
    }));
  } catch (e) {
    console.warn("Draft skipped (quota)");
  }
}

// ---------------- FLIPBOOK EXPORT ----------------
export function exportFlipbook() {
  savePage();

  const pagesHTML = pages.map(p => {
    return `<div class="page"><img src="${canvas.toDataURL()}" /></div>`;
  }).join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
<style>
body{margin:0;background:#111}
.book{display:flex;overflow-x:auto}
.page{min-width:100vw}
.page img{width:100%}
</style>
</head>
<body>
<div class="book">${pagesHTML}</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "flipbook.html";
  a.click();
}
