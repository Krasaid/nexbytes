// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAmqLNasFIF4_o6BRR6ani-1wktEYlF0Ro",
  authDomain: "nexbytes.firebaseapp.com",
  projectId: "nexbytes",
  storageBucket: "nexbytes.firebasestorage.app",
  messagingSenderId: "561219557970",
  appId: "1:561219557970:web:c42003a8d83a3f3d6bdd8b",
  measurementId: "G-E19MS65FH7",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Analytics only in the browser (not during SSR)
export const analytics = isSupported().then((supported) =>
  supported ? getAnalytics(app) : null
);
