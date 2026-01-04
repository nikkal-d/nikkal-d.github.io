// ================================
// CORE – Photobook Editor
// ================================

let canvas;
let pages = [];
let currentPageIndex = 0;
let zoom = 1;

// --------------------
// INIT
// --------------------
export function initCanvas() {
  canvas = new fabric.Canvas("canvas", {
    backgroundColor: "#ffffff",
    preserveObjectStacking: true,
    selection: true,
  });

  createInitialPage();
  fitCanvasToScreen();

  console.log("✅ Canvas initialized");
}

// --------------------
// PAGES
// --------------------
function createInitialPage() {
  pages = [{ objects: [] }];
  currentPageIndex = 0;
  renderPage();
}

export function addPage() {
  saveCurrentPage();
  pages.push({ objects: [] });
  currentPageIndex = pages.length - 1;
  renderPage();
}

export function duplicatePage() {
  saveCurrentPage();
  const src = pages[currentPageIndex];
  const clone = JSON.parse(JSON.stringify(src));
  pages.splice(currentPageIndex + 1, 0, clone);
  currentPageIndex++;
  renderPage();
}

export function prevPage() {
  if (currentPageIndex === 0) return;
  saveCurrentPage();
  currentPageIndex--;
  renderPage();
}

export function nextPage() {
  if (currentPageIndex === pages.length - 1) return;
  saveCurrentPage();
  currentPageIndex++;
  renderPage();
}

function saveCurrentPage() {
  const json = canvas.toJSON();
  pages[currentPageIndex].objects = json.objects || [];
}

function renderPage() {
  canvas.clear();
  canvas.backgroundColor = "#ffffff";

  const data = pages[currentPageIndex];
  if (!data || !data.objects) return;

  fabric.util.enlivenObjects(data.objects, (objs) => {
    objs.forEach((o) => normalizeObject(o));
    canvas.add(...objs);
    canvas.requestRenderAll();
  });
}

function normalizeObject(o) {
  if (o.flipX) o.flipX = false;
  if (o.flipY) o.flipY = false;
  if (!o.originX) o.originX = "center";
  if (!o.originY) o.originY = "center";
}

// --------------------
// CENTER POSITION
// --------------------
function getCanvasCenter() {
  return {
    x: canvas.getWidth() / 2,
    y: canvas.getHeight() / 2,
  };
}

// --------------------
// TEXT
// --------------------
export function addText() {
  const { x, y } = getCanvasCenter();
  const t = new fabric.Textbox("Text", {
    left: x,
    top: y,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111",
  });
  canvas.add(t);
  canvas.setActiveObject(t);
}

// --------------------
// IMAGES
// --------------------
export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, (img) => {
      const { x, y } = getCanvasCenter();
      img.set({
        left: x,
        top: y,
        originX: "center",
        originY: "center",
        scaleX: 0.5,
        scaleY: 0.5,
      });
      canvas.add(img);
      canvas.setActiveObject(img);
    });
  };
  reader.readAsDataURL(file);
}

// --------------------
// SHAPES
// --------------------
export function addRect() {
  const { x, y } = getCanvasCenter();
  const r = new fabric.Rect({
    left: x,
    top: y,
    width: 200,
    height: 120,
    fill: "#4f46e5",
    originX: "center",
    originY: "center",
  });
  canvas.add(r);
}

export function addCircle() {
  const { x, y } = getCanvasCenter();
  const c = new fabric.Circle({
    left: x,
    top: y,
    radius: 80,
    fill: "#22c55e",
    originX: "center",
    originY: "center",
  });
  canvas.add(c);
}

// --------------------
// ZOOM (VIEWPORT)
// --------------------
export function zoomIn() {
  setZoom(zoom + 0.1);
}
export function zoomOut() {
  setZoom(Math.max(0.2, zoom - 0.1));
}
export function resetZoom() {
  setZoom(1);
}

function setZoom(z) {
  zoom = z;
  canvas.setZoom(zoom);
  fitCanvasToScreen();
}

function fitCanvasToScreen() {
  const host = document.getElementById("canvasHost");
  if (!host) return;

  const w = host.clientWidth;
  const h = host.clientHeight;

  canvas.setWidth(w);
  canvas.setHeight(h);

  canvas.viewportTransform = [zoom, 0, 0, zoom, 0, 0];
  canvas.requestRenderAll();
}

// --------------------
// FLIPBOOK EXPORT
// --------------------
export function exportFlipbook() {
  saveCurrentPage();

  const pagesHTML = pages
    .map((p) => {
      return `
        <div class="page">
          <canvas width="800" height="1100"></canvas>
          <script>
            const c = new fabric.Canvas(document.currentScript.previousElementSibling);
            fabric.util.enlivenObjects(${JSON.stringify(
              p.objects
            )}, objs => {
              objs.forEach(o => {
                o.flipX = false;
                o.flipY = false;
                c.add(o);
              });
            });
          </script>
        </div>`;
    })
    .join("");

  const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Flipbook</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js"></script>
<style>
body{margin:0;background:#111;display:flex;justify-content:center}
.book{display:flex;gap:10px}
.page{background:#fff}
</style>
</head>
<body>
<div class="book">${pagesHTML}</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}
