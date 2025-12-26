// js/ui.js
import * as core from "./core.js";

const $ = id => document.getElementById(id);

window.addEventListener("DOMContentLoaded", ()=>{
  core.initCanvas();

  $("addTextBtn")?.onclick = ()=> core.addText();
  $("pickImageBtn")?.onclick = ()=> $("imageInput")?.click();
  $("imageInput")?.onchange = e=>{
    if(e.target.files[0]) core.addImageFromFile(e.target.files[0]);
    e.target.value="";
  };

  $("zoomInBtn")?.onclick = ()=> core.setZoom(core.getZoom()+0.1);
  $("zoomOutBtn")?.onclick = ()=> core.setZoom(core.getZoom()-0.1);
  $("zoomResetBtn")?.onclick = ()=> core.resetZoom();
  $("zoomFitBtn")?.onclick = ()=> core.fitToScreen();

  $("addPageBtn")?.onclick = ()=> core.addPage();

  $("previewFlipbookBtn")?.onclick = ()=>{
    core.saveCurrentPage();
    const html = core.buildFlipbookHTML({
      title: $("flipTitle")?.value || "My Flipbook",
      orientation: $("flipOrientation")?.value || "horizontal"
    });
    $("flipPreviewFrame").srcdoc = html;
    $("flipPreviewModal").classList.add("open");
  };

  $("exportFlipbookBtn")?.onclick = ()=>{
    core.downloadFlipbookHTML({
      title: $("flipTitle")?.value || "My Flipbook",
      orientation: $("flipOrientation")?.value || "horizontal"
    });
  };
});
