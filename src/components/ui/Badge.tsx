export function Badge({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'green' | 'blue' | 'amber' | 'slate' }) {
  const styles = {
    green: 'bg-[var(--success-soft)] text-[var(--success)] dark:bg-[var(--success-soft)] dark:text-[var(--success)]',
    blue: 'bg-[var(--accent-soft)] text-[var(--accent)] dark:bg-[var(--surface-elevated)] dark:text-[var(--accent)]',
    amber: 'bg-[var(--warning-soft)] text-[var(--warning)] dark:bg-[var(--warning-soft)] dark:text-[var(--warning)]',
    slate: 'bg-[var(--accent-soft)] text-[var(--text-secondary)] dark:bg-[var(--surface)] dark:text-[var(--text-secondary)]',
  }[tone]
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>{children}</span>
}