import { Bookmark, FileText, Folder as FolderIcon, NotebookPen, Plus, Search, Star } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ActionMenu, ActionMenuItem } from '../../../components/ui/ActionMenu'
import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/EmptyState'
import { AnswerCard } from '../components/AnswerCard'
import { AnswerFilters } from '../components/AnswerFilters'
import { useAnswers } from '../hooks/useAnswers'
import { filterAnswers } from '../utils/answerUtils'
import { firebaseConfigured } from '../../../firebase/config'
import type { Answer } from '../models/answer'
import type { Folder } from '../../notes/models/folder'
import type { Note } from '../../notes/models/note'
import { listPinnedFolders, listFolders, setFolderPinned } from '../../notes/services/foldersService'
import { listFavouriteNotes, listPinnedNotes, setNoteFavourite, setNotePinned } from '../../notes/services/notesService'
import { listFavouriteAnswers, listPinnedAnswers, setAnswerFavourite, setAnswerPinned } from '../services/answerService'

type Shortcut = { id: string; name: string; type: 'Folder' | 'Answer' | 'Note'; location: string; icon: ReactNode; onOpen: () => void; onUnpin: () => Promise<void> }

export function AnswersPage() {
  const [params] = useSearchParams()
  return params.get('favourite') === 'true' ? <FavouritesWorkspace /> : <AnswerBankWorkspace />
}

function AnswerBankWorkspace() {
  const { answers, loading, error, favourite } = useAnswers()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const query = params.get('q') ?? ''
  const subject = params.get('subject') ?? 'All'
  const filtered = filterAnswers(answers, query, subject)

  return <div className="space-y-6">
    <div className="flex items-end justify-between gap-4"><div className="min-w-0"><p className="text-sm font-semibold text-[var(--accent)]">Your personal study notebook</p><h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Answer Bank</h1><p className="mt-2 text-sm text-[var(--text-muted)]">Keep your NABARD model answers in one clean place.</p></div><Button className="hidden shrink-0 sm:inline-flex" onClick={() => navigate('/answers/new')}><Plus size={18} />Add Answer</Button></div>
    {!firebaseConfigured && <div className="rounded-xl border border-[var(--warning)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning)]">Demo mode is active. Add Firebase environment values in <code>.env</code> to save answers to Firestore.</div>}
    <AnswerFilters query={query} subject={subject} onQuery={(value) => { const next = new URLSearchParams(params); value ? next.set('q', value) : next.delete('q'); setParams(next) }} onSubject={(value) => { const next = new URLSearchParams(params); value === 'All' ? next.delete('subject') : next.set('subject', value); setParams(next) }} />
    <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{subject === 'All' ? 'All Answers' : subject}</h2><span className="text-sm text-[var(--text-muted)]">{filtered.length} answer{filtered.length === 1 ? '' : 's'}</span></div>
    {loading ? <div className="py-16 text-center text-sm text-[var(--text-muted)]">Loading answers...</div> : error ? <EmptyState title="Couldn’t load answers" description={error} /> : filtered.length === 0 ? <EmptyState title="No answers found" description="Try another search or add your first model answer." /> : <div className="grid gap-4">{filtered.map((answer) => <AnswerCard key={answer.id} answer={answer} onFavourite={() => void favourite(answer)} />)}</div>}
  </div>
}

function FavouritesWorkspace() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const [notes, setNotes] = useState<Note[]>([])
  const [answers, setAnswers] = useState<Answer[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [pinnedFolders, setPinnedFolders] = useState<Folder[]>([])
  const [pinnedAnswers, setPinnedAnswers] = useState<Answer[]>([])
  const [pinnedNotes, setPinnedNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const search = params.get('q') ?? ''
  const type = (params.get('kind') ?? 'all') as 'all' | 'answers' | 'notes'
  const origin = { returnTo: `${location.pathname}${location.search}`, originSection: 'favourites', backLabel: 'Favourites' }

  const refresh = async () => {
    const [favouriteNotes, favouriteAnswers, allFolders, foldersPinned, answersPinned, notesPinned] = await Promise.all([listFavouriteNotes(), listFavouriteAnswers(), listFolders(), listPinnedFolders(), listPinnedAnswers(), listPinnedNotes()])
    setNotes(favouriteNotes); setAnswers(favouriteAnswers); setFolders(allFolders); setPinnedFolders(foldersPinned); setPinnedAnswers(answersPinned); setPinnedNotes(notesPinned)
  }
  useEffect(() => { let live = true; void refresh().catch((e) => { if (live) setError(e instanceof Error ? e.message : 'Could not load favourites.') }).finally(() => { if (live) setLoading(false) }); return () => { live = false } }, [])

  const favouriteAnswers = answers
  const favouriteNotes = notes
  const term = search.trim().toLocaleLowerCase()
  const matchingAnswers = type === 'notes' ? [] : favouriteAnswers.filter((answer) => `${answer.question} ${answer.topic} ${answer.subject}`.toLocaleLowerCase().includes(term))
  const matchingNotes = type === 'answers' ? [] : favouriteNotes.filter((note) => `${note.title} ${note.content}`.toLocaleLowerCase().includes(term))
  const total = favouriteAnswers.length + favouriteNotes.length
  const shortcuts: Shortcut[] = [
    ...pinnedFolders.map((folder) => ({ id: folder.id, name: folder.name, type: 'Folder' as const, location: folderPath(folder.parentId, folders), icon: <FolderIcon size={18} />, onOpen: () => navigate(`/?folder=${folder.id}`, { state: origin }), onUnpin: async () => { await setFolderPinned(folder, false); setPinnedFolders((items) => items.filter((item) => item.id !== folder.id)) } })),
    ...pinnedAnswers.map((answer) => ({ id: answer.id, name: answer.question, type: 'Answer' as const, location: folderPath(answer.folderId, folders), icon: <FileText size={18} />, onOpen: () => navigate(`/answers/${answer.id}`, { state: origin }), onUnpin: async () => { await setAnswerPinned(answer, false); setPinnedAnswers((items) => items.filter((item) => item.id !== answer.id)) } })),
    ...pinnedNotes.map((note) => ({ id: note.id, name: note.title || 'Untitled note', type: 'Note' as const, location: folderPath(note.folderId, folders, 'Quick Notes'), icon: <NotebookPen size={18} />, onOpen: () => navigate(`/notes/${note.id}`, { state: origin }), onUnpin: async () => { await setNotePinned(note, false); setPinnedNotes((items) => items.filter((item) => item.id !== note.id)) } })),
  ]

  return <div className="space-y-8">
    <header className="space-y-1"><p className="text-sm font-medium text-[var(--accent)]">Study Workspace</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Favourites</h1><p className="text-sm text-[var(--text-secondary)]">Your important study materials in one place.</p><p className="pt-1 text-sm text-[var(--text-muted)]">{total} favourited item{total === 1 ? '' : 's'}</p></header>
    <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Pinned Shortcuts</h2><p className="text-sm text-[var(--text-muted)]">Pinned items from across your workspace.</p></div><span className="text-sm text-[var(--text-muted)]">{shortcuts.length} pinned</span></div>{loading ? <p className="text-sm text-[var(--text-muted)]">Loading shortcuts…</p> : error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p> : shortcuts.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No pinned shortcuts yet.</p> : <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">{shortcuts.map((shortcut) => <div key={`${shortcut.type}-${shortcut.id}`} className="grid min-h-14 grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-2 border-b border-[var(--border)] px-3 last:border-0 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)_2.5rem] sm:px-4"><button onClick={shortcut.onOpen} className="flex min-w-0 items-center gap-2 text-left"><span className="shrink-0 text-[var(--accent)]">{shortcut.icon}</span><span className="truncate text-sm font-medium">{shortcut.name}</span><Bookmark size={13} className="shrink-0 text-[var(--accent)]" fill="currentColor" /></button><span className="hidden text-xs text-[var(--text-secondary)] sm:block">{shortcut.type}</span><span className="hidden truncate text-xs text-[var(--text-muted)] sm:block">{shortcut.location}</span><ActionMenu label={`More options for ${shortcut.name}`}><ActionMenuItem onClick={shortcut.onOpen}>Open {shortcut.type.toLowerCase()}</ActionMenuItem><ActionMenuItem onClick={() => void shortcut.onUnpin()}><Bookmark size={15} />Unpin shortcut</ActionMenuItem></ActionMenu></div>)}</div>}</section>
    <section className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">Favourites</h2><p className="text-sm text-[var(--text-muted)]">Only items you have marked as favourites.</p></div><span className="text-sm text-[var(--text-muted)]">{matchingAnswers.length + matchingNotes.length} shown</span></div><div className="flex flex-wrap gap-2"><label className="relative min-w-48 flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" /><input aria-label="Search favourites" value={search} onChange={(event) => { const next = new URLSearchParams(params); event.target.value ? next.set('q', event.target.value) : next.delete('q'); setParams(next, { replace: true }) }} placeholder="Search favourites..." className="!h-10 !pl-9" /></label><select aria-label="Filter favourites by type" className="!w-auto !min-w-32" value={type} onChange={(event) => { const next = new URLSearchParams(params); event.target.value === 'all' ? next.delete('kind') : next.set('kind', event.target.value); setParams(next, { replace: true }) }}><option value="all">All types</option><option value="answers">Answers</option><option value="notes">Notes</option></select></div>
      {loading ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">Loading favourites…</p> : error ? <EmptyState title="Couldn’t load favourites" description={error} /> : matchingAnswers.length + matchingNotes.length === 0 ? <EmptyState title={total ? search ? 'No search results' : 'No favourites match this type' : search ? 'No search results' : 'No favourites yet'} description={total ? search ? 'Try another search term.' : 'Choose another item type.' : 'Mark an answer or note as a favourite and it will appear here.'} /> : <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">{matchingAnswers.map((answer) => <FavouriteRow key={`answer-${answer.id}`} icon={<FileText size={18} />} name={answer.question} type={`Answer · ${answer.subject}`} location={folderPath(answer.folderId, folders)} meta={`${answer.topic} · ${answer.marks} marks`} onOpen={() => navigate(`/answers/${answer.id}`, { state: origin })} onRemove={async () => { await setAnswerFavourite(answer, false); setAnswers((items) => items.filter((item) => item.id !== answer.id)) }} />)}{matchingNotes.map((note) => <FavouriteRow key={`note-${note.id}`} icon={<NotebookPen size={18} />} name={note.title || 'Untitled note'} type="Quick Note" location={folderPath(note.folderId, folders, 'Quick Notes')} meta={displayDate(note.updatedAt ?? note.createdAt)} onOpen={() => navigate(`/notes/${note.id}`, { state: origin })} onRemove={async () => { await setNoteFavourite(note, false); setNotes((items) => items.filter((item) => item.id !== note.id)) }} />)}</div>}
    </section>
  </div>
}

function FavouriteRow({ icon, name, type, location, meta, onOpen, onRemove }: { icon: ReactNode; name: string; type: string; location: string; meta: string; onOpen: () => void; onRemove: () => void | Promise<void> }) {
  return <div className="grid min-h-16 grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-2 border-b border-[var(--border)] px-3 py-2 last:border-0 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)_2.5rem] sm:px-4"><button onClick={onOpen} className="flex min-w-0 items-center gap-3 text-left"><span className="shrink-0 text-[var(--accent)]">{icon}</span><span className="min-w-0"><span className="block truncate text-sm font-medium text-[var(--text-primary)]">{name}</span><span className="block truncate text-xs text-[var(--text-muted)] sm:hidden">{type} · {location}</span></span></button><span className="hidden text-xs text-[var(--text-secondary)] sm:block">{type}</span><span className="hidden min-w-0 sm:block"><span className="block truncate text-xs text-[var(--text-muted)]">{location}</span><span className="block truncate text-xs text-[var(--text-muted)]">{meta}</span></span><ActionMenu label={`More options for ${name}`}><ActionMenuItem onClick={onOpen}>Open {type.split(' · ')[0].toLowerCase()}</ActionMenuItem><ActionMenuItem onClick={() => void onRemove()}><Star size={15} fill="currentColor" />Remove favourite</ActionMenuItem></ActionMenu></div>
}

function folderPath(folderId: string | null | undefined, folders: Folder[], root = 'My Drive') {
  if (!folderId || !folders.some((folder) => folder.id === folderId)) return root
  const path: string[] = []; const seen = new Set<string>(); let folder = folders.find((item) => item.id === folderId)
  while (folder && !seen.has(folder.id)) { seen.add(folder.id); path.unshift(folder.name); folder = folder.parentId ? folders.find((item) => item.id === folder?.parentId) : undefined }
  return `${root} / ${path.join(' / ')}`
}
function displayDate(value: unknown) { if (!value) return '—'; const date = value instanceof Date ? value : typeof value === 'string' || typeof value === 'number' ? new Date(value) : value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function' ? (value.toDate() as Date) : null; return date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date) : '—' }
