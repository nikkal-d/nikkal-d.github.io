// js/ui.js
import { addText } from "./core.js";

window.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("addTextBtn");

  if (!btn) {
    console.warn("❌ addTextBtn not found");
    return;
  }

  btn.addEventListener("click", () => {
    console.log("🟢 Add Text clicked");
    addText();
  });
});
