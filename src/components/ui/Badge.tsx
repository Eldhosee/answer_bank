export function Badge({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'green' | 'blue' | 'amber' | 'slate' }) {
  const styles = {
    green: 'bg-[#dcf7ec] text-[#0b7a5a] dark:bg-[#12382f] dark:text-[#4ae0b0]',
    blue: 'bg-[#ece6ff] text-[#5530e6] dark:bg-[#2f2658] dark:text-[#b8a6ff]',
    amber: 'bg-[#fff0d1] text-[#9a5b00] dark:bg-[#4a3512] dark:text-[#ffcf70]',
    slate: 'bg-[#f1eefa] text-[#4f4870] dark:bg-[#272046] dark:text-[#c3bce0]',
  }[tone]
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>{children}</span>
}