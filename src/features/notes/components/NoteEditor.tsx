import { useRef } from 'react'
import type { NoteBlock } from '../utils/noteDocument'
import { NoteTable } from './NoteTable'
import { parseClipboardTable, parseClipboardTextTable } from '../utils/clipboardTableParser'

export function NoteEditor({ blocks, onChange }: { blocks: NoteBlock[]; onChange: (blocks: NoteBlock[]) => void }) {
  const fields = useRef(new Map<number, HTMLTextAreaElement>())
  const updateText = (index: number, text: string) => onChange(blocks.map((block, i) => i === index && block.type === 'text' ? { ...block, text } : block))
  const wrapSelection = (marker: string) => {
    const entry = [...fields.current.entries()].find(([, field]) => field === document.activeElement)
    if (!entry) return
    const [index, field] = entry
    const block = blocks[index]
    if (block?.type !== 'text') return
    const start = field.selectionStart, end = field.selectionEnd
    const selected = block.text.slice(start, end)
    const replacement = `${marker}${selected || 'text'}${marker}`
    updateText(index, `${block.text.slice(0, start)}${replacement}${block.text.slice(end)}`)
    requestAnimationFrame(() => { field.focus(); const cursor = start + marker.length; field.setSelectionRange(cursor, cursor + (selected ? selected.length : 4)) })
  }
  const paste = (event: React.ClipboardEvent<HTMLTextAreaElement>, index: number) => {
    const rows = parseClipboardTable(event.clipboardData.getData('text/html')) ?? parseClipboardTextTable(event.clipboardData.getData('text/plain'))
    if (!rows) return
    const block = blocks[index]
    if (block?.type !== 'text') return
    event.preventDefault()
    const start = event.currentTarget.selectionStart, end = event.currentTarget.selectionEnd
    const before = block.text.slice(0, start), after = block.text.slice(end)
    const inserted: NoteBlock[] = [...(before ? [{ type: 'text', text: before } as const] : []), { type: 'table', rows }, ...(after ? [{ type: 'text', text: after } as const] : [])]
    onChange([...blocks.slice(0, index), ...inserted, ...blocks.slice(index + 1)])
  }
  return <div className="space-y-3">
    {blocks.map((block, index) => block.type === 'table' ? <div key={`table-${index}`}><NoteTable block={block} editable onChange={(rows) => onChange(blocks.map((item, i) => i === index && item.type === 'table' ? { ...item, rows } : item))} /><button type="button" className="min-h-9 px-2 text-xs text-[#8a84a6] hover:text-[#b64d4d] dark:text-[#8f87b3]" onClick={() => onChange(blocks.filter((_, i) => i !== index))}>Remove table</button></div> : <div key={`text-${index}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-medium text-[#8a84a6] dark:text-[#8f87b3]">Text</span><div className="flex items-center gap-1" aria-label="Text formatting"><FormatButton title="Bold" onClick={() => wrapSelection('**')}><strong>B</strong></FormatButton><FormatButton title="Italic" onClick={() => wrapSelection('*')}><em>I</em></FormatButton><FormatButton title="Underline" onClick={() => wrapSelection('__')}><u>U</u></FormatButton><FormatButton title="Highlight" onClick={() => wrapSelection('==')}>Highlight</FormatButton></div></div>
      <p className="mb-2 text-xs text-[#8a84a6] dark:text-[#8f87b3]">Type **bold**, *italic*, __underline__, ==highlight==, &gt; callout, - bullet or 1. numbered list.</p>
      <textarea ref={(node) => { if (node) fields.current.set(index, node); else fields.current.delete(index) }} aria-label="Note text" className="!min-h-[28vh] !bg-[#fbf9ff] !text-[15px] !leading-7 dark:!bg-[#272046]" value={block.text} onChange={(e) => updateText(index, e.target.value)} onPaste={(e) => paste(e, index)} placeholder="Write or paste your study note here..." />
    </div>)}
    <button type="button" className="min-h-10 rounded-lg px-3 text-sm font-medium text-[#6d4aff] hover:bg-[#f3efff] dark:text-[#b8a6ff] dark:hover:bg-[#272046]" onClick={() => onChange([...blocks, { type: 'text', text: '' }])}>+ Add text</button>
  </div>
}

function FormatButton({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" title={title} aria-label={title} onMouseDown={(e) => e.preventDefault()} onClick={onClick} className="min-h-8 rounded-lg border border-[#e4dcf7] bg-white px-2.5 text-xs text-[#4f4870] hover:bg-[#f8f5ff] dark:border-[#352d5c] dark:bg-[#272046] dark:text-[#c3bce0] dark:hover:bg-[#2f2658]">{children}</button>
}
