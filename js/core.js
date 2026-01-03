// js/core.js
import { saveProject, loadProject, uploadImage } from "./saveToFirebase.js";

export let canvas;
export let pages = [];
export let currentPage = 0;
export const PROJECT_ID = "demo-project";

export function initCanvas() {
  canvas = new fabric.Canvas("canvas", {
    backgroundColor: "#fff",
    preserveObjectStacking: true
  });
  setCanvasSize(2480, 3508); // A4
}

export function setCanvasSize(w, h) {
  canvas.setWidth(w);
  canvas.setHeight(h);
  fitCanvas();
}

export function fitCanvas() {
  const host = document.getElementById("canvasFrame");
  const scale = Math.min(
    host.clientWidth / canvas.width,
    host.clientHeight / canvas.height
  );
  canvas.setZoom(scale);
  canvas.renderAll();
}

export function saveCurrentPage() {
  pages[currentPage] = canvas.toJSON(["selectable"]);
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
  pages.splice(currentPage + 1, 0, JSON.parse(JSON.stringify(pages[currentPage])));
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

export function addText() {
  const t = new fabric.Textbox("Text", {
    left: canvas.width / 2,
    top: canvas.height / 2,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111"
  });
  canvas.add(t).setActiveObject(t);
}

export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = async e => {
    const url = await uploadImage(e.target.result, `${Date.now()}.png`);
    fabric.Image.fromURL(url, img => {
      img.set({ left: 200, top: 200 });
      canvas.add(img);
    });
  };
  reader.readAsDataURL(file);
}

export function exportFlipbook() {
  saveCurrentPage();
  const imgs = pages.map(p => {
    const c = new fabric.StaticCanvas(null, { width: canvas.width, height: canvas.height });
    if (p) c.loadFromJSON(p, c.renderAll.bind(c));
    return c.toDataURL();
  });
  return imgs;
}

import { uploadImageFile } from "./saveToFirebase.js";

export async function addImageFromFile(file) {
  const url = await uploadImageFile(file);

  fabric.Image.fromURL(url, (img) => {
    img.set({
      left: canvas.getWidth() / 2,
      top: canvas.getHeight() / 2,
      originX: "center",
      originY: "center",
      crossOrigin: "anonymous"
    });

    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.requestRenderAll();
    saveCurrentPage();
  });
}

