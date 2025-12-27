// js/core.js
export let canvas = null;

let zoom = 1;
let pages = [];
let currentPage = 0;

window.addEventListener("DOMContentLoaded", () => {
  canvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    backgroundColor: "#fff"
  });

  setCanvasSize(1240, 1754);
  pages.push(savePage());
  console.log("✅ Canvas initialized");
});

// --------------------
// CANVAS SIZE
// --------------------
export function setCanvasSize(w, h) {
  canvas.setWidth(w);
  canvas.setHeight(h);
  canvas.renderAll();
}

// --------------------
// ZOOM (CANVAS, NOT OBJECT)
// --------------------
export function setZoom(value) {
  zoom = Math.max(0.2, Math.min(3, value));
  canvas.setZoom(zoom);

  const center = canvas.getCenter();
  canvas.viewportTransform[4] = center.left * (1 - zoom);
  canvas.viewportTransform[5] = center.top * (1 - zoom);

  canvas.requestRenderAll();
}

export function getZoom() {
  return zoom;
}

// --------------------
// TEXT
// --------------------
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
}

// --------------------
// IMAGES
// --------------------
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
      img.scaleToWidth(canvas.getWidth() * 0.4);
      canvas.add(img);
      canvas.setActiveObject(img);
    });
  };
  reader.readAsDataURL(file);
}

// --------------------
// PAGES
// --------------------
function savePage() {
  return canvas.toJSON();
}

export function nextPage() {
  pages[currentPage] = savePage();
  currentPage++;
  if (!pages[currentPage]) {
    pages.push(null);
    canvas.clear();
    canvas.backgroundColor = "#fff";
  } else {
    canvas.loadFromJSON(pages[currentPage], canvas.renderAll.bind(canvas));
  }
}

export function prevPage() {
  if (currentPage === 0) return;
  pages[currentPage] = savePage();
  currentPage--;
  canvas.loadFromJSON(pages[currentPage], canvas.renderAll.bind(canvas));
}

// --------------------
// EXPORT FLIPBOOK (BASIC)
// --------------------
export function exportFlipbook() {
  const imgs = pages.map(p => {
    canvas.loadFromJSON(p, canvas.renderAll.bind(canvas));
    return canvas.toDataURL("image/png");
  });

  const w = window.open("");
  w.document.write("<h1>Flipbook Preview</h1>");
  imgs.forEach(src => {
    w.document.write(`<img src="${src}" style="width:100%;margin-bottom:20px"/>`);
  });
}
