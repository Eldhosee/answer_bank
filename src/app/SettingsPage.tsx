import { Moon, Sun } from 'lucide-react'
import { useTheme } from './ThemeProvider'

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme()
  return <section className="mx-auto max-w-3xl space-y-6">
    <header><p className="text-sm font-semibold text-[var(--accent)] dark:text-[var(--accent)]">Study Workspace</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Settings</h1><p className="mt-2 text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">Choose the appearance that feels comfortable for your study sessions.</p></header>
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 dark:border-[var(--border)] dark:bg-[var(--surface)] sm:p-6"><h2 className="font-semibold">Appearance</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">
      {(['light', 'dark'] as const).map((choice) => <button key={choice} type="button" aria-pressed={theme === choice} onClick={() => { if (theme !== choice) toggleTheme() }} className={`flex min-h-16 items-center gap-3 rounded-xl border px-4 text-left transition ${theme === choice ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] dark:border-[var(--accent)] dark:bg-[var(--surface)] dark:text-[var(--accent)]' : 'border-[var(--border)] hover:bg-[var(--accent-soft)] dark:border-[var(--border)] dark:hover:bg-[var(--surface)]'}`}>{choice === 'light' ? <Sun size={19} /> : <Moon size={19} />}<span className="font-medium">{choice === 'light' ? 'Light mode' : 'Dark mode'}</span><span className="ml-auto text-xs">{theme === choice ? 'Selected' : ''}</span></button>)}
    </div></div>
  </section>
}
