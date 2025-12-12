// js/flipbook-preview.js
// ============================================================
// Flipbook Preview modal (no export)
// ============================================================

import { pages } from "./core.js";

let idx = 0;
let imgs = [];

export function openPreview() {
  imgs = pages.map(p => p.image).filter(Boolean);
  if (!imgs.length) return alert("Δεν υπάρχουν σελίδες για preview.");

  idx = 0;
  document.getElementById("previewModal")?.classList.add("open");
  render();
}

export function closePreview() {
  document.getElementById("previewModal")?.classList.remove("open");
}

function render() {
  const host = document.getElementById("previewFlipbook");
  const lbl = document.getElementById("pvLabel");
  if (!host || !lbl) return;

  host.innerHTML = "";

  const isMobile = window.innerWidth < 820;

  if (isMobile) {
    // simple view
    const img = document.createElement("img");
    img.src = imgs[idx];
    img.style.maxWidth = "100%";
    img.style.maxHeight = "100%";
    img.style.objectFit = "contain";
    img.style.background = "#fff";
    img.style.borderRadius = "12px";
    host.appendChild(img);
  } else {
    // flipbook stack
    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.perspective = "1600px";

    imgs.forEach((src, i) => {
      const page = document.createElement("div");
      page.style.width = "420px";
      page.style.height = "580px";
      page.style.transformOrigin = "left center";
      page.style.transition = "transform .8s ease";
      page.style.boxShadow = "0 0 10px rgba(0,0,0,.5)";
      page.style.position = "relative";
      page.style.background = "#222";

      const im = document.createElement("img");
      im.src = src;
      im.style.width = "100%";
      im.style.height = "100%";
      im.style.objectFit = "contain";
      im.style.background = "#fff";

      page.appendChild(im);

      page.style.transform = i <= idx ? "rotateY(-180deg)" : "rotateY(0deg)";
      page.style.zIndex = imgs.length - i;

      wrap.appendChild(page);
    });

    host.appendChild(wrap);
  }

  lbl.textContent = `${idx + 1} / ${imgs.length}`;
}

export function prev() {
  if (idx > 0) idx--;
  render();
}
export function next() {
  if (idx < imgs.length - 1) idx++;
  render();
}
