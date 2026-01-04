// core.js
// ====== FABRIC CORE ======

let fabricCanvas = null;
let pages = [];
let currentPage = 0;
let zoom = 1;

// --------------------
// INIT
// --------------------
export function initCanvas() {
  fabricCanvas = new fabric.Canvas("canvas", {
    backgroundColor: "#ffffff",
    preserveObjectStacking: true,
  });

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  pages = [serializePage()];
  currentPage = 0;
  renderPage(0);

  console.log("✅ Canvas initialized");
}

// --------------------
// CANVAS SIZE
// --------------------
function resizeCanvas() {
  const frame = document.getElementById("canvasFrame");
  if (!frame || !fabricCanvas) return;

  const maxW = 900;
  const maxH = 1200;

  const w = Math.min(maxW, frame.clientWidth - 40);
  const h = Math.min(maxH, frame.clientHeight - 40);

  fabricCanvas.setWidth(w);
  fabricCanvas.setHeight(h);
  fabricCanvas.calcOffset();
  fabricCanvas.renderAll();
}

// --------------------
// ZOOM
// --------------------
export function zoomIn() {
  setZoom(zoom + 0.1);
}
export function zoomOut() {
  setZoom(Math.max(0.2, zoom - 0.1));
}
export function zoomReset() {
  setZoom(1);
}

function setZoom(z) {
  zoom = z;
  fabricCanvas.setZoom(zoom);
  fabricCanvas.requestRenderAll();

  const label = document.getElementById("zoomValue");
  if (label) label.textContent = Math.round(zoom * 100) + "%";
}

// --------------------
// PAGES
// --------------------
export function addPage() {
  pages[currentPage] = serializePage();
  pages.push(emptyPage());
  currentPage = pages.length - 1;
  renderPage(currentPage);
}

export function nextPage() {
  if (currentPage >= pages.length - 1) return;
  pages[currentPage] = serializePage();
  currentPage++;
  renderPage(currentPage);
}

export function prevPage() {
  if (currentPage <= 0) return;
  pages[currentPage] = serializePage();
  currentPage--;
  renderPage(currentPage);
}

function renderPage(i) {
  fabricCanvas.clear();
  fabricCanvas.loadFromJSON(pages[i], () => {
    fabricCanvas.renderAll();
  });

  const info = document.getElementById("pageInfo");
  if (info) info.textContent = `${i + 1} / ${pages.length}`;
}

function serializePage() {
  return fabricCanvas.toJSON();
}
function emptyPage() {
  return {
    version: "5.3.0",
    objects: [],
    background: "#ffffff",
  };
}

// --------------------
// TEXT
// --------------------
export function addText() {
  const t = new fabric.Textbox("Text", {
    left: fabricCanvas.width / 2,
    top: fabricCanvas.height / 2,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111",
  });

  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
}

// --------------------
// SHAPES
// --------------------
export function addRect() {
  fabricCanvas.add(
    new fabric.Rect({
      left: 100,
      top: 100,
      width: 120,
      height: 80,
      fill: "#4f46e5",
    })
  );
}

export function addCircle() {
  fabricCanvas.add(
    new fabric.Circle({
      left: 120,
      top: 120,
      radius: 50,
      fill: "#16a34a",
    })
  );
}

export function addLine() {
  fabricCanvas.add(
    new fabric.Line([50, 50, 200, 50], {
      stroke: "#000",
      strokeWidth: 3,
    })
  );
}

// --------------------
// IMAGES
// --------------------
export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, (img) => {
      img.scaleToWidth(300);
      img.set({
        left: fabricCanvas.width / 2,
        top: fabricCanvas.height / 2,
        originX: "center",
        originY: "center",
      });
      fabricCanvas.add(img);
    });
  };
  reader.readAsDataURL(file);
}

// --------------------
// EXPORT FLIPBOOK (basic)
// --------------------
export function exportFlipbook() {
  pages[currentPage] = serializePage();
  alert("Flipbook export OK (base).");
}
