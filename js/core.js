// js/core.js
// ===================================================
// PHOTBOOK CORE (STABLE BASE)
// ===================================================

let canvas;
let zoom = 1;

// --------------------
// PAGE STATE
// --------------------
let pages = [];
let currentPage = 0;

// --------------------
// PAGE SIZES
// --------------------
export const PAGE_SIZES = {
  A4P: { w: 2480, h: 3508 },
  A4L: { w: 3508, h: 2480 },
  SQUARE: { w: 3000, h: 3000 },
  STORY: { w: 1080, h: 1920 },
  HD: { w: 1920, h: 1080 }
};

let currentSizeKey = "A4P";

// --------------------
// INIT
// --------------------
export function initCanvas() {
  canvas = new fabric.Canvas("canvas", {
    backgroundColor: "#ffffff",
    preserveObjectStacking: true
  });

  applyPageSize(currentSizeKey);
  pages = [serializeCanvas()];
  currentPage = 0;

  centerCanvasInView();
  console.log("✅ Canvas initialized");
}

// --------------------
// CANVAS HELPERS
// --------------------
function serializeCanvas() {
  return canvas.toJSON();
}

function loadCanvas(data) {
  canvas.loadFromJSON(data, () => {
    canvas.renderAll();
  });
}

function centerCanvasInView() {
  const host = document.getElementById("canvasHost");
  if (!host) return;

  const scale = Math.min(
    host.clientWidth / canvas.getWidth(),
    host.clientHeight / canvas.getHeight()
  );

  zoom = scale;
  canvas.setViewportTransform([scale, 0, 0, scale, 0, 0]);
  updateZoomLabel();
}

// --------------------
// ZOOM
// --------------------
export function setZoom(z) {
  zoom = Math.max(0.1, Math.min(5, z));
  canvas.setViewportTransform([zoom, 0, 0, zoom, 0, 0]);
  updateZoomLabel();
}

export function zoomIn() {
  setZoom(zoom + 0.1);
}

export function zoomOut() {
  setZoom(zoom - 0.1);
}

export function resetZoom() {
  setZoom(1);
}

function updateZoomLabel() {
  const el = document.getElementById("zoomValue");
  if (el) el.textContent = Math.round(zoom * 100) + "%";
}

// --------------------
// PAGE SIZE
// --------------------
export function applyPageSize(key) {
  const size = PAGE_SIZES[key];
  if (!size) return;

  currentSizeKey = key;

  canvas.setWidth(size.w);
  canvas.setHeight(size.h);
  canvas.calcOffset();
  canvas.renderAll();

  centerCanvasInView();
}

// --------------------
// TEXT
// --------------------
export function addText() {
  const cx = canvas.getWidth() / 2;
  const cy = canvas.getHeight() / 2;

  const t = new fabric.Textbox("Text", {
    left: cx,
    top: cy,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111",
    editable: true
  });

  canvas.add(t);
  canvas.setActiveObject(t);
  canvas.renderAll();
}

// --------------------
// IMAGES
// --------------------
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
      canvas.renderAll();
    });
  };
  reader.readAsDataURL(file);
}

// --------------------
// PAGES
// --------------------
export function addPage() {
  pages[currentPage] = serializeCanvas();
  canvas.clear();
  canvas.backgroundColor = "#ffffff";
  pages.push(serializeCanvas());
  currentPage = pages.length - 1;
  updatePageInfo();
}

export function nextPage() {
  if (currentPage >= pages.length - 1) return;
  pages[currentPage] = serializeCanvas();
  currentPage++;
  loadCanvas(pages[currentPage]);
  updatePageInfo();
}

export function prevPage() {
  if (currentPage <= 0) return;
  pages[currentPage] = serializeCanvas();
  currentPage--;
  loadCanvas(pages[currentPage]);
  updatePageInfo();
}

function updatePageInfo() {
  const el = document.getElementById("pageInfo");
  if (el) el.textContent = `${currentPage + 1} / ${pages.length}`;
}

// --------------------
// FLIPBOOK EXPORT
// --------------------
export function exportFlipbook(preview = false) {
  const htmlPages = pages.map((p, i) => {
    return `<div class="page">${JSON.stringify(p)}</div>`;
  });

  const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Flipbook</title>
<style>
body{margin:0;background:#111;display:flex;align-items:center;justify-content:center}
.book{display:flex;gap:10px}
.page{width:400px;height:560px;background:#fff}
</style>
</head>
<body>
<div class="book">
${htmlPages.join("")}
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  if (preview) {
    const frame = document.getElementById("flipPreviewFrame");
    const modal = document.getElementById("flipPreviewModal");
    if (frame && modal) {
      frame.src = url;
      modal.classList.add("open");
    }
  } else {
    window.open(url, "_blank");
  }
}

// --------------------
// EXPOSE (for ui.js)
// --------------------
window.AppCore = {
  initCanvas,
  addText,
  addImageFromFile,
  zoomIn,
  zoomOut,
  resetZoom,
  applyPageSize,
  addPage,
  nextPage,
  prevPage,
  exportFlipbook
};
