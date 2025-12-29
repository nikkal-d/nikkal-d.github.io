document.getElementById("addTextBtn").onclick = () => PB.addText();

document.getElementById("imageInput").onchange = e => {
  if (e.target.files[0]) PB.addImage(e.target.files[0]);
};

document.getElementById("addPageBtn").onclick = PB.addPage;
document.getElementById("nextPageBtn").onclick = PB.nextPage;
document.getElementById("prevPageBtn").onclick = PB.prevPage;

document.getElementById("zoomInBtn").onclick = () => PB.zoomCanvas(0.1);
document.getElementById("zoomOutBtn").onclick = () => PB.zoomCanvas(-0.1);

document.getElementById("pageSizeSelect").onchange = e =>
  PB.setCanvasSize(e.target.value);

document.getElementById("exportFlipBtn").onclick = () =>
  PB.exportFlipbook(false);

document.getElementById("previewFlipBtn").onclick = () =>
  PB.exportFlipbook(true);

document.getElementById("closeFlipBtn").onclick = () =>
  document.getElementById("flipModal").style.display = "none";
