// js/auth.js
// ---------------------------------------------
// AUTH CORE (Firebase Modular v10)
// ---------------------------------------------
import { auth } from "../firebase-init.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ---------------------------------------------
// API (EXPORTS)
// ---------------------------------------------

export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function register(email, password, name) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (name) {
    await updateProfile(cred.user, { displayName: name });
  }
  return cred;
}

export async function logout() {
  return signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}
