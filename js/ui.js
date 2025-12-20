import {
  addText,
  addImageFromFile,
  zoomIn,
  zoomOut,
  resetZoom
} from "./core.js";

document.getElementById("addTextBtn").onclick = () => {
  addText();
};

document.getElementById("addImageBtn").onclick = () => {
  document.getElementById("imageInput").click();
};

document.getElementById("imageInput").onchange = (e) => {
  const file = e.target.files[0];
  addImageFromFile(file);
  e.target.value = "";
};

document.getElementById("zoomInBtn").onclick = zoomIn;
document.getElementById("zoomOutBtn").onclick = zoomOut;
document.getElementById("zoomResetBtn").onclick = resetZoom;
