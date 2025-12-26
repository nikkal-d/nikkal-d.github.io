// ui.js
import { initCanvas, addText, addImage, exportFlipbook } from "./core.js";

window.addEventListener("DOMContentLoaded", () => {
  initCanvas();

  document.getElementById("addTextBtn").onclick = () => {
    console.log("🟢 Add Text clicked");
    addText();
  };

  document.getElementById("imageInput").onchange = e => {
    if (e.target.files[0]) addImage(e.target.files[0]);
  };

  document.getElementById("exportFlipbookBtn").onclick = () => {
    exportFlipbook();
  };
});
