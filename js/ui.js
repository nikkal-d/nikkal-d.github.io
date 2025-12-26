// ui.js
import { initCanvas, addText, addImageFromFile } from "./core.js";

window.addEventListener("DOMContentLoaded", () => {
  initCanvas();

  const textBtn = document.getElementById("addTextBtn");
  const imageInput = document.getElementById("imageInput");

  textBtn?.addEventListener("click", () => {
    console.log("🟢 Add Text clicked");
    addText();
  });

  imageInput?.addEventListener("change", e => {
    if (e.target.files[0]) {
      addImageFromFile(e.target.files[0]);
      e.target.value = "";
    }
  });
});
