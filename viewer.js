// js/viewer.js
// ---------------------------------------------
// VIEWER: Load Photobook (Private / Public / Shared)
// ---------------------------------------------

import { db } from "../firebase-init.js";
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
const passwordModal = document.getElementById("passwordModal");
const passwordForm = document.getElementById("passwordForm");

// State
let currentBook = null;
let currentPages = [];
let passwordRequired = false;
let providedPassword = "";

// ---------------------------------------------
// Read URL Parameters
// ---------------------------------------------
const url = new URL(location.href);
const bookId = url.searchParams.get("id");
const shareId = url.searchParams.get("share"); // public shared mode

if (!bookId && !shareId) {
  alert("Δεν βρέθηκε photobook.");
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
// PASSWORD HANDLING
// ---------------------------------------------
function showPasswordModal() {
  if (!passwordModal) return;
  passwordModal.classList.add("visible");

  passwordForm?.addEventListener("submit", (e) => {
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

  // Έλεγχος αν υπάρχει flipbook container
  if (!flipbookContainer || !simpleViewContainer) {
    console.error("Viewer containers not found.");
    return;
  }

  // Καθαρισμός containers
  flipbookContainer.innerHTML = "";
  simpleViewContainer.innerHTML = "";

  // Επιλογή προβολής ανάλογα με συσκευή
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
let simpleIndex = 0;

function renderSimpleView() {
  simpleViewContainer.style.display = "block";
  flipbookContainer.style.display = "none";

  updateSimplePage();
  setupSimpleNavigation();
}

function updateSimplePage() {
  simpleViewContainer.innerHTML = `
    <div class="simple-page">
      <img src="${currentPages[simpleIndex]}" alt="page">
    </div>
  `;
}

function setupSimpleNavigation() {
  const nav = document.createElement("div");
  nav.className = "simple-nav";

  nav.innerHTML = `
    <button id="simplePrev">⟵</button>
    <span>${simpleIndex + 1} / ${currentPages.length}</span>
    <button id="simpleNext">⟶</button>
  `;

  simpleViewContainer.appendChild(nav);

  document.getElementById("simplePrev").onclick = () => {
    if (simpleIndex > 0) {
      simpleIndex--;
      updateSimplePage();
      setupSimpleNavigation();
    }
  };

  document.getElementById("simpleNext").onclick = () => {
    if (simpleIndex < currentPages.length - 1) {
      simpleIndex++;
      updateSimplePage();
      setupSimpleNavigation();
    }
  };
}

// ---------------------------------------------
// FLIPBOOK MODE (desktop)
// ---------------------------------------------
function renderFlipbook() {
  simpleViewContainer.style.display = "none";
  flipbookContainer.style.display = "flex";

  // Προσθέτουμε όλες τις σελίδες
  currentPages.forEach((src, i) => {
    const page = document.createElement("div");
    page.className = "flip-page";

    page.innerHTML = `
      <div class="flip-inner">
        <img src="${src}" alt="page ${i+1}">
      </div>
    `;

    flipbookContainer.appendChild(page);
  });

  setupFlipbookNavigation();
  preloadImages();
}

// ---------------------------------------------
// PRELOAD IMAGES (βελτιώνει το flip animation)
// ---------------------------------------------
function preloadImages() {
  currentPages.forEach(src => {
    const img = new Image();
    img.src = src;
  });
}

// ---------------------------------------------
// NAVIGATION for FLIPBOOK
// ---------------------------------------------
let flipIndex = 0;

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

  // Κίνηση flip
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
// PART 3 — Flip Animation, Keyboard, Zoom, Fullscreen
// ---------------------------------------------

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
    if (flipbookContainer.style.display !== "none") {
      flipTo("prev");
    } else {
      document.getElementById("simplePrev")?.click();
    }
  }

  // Right arrow = next page
  if (e.key === "ArrowRight") {
    if (flipbookContainer.style.display !== "none") {
      flipTo("next");
    } else {
      document.getElementById("simpleNext")?.click();
    }
  }
});



// ---------------------------------------------
// ZOOM MODE (double click or pinch)
// ---------------------------------------------
let zoomEnabled = false;
let zoomScale = 1;

function enableZoom(container) {
  container.addEventListener("dblclick", () => {
    zoomScale = zoomScale === 1 ? 2 : 1;
    container.style.transform = `scale(${zoomScale})`;
  });

  // basic pinch zoom (mobile)
  let startDist = 0;

  container.addEventListener("touchmove", (event) => {
    if (event.touches.length === 2) {
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      const dist = Math.sqrt(dx*dx + dy*dy);

      if (!startDist) startDist = dist;

      zoomScale = Math.min(3, Math.max(1, dist / startDist));
      container.style.transform = `scale(${zoomScale})`;
    }
  });

  container.addEventListener("touchend", () => {
    startDist = 0;
  });
}

// Enable zoom in both modes
enableZoom(simpleViewContainer);
enableZoom(flipbookContainer);



// ---------------------------------------------
// BETTER FLIP ANIMATION
// ---------------------------------------------
// Enhances the flip effect from Part 2
function enhanceFlipEffects() {
  const pages = document.querySelectorAll(".flip-page");

  pages.forEach((pg, i) => {
    pg.style.transition = "transform 0.8s ease-in-out";
    pg.style.transformOrigin = "left center";
    pg.style.backfaceVisibility = "hidden";
  });
}



// ---------------------------------------------
// SHARE OVERLAY (only if ?share=xxxx)
// ---------------------------------------------
function setupShareOverlay() {
  if (!shareId) return;

  const overlay = document.getElementById("share-banner");
  if (!overlay) return;

  overlay.style.display = "flex";

  const link = `${location.origin}/viewer.html?share=${shareId}`;
  const copyBtn = document.getElementById("copyShareLink");

  copyBtn?.addEventListener("click", async () => {
    await navigator.clipboard.writeText(link);
    copyBtn.textContent = "Αντιγράφηκε!";
    setTimeout(() => (copyBtn.textContent = "Αντιγραφή"), 1500);
  });
}



// ---------------------------------------------
// DOWNLOAD AS FLIPBOOK (export html bundle)
// ---------------------------------------------
async function downloadFlipbook() {
  // Future expansion:
  // Here we will generate a standalone HTML with inline images
  // so users can download an offline flipbook file.

  alert("Το κατέβασμα flipbook θα ενεργοποιηθεί στο επόμενο update.");
}



// ---------------------------------------------
// RUN AFTER LOAD
// ---------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  showLoading();

  loadPhotobook().then(() => {
    enhanceFlipEffects();
    setupShareOverlay();
    hideLoading();
  });
});
