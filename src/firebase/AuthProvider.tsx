import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { GoogleAuthProvider, linkWithPopup, signInWithPopup, signOut, type User } from 'firebase/auth'
import { auth, firebaseConfigured } from './config'
import { signInAnonymouslyIfNeeded, watchUser } from './auth'

type AuthStatus = 'loading' | 'authenticated' | 'signed-out' | 'demo'

type AuthContextValue = {
  status: AuthStatus
  user: User | null
  error: string | null
  signInWithGoogle: () => Promise<void>
  signOutUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const SIGNED_OUT_KEY = 'nabard-answer-bank-signed-out'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!auth || !firebaseConfigured) {
      setStatus('demo')
      return
    }

    return watchUser((nextUser) => {
      if (nextUser) {
        if (import.meta.env.DEV) console.info('[firebase] authenticated UID', nextUser.uid)
        setUser(nextUser)
        setError(null)
        setStatus('authenticated')
        return
      }

      setUser(null)
      if (window.localStorage.getItem(SIGNED_OUT_KEY) === 'true') {
        setStatus('signed-out')
        return
      }

      setStatus('loading')
      void signInAnonymouslyIfNeeded().catch((authError: unknown) => {
        setError(toAuthErrorMessage(authError))
        setStatus('signed-out')
      })
    })
  }, [])

  const signInWithGoogle = async () => {
    if (!auth || !firebaseConfigured) throw new Error('Google sign-in is unavailable because Firebase is not configured.')
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })

    if (auth.currentUser?.isAnonymous) {
      await linkWithPopup(auth.currentUser, provider)
    } else {
      await signInWithPopup(auth, provider)
    }
    window.localStorage.removeItem(SIGNED_OUT_KEY)
  }

  const signOutUser = async () => {
    if (!auth || !firebaseConfigured) throw new Error('Sign-out is unavailable because Firebase is not configured.')
    window.localStorage.setItem(SIGNED_OUT_KEY, 'true')
    try {
      await signOut(auth)
    } catch (signOutError) {
      window.localStorage.removeItem(SIGNED_OUT_KEY)
      throw signOutError
    }
  }

  return <AuthContext.Provider value={{ status, user, error, signInWithGoogle, signOutUser }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider.')
  return context
}

export function toAuthErrorMessage(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Google sign-in was cancelled. No account or data was changed.'
  }
  if (code === 'auth/popup-blocked') {
    return 'The sign-in popup was blocked. Allow popups for this site and try again.'
  }
  if (code === 'auth/credential-already-in-use' || code === 'auth/account-exists-with-different-credential') {
    return 'This Google account is already linked to a different Firebase account. Your current account and its data were not changed. Do not switch accounts or merge automatically; follow the migration guide before continuing.'
  }
  if (code === 'auth/unauthorized-domain') {
    return 'This site is not authorized for Firebase Authentication. Add its hostname under Firebase Authentication → Settings → Authorized domains.'
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Google sign-in is not enabled for this Firebase project. Enable Google under Authentication → Sign-in method.'
  }
  if (code === 'auth/network-request-failed') {
    return 'A network error interrupted Google sign-in. Check your connection and try again.'
  }
  return error instanceof Error ? error.message : 'Google sign-in failed. Please try again.'
}
