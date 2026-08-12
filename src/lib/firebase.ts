/**
 * Firebase foundation — modular Web SDK (v11).
 *
 * All configuration is read from environment variables (`.env.local`, git-ignored).
 * Never hardcode credentials or config values in source code.
 *
 * Initialization is lazy and safe for Next.js client/server boundaries:
 *  - The app/auth/firestore singletons are only created when this module is
 *    first imported (no network calls happen at init time).
 *  - Analytics is never initialized during SSR — use `getClientAnalytics()`
 *    from browser-only code (e.g. effects) when it is needed.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

if (process.env.NODE_ENV !== "production" && !firebaseConfig.apiKey) {
  console.warn(
    "[firebase] Firebase env vars are not configured. Copy your Firebase Web App config into `.env.local` (see NEXT_PUBLIC_FIREBASE_* keys)."
  );
}

// Singleton: reuse an existing app across module reloads (dev/HMR) instead of
// calling initializeApp() multiple times with the same config.
export const app: FirebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

/**
 * Analytics wrapper that is safe for Next.js:
 *  - returns `null` during SSR (never touches the browser API server-side),
 *  - returns `null` where the browser doesn't support web analytics.
 * Call it from a client component effect: `const analytics = await getClientAnalytics()`.
 */
export async function getClientAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") return null;
  if (!(await isSupported())) return null;
  return getAnalytics(app);
}
