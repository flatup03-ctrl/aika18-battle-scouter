"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";

/**
 * Initialize Firebase App once and reuse it.
 * Uses safe initialization to prevent SSR errors and white screen issues.
 * Initializes only on client-side to avoid environment variable errors during build.
 */

function assertEnv(name: string, value: string | undefined): string {
  if (!value) {
    if (typeof window !== 'undefined') {
      console.error(`Missing environment variable ${name}. Set it in Netlify (Site settings → Build & deploy → Environment).`);
    }
    // Return empty string to allow build to continue, but initialization will fail safely
    return '';
  }
  return value;
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let storageInstance: FirebaseStorage | null = null;
let initializationError: Error | null = null;

function safeInitializeFirebase(): { app: FirebaseApp; auth: Auth; storage: FirebaseStorage } | null {
  // Only initialize on client-side
  if (typeof window === 'undefined') {
    return null;
  }

  // Return cached instances if already initialized
  if (appInstance && authInstance && storageInstance) {
    return {
      app: appInstance,
      auth: authInstance,
      storage: storageInstance,
    };
  }

  // Don't retry if initialization already failed
  if (initializationError) {
    return null;
  }

  try {
    const firebaseConfig = {
      apiKey: assertEnv("NEXT_PUBLIC_FIREBASE_API_KEY", process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
      authDomain: assertEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
      projectId: assertEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
      storageBucket: assertEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
      messagingSenderId: assertEnv(
        "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
        process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
      ),
      appId: assertEnv("NEXT_PUBLIC_FIREBASE_APP_ID", process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
    };

    // Check if all required config values are present
    const hasAllConfig = Object.values(firebaseConfig).every(value => value !== '');
    if (!hasAllConfig) {
      initializationError = new Error(
        'Firebase configuration is incomplete. Please check your environment variables.'
      );
      console.error(initializationError.message);
      return null;
    }

    if (getApps().length === 0) {
      appInstance = initializeApp(firebaseConfig);
    } else {
      appInstance = getApps()[0]!;
    }

    authInstance = getAuth(appInstance);
    storageInstance = getStorage(appInstance);

    return {
      app: appInstance,
      auth: authInstance,
      storage: storageInstance,
    };
  } catch (error) {
    initializationError = error instanceof Error ? error : new Error(String(error));
    console.error('Firebase initialization error:', initializationError.message);
    return null;
  }
}

// Initialize on module load (client-side only)
const instances = safeInitializeFirebase();

// Export instances or fallback values
// Using conditional exports to handle SSR safely
export const app: FirebaseApp = instances?.app || ({} as FirebaseApp);
export const auth: Auth = instances?.auth || ({} as Auth);
export const storage: FirebaseStorage = instances?.storage || ({} as FirebaseStorage);

// Export a function to check if Firebase is initialized
export function isFirebaseInitialized(): boolean {
  return appInstance !== null && authInstance !== null && storageInstance !== null;
}

// Export getter functions for safe access
export function getFirebaseApp(): FirebaseApp | null {
  const instances = safeInitializeFirebase();
  return instances?.app || null;
}

export function getFirebaseAuth(): Auth | null {
  const instances = safeInitializeFirebase();
  return instances?.auth || null;
}

export function getFirebaseStorage(): FirebaseStorage | null {
  const instances = safeInitializeFirebase();
  return instances?.storage || null;
}
