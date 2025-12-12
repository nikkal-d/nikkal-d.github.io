// js/auth.js
// ---------------------------------------------
// AUTH SYSTEM (Firebase Modular v10)
// ---------------------------------------------
import { auth } from "../firebase-init.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// DOM Elements
const loginModal = document.getElementById("loginModal");
const registerModal = document.getElementById("registerModal");

const openLoginBtn = document.getElementById("openLoginBtn");
const openRegisterBtn = document.getElementById("openRegisterBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");

// ---------------------
// Open / Close Modals
// ---------------------
function showModal(modal) {
  if (!modal) return;
  modal.classList.add("visible");
}
function hideModal(modal) {
  if (!modal) return;
  modal.classList.remove("visible");
}

// κλείσιμο με τα Χ κουμπιά
document.querySelectorAll(".close-modal").forEach(btn =>
  btn.addEventListener("click", () => {
    hideModal(loginModal);
    hideModal(registerModal);
  })
);

// άνοιγμα login modal
openLoginBtn?.addEventListener("click", () => {
  hideModal(registerModal);
  showModal(loginModal);
});

// αν έχεις ξεχωριστό κουμπί "Εγγραφή"
openRegisterBtn?.addEventListener("click", () => {
  hideModal(loginModal);
  showModal(registerModal);
});

// ---------------------
// LOGIN
// ---------------------
document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = e.target.email.value.trim();
  const password = e.target.password.value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    hideModal(loginModal);
  } catch (err) {
    console.error(err);
    alert("Σφάλμα σύνδεσης: " + err.message);
  }
});

// ---------------------
// REGISTER
// ---------------------
document.getElementById("registerForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = e.target.email.value.trim();
  const password = e.target.password.value;
  const name = e.target.name.value.trim();

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      await updateProfile(userCredential.user, { displayName: name });
    }
    hideModal(registerModal);
    alert("Εγγραφήκακες επιτυχώς! Μπορείς να συνδεθείς.");
  } catch (err) {
    console.error(err);
    alert("Σφάλμα εγγραφής: " + err.message);
  }
});

// ---------------------
// LOGOUT
// ---------------------
logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.error(err);
    alert("Σφάλμα αποσύνδεσης: " + err.message);
  }
});

// ---------------------
// AUTH STATE CHANGES
// ---------------------
onAuthStateChanged(auth, (user) => {
  if (!userInfo || !openLoginBtn || !logoutBtn) return;

  if (user) {
    // Logged in
    userInfo.innerHTML = `
      <div class="user-badge">
        <span>${user.displayName || user.email}</span>
      </div>
    `;
    logoutBtn.style.display = "inline-flex";
    openLoginBtn.style.display = "none";
  } else {
    // Logged out
    userInfo.innerHTML = "";
    logoutBtn.style.display = "none";
    openLoginBtn.style.display = "inline-flex";
  }
});

const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");

if (loginBtn) {
  loginBtn.onclick = () => {
    alert("Auth UI θα μπει στο επόμενο βήμα (Firebase ready).");
  };
}

if (logoutBtn) {
  logoutBtn.onclick = async () => {
    await signOut(auth);
    location.reload();
  };
}

