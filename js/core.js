// js/core.js
let canvas;
let pages = [];
let currentPage = 0;

// ---------- INIT ----------
export function initCanvas() {
  canvas = new fabric.Canvas("canvas", {
    backgroundColor: "#fff",
    preserveObjectStacking: true
  });
  addPage();
}

// ---------- PAGES ----------
export function addPage() {
  pages.push([]);
  currentPage = pages.length - 1;
  renderPage();
}

export function nextPage() {
  if (currentPage < pages.length - 1) {
    currentPage++;
    renderPage();
  }
}

export function prevPage() {
  if (currentPage > 0) {
    currentPage--;
    renderPage();
  }
}

export function duplicatePage() {
  const copy = pages[currentPage].map(o => fabric.util.object.clone(o));
  pages.push(copy);
  currentPage = pages.length - 1;
  renderPage();
}

function renderPage() {
  canvas.clear();
  canvas.setBackgroundColor("#fff", canvas.renderAll.bind(canvas));
  pages[currentPage].forEach(o => canvas.add(o));
  canvas.renderAll();
}

function savePage() {
  pages[currentPage] = canvas.getObjects().map(o => o);
}

// ---------- HELPERS ----------
function center(o) {
  o.set({
    left: canvas.getWidth() / 2,
    top: canvas.getHeight() / 2,
    originX: "center",
    originY: "center"
  });
}

// ---------- TEXT ----------
export function addText() {
  const t = new fabric.Textbox("Text", {
    fontSize: 48,
    fill: "#111"
  });
  center(t);
  canvas.add(t);
  savePage();
}

// ---------- IMAGES ----------
export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      img.scaleToWidth(300);
      center(img);
      canvas.add(img);
      savePage();
    });
  };
  reader.readAsDataURL(file);
}

// ---------- SHAPES ----------
export function addRect() {
  const r = new fabric.Rect({
    width: 200,
    height: 120,
    fill: "#ccc"
  });
  center(r);
  canvas.add(r);
  savePage();
}

export function addCircle() {
  const c = new fabric.Circle({
    radius: 80,
    fill: "#ddd"
  });
  center(c);
  canvas.add(c);
  savePage();
}

export function addLine() {
  const l = new fabric.Line([0, 0, 200, 0], {
    stroke: "#000",
    strokeWidth: 4
  });
  center(l);
  canvas.add(l);
  savePage();
}

// ---------- EXPORTS ----------
export function exportFlipbook() {
  alert("Flipbook export OK (base)");
}
