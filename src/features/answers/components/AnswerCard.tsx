import { ChevronRight, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../../../components/ui/Badge'
import type { Answer } from '../models/answer'

export function AnswerCard({ answer, onFavourite }: { answer: Answer; onFavourite: () => void }) {
  const navigate = useNavigate()
  return <article onClick={() => navigate(`/answers/${answer.id}`)} className="group cursor-pointer rounded-2xl border border-[#e4dcf7] bg-white p-5 shadow-sm shadow-[#6d4aff]/5 transition hover:-translate-y-0.5 hover:border-[#cfc6ee] hover:shadow-lg hover:shadow-[#6d4aff]/10 dark:border-[#352d5c] dark:bg-[#1d1735] dark:shadow-none dark:hover:border-[#4a3f7a] dark:hover:bg-[#272046]">
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1"><h3 className="text-base font-semibold leading-snug text-[#1b1534] sm:text-lg dark:text-[#f4f1ff]">{answer.question}</h3><div className="mt-3 flex flex-wrap gap-2"><Badge tone="green">{answer.subject}</Badge><Badge tone="blue">{answer.topic}</Badge><Badge tone="amber">{answer.marks} Marks</Badge><Badge>{answer.wordLimit} Words</Badge></div></div>
      <button onClick={(e) => { e.stopPropagation(); onFavourite() }} className="shrink-0 rounded-lg p-2 text-[#8a84a6] hover:bg-[#ece6ff] dark:text-[#8f87b3] dark:hover:bg-[#2f2658]" aria-label="Toggle favourite"><Star size={19} fill={answer.isFavourite ? 'currentColor' : 'none'} className={answer.isFavourite ? 'text-[#f5a524]' : ''} /></button>
    </div>
    <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#4f4870] dark:text-[#c3bce0]">{answer.answer.split('\n').filter(Boolean).slice(0, 2).join(' ')}</p>
    <div className="mt-4 flex items-center justify-end text-xs font-semibold text-[#6d4aff] opacity-0 transition group-hover:opacity-100 dark:text-[#b8a6ff]">Read answer <ChevronRight size={15} /></div>
  </article>
}