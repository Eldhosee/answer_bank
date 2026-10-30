import { ChevronDown, Folder as FolderIcon, Grid2X2, List, Plus, Search, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/EmptyState'
import { NoteCard } from '../components/NoteCard'
import { deleteNote, listNotes } from '../services/notesService'
import { useEffect } from 'react'
import type { Note } from '../models/note'
import type { Folder } from '../models/folder'
import { createFolder, deleteFolderTree, listFolders, moveFolder, renameFolder } from '../services/foldersService'
import { FolderTree } from '../components/FolderTree'
import { noteSearchText } from '../utils/noteDocument'
import { FolderDialog, type FolderDialogState } from '../components/FolderDialog'

export function NotesPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const selectedFolder = params.get('folder') ?? 'all'
  const [notes, setNotes] = useState<Note[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [sort, setSort] = useState<'latest' | 'oldest' | 'title'>('latest')
  const [listView, setListView] = useState(() => localStorage.getItem('nabard-files-view') === 'list')
  const [dialog, setDialog] = useState<FolderDialogState | null>(null)
  const [mobileFoldersOpen, setMobileFoldersOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  useEffect(() => { void Promise.all([listNotes(), listFolders()]).then(([items, allFolders]) => { setNotes(items); setFolders(allFolders) }).catch((e) => setError(e instanceof Error ? e.message : 'Unable to load notes.')).finally(() => setLoading(false)) }, [])
  useEffect(() => {
    if (params.get('newFolder') !== '1') return
    setDialog({ mode: 'create', parentId: selectedFolder === 'all' || selectedFolder === 'unfiled' ? null : selectedFolder })
    const next = new URLSearchParams(params); next.delete('newFolder'); setParams(next, { replace: true })
  }, [params, selectedFolder, setParams])
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase()
    const folderNotes = notes.filter((note) => selectedFolder === 'all' ? true : selectedFolder === 'unfiled' ? !note.folderId : note.folderId === selectedFolder || isInFolder(note.folderId, selectedFolder, folders))
    const matches = term ? folderNotes.filter((note) => `${note.title}\n${noteSearchText(note.content)}`.toLocaleLowerCase().includes(term)) : folderNotes
    return [...matches].sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : sort === 'oldest' ? timestamp(a.updatedAt ?? a.createdAt) - timestamp(b.updatedAt ?? b.createdAt) : timestamp(b.updatedAt ?? b.createdAt) - timestamp(a.updatedAt ?? a.createdAt))
  }, [notes, search, selectedFolder, folders, sort])
  const refresh = async () => { const [nextNotes, nextFolders] = await Promise.all([listNotes(), listFolders()]); setNotes(nextNotes); setFolders(nextFolders) }
  const handleCreateFolder = async (name: string, parentId: string | null) => { await createFolder(name, parentId); await refresh() }
  const handleRenameFolder = async (folder: Folder, name: string) => { await renameFolder(folder.id, name); await refresh() }
  const handleDeleteFolder = async (folder: Folder, moveTo: string | null) => {
    const ids = subtreeIds(folder.id, folders)
    await deleteFolderTree(folder.id, moveTo)
    if (ids.has(selectedFolder)) moveTo ? setParams({ folder: moveTo }) : setParams({ folder: 'unfiled' })
    await refresh()
  }
  const selectedLabel = selectedFolder === 'all' ? 'All Notes' : selectedFolder === 'unfiled' ? 'Unfiled' : folders.find((folder) => folder.id === selectedFolder)?.name ?? 'All Notes'
  const breadcrumb = selectedFolder === 'all' || selectedFolder === 'unfiled' ? [{ id: 'all', label: 'Quick Notes' }, { id: selectedFolder, label: selectedLabel }] : folderBreadcrumb(selectedFolder, folders)

  const selectFolder = (folder: string) => { folder === 'all' ? setParams({}) : setParams({ folder }); setMobileFoldersOpen(false) }
  const openNewNote = () => navigate(`/notes/new${selectedFolder !== 'all' && selectedFolder !== 'unfiled' ? `?folder=${selectedFolder}` : ''}`)
  const setView = (view: boolean) => { setListView(view); localStorage.setItem('nabard-files-view', view ? 'list' : 'grid') }
  const tree = <FolderTree folders={folders} selected={selectedFolder} notes={notes} onSelect={selectFolder} onCreate={(parentId) => setDialog({ mode: 'create', parentId })} onRename={(folder) => setDialog({ mode: 'rename', folder })} onMove={(folder) => setDialog({ mode: 'move', folder })} onDelete={(folder) => setDialog({ mode: 'delete', folder, noteCount: notes.filter((note) => subtreeIds(folder.id, folders).has(note.folderId ?? '')).length, childCount: subtreeIds(folder.id, folders).size - 1 })} />

  return <><div className="md:grid md:grid-cols-[208px_minmax(0,1fr)] md:gap-5 lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-6">
      <aside className="hidden md:block">{tree}</aside>
      <main className="min-w-0 space-y-4">
        <div className="flex min-h-9 items-center justify-between gap-3">
          <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-1 text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">{breadcrumb.map((item, index) => <span key={item.id} className="inline-flex items-center gap-1"><button disabled={index === breadcrumb.length - 1} className="max-w-[30vw] truncate rounded px-1 py-1 hover:text-[var(--accent)] disabled:cursor-default disabled:text-[var(--text-secondary)] dark:hover:text-[var(--accent)] dark:disabled:text-[var(--text-secondary)]" onClick={() => selectFolder(item.id)}>{item.label}</button>{index < breadcrumb.length - 1 && <span>/</span>}</span>)}</nav>
          <Button className="shrink-0" onClick={openNewNote}><Plus size={17} />New Note</Button>
        </div>
        <button className="flex min-h-10 w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-left text-sm dark:border-[var(--border)] dark:bg-[var(--surface)] md:hidden" onClick={() => setMobileFoldersOpen(true)}><FolderIcon size={16} className="text-[var(--accent)] dark:text-[var(--accent)]" /><span className="min-w-0 flex-1 truncate">{breadcrumb.slice(1).map((item) => item.label).join(' / ')}</span><ChevronDown size={16} /></button>
        <h1 className="truncate pt-1 text-3xl font-bold tracking-tight text-[var(--text-primary)] dark:text-[var(--text-primary)] sm:text-4xl">{selectedFolder === 'all' ? 'Quick Notes' : selectedLabel}</h1>
        <div className="flex min-h-10 flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3 dark:border-[var(--border)]">
          <span className="shrink-0 text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">{filtered.length} {filtered.length === 1 ? 'note' : 'notes'}</span>
          <div className="flex min-w-0 items-center justify-end gap-1.5">
            {searchOpen && <div className="relative w-full min-w-36 max-w-64 sm:w-56"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" /><input ref={searchRef} aria-label="Search notes" className="!h-9 !rounded-lg !py-1 !pl-9 !pr-8 !text-sm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes..." onKeyDown={(e) => { if (e.key === 'Escape') { setSearch(''); setSearchOpen(false) } }} /><button aria-label="Close note search" className="absolute right-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded text-[var(--text-muted)] hover:bg-[var(--accent-soft)] dark:hover:bg-[var(--surface)]" onClick={() => { setSearch(''); setSearchOpen(false) }}><X size={14} /></button></div>}
            {!searchOpen && <button aria-label="Search notes" className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--accent-soft)] dark:text-[var(--text-secondary)] dark:hover:bg-[var(--surface)]" onClick={() => { setSearchOpen(true); requestAnimationFrame(() => searchRef.current?.focus()) }}><Search size={17} /></button>}
            <select aria-label="Sort notes" className="!h-9 !w-auto !min-w-0 !rounded-lg !border-transparent !bg-transparent !px-2 !py-1 !text-xs text-[var(--text-muted)] focus:!border-[var(--accent)] dark:text-[var(--text-secondary)]" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}><option value="latest">Latest first</option><option value="oldest">Oldest first</option><option value="title">Title</option></select>
            <div className="flex items-center rounded-lg border border-[var(--border)] p-0.5 dark:border-[var(--border)]"><button aria-label="Grid view" aria-pressed={!listView} className={`grid h-8 w-8 place-items-center rounded-md ${!listView ? 'bg-[var(--accent-soft)] text-[var(--accent)] dark:bg-[var(--border)] dark:text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} onClick={() => setView(false)}><Grid2X2 size={16} /></button><button aria-label="List view" aria-pressed={listView} className={`grid h-8 w-8 place-items-center rounded-md ${listView ? 'bg-[var(--accent-soft)] text-[var(--accent)] dark:bg-[var(--border)] dark:text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} onClick={() => setView(true)}><List size={17} /></button></div>
          </div>
        </div>
        {loading ? <div className="py-16 text-center text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">Loading notes...</div> : error ? <EmptyState title="Couldn’t load notes" description={error} /> : filtered.length ? <div className={listView ? 'grid items-start gap-2' : 'grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3'}>{filtered.map((note) => <NoteCard key={note.id} note={note} listView={listView} location={note.folderId ? folders.find((item) => item.id === note.folderId)?.name : 'Unfiled'} onOpen={() => navigate(`/notes/${note.id}?folder=${selectedFolder}`)} onEdit={() => navigate(`/notes/${note.id}/edit?folder=${selectedFolder}`)} onDelete={async () => { if (window.confirm('Delete this note? This cannot be undone.')) { await deleteNote(note.id); await refresh() } }} />)}</div> : <div className="flex min-h-[42vh] flex-col items-center justify-center text-center"><div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] dark:bg-[var(--surface)] dark:text-[var(--text-muted)]"><FolderIcon size={31} strokeWidth={1.5} /></div><h2 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{search ? 'No notes found' : selectedFolder === 'all' ? 'No notes yet' : `This folder is empty`}</h2><p className="mt-2 max-w-sm text-sm leading-6 text-[var(--text-muted)] dark:text-[var(--text-muted)]">{search ? 'Try a different search.' : 'Create a folder, answer, or note to start organizing your study material.'}</p>{!search && <div className="mt-5 flex flex-wrap justify-center gap-2"><Button variant="secondary" onClick={() => setDialog({ mode: 'create', parentId: selectedFolder === 'all' || selectedFolder === 'unfiled' ? null : selectedFolder })}><Plus size={16} />New Folder</Button><Button variant="secondary" onClick={() => navigate(`/answers/new${selectedFolder !== 'all' && selectedFolder !== 'unfiled' ? `?folder=${selectedFolder}` : ''}`)}><Plus size={16} />New Answer</Button><Button onClick={openNewNote}><Plus size={16} />New Note</Button></div>}</div>}
      </main>
    </div>
    {mobileFoldersOpen && <div className="fixed inset-0 z-50 flex items-end bg-[var(--overlay)]/60 p-0 sm:items-center sm:justify-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setMobileFoldersOpen(false) }}><section className="flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-[var(--surface)] p-3 dark:bg-[var(--surface)] sm:max-w-sm sm:rounded-2xl"><div className="mb-2 flex items-center justify-between px-2"><h2 className="font-semibold">Folders</h2><button aria-label="Close folders" className="rounded-lg p-2" onClick={() => setMobileFoldersOpen(false)}><X size={18} /></button></div><div className="min-h-0 flex-1">{tree}</div></section></div>}
    {dialog && <FolderDialog state={dialog} folders={folders} onClose={() => setDialog(null)} onCreate={handleCreateFolder} onRename={handleRenameFolder} onMove={async (folder, parentId) => { await moveFolder(folder.id, parentId); await refresh() }} onDelete={handleDeleteFolder} />}
  </>
}

function timestamp(value: unknown): number { if (typeof value === 'string' || typeof value === 'number') return new Date(value).getTime() || 0; if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') return (value.toDate() as Date).getTime(); return 0 }

function folderBreadcrumb(id: string, folders: Folder[]): { id: string; label: string }[] {
  const items: { id: string; label: string }[] = []
  let folder = folders.find((item) => item.id === id)
  const visited = new Set<string>()
  while (folder && !visited.has(folder.id)) { visited.add(folder.id); items.unshift({ id: folder.id, label: folder.name }); folder = folder.parentId ? folders.find((item) => item.id === folder?.parentId) : undefined }
  return [{ id: 'all', label: 'Quick Notes' }, ...items]
}

function subtreeIds(id: string, folders: Folder[]): Set<string> { const ids = new Set([id]); let changed = true; while (changed) { changed = false; for (const folder of folders) if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) { ids.add(folder.id); changed = true } } return ids }
function isInFolder(folderId: string | null | undefined, parentId: string, folders: Folder[]) { let current = folders.find((folder) => folder.id === folderId); const visited = new Set<string>(); while (current?.parentId && !visited.has(current.id)) { if (current.parentId === parentId) return true; visited.add(current.id); current = folders.find((folder) => folder.id === current?.parentId) } return false }
