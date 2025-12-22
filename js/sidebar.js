// sidebar.js
// ===============================
// SAFE SIDEBAR TOGGLER
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  const leftSidebar  = document.getElementById("leftSidebar");
  const rightSidebar = document.getElementById("rightSidebar");

  const toggleLeftBtn  = document.getElementById("toggleLeft");
  const toggleRightBtn = document.getElementById("toggleRight");

  // -------- LEFT SIDEBAR ----------
  if (toggleLeftBtn && leftSidebar) {
    toggleLeftBtn.onclick = () => {
      leftSidebar.classList.toggle("open");
      // κλείσε τη δεξιά αν είναι ανοιχτή
      if (rightSidebar) rightSidebar.classList.remove("open");
    };
  } else {
    console.warn("⚠️ Left sidebar or button not found");
  }

  // -------- RIGHT SIDEBAR ----------
  if (toggleRightBtn && rightSidebar) {
    toggleRightBtn.onclick = () => {
      rightSidebar.classList.toggle("open");
      // κλείσε την αριστερή αν είναι ανοιχτή
      if (leftSidebar) leftSidebar.classList.remove("open");
    };
  } else {
    console.warn("⚠️ Right sidebar or button not found");
  }
});
