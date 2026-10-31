import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { AppShell } from '../components/layout/AppShell'
import { AnswersPage } from '../features/answers/pages/AnswersPage'
import { AddAnswerPage } from '../features/answers/pages/AddAnswerPage'
import { AnswerDetailPage } from '../features/answers/pages/AnswerDetailPage'
import { NoteEditorPage } from '../features/notes/pages/NoteEditorPage'
import { NoteDetailPage } from '../features/notes/pages/NoteDetailPage'
import { DrivePage } from '../features/drive/pages/DrivePage'
import { SettingsPage } from './SettingsPage'
import { toAuthErrorMessage, useAuth } from '../firebase/AuthProvider'

export default function App() {
  const { status, error, signInWithGoogle } = useAuth()
  const [signInError, setSignInError] = useState('')
  const [signingIn, setSigningIn] = useState(false)

  const handleGoogleSignIn = async () => {
    setSigningIn(true)
    setSignInError('')
    try {
      await signInWithGoogle()
    } catch (authError) {
      setSignInError(toAuthErrorMessage(authError))
    } finally {
      setSigningIn(false)
    }
  }

  if (status === 'loading') {
    return <main className="grid min-h-screen place-items-center bg-[var(--background)] px-4 text-[var(--text-primary)]" aria-busy="true">
      <p className="text-sm text-[var(--text-secondary)]">Connecting to your study workspace…</p>
    </main>
  }

  if (status === 'signed-out') {
    return <main className="grid min-h-screen place-items-center bg-[var(--background)] px-4 text-[var(--text-primary)]">
      <section className="w-full max-w-md space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-sm">
        <div><p className="text-sm font-semibold text-[var(--accent)]">NABARD Answer Bank</p><h1 className="mt-2 text-2xl font-bold">Sign in to continue</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">Your answers, folders, favourites and notes are available after you sign in.</p></div>
        {(signInError || error) && <p role="alert" className="rounded-xl bg-[var(--danger-soft)] p-3 text-left text-sm text-[var(--danger)]">{signInError || error}</p>}
        <Button type="button" disabled={signingIn} onClick={() => void handleGoogleSignIn()} className="w-full">{signingIn ? 'Connecting…' : 'Continue with Google'}</Button>
      </section>
    </main>
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DrivePage />} />
        <Route path="/answers" element={<AnswersPage />} />
        <Route path="/answers/new" element={<AddAnswerPage />} />
        <Route path="/answers/:id/edit" element={<AddAnswerPage />} />
        <Route path="/answers/:id" element={<AnswerDetailPage />} />
        <Route path="/notes" element={<DrivePage notesOnly />} />
        <Route path="/notes/new" element={<NoteEditorPage />} />
        <Route path="/notes/:id/edit" element={<NoteEditorPage />} />
        <Route path="/notes/:id" element={<NoteDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}
