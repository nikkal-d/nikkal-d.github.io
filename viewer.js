// ------------------------------------------------------
// VIEWER — Standalone Photobook Viewer (No Firestore)
// ------------------------------------------------------

showLoading();

// DEMO pages (μέχρι να βάλουμε αληθινές)
let pages = [
  "assets/demo/page1.jpg",
  "assets/demo/page2.jpg"
];

// Αν έχεις αργότερα pages από το photobook editor, βάλε:
// pages = project.pages;

// Rendering mode
let isMobile = window.innerWidth < 768;

// ------------------------------------------------------
// RENDER
// ------------------------------------------------------
function renderViewer() {
  hideLoading();

  if (!pages.length) {
    document.body.innerHTML += "<h2 style='text-align:center;margin-top:30px'>Δεν υπάρχουν σελίδες</h2>";
    return;
  }

  if (isMobile) {
    renderSimpleView();
  } else {
    renderFlipbook();
  }
}

// ------------------------------------------------------
// SIMPLE VIEW
// ------------------------------------------------------
let simpleIndex = 0;

function renderSimpleView() {
  const simpleView = document.getElementById("simpleView");
  const flipbook = document.getElementById("flipbook");

  simpleView.style.display = "block";
  flipbook.style.display = "none";

  updateSimplePage();
  setupSimpleNavigation();
}

function updateSimplePage() {
  const simpleView = document.getElementById("simpleView");
  simpleView.innerHTML = `
    <div class="simple-page">
      <img src="${pages[simpleIndex]}" alt="page">
    </div>
  `;
}

function setupSimpleNavigation() {
  const simpleView = document.getElementById("simpleView");

  const nav = document.createElement("div");
  nav.className = "simple-nav";

  nav.innerHTML = `
    <button id="simplePrev">⟵</button>
    <span>${simpleIndex + 1} / ${pages.length}</span>
    <button id="simpleNext">⟶</button>
  `;

  simpleView.appendChild(nav);

  document.getElementById("simplePrev").onclick = () => {
    if (simpleIndex > 0) {
      simpleIndex--;
      updateSimplePage();
      setupSimpleNavigation();
    }
  };

  document.getElementById("simpleNext").onclick = () => {
    if (simpleIndex < pages.length - 1) {
      simpleIndex++;
      updateSimplePage();
      setupSimpleNavigation();
    }
  };
}

// ------------------------------------------------------
// FLIPBOOK VIEW
// ------------------------------------------------------
let flipIndex = 0;

function renderFlipbook() {
  const simpleView = document.getElementById("simpleView");
  const flipbook = document.getElementById("flipbook");

  simpleView.style.display = "none";
  flipbook.style.display = "flex";

  flipbook.innerHTML = "";

  pages.forEach((src, i) => {
    const page = document.createElement("div");
    page.className = "flip-page";

    page.innerHTML = `
      <img src="${src}">
    `;

    flipbook.appendChild(page);
  });

  setupFlipbookNavigation();
  updateFlipbookUI();
}

function setupFlipbookNavigation() {
  document.getElementById("flipPrev").onclick = () => flipTo("prev");
  document.getElementById("flipNext").onclick = () => flipTo("next");
}

function flipTo(direction) {
  const elems = document.querySelectorAll(".flip-page");

  if (direction === "next" && flipIndex < elems.length - 1) {
    flipIndex++;
  }
  if (direction === "prev" && flipIndex > 0) {
    flipIndex--;
  }

  elems.forEach((p, i) => {
    p.style.transform = i <= flipIndex ? "rotateY(-180deg)" : "rotateY(0deg)";
  });

  updateFlipbookUI();
}

function updateFlipbookUI() {
  const lbl = document.getElementById("pageLabel");
  lbl.textContent = `${flipIndex + 1} / ${pages.length}`;
}

// ------------------------------------------------------
// FULLSCREEN
// ------------------------------------------------------
document.getElementById("fullscreenBtn").onclick = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
};

// ------------------------------------------------------
// LOADING
// ------------------------------------------------------
function showLoading() {
  document.getElementById("viewer-loading").style.display = "flex";
}

function hideLoading() {
  document.getElementById("viewer-loading").style.display = "none";
}

// ------------------------------------------------------
// RUN
// ------------------------------------------------------
window.addEventListener("DOMContentLoaded", renderViewer);
