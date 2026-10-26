import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import type { Folder } from '../models/folder'

export type FolderDialogState =
  | { mode: 'create'; parentId: string | null }
  | { mode: 'rename'; folder: Folder }
  | { mode: 'delete'; folder: Folder; noteCount: number; childCount: number }

type Props = { state: FolderDialogState; folders: Folder[]; onClose: () => void; onCreate: (name: string, parentId: string | null) => Promise<void>; onRename: (folder: Folder, name: string) => Promise<void>; onDelete: (folder: Folder, moveTo: string | null) => Promise<void> }

export function FolderDialog({ state, folders, onClose, onCreate, onRename, onDelete }: Props) {
  const [name, setName] = useState(state.mode === 'rename' ? state.folder.name : '')
  const [parentId, setParentId] = useState(state.mode === 'create' ? state.parentId ?? '' : '')
  const [moveTo, setMoveTo] = useState('unfiled')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    setSaving(true); setError('')
    try {
      if (state.mode === 'create') { if (!name.trim()) { setError('Enter a folder name.'); return }; await onCreate(name.trim(), parentId || null) }
      else if (state.mode === 'rename') { if (!name.trim()) { setError('Folder name cannot be empty.'); return }; await onRename(state.folder, name.trim()) }
      else await onDelete(state.folder, moveTo === 'unfiled' ? null : moveTo || null)
      onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update folder.') }
    finally { setSaving(false) }
  }
  const title = state.mode === 'create' ? (state.parentId ? 'Create Subfolder' : 'Create Folder') : state.mode === 'rename' ? 'Rename Folder' : `Delete “${state.folder.name}”?`
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-[#130f24]/60 p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}><section role="dialog" aria-modal="true" aria-labelledby="folder-dialog-title" className="w-full max-w-md rounded-2xl border border-[#e4dcf7] bg-white p-5 shadow-2xl dark:border-[#352d5c] dark:bg-[#1d1735] sm:p-6">
    <div className="mb-5 flex items-center justify-between gap-3"><h2 id="folder-dialog-title" className="text-lg font-semibold">{title}</h2><button type="button" aria-label="Close" className="rounded-lg p-2 text-[#8a84a6] hover:bg-[#f3efff] dark:text-[#8f87b3] dark:hover:bg-[#272046]" onClick={onClose}>×</button></div>
    {state.mode !== 'delete' ? <div className="space-y-4"><label className="block text-sm font-medium">Folder name<input autoFocus className="mt-2" value={name} onChange={(e) => setName(e.target.value)} placeholder={state.mode === 'create' ? 'e.g. Agriculture' : ''} onKeyDown={(e) => { if (e.key === 'Enter') void submit() }} /></label>{state.mode === 'create' && <label className="block text-sm font-medium">Parent folder<select className="mt-2" value={parentId} onChange={(e) => setParentId(e.target.value)}><option value="">No parent (top-level folder)</option>{folderOptions(folders).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}</div> : <div className="space-y-4 text-sm"><p className="text-[#4f4870] dark:text-[#c3bce0]">This folder contains {state.noteCount} note{state.noteCount === 1 ? '' : 's'} and {state.childCount} subfolder{state.childCount === 1 ? '' : 's'}. Notes will be kept.</p><fieldset className="space-y-2"><legend className="mb-2 font-medium">Move notes in this folder and its subfolders to:</legend><label className="flex min-h-10 items-center gap-2"><input className="!h-4 !w-4 !shrink-0 !p-0" type="radio" name="move-to" checked={moveTo === 'unfiled'} onChange={() => setMoveTo('unfiled')} />Unfiled (recommended)</label>{state.folder.parentId && <label className="flex min-h-10 items-center gap-2"><input className="!h-4 !w-4 !shrink-0 !p-0" type="radio" name="move-to" checked={moveTo === state.folder.parentId} onChange={() => setMoveTo(state.folder.parentId!)} />Parent folder: {folders.find((folder) => folder.id === state.folder.parentId)?.name ?? 'parent folder'}</label>}</fieldset><p className="text-xs text-[#8a84a6] dark:text-[#8f87b3]">Deleting also removes its subfolders.</p></div>}
    {error && <p role="alert" className="mt-4 text-sm text-[#b64d4d] dark:text-[#ff7a8c]">{error}</p>}
    <div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="button" variant={state.mode === 'delete' ? 'danger' : 'primary'} disabled={saving} onClick={() => void submit()}>{saving ? 'Saving...' : state.mode === 'delete' ? 'Delete Folder' : state.mode === 'rename' ? 'Save' : 'Create'}</Button></div>
  </section></div>
}

export function folderOptions(folders: Folder[], parentId: string | null = null, depth = 0, visited = new Set<string>()): { id: string; label: string }[] {
  return folders.filter((folder) => (folder.parentId ?? null) === parentId && !visited.has(folder.id)).sort((a, b) => a.name.localeCompare(b.name)).flatMap((folder) => {
    const nextVisited = new Set(visited).add(folder.id)
    return [{ id: folder.id, label: `${'　'.repeat(depth)}📁 ${folder.name}` }, ...folderOptions(folders, folder.id, depth + 1, nextVisited)]
  })
}
