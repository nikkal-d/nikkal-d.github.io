// js/core.js
console.log("core.js loaded");

export let canvas;
export let pages = [];
export let currentPage = 0;
export let zoom = 1;

const CANVAS_ID = "canvas";

export function initCanvas() {
  canvas = new fabric.Canvas(CANVAS_ID, {
    width: 1240,
    height: 1754,
    backgroundColor: "#ffffff",
    preserveObjectStacking: true
  });

  pages = [canvas.toJSON()];
  currentPage = 0;

  console.log("✅ Canvas initialized");
}

/* ---------- ADD CONTENT ---------- */

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
  canvas.requestRenderAll();
}

export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      img.set({
        left: canvas.width / 2,
        top: canvas.height / 2,
        originX: "center",
        originY: "center",
        scaleX: 0.5,
        scaleY: 0.5
      });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
    });
  };
  reader.readAsDataURL(file);
}

/* ---------- PAGES ---------- */

function savePage() {
  pages[currentPage] = canvas.toJSON();
}

export function addPage() {
  savePage();
  pages.push({});
  currentPage = pages.length - 1;
  canvas.clear();
  canvas.setBackgroundColor("#ffffff", canvas.requestRenderAll.bind(canvas));
}

export function goToPage(index) {
  if (index < 0 || index >= pages.length) return;
  savePage();
  canvas.clear();
  canvas.loadFromJSON(pages[index], () => {
    canvas.requestRenderAll();
  });
  currentPage = index;
}

/* ---------- ZOOM (ΚΑΜΒΑΣ, ΟΧΙ ΑΝΤΙΚΕΙΜΕΝΟ) ---------- */

export function setZoom(value) {
  zoom = Math.max(0.2, Math.min(3, value));
  canvas.setZoom(zoom);
  canvas.requestRenderAll();
}

export function getZoom() {
  return zoom;
}

/* ---------- CANVAS SIZE ---------- */

export function setCanvasSize(w, h) {
  canvas.setWidth(w);
  canvas.setHeight(h);
  canvas.requestRenderAll();
}

/* ---------- EXPORT FLIPBOOK ---------- */

export function exportFlipbookHTML() {
  savePage();

  const images = pages.map(page => {
    const temp = new fabric.StaticCanvas(null, {
      width: canvas.width,
      height: canvas.height
    });
    temp.loadFromJSON(page, () => {});
    return temp.toDataURL({ format: "png" });
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Flipbook</title>
<style>
body { margin:0; background:#111; display:flex; justify-content:center; align-items:center; }
img { max-width:100%; max-height:100%; display:none; }
img.active { display:block; }
</style>
</head>
<body>
${images.map((src,i)=>`<img src="${src}" class="${i===0?'active':''}">`).join("")}
<script>
let index=0;
const imgs=[...document.querySelectorAll('img')];
document.body.onclick=()=>{
  imgs[index].classList.remove('active');
  index=(index+1)%imgs.length;
  imgs[index].classList.add('active');
};
</script>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  return URL.createObjectURL(blob);
}
