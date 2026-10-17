import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Firebase WEB config is public application metadata, not a Firebase Admin key.
// Defaults are for the user's existing spendly-ba3b0 project.
// Set VITE_FIREBASE_* env vars to override them for a different Firebase project.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBcEXj1DIymItMpyt70tsfILbXlGusxgXY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "spendly-ba3b0.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "spendly-ba3b0",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:793476906089:web:a575685ceefe28c553b6f8",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "793476906089",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "spendly-ba3b0.firebasestorage.app",
};

export const auth = getAuth(initializeApp(config));
export const googleProvider = new GoogleAuthProvider();
