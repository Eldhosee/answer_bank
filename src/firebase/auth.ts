import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth'
import { auth, firebaseConfigured } from './config'

let pendingAnonymousSignIn: Promise<User> | null = null

export function watchUser(callback: (user: User | null) => void) {
  if (!auth || !firebaseConfigured) return () => undefined
  return onAuthStateChanged(auth, callback)
}

export async function signInAnonymouslyIfNeeded() {
  if (!auth || !firebaseConfigured) return null
  await auth.authStateReady()
  if (auth.currentUser) {
    return auth.currentUser
  }
  if (!pendingAnonymousSignIn) {
    pendingAnonymousSignIn = signInAnonymously(auth)
      .then((credential) => credential.user)
      .finally(() => { pendingAnonymousSignIn = null })
  }
  return pendingAnonymousSignIn
}

export async function getAuthenticatedUser() {
  if (!auth || !firebaseConfigured) return null
  await auth.authStateReady()
  return auth.currentUser
}
