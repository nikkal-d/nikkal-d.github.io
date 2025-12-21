import { addText } from "./core.js";

document.getElementById("addTextBtn")?.addEventListener("click", () => {
  console.log("🟢 Add Text clicked");
  addText();
});
