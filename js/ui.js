import { addText, addImageFromFile, zoom } from "./core.js";

document.getElementById("btnAddText").onclick = () => {
  addText();
};

document.getElementById("btnAddImage").onclick = () => {
  document.getElementById("imageInput").click();
};

document.getElementById("imageInput").onchange = e => {
  if (e.target.files[0]) {
    addImageFromFile(e.target.files[0]);
  }
};

document.getElementById("btnZoomIn").onclick = () => zoom(0.1);
document.getElementById("btnZoomOut").onclick = () => zoom(-0.1);
