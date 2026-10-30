import { NotebookPen } from 'lucide-react'
import { ActionMenu, ActionMenuItem } from '../../../components/ui/ActionMenu'
import type { Note } from '../models/note'
import { NoteContent } from './NoteContent'

export function NoteCard({ note, onOpen, onEdit, onDelete, listView = false, location }: { note: Note; onOpen: () => void; onEdit: () => void; onDelete: () => void; listView?: boolean; location?: string }) {
  const modified = note.updatedAt ?? note.createdAt
  const modifiedLabel = toDate(modified)
  return <article className={`group relative min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left shadow-sm shadow-[var(--accent)]/5 transition hover:border-[var(--accent)] hover:shadow-md dark:border-[var(--border)] dark:bg-[var(--surface)] dark:shadow-none dark:hover:border-[var(--accent)] ${listView ? 'flex items-center gap-3 rounded-xl py-2.5 shadow-none' : 'flex min-h-48 flex-col'}`}>
    <div className="flex min-w-0 items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] dark:bg-[var(--surface)] dark:text-[var(--accent)]"><NotebookPen size={17} /></span><button onClick={onOpen} title={note.title || 'Untitled note'} className="min-w-0 flex-1 truncate pt-1 text-left font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] dark:text-[var(--text-primary)] dark:hover:text-[var(--accent)]">{note.title || 'Untitled note'}</button><ActionMenu label={`More actions for ${note.title || 'Untitled note'}`}><ActionMenuItem onClick={onOpen}>Open note</ActionMenuItem><ActionMenuItem onClick={onEdit}>Edit / move</ActionMenuItem><ActionMenuItem danger onClick={onDelete}>Delete note</ActionMenuItem></ActionMenu></div>
    {!listView && <><div className="note-preview mt-2 max-h-28 min-h-12 overflow-hidden text-sm leading-6 text-[var(--text-secondary)] dark:text-[var(--text-secondary)]"><NoteContent content={note.content || 'No content yet.'} /></div><div className="mt-auto flex min-w-0 items-center justify-between gap-2 pt-3 text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]"><span className="truncate">{location || 'Unfiled'}</span><span className="shrink-0">{modifiedLabel}</span></div></>}
    {listView && <span className="hidden min-w-0 flex-1 truncate text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)] sm:block">{location || 'Unfiled'}</span>}
    {listView && <span className="hidden shrink-0 text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)] md:block">{modifiedLabel}</span>}
  </article>
}

function toDate(value: unknown) { let date: Date | null = null; if (value instanceof Date) date = value; else if (typeof value === 'string' || typeof value === 'number') { const parsed = new Date(value); if (!Number.isNaN(parsed.getTime())) date = parsed } else if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') date = (value.toDate() as Date); return date ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date) : '—' }
