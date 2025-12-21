// js/ui.js
import { addText } from "./core.js";

window.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("addTextBtn");

  if (!btn) {
    console.warn("❌ addTextBtn not found");
    return;
  }

  btn.onclick = () => {
    console.log("🟢 Add Text clicked");
    addText();
  };
});
