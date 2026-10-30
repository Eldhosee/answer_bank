import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import type { Folder } from '../models/folder'

export type FolderDialogState =
  | { mode: 'create'; parentId: string | null }
  | { mode: 'rename'; folder: Folder }
  | { mode: 'move'; folder: Folder }
  | { mode: 'delete'; folder: Folder; noteCount: number; childCount: number }

type Props = { state: FolderDialogState; folders: Folder[]; onClose: () => void; onCreate: (name: string, parentId: string | null) => Promise<void>; onRename: (folder: Folder, name: string) => Promise<void>; onMove: (folder: Folder, parentId: string | null) => Promise<void>; onDelete: (folder: Folder, moveTo: string | null) => Promise<void> }

export function FolderDialog({ state, folders, onClose, onCreate, onRename, onMove, onDelete }: Props) {
  const [name, setName] = useState(state.mode === 'rename' || state.mode === 'move' ? state.folder.name : '')
  const [parentId, setParentId] = useState(state.mode === 'create' ? state.parentId ?? '' : state.mode === 'move' ? state.folder.parentId ?? '' : '')
  const [moveTo, setMoveTo] = useState('unfiled')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    setSaving(true); setError('')
    try {
      if (state.mode === 'create') { if (!name.trim()) { setError('Enter a folder name.'); return }; await onCreate(name.trim(), parentId || null) }
      else if (state.mode === 'rename') { if (!name.trim()) { setError('Folder name cannot be empty.'); return }; await onRename(state.folder, name.trim()) }
      else if (state.mode === 'move') await onMove(state.folder, parentId || null)
      else await onDelete(state.folder, moveTo === 'unfiled' ? null : moveTo || null)
      onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update folder.') }
    finally { setSaving(false) }
  }
  const title = state.mode === 'create' ? (state.parentId ? 'Create Subfolder' : 'Create Folder') : state.mode === 'rename' ? 'Rename Folder' : state.mode === 'move' ? `Move “${state.folder.name}”` : `Delete “${state.folder.name}”?`
  const excluded = state.mode === 'move' ? folderSubtree(state.folder.id, folders) : new Set<string>()
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-[var(--overlay)]/60 p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}><section role="dialog" aria-modal="true" aria-labelledby="folder-dialog-title" className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl dark:border-[var(--border)] dark:bg-[var(--surface)] sm:p-6">
    <div className="mb-5 flex items-center justify-between gap-3"><h2 id="folder-dialog-title" className="text-lg font-semibold">{title}</h2><button type="button" aria-label="Close" className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--accent-soft)] dark:text-[var(--text-muted)] dark:hover:bg-[var(--surface)]" onClick={onClose}>×</button></div>
    {state.mode === 'create' || state.mode === 'rename' ? <div className="space-y-4"><label className="block text-sm font-medium">Folder name<input autoFocus className="mt-2" value={name} onChange={(e) => setName(e.target.value)} placeholder={state.mode === 'create' ? 'e.g. Agriculture' : ''} onKeyDown={(e) => { if (e.key === 'Enter') void submit() }} /></label>{state.mode === 'create' && <label className="block text-sm font-medium">Parent folder<select className="mt-2" value={parentId} onChange={(e) => setParentId(e.target.value)}><option value="">No parent (top-level folder)</option>{folderOptions(folders).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}</div> : state.mode === 'move' ? <label className="block text-sm font-medium">Move to<select className="mt-2" value={parentId} onChange={(e) => setParentId(e.target.value)}><option value="">My Drive (top level)</option>{folderOptions(folders).filter((item) => !excluded.has(item.id)).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label> : <div className="space-y-4 text-sm"><p className="text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">This folder contains {state.noteCount} file{state.noteCount === 1 ? '' : 's'} and {state.childCount} subfolder{state.childCount === 1 ? '' : 's'}. Its files will be kept.</p><fieldset className="space-y-2"><legend className="mb-2 font-medium">Move files in this folder and its subfolders to:</legend><label className="flex min-h-10 items-center gap-2"><input className="!h-4 !w-4 !shrink-0 !p-0" type="radio" name="move-to" checked={moveTo === 'unfiled'} onChange={() => setMoveTo('unfiled')} />Unfiled</label>{state.folder.parentId && <label className="flex min-h-10 items-center gap-2"><input className="!h-4 !w-4 !shrink-0 !p-0" type="radio" name="move-to" checked={moveTo === state.folder.parentId} onChange={() => setMoveTo(state.folder.parentId!)} />Parent folder: {folders.find((folder) => folder.id === state.folder.parentId)?.name ?? 'parent folder'}</label>}</fieldset><p className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">Deleting also removes its subfolders.</p></div>}
    {error && <p role="alert" className="mt-4 text-sm text-[var(--danger)] dark:text-[var(--danger)]">{error}</p>}
    <div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="button" variant={state.mode === 'delete' ? 'danger' : 'primary'} disabled={saving} onClick={() => void submit()}>{saving ? 'Saving...' : state.mode === 'delete' ? 'Delete Folder' : state.mode === 'move' ? 'Move Folder' : state.mode === 'rename' ? 'Save' : 'Create'}</Button></div>
  </section></div>
}

function folderSubtree(id: string, folders: Folder[]) { const ids = new Set([id]); let changed = true; while (changed) { changed = false; for (const folder of folders) if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) { ids.add(folder.id); changed = true } } return ids }

export function folderOptions(folders: Folder[], parentId: string | null = null, depth = 0, visited = new Set<string>()): { id: string; label: string }[] {
  return folders.filter((folder) => (folder.parentId ?? null) === parentId && !visited.has(folder.id)).sort((a, b) => a.name.localeCompare(b.name)).flatMap((folder) => {
    const nextVisited = new Set(visited).add(folder.id)
    return [{ id: folder.id, label: `${'　'.repeat(depth)}📁 ${folder.name}` }, ...folderOptions(folders, folder.id, depth + 1, nextVisited)]
  })
}
