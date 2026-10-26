import { ArrowUpRight } from 'lucide-react'
import type { Note } from '../models/note'
import { noteSearchText } from '../utils/noteDocument'

export function NoteCard({ note, onOpen }: { note: Note; onOpen: () => void }) {
  return <button onClick={onOpen} className="group flex min-h-44 flex-col rounded-2xl border border-[#e4dcf7] bg-white p-5 text-left shadow-sm shadow-[#6d4aff]/5 transition hover:-translate-y-0.5 hover:border-[#c8b9ff] hover:shadow-md dark:border-[#352d5c] dark:bg-[#1d1735] dark:shadow-none dark:hover:border-[#6252a0]">
    <span className="flex w-full items-start justify-between gap-3"><span className="min-w-0 break-words text-lg font-semibold leading-snug text-[#1b1534] dark:text-[#f4f1ff]">{note.title || 'Untitled note'}</span><ArrowUpRight size={17} className="mt-1 shrink-0 text-[#a69cce] opacity-0 transition group-hover:opacity-100" /></span>
    <span className="mt-3 line-clamp-8 w-full whitespace-pre-wrap break-words text-sm leading-6 text-[#4f4870] dark:text-[#c3bce0]">{noteSearchText(note.content) || 'No content yet.'}</span>
  </button>
}
