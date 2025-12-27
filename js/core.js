// js/core.js
// ===============================
// CANVAS CORE (STABLE BASE)
// ===============================

export let canvas = null;
export let pages = [];
export let currentPage = 0;

let zoom = 1;

// ---------------- INIT ----------------
export function initCanvas() {
  canvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    backgroundColor: "#ffffff"
  });

  setCanvasSize(1240, 1754);
  addPage();

  console.log("✅ Canvas initialized");
}

// ---------------- CANVAS SIZE ----------------
export function setCanvasSize(w, h) {
  canvas.setWidth(w);
  canvas.setHeight(h);
  resetZoom();
  canvas.renderAll();
}

// ---------------- ZOOM (VIEWPORT) ----------------
export function setZoom(value) {
  zoom = Math.min(4, Math.max(0.2, value));
  canvas.setZoom(zoom);

  const center = canvas.getCenter();
  canvas.absolutePan({
    x: center.left * zoom - canvas.width / 2,
    y: center.top * zoom - canvas.height / 2
  });

  canvas.requestRenderAll();
}

export function resetZoom() {
  zoom = 1;
  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  canvas.setZoom(1);
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
    fontSize: 48,
    fill: "#111"
  });

  canvas.add(t);
  canvas.setActiveObject(t);
  canvas.requestRenderAll();

  console.log("✅ Text added");
}

// ---------------- IMAGE ----------------
export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      const center = canvas.getCenter();
      img.set({
        left: center.left,
        top: center.top,
        originX: "center",
        originY: "center"
      });
      img.scaleToWidth(canvas.width * 0.4);
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
    });
  };
  reader.readAsDataURL(file);
}

// ---------------- PAGES ----------------
export function addPage() {
  pages.push(canvas.toJSON());
  currentPage = pages.length - 1;
}

export function goToPage(index) {
  if (!pages[index]) return;
  currentPage = index;
  canvas.loadFromJSON(pages[index], () => {
    canvas.renderAll();
  });
}

export function saveCurrentPage() {
  pages[currentPage] = canvas.toJSON();
}

// ---------------- FLIPBOOK EXPORT ----------------
export function exportFlipbook() {
  saveCurrentPage();

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Flipbook</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js"></script>
<style>
body{margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#111}
canvas{background:#fff}
</style>
</head>
<body>
<canvas id="c" width="1240" height="1754"></canvas>
<script>
const pages = ${JSON.stringify(pages)};
let i = 0;
const c = new fabric.Canvas("c");
function load(){
  c.loadFromJSON(pages[i],()=>c.renderAll());
}
document.body.onclick = ()=>{ i=(i+1)%pages.length; load(); }
load();
</script>
</body>
</html>
`;

  const blob = new Blob([html], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "flipbook.html";
  a.click();
}
