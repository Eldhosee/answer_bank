import { ArrowLeft, Bookmark, Edit3, Star, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import type { Note } from '../models/note'
import { deleteNote, getNote, setNoteFavourite, setNotePinned } from '../services/notesService'
import { NoteContent } from '../components/NoteContent'
import { ReadingToolbar } from '../../../components/reading/ReadingToolbar'
import { ReadingSurface } from '../../../components/reading/ReadingSurface'
import { useReadingMode } from '../../../app/ReadingModeProvider'
import { listFolders } from '../services/foldersService'
import type { Folder } from '../models/folder'

export function NoteDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [note, setNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [pinning, setPinning] = useState(false)
  const [folders, setFolders] = useState<Folder[]>([])
  const { focusMode } = useReadingMode()
  useEffect(() => {
    if (!id) return
    void getNote(id).then(setNote).catch((e) => setError(e instanceof Error ? e.message : 'Could not load this note.')).finally(() => setLoading(false))
  }, [id])
  useEffect(() => { void listFolders().then(setFolders).catch(() => undefined) }, [])
  if (loading) return <div className="py-20 text-center text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">Loading note...</div>
  if (error || !note) return <div className="space-y-4"><button onClick={() => navigate('/notes')} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--accent)] dark:text-[var(--text-muted)] dark:hover:text-[var(--accent)]"><ArrowLeft size={17} />Quick Notes</button><p role="alert" className="text-sm text-[var(--danger)]">{error || 'Note not found.'}</p></div>
  const navState = location.state as { returnTo?: string; backLabel?: string; originSection?: string } | null
  const validParent = note.folderId && folders.some((folder) => folder.id === note.folderId)
  const backToNotes = navState?.returnTo ?? (validParent ? `/notes?folder=${note.folderId}` : '/notes?folder=unfiled')
  const backLabel = navState?.backLabel ?? (validParent ? folders.find((folder) => folder.id === note.folderId)?.name ?? 'Quick Notes' : 'Unfiled')
  const goBack = () => navState?.returnTo ? navigate(-1) : navigate(backToNotes)
  return <div className="reading-page space-y-4">
    <ReadingToolbar title={note.title} />
    {!focusMode && <div className="reading-actions flex flex-wrap items-center justify-between gap-2">
      <button onClick={goBack} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--accent)]"><ArrowLeft size={17} />Back to {backLabel}</button>
      <div className="flex gap-2">
      <Button variant="secondary" disabled={pinning} title={note.isPinned ? 'Unpin from this folder' : 'Pin to this folder'} aria-label={note.isPinned ? 'Unpin from this folder' : 'Pin to this folder'} onClick={async () => { const next = !note.isPinned; setNote({ ...note, isPinned: next }); setPinning(true); try { await setNotePinned(note, next) } catch (e) { setNote({ ...note, isPinned: !next }); setError(e instanceof Error ? e.message : 'Could not update pin.') } finally { setPinning(false) } }}><Bookmark size={16} fill={note.isPinned ? 'currentColor' : 'none'} className={note.isPinned ? 'text-[var(--accent)]' : ''} /></Button>
      <Button variant="secondary" title={note.isFavourite ? 'Remove from favourites' : 'Add to favourites'} aria-label={note.isFavourite ? 'Remove from favourites' : 'Add to favourites'} onClick={async () => { const next = !note.isFavourite; setNote({ ...note, isFavourite: next }); try { await setNoteFavourite(note, next) } catch (e) { setNote({ ...note, isFavourite: !next }); setError(e instanceof Error ? e.message : 'Could not update favourite.') } }}><Star size={16} fill={note.isFavourite ? 'currentColor' : 'none'} className={note.isFavourite ? 'text-[var(--warning)]' : ''} /></Button>
      <Button variant="secondary" onClick={() =>
        navigate(`/notes/${note.id}/edit`, { state: location.state })}>
        <Edit3 size={16} />Edit</Button>
      <Button variant="danger" disabled={deleting}
        onClick={async () => {
          if (!window.confirm('Delete this note? This cannot be undone.'))
            return;
          setDeleting(true);
          setError('');
          try {
            await deleteNote(note.id);
            goBack()
          } catch (e) {
            setError(e instanceof Error ?
              e.message : 'Could not delete this note.')
          }
          finally {
            setDeleting(false)
          }
        }}>
        <Trash2 size={16} />{deleting ?
          'Deleting...' : 'Delete'}</Button>
      </div>
    </div>}
    <ReadingSurface>
      <article className="reading-article rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-7 shadow-sm shadow-[var(--accent)]/5 sm:px-9 sm:py-10">
        <h1 className="wrap-break-word text-2xl font-bold leading-tight tracking-tight text-[var(--text-primary)] sm:text-3xl">{note.title}</h1>
        <div className="my-6 border-t border-[var(--border)]" />
        <NoteContent content={note.content} />
      </article>
    </ReadingSurface>
    {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
   
  </div>
}
