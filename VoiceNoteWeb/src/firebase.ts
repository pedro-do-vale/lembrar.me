import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBaQJnbOl5jhbrrPPIL_3tXKbmTS-d3wpI",
  authDomain: "voice-notes-54e1a.firebaseapp.com",
  projectId: "voice-notes-54e1a",
  storageBucket: "voice-notes-54e1a.firebasestorage.app",
  messagingSenderId: "843275428965",
  appId: "1:843275428965:web:9bbca19b33da78f180528c",
  measurementId: "G-LBDN9WZ61T"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
