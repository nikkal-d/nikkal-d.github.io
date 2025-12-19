import {
  addText,
  addImageFromFile,
  zoomIn,
  zoomOut,
  resetZoom,
  fitToScreen
} from "./core.js";

// TEXT
document.getElementById("railText")?.addEventListener("click", addText);

// IMAGE
document.getElementById("railImage")?.addEventListener("click", () => {
  document.getElementById("imageInput")?.click();
});

document.getElementById("imageInput")?.addEventListener("change", e => {
  const file = e.target.files[0];
  if (file) addImageFromFile(file);
});

// ZOOM
document.getElementById("zoomInBtn")?.addEventListener("click", zoomIn);
document.getElementById("zoomOutBtn")?.addEventListener("click", zoomOut);
document.getElementById("zoomResetBtn")?.addEventListener("click", resetZoom);
document.getElementById("fitBtn")?.addEventListener("click", fitToScreen);
