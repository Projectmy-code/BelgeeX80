// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ВСТАВЬТЕ СЮДА ВАШ КОНФИГ ИЗ FIREBASE:
const firebaseConfig = {
  apiKey: "AIzaSyDFRkRrXAE7K_jnlS5ttzS9f1_hxxdBX3A",
  authDomain: "belgee-x80.firebaseapp.com",
  projectId: "belgee-x80",
  storageBucket: "belgee-x80.firebasestorage.app",
  messagingSenderId: "1070076211337",
  appId: "1:1070076211337:web:51906ada7cb6c085ded658"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ВАЖНО: Впишите сюда вашу почту, чтобы стать Админом
export const ADMIN_EMAIL = "milaskaak47@gmail.com"; 
