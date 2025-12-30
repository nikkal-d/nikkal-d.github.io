import {
  canvas,
  addText,
  applyTextColor,
  applyTextOpacity,
  applyTextStroke,
  animateFade,
  animateSlide,
  animateScale
} from "./core_flipbook_ready.js";

/* =====================
   TEXT UI
===================== */
const addTextBtn = document.getElementById("addTextBtn");
const textColorInput = document.getElementById("textColorInput");
const textOpacityInput = document.getElementById("textOpacityInput");
const textStrokeToggle = document.getElementById("textStrokeToggle");

addTextBtn?.addEventListener("click", () => {
  addText();
});

textColorInput?.addEventListener("input", e => {
  applyTextColor(e.target.value);
});

textOpacityInput?.addEventListener("input", e => {
  applyTextOpacity(Number(e.target.value));
});

textStrokeToggle?.addEventListener("change", e => {
  applyTextStroke(e.target.checked);
});

/* =====================
   ANIMATIONS
===================== */
document.getElementById("animFadeBtn")?.addEventListener("click", animateFade);
document.getElementById("animSlideBtn")?.addEventListener("click", () => animateSlide("left"));
document.getElementById("animScaleBtn")?.addEventListener("click", animateScale);
