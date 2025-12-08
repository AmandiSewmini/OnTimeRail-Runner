import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCBjbhpjzItZrOvUzmHbcYCklYXTTTTjBo",
    authDomain: "railway-booking-system-e537a.firebaseapp.com",
    projectId: "railway-booking-system-e537a",
    storageBucket: "railway-booking-system-e537a.firebasestorage.app",
    messagingSenderId: "319808323209",
    appId: "1:319808323209:web:124273ba9411549ad3d058"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db }; 