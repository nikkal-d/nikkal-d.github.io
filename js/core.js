// js/core.js
export let canvas;
export let pages = [];
export let currentPage = 0;

const PAGE_SIZES = {
  A4P: { w: 1240, h: 1754 },
  A4L: { w: 1754, h: 1240 },
  SQUARE: { w: 1400, h: 1400 },
};

export function initCanvas() {
  canvas = new fabric.Canvas("canvas", {
    backgroundColor: "#fff",
    preserveObjectStacking: true,
  });

  setPageSize("A4P");
  pages.push({ json: null });
}

export function setPageSize(key) {
  const s = PAGE_SIZES[key];
  canvas.setWidth(s.w);
  canvas.setHeight(s.h);
  fitCanvas();
}

function fitCanvas() {
  const host = document.getElementById("canvasHost");
  const scale = Math.min(
    host.clientWidth / canvas.width,
    host.clientHeight / canvas.height
  );
  canvas.setZoom(scale);
  canvas.requestRenderAll();
}

// -------- TEXT --------
export function addText() {
  const t = new fabric.Textbox("Text", {
    left: canvas.width / 2,
    top: canvas.height / 2,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111",
  });
  canvas.add(t).setActiveObject(t);
}

// -------- TEXT COLOR --------
export function setTextColor(color) {
  const obj = canvas.getActiveObject();
  if (obj && obj.type === "textbox") {
    obj.set("fill", color);
    canvas.requestRenderAll();
  }
}

// -------- PAGES --------
export function savePage() {
  pages[currentPage].json = canvas.toJSON();
}

export function loadPage(i) {
  savePage();
  currentPage = i;
  canvas.clear();
  if (pages[i].json) {
    canvas.loadFromJSON(pages[i].json, canvas.renderAll.bind(canvas));
  }
}

export function addPage() {
  savePage();
  pages.push({ json: null });
  loadPage(pages.length - 1);
}

// -------- EXPORT FLIPBOOK --------
export function exportFlipbook({ direction = "horizontal" } = {}) {
  savePage();
  const html = `
  <html>
  <head>
    <style>
      body{margin:0;background:#111;display:flex;justify-content:center}
      .book{display:flex;flex-direction:${direction === "vertical" ? "column" : "row"}}
      img{width:600px;height:auto;box-shadow:0 10px 40px rgba(0,0,0,.6)}
    </style>
  </head>
  <body>
    <div class="book">
      ${pages.map(p => `<img src="${canvas.toDataURL()}">`).join("")}
    </div>
  </body>
  </html>
  `;
  const blob = new Blob([html], { type: "text/html" });
  window.open(URL.createObjectURL(blob));
}
