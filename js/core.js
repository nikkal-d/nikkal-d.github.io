// js/core.js
// ============================================================
// Photobook Studio Core (ES Module)
// - Single Fabric canvas instance
// - Works with GitHub Pages (no bundler)
// - Zoom (center), Fit to screen
// - Add Text / Emoji / Image
// - Pages (basic) + thumbnails (in-memory)
// - NO localStorage autosave (prevents QuotaExceededError)
// - Guards everywhere so UI never "dies"
// ============================================================

export let fabricCanvas = null;

const state = {
  zoom: 1,
  pages: [{ json: null, thumb: null }],
  currentPage: 0
};

export function getZoom() { return state.zoom; }

// ---------- small helpers ----------
const $ = (id) => document.getElementById(id);

function setStatus(msg) {
  const el = $("statusPill");
  if (el) el.textContent = msg;
}

function ensureFabric() {
  if (typeof window.fabric === "undefined") {
    setStatus("Fabric missing");
    console.error("Fabric missing");
    alert("❌ Δεν φορτώθηκε το Fabric. Κάνε hard refresh (Ctrl+Shift+R).");
    return false;
  }
  return true;
}

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function withCanvas(fn) {
  return (...args) => {
    if (!fabricCanvas) return;
    try { return fn(...args); } catch (e) { console.error(e); }
  };
}

// ---------- init ----------
export function initCore() {
  if (!ensureFabric()) return;

  const canvasEl = $("canvas");
  if (!canvasEl) {
    console.error("Missing #canvas element");
    setStatus("Missing canvas");
    return;
  }

  fabricCanvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true
  });

  // Make sure background exists
  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));

  // Default zoom/fit
  applyZoom(1);
  fitToScreen();

  // Bind core UI (only core-critical buttons)
  bindCoreButtons();

  // Initial page info
  updatePageInfo();
  refreshThumbnails();

  setStatus("Ready");
}

// ---------- zoom ----------
export const applyZoom = withCanvas((value) => {
  state.zoom = clamp(Number(value) || 1, 0.2, 4);

  // zoom around center of canvas (stable)
  const center = new fabric.Point(
    fabricCanvas.getWidth() / 2,
    fabricCanvas.getHeight() / 2
  );
  fabricCanvas.zoomToPoint(center, state.zoom);
  fabricCanvas.requestRenderAll();

  const lbl = $("zoomValue");
  if (lbl) lbl.textContent = Math.round(state.zoom * 100) + "%";
});

export const resetZoom = withCanvas(() => {
  state.zoom = 1;
  fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  fabricCanvas.setZoom(1);
  fabricCanvas.requestRenderAll();
  const lbl = $("zoomValue");
  if (lbl) lbl.textContent = "100%";
});

export const fitToScreen = withCanvas(() => {
  const host = $("canvasHost") || fabricCanvas.wrapperEl?.parentElement;
  if (!host) return;

  // Reset transforms first
  fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  fabricCanvas.setZoom(1);
  state.zoom = 1;

  const pad = 24;
  const availW = host.clientWidth - pad;
  const availH = host.clientHeight - pad;

  const cw = fabricCanvas.getWidth();
  const ch = fabricCanvas.getHeight();
  if (!cw || !ch) return;

  const s = clamp(Math.min(availW / cw, availH / ch), 0.2, 1.5);
  state.zoom = s;

  const center = new fabric.Point(cw / 2, ch / 2);
  fabricCanvas.zoomToPoint(center, s);

  // center the viewport inside host
  const vpt = fabricCanvas.viewportTransform;
  const scaledW = cw * s;
  const scaledH = ch * s;
  vpt[4] = (availW - scaledW) / 2;
  vpt[5] = (availH - scaledH) / 2;
  fabricCanvas.setViewportTransform(vpt);
  fabricCanvas.requestRenderAll();

  const lbl = $("zoomValue");
  if (lbl) lbl.textContent = Math.round(s * 100) + "%";
});

// ---------- add objects ----------
export const addText = withCanvas(() => {
  const t = new fabric.Textbox("Text", {
    left: 140,
    top: 140,
    fontSize: 44,
    fill: "#111",
    fontFamily: "Arial"
  });
  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
  refreshThumbnails();
});

export const addEmoji = withCanvas((emoji = "😀") => {
  const t = new fabric.Textbox(String(emoji), {
    left: 170,
    top: 170,
    fontSize: 96
  });
  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
  refreshThumbnails();
});

export const addImageFromFile = withCanvas((file) => {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, (img) => {
      img.scaleToWidth(fabricCanvas.getWidth() * 0.45);
      img.set({ left: 120, top: 120 });
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.requestRenderAll();
      saveCurrentPage();
      refreshThumbnails();
    }, { crossOrigin: "anonymous" });
  };
  reader.readAsDataURL(file);
});

// ---------- pages ----------
export const addPage = withCanvas(() => {
  saveCurrentPage();
  state.pages.push({ json: null, thumb: null });
  state.currentPage = state.pages.length - 1;
  fabricCanvas.clear();
  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));
  updatePageInfo();
  refreshThumbnails();
});

export const prevPage = withCanvas(() => {
  if (state.currentPage <= 0) return;
  switchPage(state.currentPage - 1);
});

export const nextPage = withCanvas(() => {
  if (state.currentPage >= state.pages.length - 1) return;
  switchPage(state.currentPage + 1);
});

export const switchPage = withCanvas((index) => {
  if (index < 0 || index >= state.pages.length) return;
  saveCurrentPage();
  state.currentPage = index;
  loadPageToCanvas();
  updatePageInfo();
  refreshThumbnails();
});

export function updatePageInfo() {
  const el = $("pageInfo");
  if (el) el.textContent = `${state.currentPage + 1} / ${state.pages.length}`;
}

export const saveCurrentPage = withCanvas(() => {
  const pg = state.pages[state.currentPage];
  if (!pg) return;
  const json = fabricCanvas.toJSON();
  sanitizeJSON(json);
  pg.json = json;

  // Thumbnail only in-memory (avoid localStorage quota)
  try {
    pg.thumb = fabricCanvas.toDataURL({ format: "png", quality: 0.6, multiplier: 0.25 });
  } catch {
    pg.thumb = null;
  }
});

export const loadPageToCanvas = withCanvas(() => {
  const pg = state.pages[state.currentPage];
  if (!pg || !pg.json) {
    fabricCanvas.clear();
    fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));
    fabricCanvas.requestRenderAll();
    return;
  }
  const clean = structuredClone(pg.json);
  sanitizeJSON(clean);
  fabricCanvas.loadFromJSON(clean, () => {
    fabricCanvas.renderAll();
  });
});

export function refreshThumbnails() {
  const strip = $("thumbStrip");
  if (!strip) return;
  strip.innerHTML = "";

  state.pages.forEach((p, i) => {
    const d = document.createElement("button");
    d.className = "thumb" + (i === state.currentPage ? " active" : "");
    d.type = "button";
    d.title = `Σελίδα ${i + 1}`;

    const img = document.createElement("img");
    img.alt = `page ${i + 1}`;
    img.src = p.thumb || "";
    d.appendChild(img);

    d.addEventListener("click", () => switchPage(i));
    strip.appendChild(d);
  });
}

// ---------- sanitize (kills alphabetical baseline inside JSON) ----------
function sanitizeJSON(json) {
  if (!json) return;
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (k === "textBaseline" && v === "alphabetical") node[k] = "alphabetic";
      walk(v);
    }
  };
  walk(json);
}

// ---------- bind DOM buttons ----------
function bindCoreButtons() {
  // Left rail
  $("railText")?.addEventListener("click", addText);
  $("railImage")?.addEventListener("click", () => $("imageInput")?.click());
  $("railEmoji")?.addEventListener("click", () => addEmoji("😀"));

  // File input
  $("imageInput")?.addEventListener("change", (e) => {
    const f = e.target?.files?.[0];
    if (f) addImageFromFile(f);
    e.target.value = "";
  });

  // Zoom
  $("zoomInBtn")?.addEventListener("click", () => applyZoom(state.zoom + 0.1));
  $("zoomOutBtn")?.addEventListener("click", () => applyZoom(state.zoom - 0.1));
  $("zoomResetBtn")?.addEventListener("click", resetZoom);
  $("fitBtn")?.addEventListener("click", fitToScreen);

  // Pages
  $("prevPageBtn")?.addEventListener("click", prevPage);
  $("nextPageBtn")?.addEventListener("click", nextPage);
  $("addPageBtn")?.addEventListener("click", addPage);

  // Right panel toggle
  $("toggleRight")?.addEventListener("click", () => $("rightPanel")?.classList.toggle("open"));

  // Resize responsiveness
  window.addEventListener("resize", () => {
    // don't aggressively change zoom while editing; only if user hits fit
  });
}

// Auto-init
document.addEventListener("DOMContentLoaded", initCore);
