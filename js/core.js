// js/core.js
// SAFE CORE – no base64 drafts, firebase-ready

export let fabricCanvas = null;
export let pages = [];
export let currentPage = 0;

const DRAFT_KEY = "photobook_draft_light_v1";

// =======================
// INIT
// =======================
export function initCanvas() {
  fabricCanvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true
  });

  setCanvasSize("A4P");

  addPage(true);
  loadDraft();

  console.log("✅ Canvas initialized (SAFE MODE)");
}

// =======================
// CANVAS SIZE
// =======================
export function setCanvasSize(preset) {
  const sizes = {
    A4P: [1240, 1754],
    A4L: [1754, 1240],
    SQUARE: [1400, 1400],
    HD: [1920, 1080]
  };

  const [w, h] = sizes[preset] || sizes.A4P;
  fabricCanvas.setWidth(w);
  fabricCanvas.setHeight(h);
  fabricCanvas.setBackgroundColor("#fff", fabricCanvas.renderAll.bind(fabricCanvas));
}

// =======================
// PAGES
// =======================
export function addPage(initial = false) {
  pages.push({ objects: [] });
  currentPage = pages.length - 1;

  if (!initial) fabricCanvas.clear();
  updatePageInfo();
}

export function saveCurrentPage() {
  if (!pages[currentPage]) return;

  const json = fabricCanvas.toJSON(["srcId"]);
  // ❌ remove base64 images
  json.objects.forEach(o => {
    if (o.type === "image") delete o.src;
  });

  pages[currentPage].objects = json.objects;
}

export function loadPage(index) {
  if (!pages[index]) return;

  saveCurrentPage();
  currentPage = index;

  fabricCanvas.clear();
  fabricCanvas.loadFromJSON(
    { objects: pages[index].objects },
    () => fabricCanvas.renderAll()
  );

  updatePageInfo();
}

export function nextPage() {
  if (currentPage < pages.length - 1) loadPage(currentPage + 1);
}

export function prevPage() {
  if (currentPage > 0) loadPage(currentPage - 1);
}

function updatePageInfo() {
  const el = document.getElementById("pageInfo");
  if (el) el.textContent = `${currentPage + 1} / ${pages.length}`;
}

// =======================
// TEXT
// =======================
export function addText() {
  const t = new fabric.Textbox("Text", {
    left: fabricCanvas.getWidth() / 2,
    top: fabricCanvas.getHeight() / 2,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111"
  });

  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
}

// =======================
// IMAGES (REFERENCE ONLY)
// =======================
export function addImageFromURL(url, id) {
  fabric.Image.fromURL(url, img => {
    img.set({
      left: 200,
      top: 200,
      scaleX: 0.5,
      scaleY: 0.5,
      srcId: id // 🔑 IMPORTANT
    });
    fabricCanvas.add(img);
  }, { crossOrigin: "anonymous" });
}

// =======================
// DRAFT (LIGHT)
// =======================
export function saveDraft() {
  try {
    saveCurrentPage();
    const payload = {
      pages,
      currentPage
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {
    console.warn("⚠ Draft skipped (quota safe)");
  }
}

function loadDraft() {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    pages = data.pages || pages;
    currentPage = data.currentPage || 0;
    loadPage(currentPage);
  } catch {}
}
