// js/core.js
// =============================================
// CORE STATE
// =============================================
export const App = {
  canvas: null,
  pages: [],
  currentPage: 0,
  zoom: 1,
  pageSize: { w: 2480, h: 3508 } // A4 Portrait
};

// =============================================
// INIT
// =============================================
export function initCanvas() {
  App.canvas = new fabric.Canvas("canvas", {
    backgroundColor: "#ffffff",
    preserveObjectStacking: true
  });

  addPage(); // πρώτη σελίδα
  renderPage();
  fitToScreen();

  console.log("✅ Canvas initialized");
}

// =============================================
// PAGES
// =============================================
export function addPage() {
  App.pages.push({ json: null });
  App.currentPage = App.pages.length - 1;
  renderPage();
}

export function goToPage(index) {
  if (index < 0 || index >= App.pages.length) return;
  saveCurrentPage();
  App.currentPage = index;
  renderPage();
}

function saveCurrentPage() {
  if (!App.canvas) return;
  App.pages[App.currentPage].json = App.canvas.toJSON();
}

function renderPage() {
  const page = App.pages[App.currentPage];
  App.canvas.clear();

  App.canvas.setWidth(App.pageSize.w);
  App.canvas.setHeight(App.pageSize.h);
  App.canvas.setBackgroundColor("#ffffff", App.canvas.renderAll.bind(App.canvas));

  if (page.json) {
    App.canvas.loadFromJSON(page.json, () => {
      App.canvas.renderAll();
    });
  }
}

// =============================================
// ZOOM (viewport zoom – ΣΩΣΤΟ)
// =============================================
export function setZoom(z) {
  App.zoom = Math.max(0.2, Math.min(3, z));
  App.canvas.setZoom(App.zoom);
  centerCanvas();
}

export function fitToScreen() {
  const host = document.getElementById("canvasHost");
  if (!host) return;

  const scale = Math.min(
    host.clientWidth / App.pageSize.w,
    host.clientHeight / App.pageSize.h
  );

  setZoom(scale);
}

function centerCanvas() {
  const frame = document.getElementById("canvasFrame");
  frame.style.transform =
    `translate(-50%, -50%) scale(${App.zoom})`;
}

// =============================================
// PAGE SIZE
// =============================================
export function setPageSize(type) {
  const sizes = {
    A4P: { w: 2480, h: 3508 },
    A4L: { w: 3508, h: 2480 },
    SQUARE: { w: 3000, h: 3000 },
    HD: { w: 1920, h: 1080 }
  };
  if (!sizes[type]) return;

  App.pageSize = sizes[type];
  renderPage();
  fitToScreen();
}

// =============================================
// OBJECTS
// =============================================
export function addText() {
  const t = new fabric.Textbox("Text", {
    left: App.pageSize.w / 2,
    top: App.pageSize.h / 2,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111"
  });
  App.canvas.add(t);
  App.canvas.setActiveObject(t);
}

export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    fabric.Image.fromURL(e.target.result, img => {
      img.set({
        left: App.pageSize.w / 2,
        top: App.pageSize.h / 2,
        originX: "center",
        originY: "center",
        scaleX: 0.5,
        scaleY: 0.5
      });
      App.canvas.add(img);
    });
  };
  reader.readAsDataURL(file);
}

// =============================================
// FLIPBOOK EXPORT
// =============================================
export async function exportFlipbook() {
  saveCurrentPage();

  const images = [];
  for (let i = 0; i < App.pages.length; i++) {
    goToPage(i);
    await new Promise(r => setTimeout(r, 50));
    images.push(App.canvas.toDataURL({ format: "png" }));
  }

  const win = window.open();
  win.document.write(`
    <html>
    <head>
      <title>Flipbook</title>
      <style>
        body{margin:0;background:#111;display:flex;align-items:center;justify-content:center}
        img{max-width:90vw;max-height:90vh}
      </style>
    </head>
    <body>
      <img id="page" src="${images[0]}">
      <script>
        const pages=${JSON.stringify(images)};
        let i=0;
        document.body.onclick=()=>{
          i=(i+1)%pages.length;
          document.getElementById("page").src=pages[i];
        }
      </script>
    </body>
    </html>
  `);
}
