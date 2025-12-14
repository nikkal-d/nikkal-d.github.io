/* js/core.js
   Σταθερός “single-canvas” πυρήνας:
   - Εικόνα / Κείμενο / Emoji δουλεύουν
   - Zoom (+/-/reset/fit) δουλεύει
   - Pages (basic) δουλεύουν
   - Fix baseline warning (alphabetical -> alphabetic) ήδη από HTML patch
*/

(function () {
  const statusPill = () => document.getElementById("statusPill");
  const setStatus = (t) => { const el = statusPill(); if (el) el.textContent = t; };

  // ---------- Guard ----------
  function ensureFabric() {
    if (typeof window.fabric === "undefined") {
      setStatus("Fabric missing");
      alert("❌ Δεν φορτώθηκε το Fabric. Κάνε hard refresh (Ctrl+Shift+R).");
      return false;
    }
    return true;
  }

  // ---------- State ----------
  let canvas = null;
  let zoom = 1;

  let pages = [{ json: null }];
  let currentPage = 0;
  let restoring = false;

  function $(id) { return document.getElementById(id); }

  // ---------- Init ----------
  document.addEventListener("DOMContentLoaded", () => {
    if (!ensureFabric()) return;

    canvas = new fabric.Canvas("canvas", {
      preserveObjectStacking: true,
      selection: true
    });
    window.canvas = canvas;

    // Canvas defaults
    canvas.setBackgroundColor("#ffffff", canvas.renderAll.bind(canvas));
    setStatus("Canvas OK");

    bindUI();
    updatePageInfo();
    applyZoom(1);
    fitToScreen();
  });

  // ---------- UI wiring ----------
  function bindUI() {
    // Left rail quick buttons
    $("railText")?.addEventListener("click", addText);
    $("railImage")?.addEventListener("click", () => $("imageInput")?.click());
    $("railEmoji")?.addEventListener("click", () => addEmoji("😀"));

    // Main buttons
    $("addTextBtn")?.addEventListener("click", addText);
    $("addEmojiBtn")?.addEventListener("click", () => addEmoji("😀"));
    $("addImageBtn")?.addEventListener("click", () => $("imageInput")?.click());

    // File input
    $("imageInput")?.addEventListener("change", onImagePicked);

    // Zoom buttons
    $("zoomInBtn")?.addEventListener("click", () => applyZoom(zoom + 0.1));
    $("zoomOutBtn")?.addEventListener("click", () => applyZoom(zoom - 0.1));
    $("zoomResetBtn")?.addEventListener("click", () => applyZoom(1));
    $("fitBtn")?.addEventListener("click", fitToScreen);

    // Right panel toggle
    $("toggleRight")?.addEventListener("click", () => {
      $("rightPanel")?.classList.toggle("open");
    });

    // Pages
    $("nextPageBtn")?.addEventListener("click", nextPage);
    $("prevPageBtn")?.addEventListener("click", prevPage);

    // Pan: Space
    bindPanZoom();
  }

  // ---------- Tools ----------
  function addText() {
    if (!canvas) return;

    const t = new fabric.Textbox("Text", {
      left: 140,
      top: 140,
      fontSize: 44,
      fill: "#111",
      fontFamily: "Arial"
    });

    canvas.add(t);
    canvas.setActiveObject(t);
    canvas.requestRenderAll();
    saveCurrentPage();
    setStatus("Text added");
  }

  function addEmoji(emoji) {
    if (!canvas) return;

    const t = new fabric.Textbox(emoji, {
      left: 180,
      top: 180,
      fontSize: 90,
      fill: "#111"
    });

    canvas.add(t);
    canvas.setActiveObject(t);
    canvas.requestRenderAll();
    saveCurrentPage();
    setStatus("Emoji added");
  }

  function onImagePicked(e) {
    const file = e.target.files?.[0];
    if (!file || !canvas) return;

    const reader = new FileReader();
    reader.onload = () => {
      fabric.Image.fromURL(reader.result, (img) => {
        img.set({ left: 120, top: 120 });
        img.scaleToWidth(canvas.getWidth() * 0.45);
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();
        saveCurrentPage();
        setStatus("Image added");
      });
    };
    reader.readAsDataURL(file);

    // reset input so selecting same file again works
    e.target.value = "";
  }

  // ---------- Zoom ----------
  function applyZoom(z) {
    if (!canvas) return;
    zoom = Math.max(0.2, Math.min(4, Number(z) || 1));

    const center = new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
    canvas.zoomToPoint(center, zoom);
    canvas.requestRenderAll();

    const label = $("zoomValue");
    if (label) label.textContent = Math.round(zoom * 100) + "%";
  }

  function fitToScreen() {
    const host = $("canvasHost");
    if (!host || !canvas) return;

    // reset
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    zoom = 1;

    const pad = 80;
    const availW = host.clientWidth - pad;
    const availH = host.clientHeight - pad;

    const s = Math.min(availW / canvas.getWidth(), availH / canvas.getHeight());
    applyZoom(s);

    // center by shifting viewport transform
    const vt = canvas.viewportTransform;
    vt[4] = (availW - canvas.getWidth() * s) / 2;
    vt[5] = (availH - canvas.getHeight() * s) / 2;
    canvas.setViewportTransform(vt);
    canvas.requestRenderAll();
    setStatus("Fit");
  }

  // ---------- Pan + Ctrl wheel zoom ----------
  function bindPanZoom() {
    let panMode = false;
    let isPanning = false;
    let last = { x: 0, y: 0 };

    document.addEventListener("keydown", (e) => {
      if (e.code === "Space") panMode = true;
    });
    document.addEventListener("keyup", (e) => {
      if (e.code === "Space") panMode = false;
    });

    canvas.on("mouse:down", (opt) => {
      if (!panMode) return;
      isPanning = true;
      last = { x: opt.e.clientX, y: opt.e.clientY };
    });

    canvas.on("mouse:move", (opt) => {
      if (!isPanning) return;
      const vpt = canvas.viewportTransform;
      vpt[4] += opt.e.clientX - last.x;
      vpt[5] += opt.e.clientY - last.y;
      canvas.setViewportTransform(vpt);
      last = { x: opt.e.clientX, y: opt.e.clientY };
    });

    canvas.on("mouse:up", () => { isPanning = false; });

    canvas.on("mouse:wheel", (opt) => {
      const e = opt.e;
      if (!e.ctrlKey) return;
      e.preventDefault();
      e.stopPropagation();

      const factor = e.deltaY > 0 ? 0.95 : 1.05;
      zoom = Math.max(0.2, Math.min(4, zoom * factor));
      const pt = new fabric.Point(e.offsetX, e.offsetY);
      canvas.zoomToPoint(pt, zoom);
      canvas.requestRenderAll();

      const label = $("zoomValue");
      if (label) label.textContent = Math.round(zoom * 100) + "%";
    });
  }

  // ---------- Pages (basic) ----------
  function saveCurrentPage() {
    if (!canvas) return;
    if (restoring) return;
    pages[currentPage].json = canvas.toJSON();
  }

  function loadCurrentPage() {
    if (!canvas) return;
    const data = pages[currentPage]?.json;
    restoring = true;

    if (!data) {
      canvas.clear();
      canvas.setBackgroundColor("#ffffff", canvas.renderAll.bind(canvas));
      restoring = false;
      return;
    }

    canvas.loadFromJSON(data, () => {
      canvas.requestRenderAll();
      restoring = false;
    });
  }

  function nextPage() {
    saveCurrentPage();
    if (currentPage === pages.length - 1) {
      pages.push({ json: null });
      currentPage++;
      canvas.clear();
      canvas.setBackgroundColor("#ffffff", canvas.renderAll.bind(canvas));
    } else {
      currentPage++;
      loadCurrentPage();
    }
    updatePageInfo();
    setStatus("Page " + (currentPage + 1));
  }

  function prevPage() {
    if (currentPage === 0) return;
    saveCurrentPage();
    currentPage--;
    loadCurrentPage();
    updatePageInfo();
    setStatus("Page " + (currentPage + 1));
  }

  function updatePageInfo() {
    const el = $("pageInfo");
    if (el) el.textContent = `${currentPage + 1} / ${pages.length}`;
  }

})();
