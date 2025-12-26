// js/core.js
console.log("core.js loaded");

export let canvas;
export let pages = [];
export let currentPage = 0;
export let zoom = 1;

export function initCanvas() {
  canvas = new fabric.Canvas("canvas", {
    width: 1240,
    height: 1754,
    backgroundColor: "#ffffff",
    preserveObjectStacking: true
  });

  pages = [canvas.toJSON()];
  console.log("✅ Canvas initialized");
}

export function addText() {
  const t = new fabric.Textbox("Text", {
    left: canvas.width / 2,
    top: canvas.height / 2,
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

export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      img.set({
        left: canvas.width / 2,
        top: canvas.height / 2,
        originX: "center",
        originY: "center",
        scaleX: 0.5,
        scaleY: 0.5
      });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
    });
  };
  reader.readAsDataURL(file);
}

/* ---------- PAGES ---------- */

export function savePage() {
  pages[currentPage] = canvas.toJSON();
}

export function loadPage(index) {
  savePage();
  canvas.clear();
  canvas.loadFromJSON(pages[index], () => {
    canvas.requestRenderAll();
  });
  currentPage = index;
}

export function addPage() {
  savePage();
  pages.push({});
  currentPage = pages.length - 1;
  canvas.clear();
  canvas.setBackgroundColor("#ffffff", canvas.requestRenderAll.bind(canvas));
}

/* ---------- ZOOM ---------- */

export function applyZoom(value) {
  zoom = value;
  canvas.setZoom(zoom);
  canvas.requestRenderAll();
}

/* ---------- EXPORT ---------- */

export function exportPagesAsImages() {
  savePage();
  return pages.map((page, i) => {
    const temp = new fabric.StaticCanvas(null, {
      width: canvas.width,
      height: canvas.height
    });
    temp.loadFromJSON(page, () => {});
    return temp.toDataURL({ format: "png" });
  });
}



// core.js
export const pages = [];
export let currentPage = 0;

export function savePage() {
  pages[currentPage] = canvas.toJSON();
}

export function loadPage(index) {
  if (!pages[index]) {
    canvas.clear();
    canvas.setBackgroundColor("#fff", canvas.renderAll.bind(canvas));
    return;
  }

  canvas.loadFromJSON(pages[index], canvas.renderAll.bind(canvas));
}

export function addPage() {
  savePage();
  pages.push(null);
  currentPage = pages.length - 1;
  canvas.clear();
  canvas.setBackgroundColor("#fff", canvas.renderAll.bind(canvas));
}

export function nextPage() {
  savePage();
  if (currentPage < pages.length - 1) {
    currentPage++;
    loadPage(currentPage);
  }
}

export function prevPage() {
  savePage();
  if (currentPage > 0) {
    currentPage--;
    loadPage(currentPage);
  }
}

