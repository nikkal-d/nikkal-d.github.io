// js/ui.js
import {
  initCanvas,
  addText,
  addImageFromFile,
  addPage,
  applyZoom,
  exportPagesAsImages
} from "./core.js";

window.addEventListener("DOMContentLoaded", () => {
  initCanvas();

  document.getElementById("addTextBtn")?.addEventListener("click", addText);

  document.getElementById("imageInput")?.addEventListener("change", e => {
    if (e.target.files[0]) addImageFromFile(e.target.files[0]);
  });

  document.getElementById("addPageBtn")?.addEventListener("click", addPage);

  document.getElementById("zoomInBtn")?.addEventListener("click", () =>
    applyZoom(1.2)
  );
  document.getElementById("zoomOutBtn")?.addEventListener("click", () =>
    applyZoom(0.8)
  );

  document.getElementById("exportFlipBtn")?.addEventListener("click", () => {
    const images = exportPagesAsImages();
    openFlipbook(images);
  });
});

/* -------- FLIPBOOK ---------- */

function openFlipbook(images) {
  const win = window.open("", "_blank");
  win.document.write(`
    <html>
    <head>
      <title>Flipbook</title>
      <style>
        body { margin:0; display:flex; justify-content:center; align-items:center; background:#111; }
        img { max-width:100%; max-height:100vh; }
        .nav { position:fixed; top:50%; color:white; font-size:40px; cursor:pointer; }
        .left { left:20px; }
        .right { right:20px; }
      </style>
    </head>
    <body>
      <div class="nav left" onclick="prev()">‹</div>
      <img id="page">
      <div class="nav right" onclick="next()">›</div>

      <script>
        const pages = ${JSON.stringify(images)};
        let i = 0;
        const img = document.getElementById("page");
        img.src = pages[0];
        function next(){ if(i < pages.length-1) img.src = pages[++i]; }
        function prev(){ if(i > 0) img.src = pages[--i]; }
      </script>
    </body>
    </html>
  `);
}
