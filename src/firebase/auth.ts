import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth'
import { auth, firebaseConfigured } from './config'

let pendingAnonymousSignIn: Promise<User> | null = null

export function watchUser(callback: (user: User | null) => void) {
  if (!auth || !firebaseConfigured) return () => undefined
  return onAuthStateChanged(auth, callback)
}

export async function ensureAnonymousUser() {
  if (!auth || !firebaseConfigured) return null
  await auth.authStateReady()
  if (auth.currentUser) {
    if (import.meta.env.DEV) console.info('[firebase] authenticated UID', auth.currentUser.uid)
    return auth.currentUser
  }
  if (!pendingAnonymousSignIn) {
    pendingAnonymousSignIn = signInAnonymously(auth)
      .then((credential) => credential.user)
      .finally(() => { pendingAnonymousSignIn = null })
  }
  const user = await pendingAnonymousSignIn
  if (import.meta.env.DEV) console.info('[firebase] authenticated UID', user.uid)
  return user
}
