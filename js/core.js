// js/core.js
// Fabric canvas core – pages, zoom, objects, flipbook

export let fabricCanvas = null;

let pages = [];
let currentPage = 0;
let zoom = 1;
let isRestoring = false;

// ================= INIT =================
export function initCanvas() {
  if (!window.fabric) {
    throw new Error("Fabric.js not loaded");
  }

  if (fabricCanvas) return fabricCanvas;

  fabricCanvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true
  });

  pages = [{ json: blankPageJSON() }];
  currentPage = 0;

  setCanvasSize(1240, 1754);
  renderPage(0);
  fitToHost();

  window.addEventListener("resize", fitToHost);

  console.log("✅ Canvas initialized");
  return fabricCanvas;
}

// ================= PAGE =================
function blankPageJSON() {
  return { objects: [], backgroundColor: "#ffffff" };
}

function renderPage(index) {
  isRestoring = true;
  fabricCanvas.clear();
  fabricCanvas.loadFromJSON(pages[index].json, () => {
    fabricCanvas.renderAll();
    isRestoring = false;
    fitToHost();
  });
}

function saveCurrentPage() {
  if (!fabricCanvas) return;
  pages[currentPage].json = fabricCanvas.toJSON();
}

export function addPage() {
  saveCurrentPage();
  pages.push({ json: blankPageJSON() });
  currentPage = pages.length - 1;
  renderPage(currentPage);
  updatePageInfo();
}

export function nextPage() {
  if (currentPage >= pages.length - 1) return;
  saveCurrentPage();
  currentPage++;
  renderPage(currentPage);
  updatePageInfo();
}

export function prevPage() {
  if (currentPage <= 0) return;
  saveCurrentPage();
  currentPage--;
  renderPage(currentPage);
  updatePageInfo();
}

function updatePageInfo() {
  const el = document.getElementById("pageInfo");
  if (el) el.textContent = `${currentPage + 1} / ${pages.length}`;
}

// ================= OBJECTS =================
export function addText() {
  const t = new fabric.Textbox("Text", {
    left: fabricCanvas.width / 2,
    top: fabricCanvas.height / 2,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111",
    textBaseline: "alphabetic"
  });
  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
}

export function addRect() {
  const r = new fabric.Rect({
    width: 260,
    height: 180,
    fill: "#ff0000",
    left: fabricCanvas.width / 2,
    top: fabricCanvas.height / 2,
    originX: "center",
    originY: "center"
  });
  fabricCanvas.add(r);
}

export function addCircle() {
  const c = new fabric.Circle({
    radius: 90,
    fill: "#ff0000",
    left: fabricCanvas.width / 2,
    top: fabricCanvas.height / 2,
    originX: "center",
    originY: "center"
  });
  fabricCanvas.add(c);
}

export function addLine() {
  const l = new fabric.Line([0, 0, 260, 0], {
    stroke: "#111",
    strokeWidth: 6,
    left: fabricCanvas.width / 2,
    top: fabricCanvas.height / 2,
    originX: "center",
    originY: "center"
  });
  fabricCanvas.add(l);
}

export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      img.set({
        left: fabricCanvas.width / 2,
        top: fabricCanvas.height / 2,
        originX: "center",
        originY: "center"
      });
      img.scaleToWidth(fabricCanvas.width * 0.6);
      fabricCanvas.add(img);
    });
  };
  reader.readAsDataURL(file);
}

// ================= ZOOM / SIZE =================
export function setCanvasSize(w, h) {
  fabricCanvas.setWidth(w);
  fabricCanvas.setHeight(h);
  fitToHost();
}

export function fitToHost() {
  const host = document.getElementById("canvasHost");
  if (!host) return;

  const scale = Math.min(
    (host.clientWidth - 40) / fabricCanvas.width,
    (host.clientHeight - 40) / fabricCanvas.height
  );

  zoom = Math.max(0.1, Math.min(scale, 1));
  fabricCanvas.setViewportTransform([zoom, 0, 0, zoom, 0, 0]);
  fabricCanvas.renderAll();

  updateZoomLabel();
}

export function zoomCanvas(delta) {
  zoom = Math.max(0.1, Math.min(4, zoom + delta));
  fabricCanvas.setZoom(zoom);
  fabricCanvas.renderAll();
  updateZoomLabel();
}

function updateZoomLabel() {
  const el = document.getElementById("zoomValue");
  if (el) el.textContent = Math.round(zoom * 100) + "%";
}

// ================= FLIPBOOK =================
export async function exportFlipbook() {
  const pagesImg = [];

  for (let p of pages) {
    const c = new fabric.StaticCanvas(null, {
      width: fabricCanvas.width,
      height: fabricCanvas.height,
      backgroundColor: "#fff"
    });
    await new Promise(res => c.loadFromJSON(p.json, res));
    pagesImg.push(c.toDataURL("image/png"));
  }

  const html = `
<!doctype html>
<html>
<body style="margin:0;background:#111;display:flex;justify-content:center">
<script>
const imgs=${JSON.stringify(pagesImg)};
let i=0;
const img=document.createElement('img');
img.style.maxWidth='100vw';
img.style.maxHeight='100vh';
document.body.appendChild(img);
function show(){img.src=imgs[i];}
document.onclick=()=>{i=(i+1)%imgs.length;show();}
show();
</script>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "flipbook.html";
  a.click();
}
