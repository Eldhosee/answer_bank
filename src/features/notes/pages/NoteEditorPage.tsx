import { ArrowLeft, FolderPlus, FolderTree as FolderTreeIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import type { Folder } from '../models/folder'
import type { NoteInput } from '../models/note'
import { createNote, getNote, updateNote } from '../services/notesService'
import { NoteEditor } from '../components/NoteEditor'
import { noteSearchText, parseNoteContent, serializeNoteContent, type NoteBlock } from '../utils/noteDocument'
import { FolderSelector } from '../components/FolderSelector'
import { FolderDialog, type FolderDialogState } from '../components/FolderDialog'
import { createFolder, deleteFolderTree, listFolders, renameFolder } from '../services/foldersService'

const emptyBlocks: NoteBlock[] = [{ type: 'text', text: '' }]

export function NoteEditorPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [title, setTitle] = useState('')
  const [blocks, setBlocks] = useState<NoteBlock[]>(emptyBlocks)
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
      if (note) { setTitle(note.title); setBlocks(parseNoteContent(note.content)); setFolderId(note.folderId ?? null) }
      else setError('Note not found.')
    }).catch(() => setError('Could not load this note.')).finally(() => setLoading(false))
  }, [id])

  const save = async () => {
    const content = serializeNoteContent(blocks)
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
  if (loading) return <div className="py-20 text-center text-sm text-[#8a84a6] dark:text-[#8f87b3]">Loading note...</div>

  return <div className="mx-auto max-w-3xl space-y-6">
    <button onClick={() => navigate(id ? `/notes/${id}${searchParams.get('folder') ? `?folder=${searchParams.get('folder')}` : ''}` : folderId ? `/notes?folder=${folderId}` : '/notes')} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#8a84a6] hover:text-[#6d4aff] dark:text-[#8f87b3] dark:hover:text-[#b8a6ff]"><ArrowLeft size={17} />{id ? 'Back to note' : 'Quick Notes'}</button>
    <div><h1 className="text-3xl font-bold tracking-tight text-[#1b1534] dark:text-[#f4f1ff]">{editing ? 'Edit Note' : 'New Note'}</h1><p className="mt-2 text-sm text-[#4f4870] dark:text-[#c3bce0]">Your personal study notepad.</p></div>
    <div className="space-y-5 rounded-2xl border border-[#e4dcf7] bg-white p-4 shadow-sm shadow-[#6d4aff]/5 sm:p-7 dark:border-[#352d5c] dark:bg-[#1d1735] dark:shadow-none">
      <label className="block text-sm font-semibold text-[#1b1534] dark:text-[#e4dcf7]">Title<input className="mt-2 !text-base" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Give your note a title" /></label>
      <div><label className="block text-sm font-semibold text-[#1b1534] dark:text-[#e4dcf7]">Folder<div className="mt-2"><FolderSelector folders={folders} value={folderId} onChange={setFolderId} /></div></label><div className="mt-1 flex gap-1"><button type="button" className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-medium text-[#6d4aff] hover:bg-[#f3efff] dark:text-[#b8a6ff] dark:hover:bg-[#272046]" onClick={() => setFolderDialog({ mode: 'create', parentId: null })}><FolderPlus size={14} />New Folder</button>{folderId && <button type="button" className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-medium text-[#6d4aff] hover:bg-[#f3efff] dark:text-[#b8a6ff] dark:hover:bg-[#272046]" onClick={() => setFolderDialog({ mode: 'create', parentId: folderId })}><FolderTreeIcon size={14} />New Subfolder</button>}</div></div>
      <NoteEditor blocks={blocks} onChange={setBlocks} />
      {error && <p role="alert" className="rounded-xl border border-[#f9c4cc] bg-[#fff0f2] px-4 py-3 text-sm font-medium text-[#d6264a] dark:border-[#7a2a3a] dark:bg-[#3a1f33] dark:text-[#ff7a8c]">{error}</p>}
      <div className="flex flex-col-reverse gap-3 border-t border-[#e4dcf7] pt-5 dark:border-[#352d5c] sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => navigate(id ? `/notes/${id}${searchParams.get('folder') ? `?folder=${searchParams.get('folder')}` : ''}` : folderId ? `/notes?folder=${folderId}` : '/notes')}>Cancel</Button><Button onClick={() => void save()} disabled={saving}>{saving ? 'Saving...' : 'Save Note'}</Button></div>
    </div>
    {folderDialog && <FolderDialog state={folderDialog} folders={folders} onClose={() => setFolderDialog(null)} onCreate={createFolderAndSelect} onRename={async (folder, name) => { await renameFolder(folder.id, name); setFolders(await listFolders()) }} onDelete={async (folder, moveTo) => { await deleteFolderTree(folder.id, moveTo); setFolders(await listFolders()); if (folderId === folder.id) setFolderId(moveTo) }} />}
  </div>
}
