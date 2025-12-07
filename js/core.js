/* ============================================================
   PHOTObook Studio — CORE MODULE
   Canvas, Pages, Thumbnails, Draft Save/Load
   ============================================================ */

import { auth } from "../firebase-init.js";

/* GLOBAL STATE */
export let fabricCanvas = null;
export let pages = [];
export let currentPage = 0;

let autosaveTimer = null;

/* ============================================================
   INITIALIZATION
   ============================================================ */

window.addEventListener("DOMContentLoaded", () => {
  initCanvas();
  initPageSystem();
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // Load user draft once auth is ready
  setTimeout(loadDraft, 800);
});

/* ------------------------------------------------------------ */

function initCanvas() {
  fabricCanvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true,
    backgroundColor: "#ffffff"
  });
}

/* ------------------------------------------------------------ */

function resizeCanvas() {
  const wrap = document.getElementById("canvas-wrapper");
  if (!wrap) return;

  fabricCanvas.setWidth(wrap.clientWidth);
  fabricCanvas.setHeight(wrap.clientHeight);
  fabricCanvas.requestRenderAll();
}


/* ============================================================
   PAGE SYSTEM
   ============================================================ */

export function initPageSystem() {
  // Buttons
  document.getElementById("addPageBtn").onclick = addPage;
  document.getElementById("deletePageBtn").onclick = deletePage;
  document.getElementById("prevPageBtn").onclick = () => switchPage(currentPage - 1);
  document.getElementById("nextPageBtn").onclick = () => switchPage(currentPage + 1);

  // Start with 1 empty page
  addPage(true);
}

/* ------------------------------------------------------------ */

export function addPage(isInitial = false) {
  const pageObj = {
    json: null,
    image: null
  };

  pages.push(pageObj);

  if (!isInitial) currentPage = pages.length - 1;

  saveCurrentPage();
  refreshThumbnails();
  loadPageToCanvas();
}

/* ------------------------------------------------------------ */

export function deletePage() {
  if (pages.length <= 1) {
    alert("Πρέπει να υπάρχει τουλάχιστον μία σελίδα.");
    return;
  }

  pages.splice(currentPage, 1);
  currentPage = Math.max(0, currentPage - 1);

  refreshThumbnails();
  loadPageToCanvas();
}

/* ------------------------------------------------------------ */

export function switchPage(index) {
  if (index < 0 || index >= pages.length) return;

  saveCurrentPage();
  currentPage = index;

  refreshThumbnails();
  loadPageToCanvas();
}


/* ============================================================
   SAVE + LOAD PAGE
   ============================================================ */

export function saveCurrentPage() {
  if (!fabricCanvas) return;

  const json = fabricCanvas.toJSON();
  const image = fabricCanvas.toDataURL({ format: "png", quality: 0.92 });

  pages[currentPage].json = json;
  pages[currentPage].image = image;

  scheduleAutosave();
}

/* ------------------------------------------------------------ */

export function loadPageToCanvas() {
  const p = pages[currentPage];
  if (!p) return;

  if (p.json) {
    fabricCanvas.loadFromJSON(p.json, () => {
      fabricCanvas.renderAll();
    });
  } else {
    fabricCanvas.clear();
  }
}


/* ============================================================
   THUMBNAILS
   ============================================================ */

export function refreshThumbnails() {
  const box = document.getElementById("thumbnails");
  if (!box) return;

  box.innerHTML = "";

  pages.forEach((pg, index) => {
    const div = document.createElement("div");
    div.className = "thumb" + (index === currentPage ? " active" : "");

    const img = document.createElement("img");
    img.src = pg.image || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";

    div.appendChild(img);
    div.onclick = () => switchPage(index);

    box.appendChild(div);
  });

  document.getElementById("pageInfo").textContent =
    `${currentPage + 1} / ${pages.length}`;
}


/* ============================================================
   DRAFT SAVE / LOAD PER USER
   ============================================================ */

function getDraftKey() {
  const user = auth.currentUser;
  return user ? "draft_" + user.uid : "draft_guest";
}

/* ------------------------------------------------------------ */

function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(saveDraft, 700);
}

/* ------------------------------------------------------------ */

export function saveDraft() {
  const key = getDraftKey();

  const draft = {
    pages,
    currentPage
  };

  localStorage.setItem(key, JSON.stringify(draft));
}

/* ------------------------------------------------------------ */

export function loadDraft() {
  const key = getDraftKey();
  const raw = localStorage.getItem(key);

  if (!raw) return;

  try {
    const draft = JSON.parse(raw);
    pages = draft.pages || [];
    currentPage = draft.currentPage || 0;

    refreshThumbnails();
    loadPageToCanvas();
  } catch (err) {
    console.error("Draft load error:", err);
  }
}

// ΠΑΡΑΔΕΙΓΜΑ:
// const fabricCanvas = new fabric.Canvas('editorCanvas');
export let fabricCanvas; // αν δεν το έχεις ήδη export

// ΙΣΤΟΡΙΚΟ
let undoStack = [];
let redoStack = [];
let isRestoring = false;

// κάλεσέ το ΜΟΝΟ όταν έχεις ήδη fabricCanvas
export function initHistory(canvas) {
  fabricCanvas = canvas;

  saveState("init");

  // κάθε φορά που αλλάζει κάτι στον καμβά, αποθηκεύουμε
  const events = ["object:added", "object:modified", "object:removed"];
  events.forEach(ev => {
    fabricCanvas.on(ev, () => {
      if (!isRestoring) {
        saveState(ev);
      }
    });
  });
}

function saveState(source = "manual") {
  const json = fabricCanvas.toJSON();
  undoStack.push(json);
  // για να μην ξεφύγει
  if (undoStack.length > 80) {
    undoStack.shift();
  }
  // κάθε νέο state μηδενίζει το redo
  redoStack = [];
}

// δημόσιες συναρτήσεις
export function undo() {
  if (undoStack.length < 2) return;

  const current = undoStack.pop();
  redoStack.push(current);

  const prev = undoStack[undoStack.length - 1];

  isRestoring = true;
  fabricCanvas.loadFromJSON(prev, () => {
    fabricCanvas.renderAll();
    isRestoring = false;
  });
}

export function redo() {
  if (!redoStack.length) return;

  const next = redoStack.pop();
  undoStack.push(next);

  isRestoring = true;
  fabricCanvas.loadFromJSON(next, () => {
    fabricCanvas.renderAll();
    isRestoring = false;
  });
}

// ------------------------------
// AUTO-SAVE SYSTEM
// ------------------------------

let autoSaveTimer = null;
let currentProjectName = "autosave-photobook";

// σώζει το state στον browser
function autoSave() {
  if (!fabricCanvas) return;

  const json = fabricCanvas.toJSON();
  const data = {
    time: Date.now(),
    json
  };

  localStorage.setItem(currentProjectName, JSON.stringify(data));
  console.log("💾 Auto-saved");
}

// ενεργοποιεί το auto-save
export function enableAutoSave() {
  if (autoSaveTimer) clearInterval(autoSaveTimer);

  autoSaveTimer = setInterval(() => {
    autoSave();
  }, 1000); // κάθε 1 δευτερόλεπτο
}

// επαναφορά
export function tryRestoreProject() {
  const raw = localStorage.getItem(currentProjectName);
  if (!raw) return false;

  try {
    const saved = JSON.parse(raw);
    if (!saved.json) return false;

    fabricCanvas.loadFromJSON(saved.json, () => {
      fabricCanvas.renderAll();
      console.log("🔄 Project restored from auto-save");
    });

    return true;
  } catch (e) {
    console.error("Restore failed:", e);
    return false;
  }
}

// αποθηκεύει project με όνομα
export function saveProjectAs(name) {
  const json = fabricCanvas.toJSON();
  localStorage.setItem("project-" + name, JSON.stringify(json));
  alert("Το project αποθηκεύτηκε ως: " + name);
}

// φορτώνει project με όνομα
export function loadProject(name) {
  const raw = localStorage.getItem("project-" + name);
  if (!raw) {
    alert("Δεν βρέθηκε project με αυτό το όνομα.");
    return;
  }

  const json = JSON.parse(raw);
  fabricCanvas.loadFromJSON(json, () => {
    fabricCanvas.renderAll();
  });
}


