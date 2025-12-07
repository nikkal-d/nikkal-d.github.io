// js/tools.js
// ---------------------------------------------
// IMAGE FILTERS SYSTEM
// ---------------------------------------------

import { fabricCanvas } from "./core.js";

// ---------------------------------------------
// APPLY FILTER TO SELECTED IMAGE
// ---------------------------------------------
export function applyFilter(type, value = 0) {
  const obj = fabricCanvas.getActiveObject();
  if (!obj || obj.type !== "image") {
    alert("Επίλεξε πρώτα μια εικόνα.");
    return;
  }

  switch (type) {
    case "brightness":
      obj.filters[0] = new fabric.Image.filters.Brightness({ brightness: value });
      break;

    case "contrast":
      obj.filters[1] = new fabric.Image.filters.Contrast({ contrast: value });
      break;

    case "saturation":
      obj.filters[2] = new fabric.Image.filters.Saturation({ saturation: value });
      break;

    case "blur":
      obj.filters[3] = new fabric.Image.filters.Blur({ blur: value });
      break;

    case "grayscale":
      obj.filters[4] = new fabric.Image.filters.Grayscale();
      break;

    case "vintage":
      obj.filters[5] = new fabric.Image.filters.SePIA();
      break;

    case "remove":
      obj.filters = [];
      break;
  }

  obj.applyFilters();
  fabricCanvas.requestRenderAll();
}
