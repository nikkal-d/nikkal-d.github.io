// sidebar.js
console.log("🧩 sidebar.js loaded");

document.addEventListener("DOMContentLoaded", () => {

  const leftSidebar  = document.getElementById("leftSidebar");
  const rightSidebar = document.getElementById("rightSidebar");

  const toggleLeftBtn  = document.getElementById("toggleLeft");
  const toggleRightBtn = document.getElementById("toggleRight");

  // ΑΣΦΑΛΕΙΑ: αν δεν υπάρχουν, σταματάμε
  if (!leftSidebar || !rightSidebar) {
    console.warn("❌ Sidebar elements not found");
    return;
  }

  // LEFT SIDEBAR
  if (toggleLeftBtn) {
    toggleLeftBtn.onclick = () => {
      leftSidebar.classList.toggle("open");
    };
  }

  // RIGHT SIDEBAR
  if (toggleRightBtn) {
    toggleRightBtn.onclick = () => {
      rightSidebar.classList.toggle("open");
    };
  }

});
