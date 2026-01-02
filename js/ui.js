// js/ui.js
import {
  initCanvas,
  // zoom
  zoomIn, zoomOut, resetZoom, fitToHost, getZoom,
  // sizes
  setPageSize, setCustomSize,
  // objects
  addText, addImageFromFile,
  addRect, addCircle, addLine,
  // pages
  addPage, duplicatePage, deletePage, nextPage, prevPage,
  // layers
  bringForward, sendBackwards, deleteActive, refreshLayers,
  // colors
  setCanvasBg, setActiveFill, updateActiveTextStyle,
  // flipbook export
  previewFlipbook, closeFlipPreview, exportFlipbook, copyFlipbookLink, exportPdf
} from "./core.js";

initCanvas();

// -------------------- elements --------------------
const $ = (id) => document.getElementById(id);

// zoom
$("zoomInBtn")?.addEventListener("click", () => zoomIn());
$("zoomOutBtn")?.addEventListener("click", () => zoomOut());
$("zoomResetBtn")?.addEventListener("click", () => resetZoom());
$("zoomFitBtn")?.addEventListener("click", () => fitToHost(true));
$("fitBtn")?.addEventListener("click", () => fitToHost(true));

// sizes
$("pageSizeSelect")?.addEventListener("change", (e) => {
  const v = e.target.value;
  if (v === "CUSTOM") {
    const w = prompt("Width (px)", "1240");
    const h = prompt("Height (px)", "1754");
    if (w && h) setCustomSize(w, h);
    e.target.value = "CUSTOM";
    return;
  }
  setPageSize(v);
});

// pages
$("addPageBtn")?.addEventListener("click", () => addPage());
$("dupPageBtn")?.addEventListener("click", () => duplicatePage());
$("delPageBtn")?.addEventListener("click", () => deletePage());
$("nextPageBtn")?.addEventListener("click", () => nextPage());
$("prevPageBtn")?.addEventListener("click", () => prevPage());

// add text
$("addTextBtn")?.addEventListener("click", () => {
  const fontFamily = $("fontSelect")?.value || "Arial";
  const fontSize = Number($("fontSizeInput")?.value || 48);
  const fill = $("textFillInput")?.value || "#111111";
  const stroke = $("textStrokeInput")?.value || "#000000";
  const strokeWidth = Number($("textStrokeWidthInput")?.value || 0);
  const opacity = Number($("textOpacityInput")?.value || 1);

  addText({ fontFamily, fontSize, fill, stroke: strokeWidth>0 ? stroke : null, strokeWidth, opacity });
  refreshLayers();
});

// image upload
$("imageInput")?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) addImageFromFile(file);
  e.target.value = "";
});

// shapes
$("addRectBtn")?.addEventListener("click", () => addRect());
$("addCircleBtn")?.addEventListener("click", () => addCircle());
$("addLineBtn")?.addEventListener("click", () => addLine());

// colors
$("canvasBgColor")?.addEventListener("input", (e) => setCanvasBg(e.target.value));
$("objFillColor")?.addEventListener("input", (e) => setActiveFill(e.target.value));
document.querySelectorAll("[data-bg]")?.forEach(btn => {
  btn.addEventListener("click", () => setCanvasBg(btn.dataset.bg));
});

// text style live updates (when a text is selected)
$("textFillInput")?.addEventListener("input", (e) => updateActiveTextStyle({ fill: e.target.value }));
$("textStrokeInput")?.addEventListener("input", (e) => updateActiveTextStyle({ stroke: e.target.value }));
$("textStrokeWidthInput")?.addEventListener("input", (e) => updateActiveTextStyle({ strokeWidth: Number(e.target.value||0) }));
$("textOpacityInput")?.addEventListener("input", (e) => updateActiveTextStyle({ opacity: Number(e.target.value||1) }));

// align buttons
$("alignLeftBtn")?.addEventListener("click", () => updateActiveTextStyle({ textAlign: "left" }));
$("alignCenterBtn")?.addEventListener("click", () => updateActiveTextStyle({ textAlign: "center" }));
$("alignRightBtn")?.addEventListener("click", () => updateActiveTextStyle({ textAlign: "right" }));

// bold/italic/underline
$("boldBtn")?.addEventListener("click", () => {
  // Fabric Textbox uses fontWeight
  updateActiveTextStyle({ fontWeight: "bold" });
});
$("italicBtn")?.addEventListener("click", () => updateActiveTextStyle({ fontStyle: "italic" }));
$("underlineBtn")?.addEventListener("click", () => updateActiveTextStyle({ underline: true }));

// layers actions
$("bringFwdBtn")?.addEventListener("click", () => bringForward());
$("sendBackBtn")?.addEventListener("click", () => sendBackwards());
$("deleteObjBtn")?.addEventListener("click", () => deleteActive());

// -------------------- export / preview --------------------
function flipDir(){
  return $("flipDirSelect")?.value === "vertical" ? "vertical" : "horizontal";
}

$("previewFlipBtn")?.addEventListener("click", () => previewFlipbook(flipDir()));
$("closeFlipPreview")?.addEventListener("click", () => closeFlipPreview());
$("flipPreviewModal")?.addEventListener("click", (e) => {
  if (e.target?.id === "flipPreviewModal") closeFlipPreview();
});

$("exportFlipBtn")?.addEventListener("click", () => {
  const { url } = exportFlipbook(flipDir());
  window.open(url, "_blank");
});

$("exportLinkBtn")?.addEventListener("click", async () => {
  try{
    await copyFlipbookLink(flipDir());
    $("exportHint") && ($("exportHint").textContent = "✅ Copied shareable flipbook link (data URL) to clipboard.");
  }catch(e){
    $("exportHint") && ($("exportHint").textContent = "❌ Copy failed (browser permissions).");
  }
});

$("exportPdfBtn")?.addEventListener("click", () => exportPdf(flipDir()));

// -------------------- basic auth placeholders --------------------
$("loginBtn")?.addEventListener("click", () => alert("Auth θα συνδεθεί στο επόμενο βήμα (Firebase)."));
$("logoutBtn")?.addEventListener("click", () => alert("Logout placeholder"));
