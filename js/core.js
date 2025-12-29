// js/core.js
import { fabric } from "https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js";

export let canvas;
export let pages = [];
export let currentPage = 0;

let zoom = 1;

const PRESETS = {
  A4P: { w: 1240, h: 1754 },
  A4L: { w: 1754, h: 1240 },
  SQUARE: { w: 1400, h: 1400 },
  STORY: { w: 1080, h: 1920 },
  HD: { w: 1920, h: 1080 },
};

// ---------------- INIT ----------------
export function initCanvas() {
  canvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true,
  });

  setPageSize("A4P");

  pages = [null];
  savePage();
}

// ---------------- PAGES ----------------
export function savePage() {
  pages[currentPage] = canvas.toJSON();
}

export function loadPage(index) {
  if (!pages[index]) return;
  savePage();
  currentPage = index;

  canvas.clear();
  canvas.loadFromJSON(pages[index], () => {
    canvas.renderAll();
    fitToScreen();
  });
}

export function addPage() {
  savePage();
  pages.push(null);
  canvas.clear();
  currentPage = pages.length - 1;
  fitToScreen();
}

export function prevPage() {
  if (currentPage === 0) return;
  loadPage(currentPage - 1);
}

export function nextPage() {
  if (currentPage >= pages.length - 1) return;
  loadPage(currentPage + 1);
}

// ---------------- TEXT / IMAGE ----------------
export function addText() {
  const center = canvas.getCenter();
  const t = new fabric.Textbox("Text", {
    left: center.left,
    top: center.top,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111",
  });
  canvas.add(t);
  canvas.setActiveObject(t);
}

export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      img.scaleToWidth(canvas.getWidth() * 0.4);
      img.center();
      canvas.add(img);
    });
  };
  reader.readAsDataURL(file);
}

// ---------------- ZOOM ----------------
export function setZoom(delta) {
  zoom = Math.min(3, Math.max(0.2, zoom + delta));
  canvas.setZoom(zoom);
  centerCanvas();
}

export function resetZoom() {
  zoom = 1;
  canvas.setZoom(1);
  centerCanvas();
}

export function fitToScreen() {
  const host = document.getElementById("canvasHost");
  if (!host) return;

  const scale = Math.min(
    host.clientWidth / canvas.getWidth(),
    host.clientHeight / canvas.getHeight()
  );

  zoom = scale * 0.95;
  canvas.setZoom(zoom);
  centerCanvas();
}

function centerCanvas() {
  const vpt = canvas.viewportTransform;
  vpt[4] = (canvas.width - canvas.width * zoom) / 2;
  vpt[5] = (canvas.height - canvas.height * zoom) / 2;
  canvas.setViewportTransform(vpt);
}

// ---------------- SIZE ----------------
export function setPageSize(preset) {
  const p = PRESETS[preset];
  if (!p) return;

  canvas.setWidth(p.w);
  canvas.setHeight(p.h);
  canvas.setBackgroundColor("#fff", canvas.renderAll.bind(canvas));
  resetZoom();
}

// ---------------- EXPORT FLIPBOOK ----------------
export function exportFlipbook() {
  savePage();

  // reset zoom before export
  const oldZoom = zoom;
  resetZoom();

  const images = pages.map((_, i) => {
    loadPage(i);
    return canvas.toDataURL({ format: "png", multiplier: 2 });
  });

  // restore
  zoom = oldZoom;
  canvas.setZoom(zoom);
  centerCanvas();

  const html = `
  <html>
  <head>
    <style>
      body{margin:0;background:#111;display:flex;justify-content:center}
      .book{width:90vw;height:90vh;perspective:2000px}
      .page{position:absolute;width:100%;height:100%;background-size:contain;background-repeat:no-repeat;background-position:center;transform-origin:left;transition:transform .8s}
      .page.flipped{transform:rotateY(-180deg)}
    </style>
  </head>
  <body>
    <div class="book">
      ${images.map((img,i)=>`<div class="page" style="background-image:url(${img});z-index:${images.length-i}"></div>`).join("")}
    </div>
    <script>
      let i=0;
      document.body.onclick=()=>{
        const pages=document.querySelectorAll('.page');
        if(i<pages.length){pages[i].classList.add('flipped');i++;}
      }
    </script>
  </body>
  </html>`;

  const w = window.open();
  w.document.write(html);
}
