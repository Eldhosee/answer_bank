import type { Folder } from '../models/folder'
import { folderOptions } from './FolderDialog'

export function FolderSelector({ folders, value, onChange }: { folders: Folder[]; value: string | null; onChange: (id: string | null) => void }) {
  return <select className="!text-sm" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} aria-label="Folder"><option value="">📁 Unfiled</option>{folderOptions(folders).map((folder) => <option value={folder.id} key={folder.id}>{folder.label}</option>)}</select>
}
