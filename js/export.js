// js/export.js
// ============================================================
// Export: PNG/JPG pages, PDF, ZIP, Flipbook ZIP
// ============================================================

import { pages, currentPage } from "./core.js";

function requireLib(name, ok) {
  if (!ok()) throw new Error(`Missing lib: ${name}`);
}

function dataUrlToBase64(dataUrl) {
  const i = dataUrl.indexOf(",");
  return i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
}

function getRange(range) {
  const all = pages.map(p => p.image).filter(Boolean);
  if (range === "CURRENT") {
    const one = pages[currentPage]?.image;
    return one ? [one] : [];
  }
  return all;
}

export async function exportDo({ format, range, quality = 0.9 }) {
  const imgs = getRange(range);
  if (!imgs.length) return alert("Δεν υπάρχουν σελίδες για export (πάτα αλλαγή σελίδας/thumbnail για να γίνει snapshot).");

  if (format === "ZIP") return exportAsZip(imgs);
  if (format === "PDF") return exportAsPDF(imgs);
  if (format === "FLIPBOOK") return exportAsFlipbook(imgs);
  if (format === "PNG") return downloadImages(imgs, "png");
  if (format === "JPG") return downloadImages(imgs, "jpg", quality);
}

async function downloadImages(dataUrls, kind = "png", quality = 0.9) {
  // Download one by one
  for (let i = 0; i < dataUrls.length; i++) {
    const a = document.createElement("a");
    a.download = `page-${String(i + 1).padStart(2, "0")}.${kind}`;

    if (kind === "jpg") {
      const jpg = await toJpg(dataUrls[i], quality);
      a.href = jpg;
    } else {
      a.href = dataUrls[i];
    }
    a.click();
  }
}

async function toJpg(pngDataUrl, quality) {
  const img = await loadImage(pngDataUrl);
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0);
  return c.toDataURL("image/jpeg", quality);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
}

export async function exportAsZip(pageDataUrls, filename = "photobook_pages.zip") {
  requireLib("JSZip", () => typeof window.JSZip !== "undefined");
  requireLib("FileSaver", () => typeof window.saveAs !== "undefined");

  const zip = new JSZip();
  pageDataUrls.forEach((dataUrl, idx) => {
    zip.file(`page-${String(idx + 1).padStart(2, "0")}.png`, dataUrlToBase64(dataUrl), { base64: true });
  });

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, filename);
}

export async function exportAsPDF(pageDataUrls, filename = "photobook.pdf") {
  requireLib("jsPDF", () => typeof window.jspdf !== "undefined");
  requireLib("FileSaver", () => typeof window.saveAs !== "undefined");

  const { jsPDF } = window.jspdf;
  const first = await loadImage(pageDataUrls[0]);
  const w = first.width;
  const h = first.height;

  const pdf = new jsPDF({
    orientation: w >= h ? "landscape" : "portrait",
    unit: "px",
    format: [w, h]
  });

  for (let i = 0; i < pageDataUrls.length; i++) {
    if (i !== 0) pdf.addPage([w, h], w >= h ? "landscape" : "portrait");
    pdf.addImage(pageDataUrls[i], "PNG", 0, 0, w, h);
  }

  saveAs(pdf.output("blob"), filename);
}

export async function exportAsFlipbook(pageDataUrls, filename = "flipbook.zip") {
  requireLib("JSZip", () => typeof window.JSZip !== "undefined");
  requireLib("FileSaver", () => typeof window.saveAs !== "undefined");

  const zip = new JSZip();
  const imgFolder = zip.folder("images");

  pageDataUrls.forEach((dataUrl, idx) => {
    imgFolder.file(`page-${String(idx + 1).padStart(2, "0")}.png`, dataUrlToBase64(dataUrl), { base64: true });
  });

  zip.file("index.html", buildFlipbookHtml(pageDataUrls.length));
  zip.file("style.css", buildFlipbookCss());
  zip.file("app.js", buildFlipbookJs(pageDataUrls.length));

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, filename);
}

function buildFlipbookHtml(n) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Flipbook</title>
<link rel="stylesheet" href="style.css"/>
</head>
<body>
<div class="wrap">
  <div id="flip" class="flip"></div>
  <div class="nav">
    <button id="prev">⟵</button>
    <span id="lbl">1 / ${n}</span>
    <button id="next">⟶</button>
  </div>
</div>
<script src="app.js"></script>
</body>
</html>`;
}

function buildFlipbookCss() {
  return `body{margin:0;background:#111;color:#fff;font-family:Arial;overflow:hidden}
.wrap{height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}
.flip{display:flex;perspective:1600px}
.page{width:420px;height:580px;position:relative;transform-origin:left center;transition:transform .8s ease;box-shadow:0 0 10px #0008;background:#222}
.page img{width:100%;height:100%;object-fit:contain;background:#fff}
.nav{display:flex;gap:12px;align-items:center}
button{padding:8px 12px;border:none;border-radius:10px;background:#333;color:#fff;cursor:pointer}
button:hover{background:#444}`;
}

function buildFlipbookJs(n) {
  return `const flip=document.getElementById("flip");let idx=0;
for(let i=1;i<=${n};i++){
  const d=document.createElement("div");
  d.className="page";
  d.innerHTML=\`<img src="images/page-\${String(i).padStart(2,"0")}.png"/>\`;
  flip.appendChild(d);
}
const pages=[...document.querySelectorAll(".page")];
function render(){
  pages.forEach((p,i)=>{
    p.style.transform=i<=idx?"rotateY(-180deg)":"rotateY(0deg)";
    p.style.zIndex=pages.length-i;
  });
  document.getElementById("lbl").textContent=\`\${idx+1} / \${pages.length}\`;
}
document.getElementById("prev").onclick=()=>{if(idx>0){idx--;render();}};
document.getElementById("next").onclick=()=>{if(idx<pages.length-1){idx++;render();}};
render();`;
}
