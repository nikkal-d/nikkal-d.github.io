const sidebar = document.getElementById("sidebar");
const btn = document.getElementById("sidebarBtn");

if (sidebar && btn) {
  btn.onclick = () => {
    sidebar.classList.toggle("active");
  };
} else {
  console.warn("Sidebar or button not found in DOM");
}
