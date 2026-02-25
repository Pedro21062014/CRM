import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyABooLzKOpSqcmQ5VjAydDgbgiUvpMEMh8",
  authDomain: "crm-e-vendas.firebaseapp.com",
  projectId: "crm-e-vendas",
  storageBucket: "crm-e-vendas.firebasestorage.app",
  messagingSenderId: "786463592188",
  appId: "1:786463592188:web:b9d12600bb856189515179",
  measurementId: "G-6XYM74KMD9"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app); // Safe to keep even if not used actively
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);