import { ArrowLeft, Edit3, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import type { Note } from '../models/note'
import { deleteNote, getNote } from '../services/notesService'
import { NoteContent } from '../components/NoteContent'

export function NoteDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [note, setNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  useEffect(() => {
    if (!id) return
    void getNote(id).then(setNote).catch((e) => setError(e instanceof Error ? e.message : 'Could not load this note.')).finally(() => setLoading(false))
  }, [id])
  if (loading) return <div className="py-20 text-center text-sm text-[#8a84a6] dark:text-[#8f87b3]">Loading note...</div>
  if (error || !note) return <div className="space-y-4"><button onClick={() => navigate('/notes')} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#8a84a6] hover:text-[#6d4aff] dark:text-[#8f87b3] dark:hover:text-[#b8a6ff]"><ArrowLeft size={17} />Quick Notes</button><p role="alert" className="text-sm text-[#d6264a]">{error || 'Note not found.'}</p></div>
  const returnFolder = searchParams.get('folder')
  const backToNotes = returnFolder ? `/notes?folder=${returnFolder === 'all' ? '' : returnFolder}` : note.folderId ? `/notes?folder=${note.folderId}` : '/notes?folder=unfiled'
  return <div className="mx-auto max-w-3xl space-y-5">
    <button onClick={() => navigate(backToNotes)} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#8a84a6] hover:text-[#6d4aff] dark:text-[#8f87b3] dark:hover:text-[#b8a6ff]"><ArrowLeft size={17} />Quick Notes</button>
    <div className="flex justify-end gap-2">
      <Button variant="secondary" onClick={() =>
        navigate(`/notes/${note.id}/edit${returnFolder
          ? `?folder=${returnFolder}` : ''}`)}>
        <Edit3 size={16} />Edit</Button>
      <Button variant="danger" disabled={deleting}
        onClick={async () => {
          if (!window.confirm('Delete this note? This cannot be undone.'))
            return;
          setDeleting(true);
          setError('');
          try {
            await deleteNote(note.id);
            navigate(backToNotes)
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
    <article className="rounded-2xl border border-[#e4dcf7] bg-white px-5 py-7 shadow-sm shadow-[#6d4aff]/5 sm:px-9 sm:py-10 dark:border-[#352d5c] dark:bg-[#1d1735] dark:shadow-none">
      <h1 className="wrap-break-word text-2xl font-bold leading-tight tracking-tight text-[#1b1534] dark:text-[#f4f1ff] sm:text-3xl">{note.title}</h1>
      <div className="my-6 border-t border-[#e4dcf7] dark:border-[#352d5c]" />
      <NoteContent content={note.content} />
    </article>
    {error && <p role="alert" className="text-sm text-[#d6264a]">{error}</p>}
   
  </div>
}
