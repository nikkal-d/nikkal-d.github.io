// js/core.js
let canvas;
let pages = [];
let currentPage = 0;
let zoom = 1;

// ================= INIT =================
export function initEditor() {
  canvas = new fabric.Canvas('canvas', {
    backgroundColor: '#ffffff',
    preserveObjectStacking: true
  });

  canvas.setWidth(900);
  canvas.setHeight(600);

  addPage();
  renderPage();
}

// ================= PAGES =================
export function addPage() {
  pages.push([]);
  currentPage = pages.length - 1;
  renderPage();
}

export function duplicatePage() {
  const copy = JSON.parse(JSON.stringify(pages[currentPage]));
  pages.push(copy);
  currentPage = pages.length - 1;
  renderPage();
}

export function prevPage() {
  if (currentPage > 0) {
    savePage();
    currentPage--;
    renderPage();
  }
}

export function nextPage() {
  if (currentPage < pages.length - 1) {
    savePage();
    currentPage++;
    renderPage();
  }
}

function savePage() {
  pages[currentPage] = canvas.toJSON().objects || [];
}

function renderPage() {
  canvas.clear();
  canvas.backgroundColor = '#ffffff';

  const objects = pages[currentPage] || [];
  fabric.util.enlivenObjects(objects, objs => {
    objs.forEach(o => canvas.add(o));
    canvas.renderAll();
  });
}

// ================= OBJECTS =================
export function addText() {
  const t = new fabric.Textbox('Text', {
    left: canvas.width / 2,
    top: canvas.height / 2,
    originX: 'center',
    originY: 'center',
    fontSize: 48,
    fill: '#111'
  });
  canvas.add(t);
  canvas.setActiveObject(t);
}

export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    fabric.Image.fromURL(e.target.result, img => {
      img.scaleToWidth(300);
      img.left = canvas.width / 2;
      img.top = canvas.height / 2;
      img.originX = 'center';
      img.originY = 'center';
      canvas.add(img);
    });
  };
  reader.readAsDataURL(file);
}

// ================= ZOOM =================
export function zoomIn() {
  zoom += 0.1;
  canvas.setZoom(zoom);
}

export function zoomOut() {
  zoom = Math.max(0.2, zoom - 0.1);
  canvas.setZoom(zoom);
}

export function resetZoom() {
  zoom = 1;
  canvas.setZoom(1);
  canvas.viewportTransform = [1,0,0,1,0,0];
}

// ================= FLIPBOOK =================
export function exportFlipbook() {
  savePage();
  const data = JSON.stringify(pages);
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'flipbook.json';
  a.click();
}

export function openFlipbookPreview() {
  alert('Flipbook preview (επόμενο βήμα)');
}

export function closeFlipbookPreview() {}
