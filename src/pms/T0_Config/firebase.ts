import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const getEnvVar = (key: string, fallback: string): string => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  try {
    const metaEnv = (import.meta as any)?.env;
    if (metaEnv && metaEnv[key]) {
      return metaEnv[key];
    }
  } catch {
    // fallback
  }
  return fallback;
};

const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY', "AIzaSyDHiMluwChH10vu5uJrXeI2AjrgXk0CvDk"),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN', "pms-2026-bcd84.firebaseapp.com"),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID', "pms-2026-bcd84"),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET', "pms-2026-bcd84.firebasestorage.app"),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', "122227471981"),
  appId: getEnvVar('VITE_FIREBASE_APP_ID', "1:122227471981:web:8646c0c91fe3d961173164"),
  measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID', "G-MB19T17DQ8")
};

// Initialize Firebase safely (prevent multiple initialization)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
