import { useMemo, useState } from 'react'
import type { TableBlock } from '../utils/noteDocument'
import { tableToHtml, tableToPlainText } from '../utils/clipboardTableParser'

type Props = { block: TableBlock; editable?: boolean; onChange?: (rows: string[][]) => void }

export function NoteTable({ block, editable = false, onChange }: Props) {
  const [message, setMessage] = useState('')
  const widths = useMemo(() => columnWidths(block.rows), [block.rows])
  const updateCell = (rowIndex: number, columnIndex: number, value: string) => onChange?.(block.rows.map((row, r) => row.map((cell, c) => r === rowIndex && c === columnIndex ? value : cell)))
  const copy = (event: React.ClipboardEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(window.getSelection()?.anchorNode ?? null)) return
    event.clipboardData.setData('text/html', tableToHtml(block.rows))
    event.clipboardData.setData('text/plain', tableToPlainText(block.rows))
    event.preventDefault()
    setMessage('Table copied')
    window.setTimeout(() => setMessage(''), 1500)
  }
  const [header, ...body] = block.rows
  return <div className="my-3 w-full max-w-full overflow-hidden rounded-xl border border-[#e4dcf7] dark:border-[#352d5c]" onCopy={copy}>
    <table className="w-full border-collapse text-left text-sm" style={{ tableLayout: 'fixed' }}><colgroup>{widths.map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}</colgroup>
      <thead><tr className="bg-[#f3efff] font-semibold dark:bg-[#2f2658]">{(header ?? []).map((cell, c) => <th scope="col" key={c} className="border-b border-r border-[#e4dcf7] px-2 py-2.5 align-top last:border-r-0 dark:border-[#352d5c] sm:px-3">{editable ? <CellEditor value={cell} onChange={(value) => updateCell(0, c, value)} /> : <CellPreview value={cell} />}</th>)}</tr></thead>
      <tbody>{body.map((row, index) => { const r = index + 1; return <tr key={r} className="bg-white dark:bg-[#1d1735]">{row.map((cell, c) => <td key={c} className="border-b border-r border-[#e4dcf7] px-2 py-2.5 align-top last:border-r-0 dark:border-[#352d5c] sm:px-3"><CellEditor value={cell} editable={editable} onChange={(value) => updateCell(r, c, value)} /></td>)}</tr> })}</tbody>
    </table>
    {message && <span className="sr-only" aria-live="polite">{message}</span>}
    {editable && <div className="flex flex-wrap gap-1.5 border-t border-[#e4dcf7] bg-[#fbf9ff] p-2 dark:border-[#352d5c] dark:bg-[#272046]">
      <TableAction onClick={() => onChange?.([...block.rows, Array(block.rows[0]?.length ?? 1).fill('')])}>+ Row</TableAction><TableAction onClick={() => onChange?.(block.rows.map((row) => [...row, '']))}>+ Column</TableAction>
      <TableAction disabled={block.rows.length <= 1} onClick={() => onChange?.(block.rows.slice(0, -1))}>− Last row</TableAction><TableAction disabled={(block.rows[0]?.length ?? 0) <= 1} onClick={() => onChange?.(block.rows.map((row) => row.slice(0, -1)))}>− Last column</TableAction>
    </div>}
  </div>
}

function columnWidths(rows: string[][]): number[] {
  const count = Math.max(1, ...rows.map((row) => row.length))
  const min = Math.min(12, 75 / count)
  const remaining = Math.max(0, 100 - min * count)
  const weights = Array.from({ length: count }, (_, column) => Math.max(12, ...rows.map((row) => Math.min(80, row[column]?.length ?? 0))))
  const total = weights.reduce((sum, value) => sum + value, 0)
  return weights.map((weight) => min + remaining * weight / total)
}

function CellEditor({ value, editable = false, onChange }: { value: string; editable?: boolean; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const long = value.length > 180
  if (!long && editable) return <input aria-label="Table cell" className="table-cell-input" value={value} onChange={(e) => onChange(e.target.value)} />
  return <>
    <div className={long ? 'table-cell-preview table-cell-preview-clamped' : 'table-cell-preview'}>{value}</div>
    {long && <button type="button" className="mt-1 min-h-8 rounded px-1 text-xs font-semibold text-[#6d4aff] hover:underline dark:text-[#b8a6ff]" onClick={() => setOpen(true)}>{editable ? 'View / edit more' : 'View more'}</button>}
    {open && <div className="fixed inset-0 z-[70] grid place-items-center bg-[#130f24]/60 p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false) }}><section role="dialog" aria-modal="true" aria-label="Full table cell content" className="w-full max-w-2xl rounded-2xl border border-[#e4dcf7] bg-white p-5 shadow-2xl dark:border-[#352d5c] dark:bg-[#1d1735] sm:p-6"><h2 className="mb-3 text-lg font-semibold">Cell content</h2>{editable ? <textarea autoFocus className="!max-h-[60vh] !min-h-56 !bg-[#fbf9ff] dark:!bg-[#272046]" value={value} onChange={(e) => onChange(e.target.value)} /> : <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-6">{value}</div>}<div className="mt-4 flex justify-end"><button type="button" className="min-h-10 rounded-xl bg-[#6d4aff] px-4 text-sm font-semibold text-white hover:bg-[#5530e6] dark:bg-[#9d85ff] dark:text-[#130f24]" onClick={() => setOpen(false)}>Done</button></div></section></div>}
  </>
}

function CellPreview({ value }: { value: string }) { return <CellEditor value={value} onChange={() => undefined} /> }

function TableAction({ children, onClick, disabled = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="min-h-9 rounded-lg px-2.5 text-xs font-medium text-[#4f4870] hover:bg-[#ece6ff] disabled:opacity-40 dark:text-[#c3bce0] dark:hover:bg-[#352d5c]">{children}</button>
}
