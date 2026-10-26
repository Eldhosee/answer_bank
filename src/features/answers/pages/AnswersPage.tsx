import { Plus } from 'lucide-react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/EmptyState'
import { AnswerCard } from '../components/AnswerCard'
import { AnswerFilters } from '../components/AnswerFilters'
import { useAnswers } from '../hooks/useAnswers'
import { filterAnswers } from '../utils/answerUtils'
import { firebaseConfigured } from '../../../firebase/config'

export function AnswersPage() {
  const { answers, loading, error, favourite } = useAnswers()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const query = params.get('q') ?? ''
  const subject = params.get('subject') ?? 'All'
  const favouriteOnly = params.get('favourite') === 'true'
  const filtered = filterAnswers(answers, query, subject).filter((a) => !favouriteOnly || a.isFavourite)

  return <div className="space-y-6">
    <div className="flex items-end justify-between gap-4"><div className="min-w-0"><p className="text-sm font-semibold text-[#496b82] dark:text-[#abc5d2]">Your personal study notebook</p><h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Answer Bank</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Keep your NABARD model answers in one clean place.</p></div><Button className="hidden shrink-0 sm:inline-flex" onClick={() => navigate('/answers/new')}><Plus size={18} />Add Answer</Button></div>
    {!firebaseConfigured && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">Demo mode is active. Add Firebase environment values in <code>.env</code> to save answers to Firestore.</div>}
    <AnswerFilters query={query} subject={subject} onQuery={(v) => { const next = new URLSearchParams(params); v ? next.set('q', v) : next.delete('q'); setParams(next) }} onSubject={(v) => { const next = new URLSearchParams(params); v === 'All' ? next.delete('subject') : next.set('subject', v); setParams(next) }} />
    <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{favouriteOnly ? 'Favourites' : subject === 'All' ? 'All Answers' : subject}</h2><span className="text-sm text-slate-400">{filtered.length} answer{filtered.length === 1 ? '' : 's'}</span></div>
    {loading ? <div className="py-16 text-center text-sm text-slate-500">Loading answers...</div> : error ? <EmptyState title="Couldn’t load answers" description={error} /> : filtered.length === 0 ? <EmptyState title="No answers found" description="Try another search or add your first model answer." /> : <div className="grid gap-4">{filtered.map((answer) => <AnswerCard key={answer.id} answer={answer} onFavourite={() => void favourite(answer)} />)}</div>}
  </div>
}
