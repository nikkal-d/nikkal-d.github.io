// js/ui.js
import {
  addText,
  addImageFromFile,
  zoomIn,
  zoomOut,
  resetZoom,
  getZoom,
  setCanvasSize,
  addPage,
  goToPage
} from "./core.js";

// ---------------- TEXT ----------------
const addTextBtn = document.getElementById("addTextBtn");
if (addTextBtn) {
  addTextBtn.addEventListener("click", () => {
    console.log("🟢 Add Text clicked");
    addText();
  });
}

// ---------------- IMAGE ----------------
const imageInput = document.getElementById("imageInput");
if (imageInput) {
  imageInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if (file) addImageFromFile(file);
  });
}

// ---------------- ZOOM ----------------
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const zoomResetBtn = document.getElementById("zoomResetBtn");
const zoomValue = document.getElementById("zoomValue");

function updateZoomLabel() {
  if (zoomValue) zoomValue.textContent = Math.round(getZoom() * 100) + "%";
}

zoomInBtn?.addEventListener("click", () => {
  zoomIn();
  updateZoomLabel();
});
zoomOutBtn?.addEventListener("click", () => {
  zoomOut();
  updateZoomLabel();
});
zoomResetBtn?.addEventListener("click", () => {
  resetZoom();
  updateZoomLabel();
});

// ---------------- PAGES ----------------
document.getElementById("addPageBtn")?.addEventListener("click", () => {
  addPage();
});
document.getElementById("prevPageBtn")?.addEventListener("click", () => {
  goToPage(0);
});
document.getElementById("nextPageBtn")?.addEventListener("click", () => {
  goToPage(1);
});

// ---------------- PAGE SIZE ----------------
document.getElementById("pageSizeSelect")?.addEventListener("change", e => {
  setCanvasSize(e.target.value);
});

updateZoomLabel();
