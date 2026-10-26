import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }

export function Button({ children, variant = 'primary', className = '', ...props }: Props) {
  const styles = {
    primary: 'bg-[#6d4aff] text-white shadow-md shadow-[#6d4aff]/25 hover:bg-[#5530e6] active:bg-[#4824cc] dark:bg-[#9d85ff] dark:text-[#130f24] dark:shadow-none dark:hover:bg-[#b8a6ff] dark:active:bg-[#c9bbff]',
    secondary: 'border border-[#e4dcf7] bg-white text-[#1b1534] hover:bg-[#f8f5ff] dark:border-[#352d5c] dark:bg-[#272046] dark:text-[#f4f1ff] dark:hover:bg-[#2f2658]',
    danger: 'border border-[#f9c4cc] bg-white text-[#d6264a] hover:bg-[#fff0f2] dark:border-[#7a2a3a] dark:bg-[#272046] dark:text-[#ff7a8c] dark:hover:bg-[#3a1f33]',
    ghost: 'text-[#4f4870] hover:bg-[#ece6ff] dark:text-[#c3bce0] dark:hover:bg-[#272046]',
  }[variant]
  return <button {...props} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d4aff] focus-visible:ring-offset-2 dark:focus-visible:ring-[#9d85ff] dark:focus-visible:ring-offset-[#130f24] ${styles} ${className}`}>{children}</button>
}