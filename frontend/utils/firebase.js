// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider} from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "darpan-c0bfe.firebaseapp.com",
  projectId: "darpan-c0bfe",
  storageBucket: "darpan-c0bfe.firebasestorage.app",
  messagingSenderId: "858953583167",
  appId: "1:858953583167:web:992ee54372ef9460ca068a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const auth=getAuth(app)
export const googleProvider=new GoogleAuthProvider()