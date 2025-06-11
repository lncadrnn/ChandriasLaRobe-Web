// Chandria's La Robe Firebase SDK
// This file exports all Firebase functions needed throughout the application

// Import Firebase Auth functions
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    sendEmailVerification,
    validatePassword,
    signOut,
    updateProfile,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
    deleteUser,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// Import Firebase Firestore functions
import {
    getFirestore,
    doc,
    setDoc,
    collection,
    addDoc,
    deleteDoc,
    updateDoc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    limit,
    arrayUnion,
    arrayRemove,
    Timestamp,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Import Firebase App and Analytics
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js";

// Import Firebase configuration
import { firebaseConfig, COLLECTION_NAMES, FIELD_NAMES, STATUS, CATEGORIES, ADDITIONAL_TYPES } from "./firebase-config.js";

// Initialize Firebase App
const appCredential = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(appCredential);
const chandriaDB = getFirestore(appCredential);
const analytics = getAnalytics(appCredential);

// Helper function to check if Firebase is connected
const checkFirebaseConnection = async () => {
    try {
        await getDocs(query(collection(chandriaDB, COLLECTION_NAMES.PRODUCTS), limit(1)));
        return true;
    } catch (error) {
        console.error('Firebase connection check failed:', error);
        return false;
    }
};

// Helper function to create timestamps
const createTimestamp = () => serverTimestamp();

// Export all Firebase functions and constants
export {
    // Firebase app and services
    appCredential,
    auth,
    chandriaDB,
    analytics,
    
    // Authentication functions
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    sendEmailVerification,
    validatePassword,
    signOut,
    updateProfile,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
    deleteUser,
    GoogleAuthProvider,
    signInWithPopup,
    
    // Firestore functions
    getFirestore,
    doc,
    setDoc,
    collection,
    addDoc,
    deleteDoc,
    updateDoc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    limit,
    arrayUnion,
    arrayRemove,
    Timestamp,
    serverTimestamp,
    
    // Helper functions
    checkFirebaseConnection,
    createTimestamp,
    
    // Configuration constants
    firebaseConfig,
    COLLECTION_NAMES,
    FIELD_NAMES,
    STATUS,
    CATEGORIES,
    ADDITIONAL_TYPES
};

// Make some commonly used functions available globally for backwards compatibility
if (typeof window !== 'undefined') {
    window.chandriaDB = chandriaDB;
    window.auth = auth;
    window.checkFirebaseConnection = checkFirebaseConnection;
}
