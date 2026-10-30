import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }

export function Button({ children, variant = 'primary', className = '', ...props }: Props) {
  const styles = {
    primary: 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-md shadow-[var(--accent)]/25 hover:bg-[var(--accent)] active:bg-[var(--accent-hover)] dark:bg-[var(--accent)] dark:text-[var(--accent-contrast)] dark:shadow-none dark:hover:bg-[var(--accent)] dark:active:bg-[var(--accent-hover)]',
    secondary: 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--background)] dark:border-[var(--border)] dark:bg-[var(--surface)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--surface-elevated)]',
    danger: 'border border-[var(--danger-soft)] bg-[var(--surface)] text-[var(--danger)] hover:bg-[var(--danger-soft)] dark:border-[var(--danger-soft)] dark:bg-[var(--surface)] dark:text-[var(--danger)] dark:hover:bg-[var(--danger-soft)]',
    ghost: 'text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] dark:text-[var(--text-secondary)] dark:hover:bg-[var(--surface)]',
  }[variant]
  return <button {...props} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 dark:focus-visible:ring-[var(--accent)] dark:focus-visible:ring-offset-[var(--background)] ${styles} ${className}`}>{children}</button>
}