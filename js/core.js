// js/core.js
import { saveProjectToFirebase, loadProjectFromFirebase } from "./saveToFirebase.js";

export let fabricCanvas = null;
let pages = [];
let currentPage = 0;

/* ---------------- CANVAS INIT ---------------- */

export function initCanvas() {
  fabricCanvas = new fabric.Canvas("canvas", {
    backgroundColor: "#ffffff",
    preserveObjectStacking: true
  });

  pages = [serializePage()];
  currentPage = 0;

  renderPage();
}

/* ---------------- PAGE SYSTEM ---------------- */

function serializePage() {
  return fabricCanvas ? fabricCanvas.toJSON() : { objects: [] };
}

function renderPage() {
  fabricCanvas.clear();
  fabricCanvas.loadFromJSON(pages[currentPage], () => {
    fabricCanvas.requestRenderAll();
  });
}

export function addPage() {
  pages[currentPage] = serializePage();
  pages.push({ objects: [] });
  currentPage = pages.length - 1;
  renderPage();
}

export function prevPage() {
  if (currentPage === 0) return;
  pages[currentPage] = serializePage();
  currentPage--;
  renderPage();
}

export function nextPage() {
  if (currentPage >= pages.length - 1) return;
  pages[currentPage] = serializePage();
  currentPage++;
  renderPage();
}

/* ---------------- OBJECTS ---------------- */

export function addText() {
  const t = new fabric.Textbox("Text", {
    left: fabricCanvas.getWidth() / 2,
    top: fabricCanvas.getHeight() / 2,
    fontSize: 48,
    fill: "#111",
    originX: "center",
    originY: "center"
  });
  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
}

export function addCircle() {
  const c = new fabric.Circle({
    radius: 60,
    fill: "#4f46e5",
    left: 200,
    top: 200
  });
  fabricCanvas.add(c);
}

export function addLine() {
  const l = new fabric.Line([50, 50, 300, 50], {
    stroke: "#111",
    strokeWidth: 4
  });
  fabricCanvas.add(l);
}

export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    fabric.Image.fromURL(e.target.result, img => {
      img.scaleToWidth(300);
      fabricCanvas.add(img);
    });
  };
  reader.readAsDataURL(file);
}

/* ---------------- ZOOM ---------------- */

let zoom = 1;

export function zoomIn() {
  zoom += 0.1;
  fabricCanvas.setZoom(zoom);
}

export function zoomOut() {
  zoom = Math.max(0.2, zoom - 0.1);
  fabricCanvas.setZoom(zoom);
}

export function resetZoom() {
  zoom = 1;
  fabricCanvas.setZoom(1);
}

/* ---------------- FLIPBOOK ---------------- */

export function previewFlipbook() {
  const html = `
    <html>
    <head>
      <script src="https://unpkg.com/page-flip/dist/page-flip.browser.js"></script>
    </head>
    <body>
      <div id="flip"></div>
      <script>
        const pageFlip = new St.PageFlip(
          document.getElementById("flip"),
          { width: 600, height: 800 }
        );
        pageFlip.loadFromImages([
          ${pages.map(p => `'${fabricCanvas.toDataURL()}'`).join(",")}
        ]);
      </script>
    </body>
    </html>
  `;
  const w = window.open();
  w.document.write(html);
}

/* ---------------- FIREBASE ---------------- */

export async function saveToCloud(userId) {
  pages[currentPage] = serializePage();
  await saveProjectToFirebase(userId, pages);
}

export async function loadFromCloud(userId) {
  pages = await loadProjectFromFirebase(userId);
  currentPage = 0;
  renderPage();
}
