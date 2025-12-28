// js/core.js
// ==============================
// FABRIC CORE + PAGES
// ==============================

export let canvas = null;

const PAGE_SIZES = {
  A4P: { w: 2480, h: 3508 },
  A4L: { w: 3508, h: 2480 },
  SQUARE: { w: 3000, h: 3000 },
  STORY: { w: 1080, h: 1920 },
  HD: { w: 1920, h: 1080 },
};

let pages = [];
let currentPage = 0;

// ------------------------------
// INIT
// ------------------------------
export function initCanvas() {
  canvas = new fabric.Canvas("canvas", {
    backgroundColor: "#ffffff",
    preserveObjectStacking: true,
  });

  setPageSize("A4P");
  pages.push(serializePage());

  renderPage(0);
  console.log("✅ Canvas initialized");
}

// ------------------------------
// PAGE SYSTEM (FIXED)
// ------------------------------
function serializePage() {
  return canvas.toJSON();
}

function loadPage(data) {
  canvas.clear();
  canvas.loadFromJSON(data, () => {
    canvas.requestRenderAll();
  });
}

export function addPage() {
  pages[currentPage] = serializePage();
  pages.push({ objects: [], background: "#ffffff" });
  currentPage = pages.length - 1;
  loadPage(pages[currentPage]);
  updatePageInfo();
}

export function prevPage() {
  if (currentPage === 0) return;
  pages[currentPage] = serializePage();
  currentPage--;
  loadPage(pages[currentPage]);
  updatePageInfo();
}

export function nextPage() {
  if (currentPage >= pages.length - 1) return;
  pages[currentPage] = serializePage();
  currentPage++;
  loadPage(pages[currentPage]);
  updatePageInfo();
}

export function updatePageInfo() {
  const el = document.getElementById("pageInfo");
  if (el) el.textContent = `${currentPage + 1} / ${pages.length}`;
}

// ------------------------------
// PAGE SIZE
// ------------------------------
export function setPageSize(key) {
  const size = PAGE_SIZES[key];
  if (!size) return;

  canvas.setWidth(size.w);
  canvas.setHeight(size.h);
  canvas.calcOffset();
  canvas.requestRenderAll();
}

// ------------------------------
// OBJECTS
// ------------------------------
export function addText() {
  const t = new fabric.Textbox("Text", {
    left: canvas.getWidth() / 2,
    top: canvas.getHeight() / 2,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111",
  });
  canvas.add(t).setActiveObject(t);
}

export function addRect() {
  const r = new fabric.Rect({
    left: 200,
    top: 200,
    width: 300,
    height: 200,
    fill: "#ff0000",
  });
  canvas.add(r);
}

export function addCircle() {
  const c = new fabric.Circle({
    left: 300,
    top: 300,
    radius: 120,
    fill: "#00aaff",
  });
  canvas.add(c);
}

// ------------------------------
// IMAGE
// ------------------------------
export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      img.scaleToWidth(canvas.getWidth() * 0.6);
      img.left = canvas.getWidth() / 2;
      img.top = canvas.getHeight() / 2;
      img.originX = "center";
      img.originY = "center";
      canvas.add(img);
    });
  };
  reader.readAsDataURL(file);
}
