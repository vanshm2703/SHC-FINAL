// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { Firestore, getFirestore } from "firebase/firestore";
import { Auth, getAuth } from "firebase/auth";


// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyABwGYYIeKF-TWdyptAenCdnBKrEramTrs",
    authDomain: "iterativebytes.firebaseapp.com",
    projectId: "iterativebytes",
    storageBucket: "iterativebytes.appspot.com",
    messagingSenderId: "510022074128",
    appId: "1:510022074128:web:ec9b4d9ab22cbd6a826f95"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
// export const analytics = getAnalytics(app);


//  Exported
export default app
export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);
