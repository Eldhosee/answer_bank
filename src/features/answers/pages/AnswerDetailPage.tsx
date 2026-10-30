import { ArrowLeft, Bookmark, ChevronLeft, ChevronRight, Edit3, Star, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useReadingMode } from '../../../app/ReadingModeProvider'
import { ReadingSurface } from '../../../components/reading/ReadingSurface'
import { ReadingToolbar } from '../../../components/reading/ReadingToolbar'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { useAnswers } from '../hooks/useAnswers'
import { formatDate } from '../utils/answerUtils'
import { setAnswerPinned } from '../services/answerService'
import { listFolders } from '../../notes/services/foldersService'
import type { Folder } from '../../notes/models/folder'

export function AnswerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { answers, loading, remove, favourite } = useAnswers()
  const [showDelete, setShowDelete] = useState(false)
  const [pinning, setPinning] = useState(false)
  const [pinOverride, setPinOverride] = useState<boolean | null>(null)
  const [actionError, setActionError] = useState('')
  const [folders, setFolders] = useState<Folder[]>([])
  const { focusMode } = useReadingMode()
  const answer = answers.find((item) => item.id === id)
  useEffect(() => { setPinOverride(null) }, [answer?.id, answer?.isPinned])
  useEffect(() => { void listFolders().then(setFolders).catch(() => undefined) }, [])
  useEffect(() => { if (!loading && !answer) navigate('/answers', { replace: true }) }, [loading, answer, navigate])
  if (loading || !answer) return <div className="py-20 text-center text-sm text-[var(--text-muted)]">Loading answer...</div>
  const index = answers.findIndex((item) => item.id === answer.id)
  const previous = index > 0 ? answers[index - 1] : null
  const next = index < answers.length - 1 ? answers[index + 1] : null
  const sections = answer.answer.split(/\n(?=(?:Introduction|Body|Government initiatives|Way Forward|Conclusion|\d+\.)\b)/i)
  const navState = location.state as { returnTo?: string; backLabel?: string; originSection?: string } | null
  const validParent = answer.folderId && folders.some((folder) => folder.id === answer.folderId)
  const returnTo = navState?.returnTo ?? (validParent ? `/?folder=${answer.folderId}` : '/?folder=unfiled')
  const backLabel = navState?.backLabel ?? (validParent ? folders.find((folder) => folder.id === answer.folderId)?.name ?? 'My Drive' : 'Unfiled')
  const goBack = () => navState?.returnTo ? navigate(-1) : navigate(returnTo)
  const isPinned = pinOverride ?? Boolean(answer.isPinned)

  return <div className="reading-page space-y-4">
    <ReadingToolbar title={answer.question} />
    {!focusMode && <div className="reading-actions flex flex-wrap items-center justify-between gap-3"><button onClick={goBack} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--accent)]"><ArrowLeft size={17} />Back to {backLabel}</button><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={async () => { const next = !isPinned; setPinOverride(next); setPinning(true); setActionError(''); try { await setAnswerPinned(answer, next) } catch (e) { setPinOverride(null); setActionError(e instanceof Error ? e.message : 'Could not update pin.') } finally { setPinning(false) } }} disabled={pinning} title={isPinned ? 'Unpin from this folder' : 'Pin to this folder'} aria-label={isPinned ? 'Unpin from this folder' : 'Pin to this folder'}><Bookmark size={16} fill={isPinned ? 'currentColor' : 'none'} className={isPinned ? 'text-[var(--accent)]' : ''} /></Button><Button variant="secondary" onClick={() => navigate(`/answers/${answer.id}/edit`, { state: location.state })}><Edit3 size={16} />Edit</Button><Button variant="danger" onClick={() => setShowDelete(true)}><Trash2 size={16} />Delete</Button><Button variant="secondary" onClick={() => void favourite(answer)}><Star size={16} fill={answer.isFavourite ? 'currentColor' : 'none'} className={answer.isFavourite ? 'text-[var(--warning)]' : ''} />{answer.isFavourite ? 'Saved' : 'Favourite'}</Button></div></div>}
    {actionError && <p role="alert" className="text-sm text-[var(--danger)]">{actionError}</p>}
    <ReadingSurface>
      <article className="reading-article rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-8">
        <header className="border-b border-[var(--border)] pb-6"><p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Question</p><h1 className="max-w-4xl text-2xl font-bold leading-tight tracking-tight text-[var(--text-primary)] sm:text-3xl">{answer.question}</h1><div className="mt-4 flex flex-wrap gap-2"><Badge tone="green">{answer.subject}</Badge><Badge tone="blue">{answer.topic}</Badge><Badge tone="amber">{answer.marks} Marks</Badge><Badge>{answer.wordLimit} Words</Badge>{answer.createdAt && <span className="px-1 py-1 text-xs text-[var(--text-muted)]">Added {formatDate(answer.createdAt)}</span>}</div></header>
        <section className="mx-auto mt-7 max-w-4xl"><div className="mb-7 flex items-center gap-3"><span className="h-7 w-1 rounded-full bg-[var(--accent)]" /><h2 className="text-xl font-bold text-[var(--text-primary)] sm:text-2xl">Model Answer</h2></div><div className="reader-copy whitespace-pre-line text-[var(--text-primary)]">{sections.map((section, i) => <div key={i}>{section}</div>)}</div></section>
        {!focusMode && <footer className="reading-navigation mt-8 flex justify-between gap-3 border-t border-[var(--border)] pt-5"><Button variant="secondary" disabled={!previous} onClick={() => previous && navigate(`/answers/${previous.id}`, { state: location.state })}><ChevronLeft size={17} />Previous</Button><Button variant="secondary" disabled={!next} onClick={() => next && navigate(`/answers/${next.id}`, { state: location.state })}>Next<ChevronRight size={17} /></Button></footer>}
      </article>
    </ReadingSurface>
    {showDelete && <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--overlay)]/60 p-4 backdrop-blur-sm"><div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl shadow-[var(--accent)]/20"><h3 className="font-serif text-xl font-bold text-[var(--text-primary)]">Delete this answer?</h3><p className="mt-2 text-sm text-[var(--text-secondary)]">This action cannot be undone.</p><div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={() => setShowDelete(false)}>Cancel</Button><Button variant="danger" onClick={async () => { await remove(answer.id); goBack() }}>Delete</Button></div></div></div>}
  </div>
}

