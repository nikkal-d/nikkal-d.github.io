// viewer.js
// ---------------------------------------------
// VIEWER: Load Photobook (Private / Public / Shared)
// ---------------------------------------------

import { db } from "./firebase-init.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Page elements
const flipbookContainer = document.getElementById("flipbook");
const simpleViewContainer = document.getElementById("simpleView");

// State
let currentBook = null;
let currentPages = [];
let passwordRequired = false;
let providedPassword = "";

let simpleIndex = 0;
let flipIndex = 0;

// ---------------------------------------------
// Read URL Parameters
// ---------------------------------------------
const url = new URL(location.href);
const bookId = url.searchParams.get("id");
const shareId = url.searchParams.get("share"); // public shared mode

// Δεν κάνουμε alert αν λείπουν – απλά δεν φορτώνουμε τίποτα
if (!bookId && !shareId) {
  console.warn("Viewer: No bookId or shareId in URL.");
}

// ---------------------------------------------
// LOADING INDICATOR
// ---------------------------------------------
function showLoading() {
  const loader = document.getElementById("viewer-loading");
  if (loader) loader.style.display = "flex";
}
function hideLoading() {
  const loader = document.getElementById("viewer-loading");
  if (loader) loader.style.display = "none";
}

// ---------------------------------------------
// Load photobook from Firestore
// ---------------------------------------------
async function loadPhotobook() {
  try {
    // CASE 1: Direct ID (private or owner mode)
    if (bookId) {
      const ref = doc(db, "photobooks", bookId);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        alert("Το photobook δεν υπάρχει.");
        return;
      }

      const data = snap.data();
      currentBook = { id: bookId, ...data };

      if (data.password && !shareId) {
        passwordRequired = true;
        showPasswordModal();
        return;
      }

      currentPages = data.pages || [];
      renderViewer();
      return;
    }

    // CASE 2: Shared link mode (?share=xxxx)
    if (shareId) {
      const q = query(
        collection(db, "photobooks"),
        where("shareId", "==", shareId),
        where("isPublic", "==", true)
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        alert("Το shared photobook δεν είναι δημόσιο ή δεν υπάρχει.");
        return;
      }

      snap.forEach((docSnap) => {
        const data = docSnap.data();
        currentBook = { id: docSnap.id, ...data };
        currentPages = data.pages || [];
      });

      renderViewer();
    }
  } catch (err) {
    console.error("Viewer load error:", err);
    alert("Σφάλμα φόρτωσης photobook.");
  }
}

// ---------------------------------------------
// PASSWORD HANDLING (αν έχεις modal στο viewer.html)
// ---------------------------------------------
function showPasswordModal() {
  const passwordModal = document.getElementById("passwordModal");
  const passwordForm = document.getElementById("passwordForm");
  if (!passwordModal || !passwordForm) {
    console.warn("Password modal not present.");
    currentPages = currentBook.pages || [];
    renderViewer();
    return;
  }

  passwordModal.classList.add("visible");

  passwordForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const pass = e.target.password.value.trim();

    if (pass === currentBook.password) {
      providedPassword = pass;
      passwordModal.classList.remove("visible");
      currentPages = currentBook.pages || [];
      renderViewer();
    } else {
      alert("Λάθος κωδικός.");
    }
  });
}

// ---------------------------------------------
// RENDER VIEWER (Flipbook or Simple Mode)
// ---------------------------------------------
function renderViewer() {
  if (!currentPages.length) {
    alert("Δεν υπάρχουν σελίδες στο photobook.");
    return;
  }

  if (!flipbookContainer || !simpleViewContainer) {
    console.error("Viewer containers not found.");
    return;
  }

  flipbookContainer.innerHTML = "";
  simpleViewContainer.innerHTML = "";

  const isMobile = window.innerWidth < 768;
  const mode = isMobile ? "simple" : "flipbook";

  if (mode === "flipbook") {
    renderFlipbook();
  } else {
    renderSimpleView();
  }
}

// ---------------------------------------------
// SIMPLE VIEW MODE (mobile-friendly)
// ---------------------------------------------
function renderSimpleView() {
  simpleIndex = 0;
  simpleViewContainer.style.display = "block";
  flipbookContainer.style.display = "none";

  updateSimplePage();
}

function updateSimplePage() {
  simpleViewContainer.innerHTML = `
    <div class="simple-page">
      <img src="${currentPages[simpleIndex]}" alt="page">
    </div>
    <div class="simple-nav">
      <button id="simplePrev">⟵</button>
      <span>${simpleIndex + 1} / ${currentPages.length}</span>
      <button id="simpleNext">⟶</button>
    </div>
  `;

  document.getElementById("simplePrev").onclick = () => {
    if (simpleIndex > 0) {
      simpleIndex--;
      updateSimplePage();
    }
  };

  document.getElementById("simpleNext").onclick = () => {
    if (simpleIndex < currentPages.length - 1) {
      simpleIndex++;
      updateSimplePage();
    }
  };
}

// ---------------------------------------------
// FLIPBOOK MODE (desktop)
// ---------------------------------------------
function renderFlipbook() {
  simpleViewContainer.style.display = "none";
  flipbookContainer.style.display = "flex";

  flipbookContainer.innerHTML = "";

  currentPages.forEach((src, i) => {
    const page = document.createElement("div");
    page.className = "flip-page";

    page.innerHTML = `
      <div class="flip-inner">
        <img src="${src}" alt="page ${i + 1}">
      </div>
    `;

    flipbookContainer.appendChild(page);
  });

  flipIndex = 0;
  enhanceFlipEffects();
  setupFlipbookNavigation();
  preloadImages();
  updateFlipNavLabel();
}

function setupFlipbookNavigation() {
  const nav = document.getElementById("flipbook-nav");
  if (!nav) return;

  nav.querySelector("#flipPrev").onclick = () => flipTo("prev");
  nav.querySelector("#flipNext").onclick = () => flipTo("next");
}

function flipTo(direction) {
  const pages = document.querySelectorAll(".flip-page");
  if (!pages.length) return;

  if (direction === "next" && flipIndex < pages.length - 1) {
    flipIndex++;
  } else if (direction === "prev" && flipIndex > 0) {
    flipIndex--;
  }

  pages.forEach((pg, i) => {
    pg.style.transform = i <= flipIndex ? "rotateY(-180deg)" : "rotateY(0deg)";
    pg.style.zIndex = pages.length - i;
  });

  updateFlipNavLabel();
}

function updateFlipNavLabel() {
  const lbl = document.getElementById("pageLabel");
  if (!lbl) return;
  lbl.textContent = `${flipIndex + 1} / ${currentPages.length}`;
}

// ---------------------------------------------
// PRELOAD IMAGES
// ---------------------------------------------
function preloadImages() {
  currentPages.forEach(src => {
    const img = new Image();
    img.src = src;
  });
}

// ---------------------------------------------
// BETTER FLIP ANIMATION
// ---------------------------------------------
function enhanceFlipEffects() {
  const pages = document.querySelectorAll(".flip-page");

  pages.forEach((pg) => {
    pg.style.transition = "transform 0.8s ease-in-out";
    pg.style.transformOrigin = "left center";
    pg.style.backfaceVisibility = "hidden";
  });
}

// ---------------------------------------------
// FULLSCREEN MODE
// ---------------------------------------------
const fsBtn = document.getElementById("fullscreenBtn");

if (fsBtn) {
  fsBtn.addEventListener("click", () => {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen();
    }
  });
}

// ---------------------------------------------
// KEYBOARD SHORTCUTS
// ---------------------------------------------
document.addEventListener("keydown", (e) => {
  if (!currentPages.length) return;

  // Left arrow = previous page
  if (e.key === "ArrowLeft") {
    if (flipbookContainer && flipbookContainer.style.display !== "none") {
      flipTo("prev");
    } else {
      const prevBtn = document.getElementById("simplePrev");
      prevBtn && prevBtn.click();
    }
  }

  // Right arrow = next page
  if (e.key === "ArrowRight") {
    if (flipbookContainer && flipbookContainer.style.display !== "none") {
      flipTo("next");
    } else {
      const nextBtn = document.getElementById("simpleNext");
      nextBtn && nextBtn.click();
    }
  }
});

// ---------------------------------------------
// SHARE OVERLAY (only if ?share=xxxx)
// ---------------------------------------------
function setupShareOverlay() {
  if (!shareId) return;

  const overlay = document.getElementById("share-banner");
  if (!overlay) return;

  overlay.style.display = "flex";

  const link = `${location.origin}${location.pathname}?share=${shareId}`;
  const copyBtn = document.getElementById("copyShareLink");

  copyBtn?.addEventListener("click", async () => {
    await navigator.clipboard.writeText(link);
    copyBtn.textContent = "Αντιγράφηκε!";
    setTimeout(() => (copyBtn.textContent = "Αντιγραφή"), 1500);
  });
}

// ---------------------------------------------
// RUN AFTER LOAD
// ---------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  showLoading();

  setupShareOverlay();

  if (bookId || shareId) {
    loadPhotobook().finally(() => {
      hideLoading();
    });
  } else {
    hideLoading();
  }
});
