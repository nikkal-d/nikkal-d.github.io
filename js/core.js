// js/core.js
let canvas;
let pages = [];
let currentPage = 0;

export function initCanvas() {
  canvas = new fabric.Canvas("canvas", {
    backgroundColor: "#ffffff",
    preserveObjectStacking: true
  });

  // πρώτη σελίδα
  pages.push(emptyPage());
  loadPage(0);

  console.log("✅ Canvas initialized");
}

function emptyPage() {
  return { json: null };
}

function savePage(index) {
  if (!canvas) return;
  pages[index].json = canvas.toJSON();
}

function loadPage(index) {
  canvas.clear();
  canvas.backgroundColor = "#ffffff";

  const page = pages[index];
  if (page?.json) {
    canvas.loadFromJSON(page.json, () => {
      canvas.renderAll();
    });
  } else {
    canvas.renderAll();
  }

  currentPage = index;
  updatePageInfo();
}

function updatePageInfo() {
  const el = document.getElementById("pageInfo");
  if (el) el.textContent = `${currentPage + 1} / ${pages.length}`;
}

/* =======================
   PAGES API
======================= */

export function addPage() {
  savePage(currentPage);
  pages.push(emptyPage());
  loadPage(pages.length - 1);
}

export function prevPage() {
  if (currentPage === 0) return;
  savePage(currentPage);
  loadPage(currentPage - 1);
}

export function nextPage() {
  if (currentPage >= pages.length - 1) return;
  savePage(currentPage);
  loadPage(currentPage + 1);
}

/* =======================
   TEXT / IMAGE (μένουν όπως είναι)
======================= */

export function addText() {
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
  canvas.renderAll();
}

export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    fabric.Image.fromURL(e.target.result, img => {
      img.set({
        left: canvas.getWidth() / 2,
        top: canvas.getHeight() / 2,
        originX: "center",
        originY: "center",
        scaleX: 0.5,
        scaleY: 0.5
      });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
    });
  };
  reader.readAsDataURL(file);
}

/* =======================
   EXPORT (βάση για flipbook)
======================= */

export function getPagesJSON() {
  savePage(currentPage);
  return pages.map(p => p.json);
}

export { canvas };
