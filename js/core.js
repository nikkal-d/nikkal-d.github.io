// js/core.js
// ===============================
// CANVAS + PAGES + ZOOM + EXPORT
// ===============================

let canvas;
let zoom = 1;

export const pages = [];
export let currentPage = 0;

// ---------------- INIT ----------------
export function initCanvas() {
  canvas = new fabric.Canvas("canvas", {
    backgroundColor: "#ffffff",
    preserveObjectStacking: true,
  });

  setCanvasSize(1240, 1754); // A4 Portrait
  addPage();
  renderPage();

  console.log("✅ Canvas ready");
}

export function getCanvas() {
  return canvas;
}

// ---------------- CANVAS SIZE ----------------
export function setCanvasSize(w, h) {
  canvas.setWidth(w);
  canvas.setHeight(h);
  fitCanvas();
}

function fitCanvas() {
  zoom = Math.min(
    canvas.getParent().clientWidth / canvas.getWidth(),
    canvas.getParent().clientHeight / canvas.getHeight()
  );
  applyZoom(zoom);
}

// ---------------- ZOOM ----------------
export function applyZoom(z) {
  zoom = Math.max(0.2, Math.min(3, z));
  const center = new fabric.Point(
    canvas.getWidth() / 2,
    canvas.getHeight() / 2
  );
  canvas.zoomToPoint(center, zoom);
  canvas.requestRenderAll();
}

export function getZoom() {
  return zoom;
}

// ---------------- TEXT ----------------
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

// ---------------- IMAGE ----------------
export function addImage(file) {
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      img.scaleToWidth(canvas.getWidth() * 0.6);
      img.center();
      canvas.add(img);
    });
  };
  reader.readAsDataURL(file);
}

// ---------------- PAGES ----------------
export function addPage() {
  pages.push({ json: null });
  currentPage = pages.length - 1;
}

export function savePage() {
  pages[currentPage].json = canvas.toJSON();
}

export function renderPage() {
  canvas.clear();
  canvas.backgroundColor = "#fff";

  const page = pages[currentPage];
  if (page?.json) {
    canvas.loadFromJSON(page.json, canvas.renderAll.bind(canvas));
  }
}

export function nextPage() {
  if (currentPage >= pages.length - 1) return;
  savePage();
  currentPage++;
  renderPage();
}

export function prevPage() {
  if (currentPage <= 0) return;
  savePage();
  currentPage--;
  renderPage();
}

// ---------------- FLIPBOOK ----------------
export function exportFlipbook() {
  savePage();
  const images = pages.map(p => {
    canvas.loadFromJSON(p.json, () => {});
    return canvas.toDataURL("image/png");
  });

  const html = `
  <html><body style="margin:0;background:#000;display:flex">
  ${images.map(i => `<img src="${i}" style="width:100vw;"/>`).join("")}
  </body></html>`;

  const w = window.open();
  w.document.write(html);
}
