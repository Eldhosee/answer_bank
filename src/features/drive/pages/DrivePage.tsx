import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Bookmark, ChevronRight, FileText, Folder as FolderIcon, NotebookPen, Plus, Search, Star, X } from 'lucide-react'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ActionMenu, ActionMenuItem } from '../../../components/ui/ActionMenu'
import { FolderDialog, type FolderDialogState } from '../../notes/components/FolderDialog'
import type { Folder } from '../../notes/models/folder'
import type { Answer } from '../../answers/models/answer'
import { deleteAnswer, listAnswers, setAnswerPinned, toggleFavourite } from '../../answers/services/answerService'
import type { Note } from '../../notes/models/note'
import { deleteNote, listNotes, setNoteFavourite, setNotePinned } from '../../notes/services/notesService'
import { createFolder as createDriveFolder, deleteFolderTree as deleteDriveFolderTree, listFolders as listDriveFolders, moveFolder as moveDriveFolder, renameFolder as renameDriveFolder, setFolderPinned } from '../../notes/services/foldersService'

type DriveFolder = { id: string; name: string; subject?: Answer['subject']; virtual?: boolean; virtualType?: 'unfiled'; isPinned?: boolean }
const subjectFolders: DriveFolder[] = [
  { id: 'subject:ARD', name: 'ARD', subject: 'ARD', virtual: true },
  { id: 'subject:ESI', name: 'ESI', subject: 'ESI', virtual: true },
  { id: 'subject:English', name: 'English', subject: 'English', virtual: true },
]

export function DrivePage({ notesOnly = false }: { notesOnly?: boolean } = {}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const selectedFolder = params.get('folder')
  const subjectId = params.get('subject')
  const [answers, setAnswers] = useState<Answer[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState(params.get('q') ?? '')
  const [sort, setSort] = useState<'name' | 'modified'>(() => params.get('sort') === 'modified' ? 'modified' : 'name')
  const [displayLimit, setDisplayLimit] = useState(50)
  const [dialog, setDialog] = useState<FolderDialogState | null>(null)

  useEffect(() => {
    let live = true
    void Promise.all([listAnswers(), listDriveFolders(), listNotes()]).then(([allAnswers, allFolders, allNotes]) => {
      if (!live) return
      setAnswers(allAnswers); setFolders(allFolders); setNotes(allNotes)
    }).catch((e) => { if (live) setError(e instanceof Error ? e.message : 'Could not load your study drive.') }).finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [])
  useEffect(() => {
    if (params.get('newFolder') !== '1') return
    setDialog({ mode: 'create', parentId: selectedFolder === 'unfiled' ? null : selectedFolder ?? null })
    const next = new URLSearchParams(params); next.delete('newFolder'); setParams(next, { replace: true })
  }, [params, selectedFolder, setParams])
  useEffect(() => { setDisplayLimit(50) }, [selectedFolder, subjectId, search, sort, notesOnly])

  const currentFolder = folders.find((folder) => folder.id === selectedFolder)
  const currentSubject = subjectId && ['ARD', 'ESI', 'English'].includes(subjectId) ? subjectId as Answer['subject'] : null
  const unfiledAnswers = answers.filter((answer) => isUnfiled(answer.folderId, folders))
  const unfiledNotes = notes.filter((note) => isUnfiled(note.folderId, folders))
  const folderItems = useMemo<DriveFolder[]>(() => {
    let candidates = selectedFolder && selectedFolder !== 'unfiled' ? folders.filter((folder) => folder.parentId === selectedFolder) : selectedFolder === 'unfiled' ? [] : currentSubject ? folders.filter((folder) => folder.parentId === null && folder.name.toLocaleLowerCase().includes(currentSubject.toLocaleLowerCase())) : folders.filter((folder) => folder.parentId === null)
    if (notesOnly) candidates = candidates.filter((folder) => hasNoteInFolder(folder.id, folders, notes))
    const ordered = [...candidates].sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)) || toMillis(b.pinnedAt) - toMillis(a.pinnedAt))
    let result: DriveFolder[] = notesOnly || selectedFolder || currentSubject ? ordered.map(({ id, name, isPinned }) => ({ id, name, isPinned })) : [...subjectFolders.filter((folder) => answers.some((answer) => answer.subject === folder.subject)), ...ordered.map(({ id, name, isPinned }) => ({ id, name, isPinned }))]
    if (!selectedFolder && !currentSubject) { const count = notesOnly ? unfiledNotes.length : unfiledAnswers.length + unfiledNotes.length; if (count) result = [...result, { id: 'virtual:unfiled', name: 'Unfiled', virtual: true, virtualType: 'unfiled' }] }
    return result.sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)))
  }, [folders, selectedFolder, currentSubject, answers, notes, notesOnly, unfiledAnswers.length, unfiledNotes.length])
  const visibleAnswers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase()
    const found = (notesOnly ? [] : answers).filter((answer) => {
      const inLocation = selectedFolder === 'unfiled' ? isUnfiled(answer.folderId, folders) : term ? true : selectedFolder ? folders.some((folder) => folder.id === selectedFolder) && answer.folderId === selectedFolder : currentSubject ? answer.subject === currentSubject : isUnfiled(answer.folderId, folders)
      return inLocation && (!term || `${answer.question}\n${answer.topic}\n${answer.subject}\n${answer.answer}`.toLocaleLowerCase().includes(term))
    })
    return [...found].sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)) || (a.isPinned && b.isPinned ? toMillis(b.pinnedAt) - toMillis(a.pinnedAt) : 0) || (sort === 'name' ? a.question.localeCompare(b.question) : toMillis(b.updatedAt ?? b.createdAt) - toMillis(a.updatedAt ?? a.createdAt)))
  }, [answers, folders, search, selectedFolder, currentSubject, sort, notesOnly])
  const visibleNotes = useMemo(() => {
    const term = search.trim().toLocaleLowerCase()
    return notes.filter((note) => {
      const inLocation = selectedFolder === 'unfiled' ? isUnfiled(note.folderId, folders) : term ? true : selectedFolder ? folders.some((folder) => folder.id === selectedFolder) && note.folderId === selectedFolder : !currentSubject ? isUnfiled(note.folderId, folders) : false
      return inLocation && (!term || `${note.title}\n${note.content}`.toLocaleLowerCase().includes(term))
    }).sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)) || (a.isPinned && b.isPinned ? toMillis(b.pinnedAt) - toMillis(a.pinnedAt) : 0) || (sort === 'name' ? a.title.localeCompare(b.title) : toMillis(b.updatedAt ?? b.createdAt) - toMillis(a.updatedAt ?? a.createdAt)))
  }, [notes, folders, search, selectedFolder, currentSubject, sort])
  const currentLabel = selectedFolder === 'unfiled' ? 'Unfiled' : currentFolder?.name ?? currentSubject ?? (notesOnly ? 'Quick Notes' : 'My Drive')
  const breadcrumb = selectedFolder === 'unfiled' ? [{ id: 'root', label: notesOnly ? 'Quick Notes' : 'My Drive' }, { id: 'virtual:unfiled', label: 'Unfiled' }] : currentFolder ? getBreadcrumb(currentFolder.id, folders, notesOnly ? 'Quick Notes' : 'My Drive') : currentSubject ? [{ id: 'root', label: 'My Drive' }, { id: `subject:${currentSubject}`, label: currentSubject }] : [{ id: 'root', label: notesOnly ? 'Quick Notes' : 'My Drive' }]

  const refresh = async () => { const [nextAnswers, nextFolders, nextNotes] = await Promise.all([listAnswers(), listDriveFolders(), listNotes()]); setAnswers(nextAnswers); setFolders(nextFolders); setNotes(nextNotes) }
  const select = (id: string) => { const next = new URLSearchParams(params); next.delete('folder'); next.delete('subject'); if (id.startsWith('subject:')) next.set('subject', id.slice(8)); else if (id !== 'root') next.set('folder', id === 'virtual:unfiled' ? 'unfiled' : id); setParams(next, { state: location.state }) }
  const updateSearch = (value: string) => { setSearch(value); const next = new URLSearchParams(params); value ? next.set('q', value) : next.delete('q'); setParams(next, { replace: true, state: location.state }) }
  const sectionOrigin = (location.state as { originSection?: string } | null)?.originSection ?? (notesOnly ? 'quickNotes' : 'drive')
  const detailState = { returnTo: `${location.pathname}${location.search}`, originSection: sectionOrigin, backLabel: selectedFolder === 'unfiled' ? 'Unfiled' : currentLabel }
  const openNewAnswer = () => navigate(`/answers/new${selectedFolder && selectedFolder !== 'unfiled' ? `?folder=${selectedFolder}` : currentSubject ? `?subject=${currentSubject}` : ''}`)
  const createNewFolder = async (name: string, parentId: string | null) => { await createDriveFolder(name, parentId === 'unfiled' ? null : parentId); await refresh() }
  const deleteFolder = async (folder: Folder, moveTo: string | null) => { await deleteDriveFolderTree(folder.id, moveTo); await refresh(); if (selectedFolder && isDescendantOrSelf(selectedFolder, folder.id, folders)) setParams(moveTo ? { folder: moveTo } : {}) }
  const deleteCounts = (folder: Folder) => answers.filter((answer) => answer.folderId === folder.id).length + notes.filter((note) => note.folderId === folder.id).length
  const newFolderDialog = (parentId: string | null = selectedFolder === 'unfiled' ? null : selectedFolder ?? null) => setDialog({ mode: 'create', parentId })

  return <div className="space-y-6">
    <header className="flex items-center justify-between gap-3">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">{breadcrumb.map((crumb, index) => <span className="inline-flex min-w-0 items-center gap-1" key={crumb.id}><button disabled={index === breadcrumb.length - 1} className="truncate rounded px-1 py-1 hover:text-[var(--accent)] disabled:cursor-default disabled:font-semibold disabled:text-[var(--text-primary)] dark:hover:text-[var(--accent)] dark:disabled:text-[var(--text-primary)]" onClick={() => select(crumb.id)}>{crumb.label}</button>{index < breadcrumb.length - 1 && <ChevronRight size={15} />}</span>)}</nav>
      <span className="hidden text-xs text-[var(--text-muted)] sm:inline">{notesOnly ? notes.length + ' notes' : answers.length + ' study answers'}</span>
    </header>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0"><p className="text-sm font-medium text-[var(--text-muted)] dark:text-[var(--text-muted)]">{notesOnly ? 'Study Workspace' : 'NABARD Study Workspace'}</p><h1 className="mt-1 truncate text-3xl font-semibold tracking-tight text-[var(--text-primary)] dark:text-[var(--text-primary)]">{currentLabel}</h1></div>
      <div className="flex items-center gap-2"><label className="relative block w-48 sm:w-64 lg:w-80"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" /><input aria-label={notesOnly ? 'Search Quick Notes' : 'Search in NABARD'} value={search} onChange={(event) => updateSearch(event.target.value)} placeholder={notesOnly ? 'Search notes...' : 'Search in NABARD...'} className="!h-10 !rounded-xl !bg-[var(--surface)] !pl-9 !pr-8 dark:!bg-[var(--surface-elevated)]" />{search && <button aria-label="Clear search" onClick={() => updateSearch('')} className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-[var(--text-muted)] hover:bg-[var(--accent-soft)] dark:hover:bg-[var(--surface-elevated)]"><X size={14} /></button>}</label>
        {notesOnly && <Button className="shrink-0" onClick={() => navigate(`/notes/new${selectedFolder && selectedFolder !== 'unfiled' ? `?folder=${selectedFolder}` : ''}`)}><Plus size={16} />New Note</Button>}</div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{selectedFolder || currentSubject ? 'Folders and files' : 'Folders'}</h2><div className="flex items-center gap-3"><span className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">{folderItems.length} folders · {visibleAnswers.length + visibleNotes.length} files</span><label className="flex items-center gap-2 text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">Sort<select aria-label="Sort drive items" className="!h-8 !w-auto !min-w-24 !rounded-lg !py-1 !pl-2 !pr-7 !text-xs" value={sort} onChange={(event) => { const value = event.target.value as typeof sort; setSort(value); const next = new URLSearchParams(params); next.set('sort', value); setParams(next, { replace: true, state: location.state }) }}><option value="name">Name</option><option value="modified">Modified</option></select></label></div></div>
    {loading ? <div className="py-16 text-center text-sm text-[var(--text-muted)]">Loading your study drive...</div> : error ? <EmptyState title="Couldn’t load your study drive" description={error} /> : <>
      {folderItems.length > 0 && <section className="space-y-2"><h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] dark:text-[var(--text-muted)]">Folders</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{folderItems.map((folder) => <FolderCard key={folder.id} folder={folder} count={folder.virtualType === 'unfiled' ? notesOnly ? unfiledNotes.length : unfiledAnswers.length + unfiledNotes.length : folder.virtual ? answers.filter((answer) => answer.subject === folder.subject).length : notesOnly ? notes.filter((note) => note.folderId === folder.id).length : countFolder(folder.id, folders, answers) + notes.filter((note) => note.folderId === folder.id).length} childCount={folder.virtual ? 0 : folders.filter((child) => child.parentId === folder.id).length} selected={selectedFolder === 'unfiled' ? folder.virtualType === 'unfiled' : selectedFolder === folder.id || subjectId === folder.subject} onPin={async () => { const actual = folders.find((item) => item.id === folder.id); if (actual) { await setFolderPinned(actual, !actual.isPinned); await refresh() } }} onOpen={() => select(folder.id)} onNewSubfolder={() => newFolderDialog(folder.id)} onRename={() => { if (!folder.virtual) setDialog({ mode: 'rename', folder: folders.find((item) => item.id === folder.id)! }) }} onMove={() => { if (!folder.virtual) setDialog({ mode: 'move', folder: folders.find((item) => item.id === folder.id)! }) }} onDelete={() => { if (!folder.virtual) setDialog({ mode: 'delete', folder: folders.find((item) => item.id === folder.id)!, noteCount: deleteCounts(folders.find((item) => item.id === folder.id)!), childCount: subtreeIds(folder.id, folders).size - 1 }) }} />)}</div></section>}
      {(visibleAnswers.length > 0 || visibleNotes.length > 0) && <section className="space-y-2"><h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] dark:text-[var(--text-muted)]">{notesOnly ? 'Notes' : 'Files'}</h3><FileListHeader /><div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] dark:border-[var(--border)] dark:bg-[var(--background)]">
        {visibleAnswers.slice(0, displayLimit).map((answer) => <AnswerRow key={answer.id} answer={answer} onOpen={() => navigate(`/answers/${answer.id}`, { state: detailState })} onEdit={() => navigate(`/answers/${answer.id}/edit`, { state: detailState })} onPin={async () => { await setAnswerPinned(answer, !answer.isPinned); setAnswers(await listAnswers()) }} onFavourite={async () => { await toggleFavourite(answer); setAnswers(await listAnswers()) }} onDelete={async () => { if (window.confirm('Delete this answer? This cannot be undone.')) { await deleteAnswer(answer.id); setAnswers(await listAnswers()) } }} />)}
        {visibleNotes.slice(0, displayLimit).map((note) => <NoteRow key={note.id} note={note} onOpen={() => navigate(`/notes/${note.id}`, { state: detailState })} onEdit={() => navigate(`/notes/${note.id}/edit`, { state: detailState })} onPin={async () => { await setNotePinned(note, !note.isPinned); setNotes(await listNotes()) }} onFavourite={async () => { await setNoteFavourite(note, !note.isFavourite); setNotes(await listNotes()) }} onDelete={async () => { if (window.confirm('Delete this note? This cannot be undone.')) { await deleteNote(note.id); setNotes(await listNotes()) } }} />)}
      </div></section>}
      {(visibleAnswers.length > displayLimit || visibleNotes.length > displayLimit) && <button className="mx-auto block rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]" onClick={() => setDisplayLimit((limit) => limit + 50)}>Load more files</button>}
      {!folderItems.length && !visibleAnswers.length && !visibleNotes.length && <div className="flex min-h-[42vh] flex-col items-center justify-center text-center"><div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] dark:bg-[var(--accent-soft)] dark:text-[var(--accent)]"><FolderIcon size={28} /></div><h2 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{search ? 'No results found' : selectedFolder || currentSubject ? 'This folder is empty' : `Your ${notesOnly ? 'Quick Notes' : 'study drive'} is empty`}</h2><p className="mt-2 max-w-sm text-sm leading-6 text-[var(--text-muted)] dark:text-[var(--text-muted)]">{search ? 'Try a different search.' : 'Create a folder, answer, or note to start organizing your study material.'}</p>{!search && <div className="mt-4 flex flex-wrap justify-center gap-2"><Button variant="secondary" onClick={() => newFolderDialog()}><Plus size={16} />New Folder</Button>{!notesOnly && <Button variant="secondary" onClick={openNewAnswer}><Plus size={16} />New Answer</Button>}<Button onClick={() => navigate(`/notes/new${selectedFolder ? `?folder=${selectedFolder}` : ''}`)}><Plus size={16} />New Note</Button></div>}</div>}
    </>}
    {dialog && <FolderDialog state={dialog} folders={folders} onClose={() => setDialog(null)} onCreate={createNewFolder} onRename={async (folder, name) => { await renameDriveFolder(folder.id, name); await refresh() }} onMove={async (folder, parentId) => { await moveDriveFolder(folder.id, parentId); await refresh() }} onDelete={deleteFolder} />}
  </div>
}

function FolderCard({ folder, count, childCount, selected, onOpen, onPin, onNewSubfolder, onRename, onMove, onDelete }: { folder: DriveFolder; count: number; childCount: number; selected: boolean; onOpen: () => void; onPin: () => void; onNewSubfolder: () => void; onRename: () => void; onMove: () => void; onDelete: () => void }) {
  return <article className={`group flex min-h-20 items-center gap-3 rounded-xl border px-4 py-3 transition hover:shadow-sm ${selected ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]'}`}><button onClick={onOpen} title={folder.name} className="flex min-w-0 flex-1 items-center gap-3 text-left"><span className="grid h-10 w-12 shrink-0 place-items-center rounded-lg bg-[var(--warning-soft)] text-[var(--warning)]"><FolderIcon size={24} fill="currentColor" fillOpacity={0.18} /></span><span className="min-w-0"><span className="flex items-center gap-1 truncate text-sm font-semibold text-[var(--text-primary)]">{folder.isPinned && <Bookmark size={13} fill="currentColor" />}<span className="truncate">{folder.name}</span></span><span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">{childCount ? `${childCount} folders · ` : ''}{count} {count === 1 ? 'file' : 'files'}</span></span></button>{!folder.virtual && <ActionMenu label={`Actions for ${folder.name}`}><ActionMenuItem onClick={onPin}><Bookmark size={15} />{folder.isPinned ? 'Unpin folder' : 'Pin folder'}</ActionMenuItem><ActionMenuItem onClick={onNewSubfolder}><Plus size={15} />New subfolder</ActionMenuItem><ActionMenuItem onClick={onRename}>Rename folder</ActionMenuItem><ActionMenuItem onClick={onMove}>Move folder</ActionMenuItem><ActionMenuItem danger onClick={onDelete}>Delete folder</ActionMenuItem></ActionMenu>}</article>
}

function FileListHeader() { return <div className="hidden grid-cols-[minmax(0,1fr)_6rem_7rem_2.5rem] items-center gap-3 px-4 py-2 text-xs font-medium text-[var(--text-muted)] sm:grid"><span>Name</span><span>Type</span><span>Modified</span><span>More</span></div> }
function fileRowClass() { return 'grid min-h-14 min-w-0 grid-cols-[minmax(0,1fr)_auto_2.5rem] items-center gap-3 border-b border-[var(--border)] px-3 py-2 text-sm last:border-b-0 hover:bg-[var(--accent-soft)] sm:grid-cols-[minmax(0,1fr)_6rem_7rem_2.5rem] sm:px-4' }
function AnswerRow({ answer, onOpen, onEdit, onPin, onFavourite, onDelete }: { answer: Answer; onOpen: () => void; onEdit: () => void; onPin: () => void; onFavourite: () => void; onDelete: () => void }) {
  return <div className={fileRowClass()}><button onClick={onOpen} title={answer.question} className="flex min-w-0 items-center gap-3 text-left"><FileText size={19} className="shrink-0 text-[var(--info)]" /><span className="flex min-w-0 items-center gap-1 truncate font-medium text-[var(--text-primary)]">{answer.isPinned && <Bookmark size={13} className="shrink-0 text-[var(--accent)]" fill="currentColor" />}<span className="truncate">{answer.question}</span></span></button><span className="text-xs text-[var(--text-secondary)]">Answer · {answer.subject}</span><span className="hidden truncate text-xs text-[var(--text-muted)] sm:block">{formatDate(answer.updatedAt ?? answer.createdAt)}</span><ActionMenu label={`More actions for ${answer.question}`}><ActionMenuItem onClick={onOpen}>Open answer</ActionMenuItem><ActionMenuItem onClick={onPin}><Bookmark size={15} />{answer.isPinned ? 'Unpin from folder' : 'Pin in folder'}</ActionMenuItem><ActionMenuItem onClick={onEdit}>Edit / move</ActionMenuItem><ActionMenuItem onClick={onFavourite}><Star size={15} />{answer.isFavourite ? 'Remove favourite' : 'Add to favourites'}</ActionMenuItem><ActionMenuItem danger onClick={onDelete}>Delete</ActionMenuItem></ActionMenu></div>
}

function NoteRow({ note, onOpen, onEdit, onPin, onFavourite, onDelete }: { note: Note; onOpen: () => void; onEdit: () => void; onPin: () => void; onFavourite: () => void; onDelete: () => void }) {
  return <div className={fileRowClass()}><button onClick={onOpen} title={note.title} className="flex min-w-0 items-center gap-3 text-left"><NotebookPen size={19} className="shrink-0 text-[var(--accent)]" /><span className="flex min-w-0 items-center gap-1 truncate font-medium text-[var(--text-primary)]">{note.isPinned && <Bookmark size={13} className="shrink-0 text-[var(--accent)]" fill="currentColor" />}{note.isFavourite && <Star size={13} className="shrink-0 text-[var(--warning)]" fill="currentColor" />}<span className="truncate">{note.title || 'Untitled note'}</span></span></button><span className="text-xs text-[var(--text-secondary)]">Note</span><span className="hidden truncate text-xs text-[var(--text-muted)] sm:block">{formatDate(note.updatedAt ?? note.createdAt)}</span><ActionMenu label={`More actions for ${note.title || 'Untitled note'}`}><ActionMenuItem onClick={onOpen}>Open note</ActionMenuItem><ActionMenuItem onClick={onPin}><Bookmark size={15} />{note.isPinned ? 'Unpin from folder' : 'Pin in folder'}</ActionMenuItem><ActionMenuItem onClick={onFavourite}><Star size={15} fill={note.isFavourite ? 'currentColor' : 'none'} />{note.isFavourite ? 'Remove favourite' : 'Add to favourites'}</ActionMenuItem><ActionMenuItem onClick={onEdit}>Edit / move</ActionMenuItem><ActionMenuItem danger onClick={onDelete}>Delete</ActionMenuItem></ActionMenu></div>
}

function formatDate(value: unknown) { const ms = toMillis(value); return ms ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(ms) : '—' }
function getBreadcrumb(id: string, folders: Folder[], rootLabel = 'My Drive') { const result: { id: string; label: string }[] = [{ id: 'root', label: rootLabel }]; let current = folders.find((folder) => folder.id === id); const seen = new Set<string>(); const path: Folder[] = []; while (current && !seen.has(current.id)) { seen.add(current.id); path.unshift(current); current = current.parentId ? folders.find((folder) => folder.id === current?.parentId) : undefined } return [...result, ...path.map((folder) => ({ id: folder.id, label: folder.name }))] }
function subtreeIds(id: string, folders: Folder[]) { const ids = new Set([id]); let didAdd = true; while (didAdd) { didAdd = false; for (const folder of folders) if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) { ids.add(folder.id); didAdd = true } } return ids }
function hasNoteInFolder(id: string, folders: Folder[], notes: Note[]) { const ids = subtreeIds(id, folders); return notes.some((note) => note.folderId && ids.has(note.folderId)) }
function isUnfiled(folderId: string | null | undefined, folders: Folder[]) { return !folderId || !folders.some((folder) => folder.id === folderId) }
function isDescendantOrSelf(id: string, parent: string, folders: Folder[]) { return subtreeIds(parent, folders).has(id) }
function countFolder(id: string, _folders: Folder[], answers: Answer[]) { return answers.filter((answer) => answer.folderId === id).length }
function toMillis(value: unknown): number { if (value instanceof Date) return value.getTime(); if (typeof value === 'string' || typeof value === 'number') return new Date(value).getTime() || 0; if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') return (value.toDate() as Date).getTime(); return 0 }
