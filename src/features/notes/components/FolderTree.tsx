import { ChevronDown, ChevronRight, Folder as FolderIcon, Plus, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ActionMenu, ActionMenuItem } from '../../../components/ui/ActionMenu'
import type { Folder } from '../models/folder'

type Props = { folders: Folder[]; selected: string; notes: { folderId?: string | null }[]; onSelect: (id: string) => void; onCreate: (parentId: string | null) => void; onRename: (folder: Folder) => void; onMove: (folder: Folder) => void; onDelete: (folder: Folder) => void }
type Actions = Pick<Props, 'selected' | 'onSelect' | 'onCreate' | 'onRename' | 'onMove' | 'onDelete'> & { toggle: (id: string) => void; collapsed: Set<string>; matchesSearch: (folder: Folder) => boolean; count: (id: string) => number; search: string }

export function FolderTree({ folders, selected, notes, onSelect, onCreate, onRename, onMove, onDelete }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const toggle = (id: string) => setCollapsed((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next })
  const matchesSearch = (folder: Folder) => !search || folder.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())
  const count = (id: string | null) => notes.filter((note) => id === null ? !note.folderId : note.folderId === id || isDescendant(note.folderId, id, folders)).length
  const actions: Actions = { selected, onSelect, onCreate, onRename, onMove, onDelete, toggle, collapsed, matchesSearch, count, search }
  useEffect(() => {
    if (selected === 'all' || selected === 'unfiled') return
    setCollapsed((current) => { const next = new Set(current); let folder = folders.find((item) => item.id === selected); const visited = new Set<string>(); while (folder?.parentId && !visited.has(folder.id)) { next.delete(folder.parentId); visited.add(folder.id); folder = folders.find((item) => item.id === folder?.parentId) }; return next })
  }, [selected, folders])
  return <section className="flex h-[68vh] min-h-0 max-h-[68vh] flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 dark:border-[var(--border)] dark:bg-[var(--surface)] md:sticky md:top-24 md:h-[calc(100vh-8rem)] md:max-h-[calc(100vh-8rem)]">
    <header className="mb-2 flex min-h-9 items-center justify-between gap-1 px-1.5">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] dark:text-[var(--text-muted)]">Folders</h2>
      <div className="flex items-center gap-0.5">
        <button aria-label={searchOpen ? 'Close folder search' : 'Search folders'} className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--accent-soft)] dark:text-[var(--text-secondary)] dark:hover:bg-[var(--surface)]" onClick={() => { setSearchOpen((open) => !open); if (searchOpen) setSearch('') }}><Search size={15} /></button>
        <button aria-label="Create top-level folder" className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--accent-soft)] dark:text-[var(--text-secondary)] dark:hover:bg-[var(--surface)]" onClick={() => onCreate(null)}><Plus size={17} /></button>
      </div>
    </header>
    {searchOpen && <div className="relative mb-2"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" /><input autoFocus className="!h-8 !rounded-lg !py-1 !pl-8 !pr-8 !text-xs" placeholder="Search folders..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search folders" onKeyDown={(e) => { if (e.key === 'Escape') { setSearch(''); setSearchOpen(false) } }} /><button aria-label="Close folder search" className="absolute right-1 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-[var(--text-muted)] hover:bg-[var(--accent-soft)] dark:hover:bg-[var(--surface)]" onClick={() => { setSearch(''); setSearchOpen(false) }}><X size={13} /></button></div>}
    <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto" aria-label="Note folders">
      {(!search || 'all notes'.includes(search.toLocaleLowerCase())) && <SystemChoice label="All Notes" id="all" count={notes.length} selected={selected} onSelect={onSelect} />}
      {(!search || 'unfiled'.includes(search.toLocaleLowerCase())) && <SystemChoice label="Unfiled" id="unfiled" count={count(null)} selected={selected} onSelect={onSelect} />}
      {folderRows(null, folders, 0, actions)}
    </nav>
  </section>
}

function folderRows(parentId: string | null, folders: Folder[], depth: number, actions: Actions): React.ReactNode[] {
  const visible = folders.filter((folder) => (folder.parentId ?? null) === parentId && matchesTreeSearch(folder, folders, actions.matchesSearch)).sort((a, b) => a.name.localeCompare(b.name))
  return visible.flatMap((folder) => {
    const hasChildren = folders.some((child) => child.parentId === folder.id)
    return [<div key={folder.id} className={`group relative flex min-h-9 items-center rounded-lg pr-1 ${actions.selected === folder.id ? 'bg-[var(--accent-soft)] text-[var(--accent)] dark:bg-[var(--surface-elevated)] dark:text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--background)] dark:text-[var(--text-secondary)] dark:hover:bg-[var(--surface)]'}`} style={{ paddingLeft: `${0.4 + depth * 0.9}rem` }}>
      {hasChildren ? <button aria-label={`${actions.collapsed.has(folder.id) ? 'Expand' : 'Collapse'} ${folder.name}`} className="grid h-8 w-5 shrink-0 place-items-center" onClick={() => actions.toggle(folder.id)}>{actions.collapsed.has(folder.id) ? <ChevronRight size={14} /> : <ChevronDown size={14} />}</button> : <span className="w-5 shrink-0" />}
      <button className="flex min-h-9 min-w-0 flex-1 items-center gap-2 text-left text-sm" onClick={() => actions.onSelect(folder.id)}><FolderIcon size={15} className="shrink-0" /><span className="truncate">{folder.name}</span></button>
      <span className="px-1 text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">{actions.count(folder.id)}</span>
      <ActionMenu label={`Actions for ${folder.name}`} className="h-8 w-8"><ActionMenuItem onClick={() => actions.onCreate(folder.id)}>New subfolder</ActionMenuItem><ActionMenuItem onClick={() => actions.onRename(folder)}>Rename</ActionMenuItem><ActionMenuItem onClick={() => actions.onMove(folder)}>Move folder</ActionMenuItem><ActionMenuItem danger onClick={() => actions.onDelete(folder)}>Delete</ActionMenuItem></ActionMenu>
    </div>, ...(!actions.collapsed.has(folder.id) || Boolean(actions.search) ? folderRows(folder.id, folders, depth + 1, actions) : [])]
  })
}

function SystemChoice({ label, id, count, selected, onSelect }: { label: string; id: string; count: number; selected: string; onSelect: (id: string) => void }) {
  return <button onClick={() => onSelect(id)} className={`flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-sm ${selected === id ? 'bg-[var(--accent-soft)] font-semibold text-[var(--accent)] dark:bg-[var(--surface-elevated)] dark:text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--background)] dark:text-[var(--text-secondary)] dark:hover:bg-[var(--surface)]'}`}><FolderIcon size={15} /><span className="flex-1">{label}</span><span className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">{count}</span></button>
}

function matchesTreeSearch(folder: Folder, folders: Folder[], matches: (folder: Folder) => boolean): boolean { return matches(folder) || folders.some((child) => child.parentId === folder.id && matchesTreeSearch(child, folders, matches)) }
function isDescendant(folderId: string | null | undefined, parentId: string, folders: Folder[]): boolean {
  let folder = folders.find((item) => item.id === folderId); const visited = new Set<string>()
  while (folder?.parentId && !visited.has(folder.id)) { if (folder.parentId === parentId) return true; visited.add(folder.id); folder = folders.find((item) => item.id === folder?.parentId) }
  return false
}
