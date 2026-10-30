import { ChevronRight, Star } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Badge } from '../../../components/ui/Badge'
import type { Answer } from '../models/answer'

export function AnswerCard({ answer, onFavourite }: { answer: Answer; onFavourite: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}`
  return <article onClick={() => navigate(`/answers/${answer.id}`, { state: { returnTo, originSection: 'drive', backLabel: 'Answer Bank' } })} className="group min-w-0 cursor-pointer overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm shadow-[var(--accent)]/5 transition hover:-translate-y-0.5 hover:border-[var(--accent-soft)] hover:shadow-lg hover:shadow-[var(--accent)]/10 dark:border-[var(--border)] dark:bg-[var(--surface)] dark:shadow-none dark:hover:border-[var(--border)] dark:hover:bg-[var(--surface)]">
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1"><h3 className="text-base font-semibold leading-snug text-[var(--text-primary)] sm:text-lg dark:text-[var(--text-primary)]">{answer.question}</h3><div className="mt-3 flex flex-wrap gap-2"><Badge tone="green">{answer.subject}</Badge><Badge tone="blue">{answer.topic}</Badge><Badge tone="amber">{answer.marks} Marks</Badge><Badge>{answer.wordLimit} Words</Badge></div></div>
      <button onClick={(e) => { e.stopPropagation(); onFavourite() }} className="shrink-0 rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--accent-soft)] dark:text-[var(--text-muted)] dark:hover:bg-[var(--surface-elevated)]" aria-label="Toggle favourite"><Star size={19} fill={answer.isFavourite ? 'currentColor' : 'none'} className={answer.isFavourite ? 'text-[var(--warning)]' : ''} /></button>
    </div>
    <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">{answer.answer.split('\n').filter(Boolean).slice(0, 2).join(' ')}</p>
    <div className="mt-4 flex items-center justify-end text-xs font-semibold text-[var(--accent)] opacity-0 transition group-hover:opacity-100 dark:text-[var(--accent)]">Read answer <ChevronRight size={15} /></div>
  </article>
}
