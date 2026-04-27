import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, deleteUser } from "firebase/auth";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Keep confirmation result in memory during session
let confirmationResult = null;

export const setupRecaptcha = (elementId) => {
    // Check if element exists first
    const container = document.getElementById(elementId);
    if (!container) return;

    // Clear previous if any to avoid 'RecaptchaVerifier already initialized'
    if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
    }

    window.recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
        'size': 'invisible',
        'callback': (response) => {
            // reCAPTCHA solved
        }
    });
};

export const sendFirebaseOtp = async (phoneNumber) => {
    try {
        if (!window.recaptchaVerifier) {
            throw new Error("Recaptcha not initialized");
        }

        const confirmation = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
        confirmationResult = confirmation;
        return true;
    } catch (error) {
        console.error("Firebase SMS Error:", error);
        throw error;
    }
};

export const verifyFirebaseOtp = async (code) => {
    try {
        if (!confirmationResult) {
            throw new Error("No OTP request found. Please request code again.");
        }
        const result = await confirmationResult.confirm(code);

        // We only use Firebase for verification, not persistent auth.
        // So we can sign out immediately or keep the token if needed by backend.
        // For D-Vote, we trust the client verification for this step 
        // (But ideally we should send the ID token to backend for verification).
        return result.user;
    } catch (error) {
        console.error("Firebase Verify Error:", error);
        throw error;
    }
};
