import { addText, addImageFromFile, zoom, fitToScreen } from "./core.js";

document.getElementById("btnAddText").onclick = addText;

document.getElementById("btnAddImage").onclick = () =>
  document.getElementById("imageInput").click();

document.getElementById("imageInput").onchange = e => {
  const f = e.target.files[0];
  if (f) addImageFromFile(f);
};

document.getElementById("btnZoomIn").onclick = () => zoom(0.1);
document.getElementById("btnZoomOut").onclick = () => zoom(-0.1);
document.getElementById("btnFit").onclick = fitToScreen;
