// js/core.js
import { savePageToFirebase, loadPageFromFirebase } from './saveToFirebase.js';

// --------------------
// GLOBALS
// --------------------
export let fabricCanvas = null;
let currentPage = 0;
let pages = [];

// --------------------
// INIT CANVAS
// --------------------
export function initCanvas() {
  fabricCanvas = new fabric.Canvas('canvas', {
    backgroundColor: '#ffffff',
    preserveObjectStacking: true
  });

  // πρώτη σελίδα
  pages = [serializeCanvas()];
  renderPage(0);
}

// --------------------
// PAGE SYSTEM
// --------------------
export function addPage() {
  saveCurrentPage();
  pages.push(emptyPage());
  renderPage(pages.length - 1);
}

export function duplicatePage() {
  saveCurrentPage();
  pages.push(structuredClone(pages[currentPage]));
  renderPage(pages.length - 1);
}

export function prevPage() {
  if (currentPage > 0) {
    saveCurrentPage();
    renderPage(currentPage - 1);
  }
}

export function nextPage() {
  if (currentPage < pages.length - 1) {
    saveCurrentPage();
    renderPage(currentPage + 1);
  }
}

function renderPage(index) {
  currentPage = index;
  fabricCanvas.clear();
  fabricCanvas.loadFromJSON(pages[index], () => {
    fabricCanvas.renderAll();
  });
}

function saveCurrentPage() {
  pages[currentPage] = serializeCanvas();
  savePageToFirebase(currentPage, pages[currentPage]);
}

function serializeCanvas() {
  return fabricCanvas.toJSON(['selectable']);
}

function emptyPage() {
  return {
    version: fabric.version,
    objects: [],
    background: '#ffffff'
  };
}

// --------------------
// OBJECT ADDERS
// --------------------
export function addText() {
  const t = new fabric.Textbox('Text', {
    left: 200,
    top: 200,
    fontSize: 48,
    fill: '#111'
  });
  fabricCanvas.add(t).setActiveObject(t);
}

export function addRect() {
  const r = new fabric.Rect({
    left: 150,
    top: 150,
    width: 200,
    height: 120,
    fill: '#ff0000'
  });
  fabricCanvas.add(r);
}

export function addCircle() {
  const c = new fabric.Circle({
    left: 200,
    top: 200,
    radius: 60,
    fill: '#00aaff'
  });
  fabricCanvas.add(c);
}

export function addLine() {
  const l = new fabric.Line([50, 50, 300, 50], {
    stroke: '#000',
    strokeWidth: 4
  });
  fabricCanvas.add(l);
}

// --------------------
// IMAGES
// --------------------
export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = e => addImage(e.target.result);
  reader.readAsDataURL(file);
}

export function addImage(url) {
  fabric.Image.fromURL(url, img => {
    img.scaleToWidth(400);
    fabricCanvas.add(img).setActiveObject(img);
  }, { crossOrigin: 'anonymous' });
}

// --------------------
// EXPORT FLIPBOOK (JSON)
// --------------------
export function exportFlipbook() {
  const data = {
    pages,
    created: Date.now()
  };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  download(blob, 'flipbook.json');
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}
