// core.js
console.log("🟢 core.js loaded");

let canvas;

export function initCanvas() {
  canvas = new fabric.Canvas("canvas", {
    backgroundColor: "#fff",
    preserveObjectStacking: true
  });

  canvas.setWidth(1240);
  canvas.setHeight(1754);

  console.log("✅ Canvas initialized");
}

export function addText() {
  const text = new fabric.Textbox("Text", {
    left: canvas.getWidth() / 2,
    top: canvas.getHeight() / 2,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#000"
  });

  canvas.add(text);
  canvas.setActiveObject(text);
  canvas.requestRenderAll();
  console.log("✅ Text added");
}

export function addImage(file) {
  const reader = new FileReader();
  reader.onload = e => {
    fabric.Image.fromURL(e.target.result, img => {
      img.scaleToWidth(600);
      img.set({
        left: canvas.getWidth() / 2,
        top: canvas.getHeight() / 2,
        originX: "center",
        originY: "center"
      });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
    });
  };
  reader.readAsDataURL(file);
}

/* =========================
   EXPORT FLIPBOOK
========================= */

export function exportFlipbook() {
  const img = canvas.toDataURL({
    format: "png",
    quality: 1
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Flipbook</title>
<style>
body {
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #222;
  height: 100vh;
}
.page {
  width: 80%;
  max-width: 900px;
  box-shadow: 0 20px 60px rgba(0,0,0,.6);
}
.page img {
  width: 100%;
  display: block;
}
</style>
</head>
<body>
  <div class="page">
    <img src="${img}">
  </div>
</body>
</html>
`;

  const blob = new Blob([html], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "flipbook.html";
  a.click();
}
