/**
 * Firebase Authentication service (Phase 1).
 *
 * Wraps the `auth` instance from `src/lib/firebase.ts` — Firebase is
 * initialized exactly once there; this module only adds auth operations.
 *
 * All functions return friendly, app-shaped data. Auth errors are mapped to
 * user-friendly messages via `getAuthErrorMessage` so the UI never surfaces
 * raw Firebase error objects.
 */

import {
  confirmPasswordReset as firebaseConfirmPasswordReset,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  verifyPasswordResetCode as firebaseVerifyPasswordResetCode,
  type User as FirebaseUser,
} from "firebase/auth"
import { auth } from "@/lib/firebase"

/** The user shape exposed to the rest of the app (same fields as the old mock user, plus the Firebase uid). */
export type AuthUser = {
  uid: string
  name: string
  email: string
  avatar?: string
}

export function mapFirebaseUser(firebaseUser: FirebaseUser): AuthUser {
  const fallbackName =
    (firebaseUser.email ?? "")
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .trim() || "HireFit User"
  return {
    uid: firebaseUser.uid,
    name: firebaseUser.displayName?.trim() || fallbackName,
    email: firebaseUser.email ?? "",
    avatar: firebaseUser.photoURL ?? undefined,
  }
}

export async function loginWithEmail(email: string, password: string): Promise<AuthUser> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password)
  return mapFirebaseUser(credential.user)
}

export async function signInWithGoogle(): Promise<AuthUser> {
  const provider = new GoogleAuthProvider()
  const credential = await signInWithPopup(auth, provider)
  return mapFirebaseUser(credential.user)
}

export async function registerWithEmail(
  name: string,
  email: string,
  password: string
): Promise<AuthUser> {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password)
  const displayName = name.trim()
  if (displayName) {
    await updateProfile(credential.user, { displayName })
  }
  return mapFirebaseUser(credential.user)
}

export async function updateUserProfile(updates: {
  name?: string
  avatar?: string
}): Promise<AuthUser> {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error("No authenticated user.")
  await updateProfile(currentUser, {
    displayName: updates.name?.trim() || undefined,
    photoURL: updates.avatar?.trim() || undefined,
  })
  return mapFirebaseUser(currentUser)
}

export async function logout(): Promise<void> {
  await signOut(auth)
}

/* -- Password reset (Phase 6) ------------------------------------------------
 * Uses Firebase's official password-reset email mechanism — no custom password
 * storage, no reset tokens logged. With `handleCodeInApp: true` the reset link
 * routes back through the app's own `/reset-password` page (carrying the
 * `oobCode`), so the flow stays on-brand and in-app.
 * ------------------------------------------------------------------------ */

/**
 * Sends a Firebase password-reset email for the given address.
 *
 * NOTE: Firebase throws `auth/user-not-found` for unregistered emails —
 * callers must treat that failure as "email sent" to avoid leaking which
 * addresses are registered (anti-enumeration) — see `ForgotPasswordForm`.
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  await firebaseSendPasswordResetEmail(auth, email.trim().toLowerCase(), {
    url: `${window.location.origin}/reset-password`,
    handleCodeInApp: true,
  })
}

/**
 * Verifies a password-reset `oobCode` and resolves to the account email when
 * the code is valid. Throws `auth/expired-action-code` / `auth/invalid-action-code`
 * for stale or malformed links.
 */
export async function verifyPasswordResetCode(oobCode: string): Promise<string> {
  return firebaseVerifyPasswordResetCode(auth, oobCode)
}

/** Completes the password reset with a new password (Firebase-enforced). */
export async function resetPasswordWithCode(
  oobCode: string,
  newPassword: string
): Promise<void> {
  await firebaseConfirmPasswordReset(auth, oobCode, newPassword)
}

/**
 * Subscribe to auth state changes. Returns an unsubscribe function.
 * Resolves immediately with the persisted session (if any) after restore,
 * which is what keeps a refresh logged in.
 */
export function observeAuthState(callback: (user: AuthUser | null) => void): () => void {
  return onAuthStateChanged(auth, (firebaseUser) => {
    callback(firebaseUser ? mapFirebaseUser(firebaseUser) : null)
  })
}

/** Map Firebase error codes to user-friendly messages. */
export function getAuthErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code ?? ""
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password. Please try again."
    case "auth/invalid-email":
    case "auth/missing-email":
      return "Enter a valid email address."
    case "auth/expired-action-code":
      return "This password reset link has expired. Request a new one."
    case "auth/invalid-action-code":
    case "auth/missing-action-code":
      return "This password reset link is invalid. Request a new one."
    case "auth/invalid-password":
      return "The new password is invalid — use at least 8 characters."
    case "auth/unauthorized-continue-uri":
      return "Password reset emails can't be sent from this domain yet. Please try again later."
    case "auth/user-disabled":
      return "This account has been disabled. Contact support for help."
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try logging in instead."
    case "auth/weak-password":
      return "Password is too weak — use at least 8 characters."
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled for this project yet."
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again."
    case "auth/network-request-failed":
      return "Network error — check your connection and try again."
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled. Try again when you're ready."
    case "auth/popup-blocked":
      return "The sign-in popup was blocked by your browser. Allow popups for this site and try again."
    case "auth/operation-not-supported-in-this-environment":
      return "Google Sign-In is only available in a browser."
    default:
      return "Something went wrong. Please try again."
  }
}
