// js/core.js
// Fabric core – stable base (NO autosave, NO firebase)

let fabricCanvas = null;
let pages = [];
let currentPage = 0;
let zoom = 1;

// ---------- INIT ----------
export function initCanvas() {
  fabricCanvas = new fabric.Canvas("canvas", {
    backgroundColor: "#ffffff",
    preserveObjectStacking: true
  });

  addPage();
  renderPage();
}

// ---------- PAGES ----------
export function addPage() {
  pages.push([]);
  currentPage = pages.length - 1;
  renderPage();
}

export function duplicatePage() {
  const clone = pages[currentPage].map(o => fabric.util.object.clone(o));
  pages.push(clone);
  currentPage = pages.length - 1;
  renderPage();
}

export function deletePage() {
  if (pages.length <= 1) return;
  pages.splice(currentPage, 1);
  currentPage = Math.max(0, currentPage - 1);
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

function renderPage() {
  fabricCanvas.clear();
  fabricCanvas.setBackgroundColor("#fff", fabricCanvas.renderAll.bind(fabricCanvas));
  pages[currentPage].forEach(obj => fabricCanvas.add(obj));
  fabricCanvas.renderAll();
}

// ---------- OBJECT HELPERS ----------
function center(obj) {
  obj.left = fabricCanvas.getWidth() / 2;
  obj.top = fabricCanvas.getHeight() / 2;
  obj.originX = "center";
  obj.originY = "center";
}

// ---------- TEXT ----------
export function addText(text = "Text") {
  const t = new fabric.Textbox(text, {
    fontSize: 48,
    fill: "#111"
  });
  center(t);
  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
  savePage();
}

export function setActiveFontFamily(f) {
  const o = fabricCanvas.getActiveObject();
  if (o && o.fontFamily) {
    o.set("fontFamily", f);
    fabricCanvas.renderAll();
  }
}

export function setActiveFontSize(s) {
  const o = fabricCanvas.getActiveObject();
  if (o && o.fontSize) {
    o.set("fontSize", Number(s));
    fabricCanvas.renderAll();
  }
}

export function setActiveFill(c) {
  const o = fabricCanvas.getActiveObject();
  if (o) {
    o.set("fill", c);
    fabricCanvas.renderAll();
  }
}

export function setActiveStroke(c) {
  const o = fabricCanvas.getActiveObject();
  if (o) {
    o.set("stroke", c);
    fabricCanvas.renderAll();
  }
}

export function setActiveOpacity(v) {
  const o = fabricCanvas.getActiveObject();
  if (o) {
    o.set("opacity", v);
    fabricCanvas.renderAll();
  }
}

// ---------- IMAGES ----------
export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      img.scaleToWidth(300);
      center(img);
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      savePage();
    });
  };
  reader.readAsDataURL(file);
}

// ---------- SHAPES (ΑΥΤΑ ΕΛΕΙΠΑΝ) ----------
export function addRect() {
  const r = new fabric.Rect({
    width: 200,
    height: 120,
    fill: "#ccc"
  });
  center(r);
  fabricCanvas.add(r);
  savePage();
}

export function addCircle() {
  const c = new fabric.Circle({
    radius: 80,
    fill: "#ddd"
  });
  center(c);
  fabricCanvas.add(c);
  savePage();
}

export function addLine() {
  const l = new fabric.Line([0, 0, 200, 0], {
    stroke: "#000",
    strokeWidth: 4
  });
  center(l);
  fabricCanvas.add(l);
  savePage();
}

// ---------- CANVAS ----------
export function setCanvasBackground(c) {
  fabricCanvas.setBackgroundColor(c, fabricCanvas.renderAll.bind(fabricCanvas));
}

export function setPageSize(type) {
  const sizes = {
    A4P: [794, 1123],
    A4L: [1123, 794],
    SQUARE: [900, 900],
    HD: [1280, 720]
  };
  const [w, h] = sizes[type] || sizes.A4P;
  fabricCanvas.setWidth(w);
  fabricCanvas.setHeight(h);
  fabricCanvas.renderAll();
}

// ---------- ZOOM ----------
export function zoomIn() {
  zoom = Math.min(zoom + 0.1, 3);
  fabricCanvas.setZoom(zoom);
}

export function zoomOut() {
  zoom = Math.max(zoom - 0.1, 0.2);
  fabricCanvas.setZoom(zoom);
}

export function resetZoom() {
  zoom = 1;
  fabricCanvas.setZoom(1);
}

export function fitToScreen() {
  resetZoom();
}

// ---------- EXPORT (BASIC) ----------
export function exportFlipbook() {
  alert("Flipbook export placeholder (OK βάση)");
}

export function previewFlipbook() {
  alert("Flipbook preview placeholder");
}

export function closeFlipbookPreview() {}

export function exportPrintablePDF() {
  alert("PDF export placeholder");
}

export async function exportFlipbookLink() {
  return location.href;
}

// ---------- UTILS ----------
function savePage() {
  pages[currentPage] = fabricCanvas.getObjects().map(o => o);
}

export function refreshThumbnails() {}
export function refreshLayers() {}
