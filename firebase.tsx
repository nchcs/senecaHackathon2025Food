// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBY5kQU04NAcEEciGT8uqvrtDeuZ6rE9TE",
  authDomain: "seneca-food-app.firebaseapp.com",
  projectId: "seneca-food-app",
  storageBucket: "seneca-food-app.firebasestorage.app",
  messagingSenderId: "231011741009",
  appId: "1:231011741009:web:e46bdedd175907c21fb770",
  measurementId: "G-EKPH2WTPMW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);


export const auth = getAuth(app);