// js/ui.js
import {
  App, PRESETS, initCanvas, addText, addPage, duplicatePage, deletePage,
  prevPage, nextPage, exportPDF, saveDraft, deleteSelected
} from "./core.js";

const on = (id, ev, fn) => { 
  const el = document.getElementById(id); 
  if (el) el.addEventListener(ev, fn); 
};

document.addEventListener("DOMContentLoaded", async () => {
  await initCanvas();

  on("addPageBtn", "click", () => addPage());
  on("dupPageBtn", "click", () => duplicatePage());
  on("delPageBtn", "click", () => deletePage());
  on("prevPageBtn", "click", () => prevPage());
  on("nextPageBtn", "click", () => nextPage());
  on("addTextBtn", "click", () => addText("Νέο Κείμενο"));
  on("deleteBtn", "click", () => deleteSelected());

  on("exportPdfBtn", "click", async () => {
    const btn = document.getElementById("exportPdfBtn");
    btn.innerText = "Περιμένετε...";
    await exportPDF();
    btn.innerText = "Export PDF";
  });

  on("imageInput", "change", async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (f) => {
        fabric.Image.fromURL(f.target.result, (img) => {
          if (img.width > 1500) img.scaleToWidth(1500);
          App.canvas.add(img).setActiveObject(img);
          saveDraft();
        });
      };
      reader.readAsDataURL(file);
    }
  });
});
