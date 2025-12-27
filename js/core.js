// js/core.js
// Fabric is GLOBAL (loaded via script tag)

let canvas;
let zoom = 1;

// Pages
let pages = [];
let currentPage = 0;

// ---------- INIT ----------
window.addEventListener("DOMContentLoaded", () => {
  canvas = new fabric.Canvas("canvas", {
    backgroundColor: "#fff",
    preserveObjectStacking: true,
  });

  setPageSize("A4P");
  addPage(true);
  applyZoom(1);

  console.log("✅ Canvas initialized");
});

// ---------- CANVAS SIZE ----------
export function setPageSize(preset) {
  const sizes = {
    A4P: [1240, 1754],
    A4L: [1754, 1240],
    SQUARE: [1400, 1400],
    STORY: [1080, 1920],
    HD: [1920, 1080],
  };
  const [w, h] = sizes[preset] || sizes.A4P;
  canvas.setWidth(w);
  canvas.setHeight(h);
  canvas.renderAll();
}

// ---------- ZOOM (REAL) ----------
export function applyZoom(z) {
  zoom = Math.min(3, Math.max(0.2, z));
  canvas.setZoom(zoom);

  const host = document.getElementById("canvasHost");
  if (!host) return;

  const cx = (host.clientWidth - canvas.getWidth() * zoom) / 2;
  const cy = (host.clientHeight - canvas.getHeight() * zoom) / 2;

  canvas.viewportTransform[4] = cx;
  canvas.viewportTransform[5] = cy;
  canvas.requestRenderAll();
}

export function getZoom() {
  return zoom;
}

// ---------- TEXT ----------
export function addText() {
  const t = new fabric.Textbox("Text", {
    left: canvas.getWidth() / 2,
    top: canvas.getHeight() / 2,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111",
  });
  canvas.add(t);
  canvas.setActiveObject(t);
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
        originY: "center",
      });
      canvas.add(img);
    });
  };
  reader.readAsDataURL(file);
}

// ---------- PAGES ----------
export function addPage(initial = false) {
  if (!initial) saveCurrentPage();
  pages.push({ json: null });
  currentPage = pages.length - 1;
  canvas.clear();
  canvas.setBackgroundColor("#fff", canvas.renderAll.bind(canvas));
  updatePageInfo();
}

export function saveCurrentPage() {
  pages[currentPage].json = canvas.toJSON();
}

export function goToPage(index) {
  if (index < 0 || index >= pages.length) return;
  saveCurrentPage();
  currentPage = index;
  canvas.clear();
  canvas.loadFromJSON(pages[index].json || {}, canvas.renderAll.bind(canvas));
  updatePageInfo();
}

export function nextPage() {
  goToPage(currentPage + 1);
}
export function prevPage() {
  goToPage(currentPage - 1);
}

function updatePageInfo() {
  const el = document.getElementById("pageInfo");
  if (el) el.textContent = `${currentPage + 1} / ${pages.length}`;
}

// ---------- FLIPBOOK EXPORT ----------
export function exportFlipbookHTML() {
  saveCurrentPage();

  const pagesHTML = pages.map(p => {
    return `<div class="page"><img src="${canvasToImage(p.json)}"></div>`;
  }).join("");

  const html = `
<!doctype html>
<html>
<head>
<style>
body{margin:0;background:#111;display:flex;justify-content:center}
.book{display:flex}
.page{width:400px;height:560px;margin:10px;background:#fff}
.page img{width:100%;height:100%;object-fit:contain}
</style>
</head>
<body>
<div class="book">${pagesHTML}</div>
</body>
</html>
`;

  return html;
}

function canvasToImage(json) {
  const temp = new fabric.StaticCanvas(null, {
    width: canvas.getWidth(),
    height: canvas.getHeight(),
  });
  temp.loadFromJSON(json, () => {});
  return temp.toDataURL({ format: "png" });
}
