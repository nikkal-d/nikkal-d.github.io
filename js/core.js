// js/core.js
// ===============================
// CORE – Fabric canvas & pages
// ===============================

export let canvas;
export let pages = [];
export let currentPage = 0;

// ---------- INIT ----------
export function initCanvas() {
  canvas = new fabric.Canvas("canvas", {
    backgroundColor: "#ffffff",
    preserveObjectStacking: true,
  });

  addPage(); // πρώτη σελίδα
}

// ---------- PAGES ----------
export function addPage(copy = false) {
  if (copy && pages[currentPage]) {
    pages.push(JSON.parse(JSON.stringify(pages[currentPage])));
  } else {
    pages.push({ objects: [] });
  }
  currentPage = pages.length - 1;
  renderPage();
}

export function prevPage() {
  if (currentPage > 0) {
    savePage();
    currentPage--;
    renderPage();
  }
}

export function nextPage() {
  if (currentPage < pages.length - 1) {
    savePage();
    currentPage++;
    renderPage();
  }
}

function savePage() {
  pages[currentPage].objects = canvas.toJSON().objects;
}

function renderPage() {
  canvas.clear();
  canvas.backgroundColor = "#ffffff";

  const page = pages[currentPage];
  if (!page) return;

  fabric.util.enlivenObjects(page.objects, (objs) => {
    objs.forEach(o => canvas.add(o));
    canvas.renderAll();
  });
}

// ---------- TEXT ----------
export function addText() {
  const t = new fabric.Textbox("Text", {
    left: canvas.width / 2,
    top: canvas.height / 2,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111",
  });
  canvas.add(t);
  canvas.setActiveObject(t);
}

// ---------- SHAPES ----------
export function addRect() {
  canvas.add(new fabric.Rect({
    left: 200, top: 200, width: 120, height: 80,
    fill: "#3b82f6"
  }));
}

export function addCircle() {
  canvas.add(new fabric.Circle({
    left: 200, top: 200, radius: 50,
    fill: "#22c55e"
  }));
}

export function addLine() {
  canvas.add(new fabric.Line([0, 0, 200, 0], {
    left: 200, top: 200, stroke: "#111", strokeWidth: 4
  }));
}

// ---------- IMAGE ----------
export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      img.scaleToWidth(300);
      canvas.add(img);
    });
  };
  reader.readAsDataURL(file);
}

// ---------- ZOOM ----------
let zoom = 1;
export function setZoom(z) {
  zoom = Math.min(3, Math.max(0.3, z));
  canvas.setZoom(zoom);
}
export function getZoom() { return zoom; }
