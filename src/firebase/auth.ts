import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth'
import { auth, firebaseConfigured } from './config'

export function watchUser(callback: (user: User | null) => void) {
  if (!auth || !firebaseConfigured) return () => undefined
  return onAuthStateChanged(auth, callback)
}

export async function ensureAnonymousUser() {
  if (!auth || !firebaseConfigured) return null
  if (auth.currentUser) return auth.currentUser
  const credential = await signInAnonymously(auth)
  return credential.user
}
