import { useEffect, useRef } from 'react'
import { AlignCenter, AlignLeft, AlignRight, Bold, Heading1, Heading2, Heading3, Highlighter, Italic, Link, List, ListOrdered, Redo2, SeparatorHorizontal, Table2, Underline, Undo2, Quote } from 'lucide-react'
import { hasRichFormatting, markdownToNoteHtml, plainTextToNoteHtml, sanitizeNoteHtml } from '../utils/richNoteHtml'

type Props = { html: string; onChange: (html: string) => void }

export function NoteEditor({ html, onChange }: Props) {
  const editor = useRef<HTMLDivElement>(null)
  const lastExternalHtml = useRef('')
  const tableSelection = useRef<{ tableIndex: number; rowIndex: number; columnIndex: number } | null>(null)

  useEffect(() => {
    const clean = sanitizeNoteHtml(html)
    if (editor.current && clean !== lastExternalHtml.current) editor.current.innerHTML = clean
    lastExternalHtml.current = clean
  }, [html])

  const publish = () => {
    if (!editor.current) return
    const clean = sanitizeNoteHtml(editor.current.innerHTML)
    if (clean !== editor.current.innerHTML) editor.current.innerHTML = clean
    lastExternalHtml.current = clean
    onChange(clean)
  }

  const command = (name: string, value?: string) => {
    editor.current?.focus()
    document.execCommand(name, false, value)
    publish()
  }

  const setBlock = (tag: string) => command('formatBlock', tag)

  const insertLink = () => {
    const url = window.prompt('Enter a link (https:// or mailto:)')
    if (!url) return
    if (!/^(https?:\/\/|mailto:)/i.test(url.trim())) { window.alert('Use a link beginning with https:// or mailto:.'); return }
    command('createLink', url.trim())
  }

  const insertTable = () => command('insertHTML', '<table><thead><tr><th>Heading 1</th><th>Heading 2</th><th>Heading 3</th></tr></thead><tbody><tr><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td></tr></tbody></table><p><br></p>')

  const rememberTableSelection = () => {
    const anchor = window.getSelection()?.anchorNode
    const element = anchor instanceof Element ? anchor : anchor?.parentElement
    const cell = element?.closest('td,th') as HTMLTableCellElement | null
    const table = cell?.closest('table')
    if (!editor.current || !cell || !table || !editor.current.contains(table)) return
    tableSelection.current = {
      tableIndex: [...editor.current.querySelectorAll('table')].indexOf(table),
      rowIndex: [...table.rows].indexOf(cell.parentElement as HTMLTableRowElement),
      columnIndex: cell.cellIndex,
    }
  }

  const changeTable = (action: 'add-row' | 'remove-row' | 'add-column' | 'remove-column') => {
    const selection = window.getSelection()
    const anchor = selection?.anchorNode
    const element = anchor instanceof Element ? anchor : anchor?.parentElement
    let cell = element?.closest('td,th') as HTMLTableCellElement | null
    let table = cell?.closest('table')
    if ((!cell || !table || !editor.current?.contains(table)) && editor.current && tableSelection.current) {
      const previous = tableSelection.current
      table = editor.current.querySelectorAll('table')[previous.tableIndex] ?? null
      cell = table?.rows[previous.rowIndex]?.cells[previous.columnIndex] ?? null
    }
    if (!cell || !table) { editor.current?.focus(); return }
    const row = cell.parentElement as HTMLTableRowElement
    const columnIndex = cell.cellIndex
    const tableIndex = [...(editor.current?.querySelectorAll('table') ?? [])].indexOf(table)
    const rowIndex = [...table.rows].indexOf(row)
    if (action === 'add-row') {
      const body = table.tBodies[0] ?? table.createTBody()
      const added = body.insertRow()
      for (let column = 0; column < Math.max(1, row.cells.length); column++) {
        const newCell = added.insertCell()
        newCell.innerHTML = '<br>'
      }
    } else if (action === 'remove-row') {
      if (row.parentElement?.tagName.toLowerCase() === 'tbody' && table.tBodies[0].rows.length > 1) row.remove()
    } else if (action === 'add-column') {
      for (const tableRow of [...table.rows]) {
        const newCell = tableRow.insertCell(columnIndex + 1)
        if (tableRow.parentElement?.tagName.toLowerCase() === 'thead') newCell.outerHTML = '<th><br></th>'
        else newCell.innerHTML = '<br>'
      }
    } else if (action === 'remove-column' && (table.rows[0]?.cells.length ?? 0) > 1) {
      for (const tableRow of [...table.rows]) tableRow.cells[columnIndex]?.remove()
    }
    tableSelection.current = {
      tableIndex,
      rowIndex: action === 'add-row' ? Math.min(rowIndex, table.rows.length - 1) : action === 'remove-row' ? Math.min(rowIndex, table.rows.length - 1) : rowIndex,
      columnIndex: action === 'add-column' ? columnIndex + 1 : action === 'remove-column' ? Math.max(0, columnIndex - 1) : columnIndex,
    }
    publish()
    editor.current?.focus()
  }

  const paste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault()
    const htmlClipboard = event.clipboardData.getData('text/html')
    const text = event.clipboardData.getData('text/plain')
    let insertion = ''
    if (htmlClipboard && hasRichFormatting(htmlClipboard)) insertion = sanitizeNoteHtml(htmlClipboard)
    else if (text && looksLikeMarkdown(text)) insertion = markdownToNoteHtml(text)
    else if (htmlClipboard) insertion = sanitizeNoteHtml(htmlClipboard)
    else insertion = plainTextToNoteHtml(text)
    document.execCommand('insertHTML', false, insertion)
    publish()
  }

  return <section className="space-y-2" aria-label="Rich text note editor">
    <div className="flex flex-wrap items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--accent-soft)] p-2 dark:border-[var(--border)] dark:bg-[var(--surface)]" role="toolbar" aria-label="Note formatting">
      <Tool title="Heading 1" onClick={() => setBlock('h1')}><Heading1 size={16} /></Tool>
      <Tool title="Heading 2" onClick={() => setBlock('h2')}><Heading2 size={16} /></Tool>
      <Tool title="Heading 3" onClick={() => setBlock('h3')}><Heading3 size={16} /></Tool>
      <span className="mx-1 h-6 w-px bg-[var(--border)] dark:bg-[var(--border)]" />
      <Tool title="Bold" onClick={() => command('bold')}><Bold size={16} /></Tool>
      <Tool title="Italic" onClick={() => command('italic')}><Italic size={16} /></Tool>
      <Tool title="Underline" onClick={() => command('underline')}><Underline size={16} /></Tool>
      <Tool title="Highlight" onClick={() => command('hiliteColor', getComputedStyle(document.documentElement).getPropertyValue('--highlight-fact').trim())}><Highlighter size={16} /></Tool>
      <span className="mx-1 h-6 w-px bg-[var(--border)] dark:bg-[var(--border)]" />
      <Tool title="Bulleted list" onClick={() => command('insertUnorderedList')}><List size={16} /></Tool>
      <Tool title="Numbered list" onClick={() => command('insertOrderedList')}><ListOrdered size={16} /></Tool>
      <Tool title="Blockquote" onClick={() => setBlock('blockquote')}><Quote size={16} /></Tool>
      <Tool title="Horizontal line" onClick={() => command('insertHorizontalRule')}><SeparatorHorizontal size={16} /></Tool>
      <Tool title="Insert table" onClick={insertTable}><Table2 size={16} /></Tool>
      <Tool title="Add table row" onClick={() => changeTable('add-row')}>+R</Tool>
      <Tool title="Remove table row" onClick={() => changeTable('remove-row')}>−R</Tool>
      <Tool title="Add table column" onClick={() => changeTable('add-column')}>+C</Tool>
      <Tool title="Remove table column" onClick={() => changeTable('remove-column')}>−C</Tool>
      <Tool title="Insert link" onClick={insertLink}><Link size={16} /></Tool>
      <Tool title="Align left" onClick={() => command('justifyLeft')}><AlignLeft size={16} /></Tool>
      <Tool title="Align center" onClick={() => command('justifyCenter')}><AlignCenter size={16} /></Tool>
      <Tool title="Align right" onClick={() => command('justifyRight')}><AlignRight size={16} /></Tool>
      <span className="mx-1 h-6 w-px bg-[var(--border)] dark:bg-[var(--border)]" />
      <Tool title="Undo" onClick={() => command('undo')}><Undo2 size={16} /></Tool>
      <Tool title="Redo" onClick={() => command('redo')}><Redo2 size={16} /></Tool>
    </div>
    <div
      ref={editor}
      aria-label="Note content"
      aria-multiline="true"
      contentEditable
      suppressContentEditableWarning
      className="note-editor min-h-[45vh] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-[15px] leading-7 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 dark:border-[var(--border)] dark:bg-[var(--surface)] dark:text-[var(--text-primary)] sm:px-6"
      data-placeholder="Write or paste your study note here..."
      onInput={publish}
      onMouseUp={rememberTableSelection}
      onKeyUp={rememberTableSelection}
      onPaste={paste}
    />
    <p className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">Paste rich text, Markdown, or plain text. Markdown headings, lists, and tables are formatted automatically.</p>
  </section>
}

function Tool({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" title={title} aria-label={title} onMouseDown={(event) => event.preventDefault()} onClick={onClick} className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-transparent px-2 text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-[var(--surface)] dark:text-[var(--text-secondary)] dark:hover:border-[var(--border)] dark:hover:bg-[var(--border)]">{children}</button>
}

function looksLikeMarkdown(text: string): boolean {
  return /(^|\n)\s*(#{1,3}\s|>\s?|[-+*]\s+|\d+[.)]\s+|\|.+\|\s*$|(?:---+|___+))/.test(text)
    || /\*\*[^*]+\*\*|__[^_]+__|==[^=]+==|\[[^\]]+\]\([^)]+\)/.test(text)
}
