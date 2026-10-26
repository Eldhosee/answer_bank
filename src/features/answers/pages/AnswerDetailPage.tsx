import { ArrowLeft, ChevronLeft, ChevronRight, Edit3, Star, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { useAnswers } from '../hooks/useAnswers'
import { formatDate } from '../utils/answerUtils'

export function AnswerDetailPage() {
  const { id } = useParams(); const navigate = useNavigate(); const { answers, loading, remove, favourite } = useAnswers(); const [showDelete, setShowDelete] = useState(false)
  const answer = answers.find((item) => item.id === id)
  useEffect(() => { if (!loading && !answer) navigate('/answers', { replace: true }) }, [loading, answer, navigate])
  if (loading || !answer) return <div className="py-20 text-center text-sm text-[#8a84a6] dark:text-[#8f87b3]">Loading answer...</div>
  const index = answers.findIndex((item) => item.id === answer.id)
  const previous = index > 0 ? answers[index - 1] : null
  const next = index < answers.length - 1 ? answers[index + 1] : null
  const sections = answer.answer.split(/\n(?=(?:Introduction|Body|Government initiatives|Way Forward|Conclusion|\d+\.)\b)/i)

  return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><button onClick={() => navigate('/answers')} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#8a84a6] hover:text-[#6d4aff] dark:text-[#8f87b3] dark:hover:text-[#b8a6ff]"><ArrowLeft size={17} />Back to All Answers</button><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => navigate(`/answers/${answer.id}/edit`)}><Edit3 size={16} />Edit</Button><Button variant="danger" onClick={() => setShowDelete(true)}><Trash2 size={16} />Delete</Button><Button variant="secondary" onClick={() => void favourite(answer)}><Star size={16} fill={answer.isFavourite ? 'currentColor' : 'none'} className={answer.isFavourite ? 'text-[#f5a524]' : ''} />{answer.isFavourite ? 'Saved' : 'Favourite'}</Button></div></div>
    <article className="rounded-2xl border border-[#e4dcf7] bg-white p-5 shadow-sm shadow-[#6d4aff]/5 sm:p-8 dark:border-[#352d5c] dark:bg-[#1d1735] dark:shadow-none"><header className="border-b border-[#e4dcf7] pb-6 dark:border-[#352d5c]"><p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#6d4aff] dark:text-[#b8a6ff]">Question</p><h1 className="max-w-4xl text-2xl font-bold leading-tight tracking-tight text-[#1b1534] sm:text-3xl dark:text-[#f4f1ff]">{answer.question}</h1><div className="mt-4 flex flex-wrap gap-2"><Badge tone="green">{answer.subject}</Badge><Badge tone="blue">{answer.topic}</Badge><Badge tone="amber">{answer.marks} Marks</Badge><Badge>{answer.wordLimit} Words</Badge>{answer.createdAt && <span className="px-1 py-1 text-xs text-[#8a84a6] dark:text-[#8f87b3]">Added {formatDate(answer.createdAt)}</span>}</div></header>
      <section className="mx-auto mt-7 max-w-4xl"><div className="mb-7 flex items-center gap-3"><span className="h-7 w-1 rounded-full bg-gradient-to-b from-[#6d4aff] to-[#9d85ff]" /><h2 className="text-xl font-bold text-[#1b1534] sm:text-2xl dark:text-[#f4f1ff]">Model Answer</h2></div><div className="reader-copy whitespace-pre-line text-[#2d2650] dark:text-[#d9d3f0]">{sections.map((section, i) => <div key={i}>{section}</div>)}</div></section>
      <footer className="mt-8 flex justify-between gap-3 border-t border-[#e4dcf7] pt-5 dark:border-[#352d5c]"><Button variant="secondary" disabled={!previous} onClick={() => previous && navigate(`/answers/${previous.id}`)}><ChevronLeft size={17} />Previous</Button><Button variant="secondary" disabled={!next} onClick={() => next && navigate(`/answers/${next.id}`)}>Next<ChevronRight size={17} /></Button></footer></article>
    {showDelete && <div className="fixed inset-0 z-50 grid place-items-center bg-[#130f24]/60 p-4 backdrop-blur-sm"><div className="w-full max-w-sm rounded-2xl border border-[#e4dcf7] bg-white p-6 shadow-2xl shadow-[#6d4aff]/20 dark:border-[#352d5c] dark:bg-[#1d1735] dark:shadow-black/50"><h3 className="font-serif text-xl font-bold text-[#1b1534] dark:text-[#f4f1ff]">Delete this answer?</h3><p className="mt-2 text-sm text-[#4f4870] dark:text-[#c3bce0]">This action cannot be undone.</p><div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={() => setShowDelete(false)}>Cancel</Button><Button variant="danger" onClick={async () => { await remove(answer.id); navigate('/answers') }}>Delete</Button></div></div></div>}
  </div>
}