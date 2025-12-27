// js/ui.js
import {
  addText,
  addImageFromFile,
  zoomIn,
  zoomOut,
  resetZoom,
  addPage,
  prevPage,
  nextPage,
  exportFlipbook
} from "./core.js";

/* ---------- HELPERS ---------- */
const $ = (id) => document.getElementById(id);

/* ---------- TEXT ---------- */
$("addTextBtn")?.addEventListener("click", () => {
  console.log("🟢 Add Text clicked");
  addText();
});

/* ---------- IMAGE ---------- */
$("imageInput")?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) addImageFromFile(file);
});

/* ---------- ZOOM ---------- */
$("zoomInBtn")?.addEventListener("click", () => {
  zoomIn();
  updateZoomLabel();
});

$("zoomOutBtn")?.addEventListener("click", () => {
  zoomOut();
  updateZoomLabel();
});

$("zoomResetBtn")?.addEventListener("click", () => {
  resetZoom();
  updateZoomLabel();
});

function updateZoomLabel() {
  const el = $("zoomValue");
  if (!el) return;
  el.textContent = Math.round(window.__PB_ZOOM__ * 100) + "%";
}

/* ---------- PAGES ---------- */
$("addPageBtn")?.addEventListener("click", addPage);
$("prevPageBtn")?.addEventListener("click", prevPage);
$("nextPageBtn")?.addEventListener("click", nextPage);

/* ---------- EXPORT ---------- */
$("exportFlipbookBtn")?.addEventListener("click", exportFlipbook);
