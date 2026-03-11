import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBOLZsvhKqYXMTzEQx2lDpt2ZQ67G8omsY",
  authDomain: "impact-center-volunteer.firebaseapp.com",
  projectId: "impact-center-volunteer",
  storageBucket: "impact-center-volunteer.firebasestorage.app",
  messagingSenderId: "1024970950267",
  appId: "1:1024970950267:web:138552761704de355cc4de",
  measurementId: "G-QJ3TR08DEF",
  databaseURL: "https://impact-center-volunteer-default-rtdb.firebaseio.com",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
