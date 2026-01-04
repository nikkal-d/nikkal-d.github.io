// js/core.js
import { uploadDataUrlToStorage, saveProjectToFirestore } from "./firebase-store.js";

export let fabricCanvas = null;

let pages = [];
let currentPage = 0;

export function initCanvas() {
  fabricCanvas = new fabric.Canvas("canvas", {
    backgroundColor: "#ffffff",
    preserveObjectStacking: true
  });

  pages = [emptyPage()];
  loadPage(0);
}

function emptyPage() {
  return { objects: [] };
}

function loadPage(index) {
  currentPage = index;
  fabricCanvas.clear();
  fabricCanvas.backgroundColor = "#ffffff";

  fabricCanvas.loadFromJSON(pages[index], () => {
    fabricCanvas.renderAll();
  });
}

function savePage(index) {
  pages[index] = fabricCanvas.toJSON();
}

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

export function duplicatePage() {
  savePage(currentPage);
  const clone = JSON.parse(JSON.stringify(pages[currentPage]));
  pages.splice(currentPage + 1, 0, clone);
  loadPage(currentPage + 1);
}

// ---------- TEXT ----------
export function addText() {
  const t = new fabric.Textbox("Text", {
    left: fabricCanvas.width / 2,
    top: fabricCanvas.height / 2,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111"
  });
  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
}

// ---------- IMAGE ----------
export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      img.set({
        left: fabricCanvas.width / 2,
        top: fabricCanvas.height / 2,
        originX: "center",
        originY: "center"
      });
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
    });
  };
  reader.readAsDataURL(file);
}

// ---------- FLIPBOOK EXPORT ----------
export async function exportFlipbook() {
  savePage(currentPage);

  const imageUrls = [];

  for (let i = 0; i < pages.length; i++) {
    await new Promise(resolve => {
      fabricCanvas.clear();
      fabricCanvas.loadFromJSON(pages[i], () => {
        fabricCanvas.renderAll();
        const dataUrl = fabricCanvas.toDataURL({ format: "png", multiplier: 2 });
        imageUrls.push(dataUrl);
        resolve();
      });
    });
  }

  // upload all pages
  const uploaded = [];
  for (let i = 0; i < imageUrls.length; i++) {
    const url = await uploadDataUrlToStorage(
      `flipbook/page_${i}.png`,
      imageUrls[i]
    );
    uploaded.push(url);
  }

  await saveProjectToFirestore(null, {
    pages: uploaded,
    updatedAt: Date.now()
  });

  openFlipbookPreview(uploaded);
}

function openFlipbookPreview(urls) {
  const frame = document.getElementById("flipPreviewFrame");
  frame.src = `viewer.html?pages=${encodeURIComponent(JSON.stringify(urls))}`;
}
