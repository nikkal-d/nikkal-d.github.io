// js/core.js
let canvas;
let pages = [];
let currentPage = 0;

const PAGE_SIZES = {
  A4P: { w: 2480, h: 3508 },
  A4L: { w: 3508, h: 2480 },
  SQUARE: { w: 2500, h: 2500 },
};

let zoom = 1;

// ---------- INIT ----------
export function initCanvas() {
  const c = document.getElementById("canvas");

  canvas = new fabric.Canvas(c, {
    backgroundColor: "#fff",
    preserveObjectStacking: true,
  });

  setPageSize("A4P");

  pages = [emptyPage()];
  renderPage(0);

  centerCanvas();
  console.log("✅ Canvas initialized");
}

function emptyPage() {
  return { json: null };
}

// ---------- PAGES ----------
export function addPage() {
  saveCurrentPage();
  pages.push(emptyPage());
  currentPage = pages.length - 1;
  renderPage(currentPage);
}

export function prevPage() {
  if (currentPage === 0) return;
  saveCurrentPage();
  currentPage--;
  renderPage(currentPage);
}

export function nextPage() {
  if (currentPage >= pages.length - 1) return;
  saveCurrentPage();
  currentPage++;
  renderPage(currentPage);
}

function saveCurrentPage() {
  pages[currentPage].json = canvas.toJSON();
}

function renderPage(index) {
  canvas.clear();
  canvas.backgroundColor = "#fff";

  const page = pages[index];
  if (page.json) {
    canvas.loadFromJSON(page.json, () => {
      canvas.renderAll();
    });
  }

  updatePageInfo();
}

function updatePageInfo() {
  const el = document.getElementById("pageInfo");
  if (el) el.textContent = `${currentPage + 1} / ${pages.length}`;
}

// ---------- CANVAS SIZE ----------
export function setPageSize(key) {
  const s = PAGE_SIZES[key] || PAGE_SIZES.A4P;
  canvas.setWidth(s.w);
  canvas.setHeight(s.h);
  centerCanvas();
}

// ---------- ZOOM ----------
export function zoomIn() {
  setZoom(zoom + 0.1);
}
export function zoomOut() {
  setZoom(zoom - 0.1);
}
export function resetZoom() {
  setZoom(1);
}

function setZoom(z) {
  zoom = Math.max(0.2, Math.min(3, z));
  canvas.setViewportTransform([zoom, 0, 0, zoom, 0, 0]);
  updateZoomUI();
}

function updateZoomUI() {
  const z = document.getElementById("zoomValue");
  if (z) z.textContent = Math.round(zoom * 100) + "%";
}

function centerCanvas() {
  const frame = document.getElementById("canvasFrame");
  if (!frame) return;

  frame.style.display = "flex";
  frame.style.alignItems = "center";
  frame.style.justifyContent = "center";
}

// ---------- OBJECTS ----------
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

export function addImage(file) {
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      img.scaleToWidth(canvas.width * 0.5);
      img.left = canvas.width / 2;
      img.top = canvas.height / 2;
      img.originX = img.originY = "center";
      canvas.add(img);
    });
  };
  reader.readAsDataURL(file);
}

// ---------- FLIPBOOK ----------
export function exportFlipbook(preview = false) {
  saveCurrentPage();

  const pagesHTML = pages.map(p => {
    return `<div class="page">${p.json ? JSON.stringify(p.json) : ""}</div>`;
  }).join("");

  const html = `
<!doctype html>
<html>
<head>
<style>
body{margin:0;background:#111}
.book{display:flex;overflow:hidden}
.page{min-width:100vw;min-height:100vh;background:#fff}
</style>
</head>
<body>
<div class="book">${pagesHTML}</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  if (preview) {
    document.getElementById("flipPreviewFrame").src = url;
    document.getElementById("flipPreviewModal").classList.add("open");
  } else {
    window.open(url);
  }
}
