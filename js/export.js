// js/export.js
// ============================================================
// Export: Cloud (Firebase) • PDF • ZIP Images • Flipbook ZIP
// Requires: JSZip (window.JSZip), FileSaver (window.saveAs), jsPDF (window.jspdf)
// ============================================================

import { auth, db, storage } from "../firebase-init.js";

import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  ref as storageRef,
  uploadString,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

function requireLib(name, testFn) {
  if (!testFn()) {
    alert(`Λείπει βιβλιοθήκη: ${name}. Έλεγξε ότι φορτώνεται από CDN στο <head>.`);
    throw new Error(`${name} not loaded`);
  }
}

function dataUrlToBase64(dataUrl) {
  const i = dataUrl.indexOf(",");
  return i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
}

function safeId(len = 12) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/* ============================================================
   EXPORT: ZIP IMAGES
   ============================================================ */

export async function exportAsZip(pageDataUrls, filename = "photobook_pages.zip") {
  requireLib("JSZip", () => typeof window.JSZip !== "undefined");
  requireLib("FileSaver", () => typeof window.saveAs !== "undefined");

  if (!pageDataUrls?.length) {
    alert("Δεν υπάρχουν σελίδες για export.");
    return;
  }

  const zip = new JSZip();

  pageDataUrls.forEach((dataUrl, idx) => {
    const base64 = dataUrlToBase64(dataUrl);
    zip.file(`page-${String(idx + 1).padStart(2, "0")}.png`, base64, { base64: true });
  });

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, filename);
}

/* ============================================================
   EXPORT: PDF
   ============================================================ */

export async function exportAsPDF(pageDataUrls, filename = "photobook.pdf") {
  requireLib("jsPDF", () => typeof window.jspdf !== "undefined");
  requireLib("FileSaver", () => typeof window.saveAs !== "undefined");

  if (!pageDataUrls?.length) {
    alert("Δεν υπάρχουν σελίδες για PDF export.");
    return;
  }

  const { jsPDF } = window.jspdf;

  // A4 portrait in px-ish. We'll size to first image ratio.
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

  const blob = pdf.output("blob");
  saveAs(blob, filename);
}

async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
}

/* ============================================================
   EXPORT: FLIPBOOK ZIP (Standalone HTML)
   ============================================================ */

export async function exportAsFlipbook(pageDataUrls, filename = "flipbook.zip") {
  requireLib("JSZip", () => typeof window.JSZip !== "undefined");
  requireLib("FileSaver", () => typeof window.saveAs !== "undefined");

  if (!pageDataUrls?.length) {
    alert("Δεν υπάρχουν σελίδες για flipbook export.");
    return;
  }

  const zip = new JSZip();
  const imgFolder = zip.folder("images");

  // Write images
  pageDataUrls.forEach((dataUrl, idx) => {
    const base64 = dataUrlToBase64(dataUrl);
    imgFolder.file(`page-${String(idx + 1).padStart(2, "0")}.png`, base64, { base64: true });
  });

  // Write simple HTML viewer
  const html = buildFlipbookHtml(pageDataUrls.length);
  zip.file("index.html", html);

  // Minimal CSS
  zip.file("style.css", buildFlipbookCss());

  // Minimal JS
  zip.file("app.js", buildFlipbookJs(pageDataUrls.length));

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, filename);
}

function buildFlipbookHtml(n) {
  return `<!doctype html>
<html lang="el">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Flipbook</title>
  <link rel="stylesheet" href="style.css"/>
</head>
<body>
  <div class="wrap">
    <div id="flipbook" class="flipbook"></div>
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
.flipbook{display:flex;perspective:1600px}
.page{width:420px;height:580px;background:#222;position:relative;transform-origin:left center;transition:transform .8s ease;box-shadow:0 0 10px #0008}
.page img{width:100%;height:100%;object-fit:contain;background:#fff}
.nav{display:flex;gap:12px;align-items:center}
button{padding:8px 12px;border:none;border-radius:8px;background:#333;color:#fff;cursor:pointer}
button:hover{background:#444}`;
}

function buildFlipbookJs(n) {
  return `const flip=document.getElementById("flipbook");
let idx=0;

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
document.getElementById("prev").onclick=()=>{ if(idx>0){idx--;render();}};
document.getElementById("next").onclick=()=>{ if(idx<pages.length-1){idx++;render();}};
render();`;
}

/* ============================================================
   EXPORT: CLOUD (Firebase Storage + Firestore)
   ============================================================ */

export async function exportToCloud(pageDataUrls, title = "Photobook", password = "") {
  if (!auth.currentUser) {
    alert("Πρέπει να είσαι συνδεδεμένος για Cloud export.");
    return null;
  }
  if (!pageDataUrls?.length) {
    alert("Δεν υπάρχουν σελίδες για upload.");
    return null;
  }

  const uid = auth.currentUser.uid;
  const bookId = safeId(14);
  const shareId = safeId(10);

  // Upload pages to Storage
  const downloadUrls = [];

  for (let i = 0; i < pageDataUrls.length; i++) {
    const p = pageDataUrls[i];
    const pRef = storageRef(storage, `photobooks/${uid}/${bookId}/page-${String(i + 1).padStart(2, "0")}.png`);

    // uploadString expects base64 or data_url. We'll use data_url:
    await uploadString(pRef, p, "data_url");
    const url = await getDownloadURL(pRef);
    downloadUrls.push(url);
  }

  // Save metadata in Firestore
  const bookDoc = doc(db, "photobooks", bookId);

  await setDoc(bookDoc, {
    ownerUid: uid,
    title: title || "Photobook",
    pages: downloadUrls,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isPublic: true,
    shareId,
    password: password || ""
  });

  return bookId;
}
