import { ChevronDown, ChevronRight, Ellipsis, Folder as FolderIcon, Plus, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Folder } from '../models/folder'

type Props = { folders: Folder[]; selected: string; notes: { folderId?: string | null }[]; onSelect: (id: string) => void; onCreate: (parentId: string | null) => void; onRename: (folder: Folder) => void; onDelete: (folder: Folder) => void }
type Actions = Pick<Props, 'selected' | 'onSelect' | 'onCreate' | 'onRename' | 'onDelete'> & { toggle: (id: string) => void; collapsed: Set<string>; menu: string | null; setMenu: (id: string | null) => void; matchesSearch: (folder: Folder) => boolean; count: (id: string) => number; search: string }

export function FolderTree({ folders, selected, notes, onSelect, onCreate, onRename, onDelete }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [menu, setMenu] = useState<string | null>(null)
  const toggle = (id: string) => setCollapsed((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next })
  const matchesSearch = (folder: Folder) => !search || folder.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())
  const count = (id: string | null) => notes.filter((note) => id === null ? !note.folderId : note.folderId === id || isDescendant(note.folderId, id, folders)).length
  const actions: Actions = { selected, onSelect, onCreate, onRename, onDelete, toggle, collapsed, menu, setMenu, matchesSearch, count, search }
  useEffect(() => {
    if (selected === 'all' || selected === 'unfiled') return
    setCollapsed((current) => { const next = new Set(current); let folder = folders.find((item) => item.id === selected); const visited = new Set<string>(); while (folder?.parentId && !visited.has(folder.id)) { next.delete(folder.parentId); visited.add(folder.id); folder = folders.find((item) => item.id === folder?.parentId) }; return next })
  }, [selected, folders])
  return <section className="flex h-[68vh] min-h-0 max-h-[68vh] flex-col rounded-xl border border-[#e4dcf7] bg-white p-2.5 dark:border-[#352d5c] dark:bg-[#1d1735] md:sticky md:top-24 md:h-[calc(100vh-8rem)] md:max-h-[calc(100vh-8rem)]">
    <header className="mb-2 flex min-h-9 items-center justify-between gap-1 px-1.5">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a84a6] dark:text-[#8f87b3]">Folders</h2>
      <div className="flex items-center gap-0.5">
        <button aria-label={searchOpen ? 'Close folder search' : 'Search folders'} className="grid h-8 w-8 place-items-center rounded-lg text-[#8a84a6] hover:bg-[#f3efff] dark:text-[#aaa1cf] dark:hover:bg-[#272046]" onClick={() => { setSearchOpen((open) => !open); if (searchOpen) setSearch('') }}><Search size={15} /></button>
        <button aria-label="Create top-level folder" className="grid h-8 w-8 place-items-center rounded-lg text-[#8a84a6] hover:bg-[#f3efff] dark:text-[#aaa1cf] dark:hover:bg-[#272046]" onClick={() => onCreate(null)}><Plus size={17} /></button>
      </div>
    </header>
    {searchOpen && <div className="relative mb-2"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8a84a6]" /><input autoFocus className="!h-8 !rounded-lg !py-1 !pl-8 !pr-8 !text-xs" placeholder="Search folders..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search folders" onKeyDown={(e) => { if (e.key === 'Escape') { setSearch(''); setSearchOpen(false) } }} /><button aria-label="Close folder search" className="absolute right-1 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-[#8a84a6] hover:bg-[#f3efff] dark:hover:bg-[#272046]" onClick={() => { setSearch(''); setSearchOpen(false) }}><X size={13} /></button></div>}
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
    return [<div key={folder.id} className={`group relative flex min-h-9 items-center rounded-lg pr-1 ${actions.selected === folder.id ? 'bg-[#ece6ff] text-[#5530e6] dark:bg-[#2f2658] dark:text-[#b8a6ff]' : 'text-[#4f4870] hover:bg-[#f8f5ff] dark:text-[#c3bce0] dark:hover:bg-[#272046]'}`} style={{ paddingLeft: `${0.4 + depth * 0.9}rem` }}>
      {hasChildren ? <button aria-label={`${actions.collapsed.has(folder.id) ? 'Expand' : 'Collapse'} ${folder.name}`} className="grid h-8 w-5 shrink-0 place-items-center" onClick={() => actions.toggle(folder.id)}>{actions.collapsed.has(folder.id) ? <ChevronRight size={14} /> : <ChevronDown size={14} />}</button> : <span className="w-5 shrink-0" />}
      <button className="flex min-h-9 min-w-0 flex-1 items-center gap-2 text-left text-sm" onClick={() => actions.onSelect(folder.id)}><FolderIcon size={15} className="shrink-0" /><span className="truncate">{folder.name}</span></button>
      <span className="px-1 text-xs text-[#8a84a6] dark:text-[#8f87b3]">{actions.count(folder.id)}</span>
      <button aria-label={`Actions for ${folder.name}`} className="grid min-h-8 w-8 place-items-center rounded-lg opacity-70 hover:bg-[#ece6ff] md:opacity-0 md:group-hover:opacity-100 focus:opacity-100" onClick={() => actions.setMenu(actions.menu === folder.id ? null : folder.id)}><Ellipsis size={16} /></button>
      {actions.menu === folder.id && <div className="absolute right-1 top-8 z-20 w-40 rounded-xl border border-[#e4dcf7] bg-white p-1 shadow-lg dark:border-[#352d5c] dark:bg-[#272046]"><MenuButton onClick={() => { actions.onCreate(folder.id); actions.setMenu(null) }}>New Subfolder</MenuButton><MenuButton onClick={() => { actions.onRename(folder); actions.setMenu(null) }}>Rename</MenuButton><MenuButton danger onClick={() => { actions.onDelete(folder); actions.setMenu(null) }}>Delete</MenuButton></div>}
    </div>, ...(!actions.collapsed.has(folder.id) || Boolean(actions.search) ? folderRows(folder.id, folders, depth + 1, actions) : [])]
  })
}

function SystemChoice({ label, id, count, selected, onSelect }: { label: string; id: string; count: number; selected: string; onSelect: (id: string) => void }) {
  return <button onClick={() => onSelect(id)} className={`flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-sm ${selected === id ? 'bg-[#ece6ff] font-semibold text-[#5530e6] dark:bg-[#2f2658] dark:text-[#b8a6ff]' : 'text-[#4f4870] hover:bg-[#f8f5ff] dark:text-[#c3bce0] dark:hover:bg-[#272046]'}`}><FolderIcon size={15} /><span className="flex-1">{label}</span><span className="text-xs text-[#8a84a6] dark:text-[#8f87b3]">{count}</span></button>
}

function matchesTreeSearch(folder: Folder, folders: Folder[], matches: (folder: Folder) => boolean): boolean { return matches(folder) || folders.some((child) => child.parentId === folder.id && matchesTreeSearch(child, folders, matches)) }
function isDescendant(folderId: string | null | undefined, parentId: string, folders: Folder[]): boolean {
  let folder = folders.find((item) => item.id === folderId); const visited = new Set<string>()
  while (folder?.parentId && !visited.has(folder.id)) { if (folder.parentId === parentId) return true; visited.add(folder.id); folder = folders.find((item) => item.id === folder?.parentId) }
  return false
}
function MenuButton({ children, onClick, danger = false }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) { return <button className={`min-h-9 w-full rounded-lg px-2.5 text-left text-xs hover:bg-[#f3efff] dark:hover:bg-[#352d5c] ${danger ? 'text-[#b64d4d] dark:text-[#ff7a8c]' : 'text-[#4f4870] dark:text-[#c3bce0]'}`} onClick={onClick}>{children}</button> }
