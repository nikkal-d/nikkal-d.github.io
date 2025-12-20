import {
  addText,
  addImageFromFile,
  zoomIn,
  zoomOut,
  resetZoom
} from "./core.js";

document.getElementById("addTextBtn").onclick = addText;

document.getElementById("addImageBtn").onclick = () => {
  document.getElementById("imageInput").click();
};

document.getElementById("imageInput").onchange = e => {
  if (e.target.files[0]) {
    addImageFromFile(e.target.files[0]);
  }
};

document.getElementById("zoomIn").onclick = zoomIn;
document.getElementById("zoomOut").onclick = zoomOut;
document.getElementById("resetZoom").onclick = resetZoom;
