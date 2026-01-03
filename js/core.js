// js/core.js
import { saveProject, loadProject, uploadImageFile } from "./saveToFirebase.js";

export let canvas;
export let pages = [];
export let currentPage = 0;
export const PROJECT_ID = "demo-project";

/* =========================
   CANVAS
========================= */
export function initCanvas() {
  canvas = new fabric.Canvas("canvas", {
    backgroundColor: "#fff",
    preserveObjectStacking: true
  });

  setCanvasSize(2480, 3508); // A4
  pages = [null];
  renderPage(0);
}

export function setCanvasSize(w, h) {
  canvas.setWidth(w);
  canvas.setHeight(h);
  fitCanvas();
}

export function fitCanvas() {
  const host = document.getElementById("canvasFrame");
  if (!host) return;

  const scale = Math.min(
    host.clientWidth / canvas.width,
    host.clientHeight / canvas.height
  );

  canvas.setZoom(scale);
  canvas.renderAll();
}

/* =========================
   PAGES
========================= */
export function saveCurrentPage() {
  pages[currentPage] = canvas.toJSON();
  saveProject(PROJECT_ID, pages);
}

export function renderPage(index) {
  canvas.clear();
  canvas.setBackgroundColor("#fff", () => {});
  if (pages[index]) {
    canvas.loadFromJSON(pages[index], canvas.renderAll.bind(canvas));
  }
  currentPage = index;
}

export function addPage() {
  saveCurrentPage();
  pages.push(null);
  renderPage(pages.length - 1);
}

export function duplicatePage() {
  saveCurrentPage();
  const clone = JSON.parse(JSON.stringify(pages[currentPage]));
  pages.splice(currentPage + 1, 0, clone);
  renderPage(currentPage + 1);
}

export function nextPage() {
  if (currentPage < pages.length - 1) {
    saveCurrentPage();
    renderPage(currentPage + 1);
  }
}

export function prevPage() {
  if (currentPage > 0) {
    saveCurrentPage();
    renderPage(currentPage - 1);
  }
}

/* =========================
   OBJECTS
========================= */
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
  saveCurrentPage();
}

/* 🔥 ΜΟΝΟ ΕΝΑ addImageFromFile 🔥 */
export async function addImageFromFile(file) {
  const url = await uploadImageFile(file);

  fabric.Image.fromURL(
    url,
    (img) => {
      img.set({
        left: canvas.width / 2,
        top: canvas.height / 2,
        originX: "center",
        originY: "center",
        crossOrigin: "anonymous"
      });

      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
      saveCurrentPage();
    },
    { crossOrigin: "anonymous" }
  );
}

/* =========================
   EXPORT
========================= */
export function exportFlipbook() {
  saveCurrentPage();

  return pages.map((p) => {
    const c = new fabric.StaticCanvas(null, {
      width: canvas.width,
      height: canvas.height
    });

    if (p) c.loadFromJSON(p, c.renderAll.bind(c));
    return c.toDataURL("image/png");
  });
}
