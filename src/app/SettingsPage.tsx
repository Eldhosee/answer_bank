import { useState } from 'react'
import { Link2, LogOut, Moon, Sun, UserRound } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { toAuthErrorMessage, useAuth } from '../firebase/AuthProvider'
import { useTheme } from './ThemeProvider'

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme()
  const { status, user, signInWithGoogle, signOutUser } = useAuth()
  const [authError, setAuthError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)

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

  return <section className="mx-auto max-w-3xl space-y-6">
    <header><p className="text-sm font-semibold text-[var(--accent)] dark:text-[var(--accent)]">Study Workspace</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Settings</h1><p className="mt-2 text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">Choose the appearance that feels comfortable for your study sessions.</p></header>
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 dark:border-[var(--border)] dark:bg-[var(--surface)] sm:p-6">
      <h2 className="font-semibold">Account</h2>
      <div className="mt-4 flex items-center gap-3">
        {user?.photoURL
          ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-12 w-12 rounded-full object-cover" />
          : <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]"><UserRound size={22} /></span>}
        <div className="min-w-0">
          <p className="truncate font-medium">{status === 'demo' ? 'Local demo mode' : user?.displayName || (user?.isAnonymous ? 'Anonymous account' : 'Google account')}</p>
          {user?.email && <p className="truncate text-sm text-[var(--text-muted)]">{user.email}</p>}
          {user?.isAnonymous && <p className="mt-1 text-sm text-[var(--text-muted)]">Link Google to keep this account and its existing data on other devices.</p>}
          {status === 'demo' && <p className="mt-1 text-sm text-[var(--text-muted)]">Firebase is not configured; data is stored locally in this browser.</p>}
        </div>
      </div>
      {authError && <p role="alert" className="mt-4 rounded-xl bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">{authError}</p>}
      {status !== 'demo' && <div className="mt-4 flex flex-wrap gap-2">
        {user?.isAnonymous && <Button type="button" disabled={authBusy} onClick={() => void runAuthAction(signInWithGoogle)}><Link2 size={16} />{authBusy ? 'Connecting…' : 'Link Google account'}</Button>}
        {user && !user.isAnonymous && <Button type="button" variant="secondary" disabled={authBusy} onClick={() => void runAuthAction(signOutUser)}><LogOut size={16} />{authBusy ? 'Signing out…' : 'Sign out'}</Button>}
      </div>}
    </div>
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 dark:border-[var(--border)] dark:bg-[var(--surface)] sm:p-6"><h2 className="font-semibold">Appearance</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">
      {(['light', 'dark'] as const).map((choice) => <button key={choice} type="button" aria-pressed={theme === choice} onClick={() => { if (theme !== choice) toggleTheme() }} className={`flex min-h-16 items-center gap-3 rounded-xl border px-4 text-left transition ${theme === choice ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] dark:border-[var(--accent)] dark:bg-[var(--surface)] dark:text-[var(--accent)]' : 'border-[var(--border)] hover:bg-[var(--accent-soft)] dark:border-[var(--border)] dark:hover:bg-[var(--surface)]'}`}>{choice === 'light' ? <Sun size={19} /> : <Moon size={19} />}<span className="font-medium">{choice === 'light' ? 'Light mode' : 'Dark mode'}</span><span className="ml-auto text-xs">{theme === choice ? 'Selected' : ''}</span></button>)}
    </div></div>
  </section>
}
