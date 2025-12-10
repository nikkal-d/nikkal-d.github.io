// js/viewer.js
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

/* --------------------------
   Module-scope state & helpers
   -------------------------- */

// shared snapshot/flag for viewer — keep a single declaration
var snap = null;

// DOM refs (will be initialized on DOMContentLoaded)
let flipbookContainer = null;
let simpleViewContainer = null;
let passwordModal = null;
let passwordForm = null;

// State
let currentBook = null;
let currentPages = [];
let passwordRequired = false;
let providedPassword = "";
let simpleIndex = 0;
let flipIndex = 0;
let zoomEnabled = false;
let zoomScale = 1;

// Helper: safe DOM getter + safe event attach
function __ensureEl(idOrEl) {
  if (!idOrEl) return null;
  const el = (typeof idOrEl === "string") ? document.getElementById(idOrEl) : idOrEl;
  if (!el) console.warn("Element not found:", idOrEl);
  return el;
}
function __safeOn(idOrEl, evt, handler) {
  const el = __ensureEl(idOrEl);
  if (!el) return function () {}; // noop remover
  el.addEventListener(evt, handler);
  return function () { el.removeEventListener(evt, handler); };
}

// Safe querySelector helper returning NodeList or []
function __qsAll(selector, root = document) {
  try {
    return Array.from(root.querySelectorAll(selector));
  } catch (e) {
    return [];
  }
}

// ---------------------------------------------
// Read URL Parameters (safe to evaluate early)
// ---------------------------------------------
const url = new URL(location.href);
const bookId = url.searchParams.get("id");
const shareId = url.searchParams.get("share"); // public shared mode

if (!bookId && !shareId) {
  // keep but do not block; actual UX alert after DOM ready
  console.warn("No bookId or shareId in URL.");
}

// ---------------------------------------------
// Load photobook from Firestore
// ---------------------------------------------
async function loadPhotobook() {
  try {
    // CASE 1: Direct ID (private or owner mode)
    if (bookId) {
      const ref = doc(db, "photobooks", bookId);
      const docSnap = await getDoc(ref); // renamed from 'snap' to avoid shadowing global

      if (!docSnap.exists()) {
        alert("Το photobook δεν υπάρχει.");
        return;
      }

      const data = docSnap.data();
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

      const snapCol = await getDocs(q);

      if (snapCol.empty) {
        alert("Το shared photobook δεν είναι δημόσιο ή δεν υπάρχει.");
        return;
      }

      snapCol.forEach((docSnapItem) => {
        const data = docSnapItem.data();
        currentBook = { id: docSnapItem.id, ...data };
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

  // remove previous handlers if any by replacing form listener with safe attach
  if (!passwordForm) {
    console.warn("Password form not found.");
    return;
  }

  // Use a one-time handler to avoid duplicate listeners
  const onSubmit = (e) => {
    e.preventDefault();
    const pass = (e.target.password && e.target.password.value) ? e.target.password.value.trim() : "";
    if (pass === currentBook.password) {
      providedPassword = pass;
      passwordModal.classList.remove("visible");
      currentPages = currentBook.pages || [];
      renderViewer();
    } else {
      alert("Λάθος κωδικός.");
    }
    // remove this listener after use
    passwordForm.removeEventListener("submit", onSubmit);
  };

  passwordForm.addEventListener("submit", onSubmit);
}

// ---------------------------------------------
// RENDER VIEWER (Flipbook or Simple Mode)
// ---------------------------------------------
function renderViewer() {
  if (!currentPages || !currentPages.length) {
    alert("Δεν υπάρχουν σελίδες στο photobook.");
    return;
  }

  // Ensure containers exist
  if (!flipbookContainer || !simpleViewContainer) {
    console.error("Viewer containers not found.");
    return;
  }

  // Clear containers
  flipbookContainer.innerHTML = "";
  simpleViewContainer.innerHTML = "";

  // Choose view based on device width
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
  if (!simpleViewContainer || !flipbookContainer) return;
  simpleViewContainer.style.display = "block";
  flipbookContainer.style.display = "none";

  // ensure index bounds
  if (simpleIndex < 0) simpleIndex = 0;
  if (simpleIndex >= currentPages.length) simpleIndex = currentPages.length - 1;

  updateSimplePage();
  setupSimpleNavigation();
}

function updateSimplePage() {
  if (!simpleViewContainer) return;
  simpleViewContainer.innerHTML = `
    <div class="simple-page">
      <img src="${currentPages[simpleIndex]}" alt="page">
    </div>
  `;
}

function setupSimpleNavigation() {
  if (!simpleViewContainer) return;

  // remove previous nav if exists
  const existing = simpleViewContainer.querySelector(".simple-nav");
  if (existing) existing.remove();

  const nav = document.createElement("div");
  nav.className = "simple-nav";

  nav.innerHTML = `
    <button id="simplePrev">⟵</button>
    <span id="simpleLabel">${simpleIndex + 1} / ${currentPages.length}</span>
    <button id="simpleNext">⟶</button>
  `;

  simpleViewContainer.appendChild(nav);

  // Use safe handlers
  __safeOn("simplePrev", "click", () => {
    if (simpleIndex > 0) {
      simpleIndex--;
      updateSimplePage();
      setupSimpleNavigation();
    }
  });

  __safeOn("simpleNext", "click", () => {
    if (simpleIndex < currentPages.length - 1) {
      simpleIndex++;
      updateSimplePage();
      setupSimpleNavigation();
    }
  });
}

// ---------------------------------------------
// FLIPBOOK MODE (desktop)
// ---------------------------------------------
function renderFlipbook() {
  if (!flipbookContainer || !simpleViewContainer) return;
  simpleViewContainer.style.display = "none";
  flipbookContainer.style.display = "flex";

  // Append pages
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

  setupFlipbookNavigation();
  preloadImages().then(() => {
    enhanceFlipEffects();
    updateFlipNavLabel();
  });
}

// ---------------------------------------------
// PRELOAD IMAGES (βελτιώνει το flip animation)
// Returns a Promise resolved when all images attempted
// ---------------------------------------------
function preloadImages() {
  return new Promise((resolve) => {
    if (!currentPages || !currentPages.length) return resolve([]);
    let loaded = 0;
    const results = new Array(currentPages.length);

    currentPages.forEach((src, idx) => {
      const img = new Image();
      img.onload = function () { loaded++; results[idx] = true; if (loaded === currentPages.length) resolve(results); };
      img.onerror = function () { loaded++; results[idx] = false; if (loaded === currentPages.length) resolve(results); };
      img.src = src;
    });
  });
}

// ---------------------------------------------
// NAVIGATION for FLIPBOOK
// ---------------------------------------------
function setupFlipbookNavigation() {
  const nav = __ensureEl("flipbook-nav");
  if (!nav) return;

  // Use safe query inside nav
  const prevBtn = nav.querySelector("#flipPrev");
  const nextBtn = nav.querySelector("#flipNext");

  if (prevBtn) prevBtn.addEventListener("click", () => flipTo("prev"));
  if (nextBtn) nextBtn.addEventListener("click", () => flipTo("next"));
}

function flipTo(direction) {
  const pages = __qsAll(".flip-page", flipbookContainer || document);
  if (!pages.length) return;

  if (direction === "next" && flipIndex < pages.length - 1) {
    flipIndex++;
  } else if (direction === "prev" && flipIndex > 0) {
    flipIndex--;
  }

  // Flip effect: set transform based on index
  pages.forEach((pg, i) => {
    // Ensure style exists
    pg.style.transform = i <= flipIndex ? "rotateY(-180deg)" : "rotateY(0deg)";
    pg.style.zIndex = String(pages.length - i);
  });

  updateFlipNavLabel();
}

function updateFlipNavLabel() {
  const lbl = __ensureEl("pageLabel");
  if (!lbl) return;
  lbl.textContent = `${flipIndex + 1} / ${currentPages.length}`;
}

// ---------------------------------------------
// Flip animation enhancements
// ---------------------------------------------
function enhanceFlipEffects() {
  const pages = __qsAll(".flip-page", flipbookContainer || document);
  pages.forEach((pg) => {
    pg.style.transition = "transform 0.8s ease-in-out";
    pg.style.transformOrigin = "left center";
    pg.style.backfaceVisibility = "hidden";
    // ensure inner preserves 3D
    const inner = pg.querySelector(".flip-inner");
    if (inner) inner.style.transformStyle = "preserve-3d";
  });
}

// ---------------------------------------------
// LOADING INDICATOR
// ---------------------------------------------
function showLoading() {
  const loader = __ensureEl("viewer-loading");
  if (loader) loader.style.display = "flex";
}
function hideLoading() {
  const loader = __ensureEl("viewer-loading");
  if (loader) loader.style.display = "none";
}

// ---------------------------------------------
// FULLSCREEN MODE
// ---------------------------------------------
function setupFullscreen() {
  const fsBtn = __ensureEl("fullscreenBtn");
  if (!fsBtn) return;
  fsBtn.addEventListener("click", () => {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch((err) => console.error(err));
    } else {
      document.exitFullscreen();
    }
  });
}

// ---------------------------------------------
// KEYBOARD SHORTCUTS
// ---------------------------------------------
function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    if (!currentPages || !currentPages.length) return;

    // Left arrow = previous page
    if (e.key === "ArrowLeft") {
      if ((flipbookContainer && flipbookContainer.style.display !== "none")) {
        flipTo("prev");
      } else {
        const prev = __ensureEl("simplePrev");
        if (prev) prev.click();
      }
    }

    // Right arrow = next page
    if (e.key === "ArrowRight") {
      if ((flipbookContainer && flipbookContainer.style.display !== "none")) {
        flipTo("next");
      } else {
        const next = __ensureEl("simpleNext");
        if (next) next.click();
      }
    }
  });
}

// ---------------------------------------------
// ZOOM MODE (double click or pinch) - guarded
// ---------------------------------------------
function enableZoom(container) {
  if (!container) return;

  // dblclick zoom toggle
  container.addEventListener("dblclick", () => {
    zoomScale = zoomScale === 1 ? 2 : 1;
    container.style.transform = `scale(${zoomScale})`;
  });

  // basic pinch zoom (mobile)
  let startDist = 0;
  container.addEventListener("touchmove", (event) => {
    try {
      if (event.touches && event.touches.length === 2) {
        const dx = event.touches[0].clientX - event.touches[1].clientX;
        const dy = event.touches[0].clientY - event.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (!startDist) startDist = dist;

        zoomScale = Math.min(3, Math.max(1, dist / startDist));
        container.style.transform = `scale(${zoomScale})`;
      }
    } catch (err) {
      console.error("Error in pinch zoom handler:", err);
    }
  });

  container.addEventListener("touchend", () => {
    startDist = 0;
  });
}

// ---------------------------------------------
// SHARE OVERLAY (only if ?share=xxxx)
// ---------------------------------------------
function setupShareOverlay() {
  if (!shareId) return;

  const overlay = __ensureEl("share-banner");
  if (!overlay) return;

  overlay.style.display = "flex";

  const link = `${location.origin}/viewer.html?share=${shareId}`;
  const copyBtn = __ensureEl("copyShareLink");

  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(link);
        copyBtn.textContent = "Αντιγράφηκε!";
        setTimeout(() => (copyBtn.textContent = "Αντιγραφή"), 1500);
      } catch (err) {
        console.error("Copy failed:", err);
      }
    });
  }
}

// ---------------------------------------------
// DOWNLOAD AS FLIPBOOK (export html bundle) - placeholder
// ---------------------------------------------
async function downloadFlipbook() {
  alert("Το κατέβασμα flipbook θα ενεργοποιηθεί στο επόμενο update.");
}

// ---------------------------------------------
// INIT after DOM loaded
// ---------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  // bind DOM refs safely
  flipbookContainer = __ensureEl("flipbook");
  simpleViewContainer = __ensureEl("simpleView");
  passwordModal = __ensureEl("passwordModal");
  passwordForm = __ensureEl("passwordForm");

  // Show loading indicator
  showLoading();

  // Setup UI features (fullscreen, keyboard)
  setupFullscreen();
  setupKeyboardShortcuts();

  // Load photobook and then finalize setup
  loadPhotobook().then(() => {
    // share overlay after pages known
    setupShareOverlay();

    // Ensure zoom enabled on both containers (if exist)
    if (simpleViewContainer) enableZoom(simpleViewContainer);
    if (flipbookContainer) enableZoom(flipbookContainer);

    hideLoading();
  }).catch((err) => {
    console.error("loadPhotobook promise error:", err);
    hideLoading();
  });
});
