
import { useState } from 'react'
import { collection, getDocs, writeBatch } from 'firebase/firestore'
import {
  Link2,
  LogOut,
  Moon,
  Sun,
  UserRound,
  ArrowRightLeft,
} from 'lucide-react'

import { Button } from '../components/ui/Button'
import { toAuthErrorMessage, useAuth } from '../firebase/AuthProvider'
import { auth, db } from '../firebase/config'
import { useTheme } from './ThemeProvider'

const OWNER_ID_COLLECTIONS = ['answers', 'notes', 'folders'] as const
const BATCH_SIZE = 500

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme()

  const {
    status,
    user,
    signInWithGoogle,
    switchToGoogleAccount,
    signOutUser,
  } = useAuth()

  const [authError, setAuthError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [ownershipBusy, setOwnershipBusy] = useState(false)
  const [ownershipMessage, setOwnershipMessage] = useState('')
  const [ownershipError, setOwnershipError] = useState('')

  const runAuthAction = async (action: () => Promise<void>) => {
    setAuthBusy(true)
    setAuthError('')

    try {
      await action()
    } catch (error) {
      setAuthError(toAuthErrorMessage(error))
    } finally {
      setAuthBusy(false)
    }
  }

  const updateDataOwnership = async () => {
    const uid = auth?.currentUser?.uid
    const firestore = db
    if (!uid || !firestore) {
      setOwnershipError('Sign in to Firebase before updating data ownership.')
      setOwnershipMessage('')
      return
    }

    setOwnershipBusy(true)
    setOwnershipMessage('')
    setOwnershipError('')
    const updatedCounts: Record<(typeof OWNER_ID_COLLECTIONS)[number], number> = {
      answers: 0,
      notes: 0,
      folders: 0,
    }

    try {
      const collections = await Promise.all(
        OWNER_ID_COLLECTIONS.map(async (name) => [
          name,
          await getDocs(collection(firestore, name)),
        ] as const),
      )

      for (const [name, snapshot] of collections) {
        const documents = snapshot.docs.filter((document) => {
          const ownerId = document.get('ownerId')
          return typeof ownerId === 'string' && ownerId.trim().length > 0
        })

        for (let start = 0; start < documents.length; start += BATCH_SIZE) {
          const batch = writeBatch(firestore)
          const batchDocuments = documents.slice(start, start + BATCH_SIZE)
          for (const document of batchDocuments) {
            batch.update(document.ref, { ownerId: uid })
          }
          await batch.commit()
          updatedCounts[name] += batchDocuments.length
        }
      }

      const total = Object.values(updatedCounts).reduce(
        (sum, count) => sum + count,
        0,
      )
      setOwnershipMessage(
        `Updated ${total} documents (answers: ${updatedCounts.answers}, notes: ${updatedCounts.notes}, folders: ${updatedCounts.folders}).`,
      )
    } catch (error) {
      const total = Object.values(updatedCounts).reduce(
        (sum, count) => sum + count,
        0,
      )
      setOwnershipError(
        `Ownership update failed${total > 0 ? ` after updating ${total} documents` : ''}: ${error instanceof Error ? error.message : String(error)}`,
      )
    } finally {
      setOwnershipBusy(false)
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">

      <header>
        <p className="text-sm font-semibold text-[var(--accent)]">
          Study Workspace
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Settings
        </h1>

        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Choose the appearance that feels comfortable for your study sessions.
        </p>
      </header>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">

        <h2 className="font-semibold">Account</h2>

        <div className="mt-4 flex items-center gap-3">

          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              referrerPolicy="no-referrer"
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
              <UserRound size={22} />
            </span>
          )}

          <div className="min-w-0">

            <p className="truncate font-medium">
              {status === 'demo'
                ? 'Local demo mode'
                : user?.displayName ||
                (user?.isAnonymous
                  ? 'Anonymous account'
                  : 'Google account')}
            </p>

            {user?.email && (
              <p className="truncate text-sm text-[var(--text-muted)]">
                {user.email}
              </p>
            )}

            {user?.isAnonymous && (
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                You are using an anonymous account.
              </p>
            )}

            {status === 'demo' && (
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Firebase is not configured.
              </p>
            )}

          </div>
        </div>

        {authError && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]"
          >
            {authError}
          </p>
        )}

        {status !== 'demo' && (
          <div className="mt-4 flex flex-wrap gap-2">

            {user?.isAnonymous && (
              <>
                <Button
                  type="button"
                  disabled={authBusy}
                  onClick={() =>
                    void runAuthAction(switchToGoogleAccount)
                  }
                >
                  <ArrowRightLeft size={16} />
                  {authBusy
                    ? 'Switching account…'
                    : 'Switch to Google account'}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  disabled={authBusy}
                  onClick={() =>
                    void runAuthAction(signInWithGoogle)
                  }
                >
                  <Link2 size={16} />
                  Link this account
                </Button>
              </>
            )}

            {user && !user.isAnonymous && (
              <Button
                type="button"
                variant="secondary"
                disabled={authBusy}
                onClick={() =>
                  void runAuthAction(signOutUser)
                }
              >
                <LogOut size={16} />
                {authBusy ? 'Signing out…' : 'Sign out'}
              </Button>
            )}

          </div>
        )}

      </div>
{/* 
      <div>
        <Button
          type="button"
          disabled={ownershipBusy || status !== 'authenticated'}
          onClick={() => void updateDataOwnership()}
        >
          {ownershipBusy ? 'Updating ownership…' : 'Update My Data Ownership'}
        </Button>
        {ownershipMessage && (
          <p role="status" className="mt-3 text-sm text-[var(--text-muted)]">
            {ownershipMessage}
          </p>
        )}
        {ownershipError && (
          <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
            {ownershipError}
          </p>
        )}
      </div> */}

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">

        <h2 className="font-semibold">Appearance</h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">

          {(['light', 'dark'] as const).map((choice) => (
            <button
              key={choice}
              type="button"
              aria-pressed={theme === choice}
              onClick={() => {
                if (theme !== choice) toggleTheme()
              }}
              className={`flex min-h-16 items-center gap-3 rounded-xl border px-4 text-left transition ${theme === choice
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-[var(--border)] hover:bg-[var(--accent-soft)]'
                }`}
            >
              {choice === 'light' ? (
                <Sun size={19} />
              ) : (
                <Moon size={19} />
              )}

              <span className="font-medium">
                {choice === 'light' ? 'Light mode' : 'Dark mode'}
              </span>

              <span className="ml-auto text-xs">
                {theme === choice ? 'Selected' : ''}
              </span>
            </button>
          ))}

        </div>
      </div>

    </section>
  )
}
