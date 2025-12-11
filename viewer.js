// viewer.js
// ======================================================
// Photobook Viewer (Flipbook + Simple View + Zoom)
// Works WITHOUT Firebase — loads pages from JSON
// ======================================================

// DOM elements
const flipbookContainer = document.getElementById("flipbook");
const simpleViewContainer = document.getElementById("simpleView");
const loading = document.getElementById("viewer-loading");

// URL params
const url = new URL(location.href);
const bookId = url.searchParams.get("id");

// If no book ID → show demo pages
const DEFAULT_PAGES = [
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200",
  "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=1200"
];

let pages = [];
let simpleIndex = 0;
let flipIndex = 0;

// ------------------------------------------------------
// LOAD BOOK
// ------------------------------------------------------
async function loadPhotobook() {
  showLoading();

  if (!bookId) {
    // no id → demo mode
    pages = DEFAULT_PAGES;
    renderViewer();
    hideLoading();
    return;
  }

  try {
    const jsonUrl = `./assets/projects/${bookId}/info.json`;
    const res = await fetch(jsonUrl);

    if (!res.ok) {
      pages = DEFAULT_PAGES;
      renderViewer();
      hideLoading();
      return;
    }

    const data = await res.json();
    pages = data.pages?.length ? data.pages : DEFAULT_PAGES;

    renderViewer();
  } catch (err) {
    console.error("Viewer load error:", err);
    pages = DEFAULT_PAGES;
    renderViewer();
  }

  hideLoading();
}

// ------------------------------------------------------
// VIEW RENDER
// ------------------------------------------------------
function renderViewer() {
  const isMobile = window.innerWidth < 768;
  isMobile ? renderSimpleView() : renderFlipbook();
}

// ------------------------------------------------------
// SIMPLE VIEW (mobile)
// ------------------------------------------------------
function renderSimpleView() {
  simpleViewContainer.style.display = "block";
  flipbookContainer.style.display = "none";
  updateSimplePage();
  setupSimpleNav();
}

function updateSimplePage() {
  simpleViewContainer.innerHTML = `
    <div class="simple-page">
      <img src="${pages[simpleIndex]}" alt="page">
    </div>
  `;
}

function setupSimpleNav() {
  const nav = document.createElement("div");
  nav.className = "simple-nav";
  nav.innerHTML = `
    <button id="simplePrev">⟵</button>
    <span>${simpleIndex + 1} / ${pages.length}</span>
    <button id="simpleNext">⟶</button>
  `;
  simpleViewContainer.appendChild(nav);

  document.getElementById("simplePrev").onclick = () => {
    if (simpleIndex > 0) {
      simpleIndex--;
      updateSimplePage();
      setupSimpleNav();
    }
  };
  document.getElementById("simpleNext").onclick = () => {
    if (simpleIndex < pages.length - 1) {
      simpleIndex++;
      updateSimplePage();
      setupSimpleNav();
    }
  };
}

// ------------------------------------------------------
// FLIPBOOK VIEW (desktop)
// ------------------------------------------------------
function renderFlipbook() {
  simpleViewContainer.style.display = "none";
  flipbookContainer.style.display = "flex";

  flipbookContainer.innerHTML = "";
  pages.forEach((src, i) => {
    const page = document.createElement("div");
    page.className = "flip-page";
    page.innerHTML = `<img src="${src}" alt="page ${i+1}">`;
    flipbookContainer.appendChild(page);
  });

  setupFlipNav();
}

function setupFlipNav() {
  document.getElementById("flipPrev").onclick = () => flipTo("prev");
  document.getElementById("flipNext").onclick = () => flipTo("next");
}

function flipTo(direction) {
  const elems = document.querySelectorAll(".flip-page");

  if (direction === "next" && flipIndex < elems.length - 1) flipIndex++;
  if (direction === "prev" && flipIndex > 0) flipIndex--;

  elems.forEach((pg, i) => {
    pg.style.transform = i <= flipIndex ? "rotateY(-180deg)" : "rotateY(0deg)";
    pg.style.zIndex = elems.length - i;
  });

  document.getElementById("pageLabel").textContent =
    `${flipIndex + 1} / ${pages.length}`;
}

// ------------------------------------------------------
// FULLSCREEN
// ------------------------------------------------------
document.getElementById("fullscreenBtn").onclick = () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen();
  else document.exitFullscreen();
};

// ------------------------------------------------------
// ZOOM (double click + pinch)
// ------------------------------------------------------
function enableZoom(container) {
  let scale = 1;

  container.addEventListener("dblclick", () => {
    scale = scale === 1 ? 2 : 1;
    container.style.transform = `scale(${scale})`;
  });
}

enableZoom(simpleViewContainer);
enableZoom(flipbookContainer);

// ------------------------------------------------------
function showLoading() { loading.style.display = "flex"; }
function hideLoading() { loading.style.display = "none"; }

// ------------------------------------------------------
window.addEventListener("DOMContentLoaded", loadPhotobook);
