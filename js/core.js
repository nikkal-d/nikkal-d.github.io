// js/core.js
export let fabricCanvas = null;

export function initCanvas(id){
  fabricCanvas = new fabric.Canvas(id, {
    preserveObjectStacking:true,
    selection:true
  });

  fabricCanvas.setBackgroundColor("#fff", fabricCanvas.renderAll.bind(fabricCanvas));
  console.log("✅ Canvas initialized");
}

export function addText(){
  if(!fabricCanvas) return;
  const t = new fabric.Textbox("Text",{
    left:150,
    top:150,
    fontSize:44,
    fill:"#111",
    fontFamily:"Arial",
    textBaseline:"alphabetic" // ΜΟΝΟ ΑΥΤΟ
  });
  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
}
