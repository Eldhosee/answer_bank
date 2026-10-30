import { ArrowLeft, FolderPlus, FolderTree as FolderTreeIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import type { Folder } from '../models/folder'
import type { NoteInput } from '../models/note'
import { createNote, getNote, updateNote } from '../services/notesService'
import { NoteEditor } from '../components/NoteEditor'
import { getNoteEditorHtml, noteSearchText, serializeRichNoteContent } from '../utils/noteDocument'
import { FolderSelector } from '../components/FolderSelector'
import { FolderDialog, type FolderDialogState } from '../components/FolderDialog'
import { createFolder, deleteFolderTree, listFolders, moveFolder, renameFolder } from '../services/foldersService'

const emptyHtml = '<p><br></p>'

export function NoteEditorPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [title, setTitle] = useState('')
  const [contentHtml, setContentHtml] = useState(emptyHtml)
  const [folderId, setFolderId] = useState<string | null>(searchParams.get('folder'))
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [folderDialog, setFolderDialog] = useState<FolderDialogState | null>(null)

  useEffect(() => {
    void listFolders().then(setFolders).catch(() => undefined)
    if (!id) return
    void getNote(id).then((note) => {
      if (note) { setTitle(note.title); setContentHtml(getNoteEditorHtml(note.content)); setFolderId(note.folderId ?? null) }
      else setError('Note not found.')
    }).catch(() => setError('Could not load this note.')).finally(() => setLoading(false))
  }, [id])

  const save = async () => {
    const content = serializeRichNoteContent(contentHtml)
    if (!title.trim() || !noteSearchText(content).trim()) { setError('Add a title and note content before saving.'); return }
    const form: NoteInput = { title: title.trim(), content, folderId }
    setSaving(true); setError('')
    try {
      const returnQuery = searchParams.get('folder') ? `?folder=${searchParams.get('folder')}` : ''
      if (id) { await updateNote(id, form); navigate(`/notes/${id}${returnQuery}`) }
      else { const noteId = await createNote(form); navigate(`/notes/${noteId}${returnQuery}`) }
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save this note.') }
    finally { setSaving(false) }
  }
  const createFolderAndSelect = async (name: string, parentId: string | null) => {
    const folderId = await createFolder(name, parentId)
    setFolders(await listFolders())
    setFolderId(folderId)
  }
  if (loading) return <div className="py-20 text-center text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">Loading note...</div>

  return <div className="mx-auto max-w-3xl space-y-6">
    <button onClick={() => navigate(id ? `/notes/${id}${searchParams.get('folder') ? `?folder=${searchParams.get('folder')}` : ''}` : folderId ? `/notes?folder=${folderId}` : '/notes')} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--accent)] dark:text-[var(--text-muted)] dark:hover:text-[var(--accent)]"><ArrowLeft size={17} />{id ? 'Back to note' : 'Quick Notes'}</button>
    <div><h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] dark:text-[var(--text-primary)]">{editing ? 'Edit Note' : 'New Note'}</h1><p className="mt-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">Your personal study notepad.</p></div>
    <div className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm shadow-[var(--accent)]/5 sm:p-7 dark:border-[var(--border)] dark:bg-[var(--surface)] dark:shadow-none">
      <label className="block text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--border)]">Title<input className="mt-2 !text-base" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Give your note a title" /></label>
      <div><label className="block text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--border)]">Folder<div className="mt-2"><FolderSelector folders={folders} value={folderId} onChange={setFolderId} /></div></label><div className="mt-1 flex gap-1"><button type="button" className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)] dark:text-[var(--accent)] dark:hover:bg-[var(--surface)]" onClick={() => setFolderDialog({ mode: 'create', parentId: null })}><FolderPlus size={14} />New Folder</button>{folderId && <button type="button" className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)] dark:text-[var(--accent)] dark:hover:bg-[var(--surface)]" onClick={() => setFolderDialog({ mode: 'create', parentId: folderId })}><FolderTreeIcon size={14} />New Subfolder</button>}</div></div>
      <NoteEditor html={contentHtml} onChange={setContentHtml} />
      {error && <p role="alert" className="rounded-xl border border-[var(--danger-soft)] bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)] dark:border-[var(--danger-soft)] dark:bg-[var(--danger-soft)] dark:text-[var(--danger)]">{error}</p>}
      <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-5 dark:border-[var(--border)] sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => navigate(id ? `/notes/${id}${searchParams.get('folder') ? `?folder=${searchParams.get('folder')}` : ''}` : folderId ? `/notes?folder=${folderId}` : '/notes')}>Cancel</Button><Button onClick={() => void save()} disabled={saving}>{saving ? 'Saving...' : 'Save Note'}</Button></div>
    </div>
    {folderDialog && <FolderDialog state={folderDialog} folders={folders} onClose={() => setFolderDialog(null)} onCreate={createFolderAndSelect} onRename={async (folder, name) => { await renameFolder(folder.id, name); setFolders(await listFolders()) }} onMove={async (folder, parentId) => { await moveFolder(folder.id, parentId); setFolders(await listFolders()) }} onDelete={async (folder, moveTo) => { await deleteFolderTree(folder.id, moveTo); setFolders(await listFolders()); if (folderId === folder.id) setFolderId(moveTo) }} />}
  </div>
}
