/* core.js – NO MODULES, NO IMPORTS */

let canvas;
let pages = [];
let currentPage = 0;
let zoom = 1;

const SIZES = {
  A4P: { w: 1240, h: 1754 },
  A4L: { w: 1754, h: 1240 },
  SQUARE: { w: 1400, h: 1400 }
};

function initCanvas() {
  canvas = new fabric.Canvas("canvas", {
    backgroundColor: "#fff",
    preserveObjectStacking: true
  });

  setCanvasSize("A4P");
  pages.push({ json: null });
  renderPage();
}

function setCanvasSize(key) {
  const s = SIZES[key];
  canvas.setWidth(s.w);
  canvas.setHeight(s.h);
  fitCanvas();
}

function fitCanvas() {
  const host = document.getElementById("canvasHost");
  const scale = Math.min(
    host.clientWidth / canvas.getWidth(),
    host.clientHeight / canvas.getHeight()
  );
  zoom = scale;
  canvas.setViewportTransform([scale, 0, 0, scale, 0, 0]);
  updateZoomUI();
}

function updateZoomUI() {
  document.getElementById("zoomValue").textContent =
    Math.round(zoom * 100) + "%";
}

function zoomCanvas(delta) {
  zoom = Math.max(0.2, Math.min(3, zoom + delta));
  canvas.setViewportTransform([zoom, 0, 0, zoom, 0, 0]);
  updateZoomUI();
}

function savePage() {
  pages[currentPage].json = canvas.toJSON();
}

function renderPage() {
  canvas.clear();
  canvas.setBackgroundColor("#fff", canvas.renderAll.bind(canvas));
  const data = pages[currentPage].json;
  if (data) {
    canvas.loadFromJSON(data, canvas.renderAll.bind(canvas));
  }
  document.getElementById("pageInfo").textContent =
    `${currentPage + 1} / ${pages.length}`;
}

function addPage() {
  savePage();
  pages.push({ json: null });
  currentPage = pages.length - 1;
  renderPage();
}

function nextPage() {
  if (currentPage < pages.length - 1) {
    savePage();
    currentPage++;
    renderPage();
  }
}

function prevPage() {
  if (currentPage > 0) {
    savePage();
    currentPage--;
    renderPage();
  }
}

function addText() {
  const t = new fabric.Textbox("Text", {
    left: canvas.getWidth() / 2,
    top: canvas.getHeight() / 2,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111"
  });
  canvas.add(t);
  canvas.setActiveObject(t);
}

function addImage(file) {
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      img.scaleToWidth(canvas.getWidth() * 0.5);
      canvas.add(img);
      canvas.centerObject(img);
    });
  };
  reader.readAsDataURL(file);
}

/* FLIPBOOK EXPORT */
function exportFlipbook(preview = false) {
  savePage();
  const pagesHTML = pages.map(p => {
    if (!p.json) return "";
    const tmp = document.createElement("canvas");
    const c = new fabric.StaticCanvas(tmp);
    c.loadFromJSON(p.json);
    return `<img src="${c.toDataURL()}">`;
  }).join("");

  const html = `
  <html><body style="margin:0;display:flex">
    ${pagesHTML}
  </body></html>`;

  if (preview) {
    document.getElementById("flipFrame").src =
      URL.createObjectURL(new Blob([html], { type: "text/html" }));
    document.getElementById("flipModal").style.display = "flex";
  } else {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    a.download = "flipbook.html";
    a.click();
  }
}

window.PB = {
  initCanvas,
  addText,
  addImage,
  addPage,
  nextPage,
  prevPage,
  zoomCanvas,
  setCanvasSize,
  exportFlipbook
};

window.addEventListener("DOMContentLoaded", initCanvas);
