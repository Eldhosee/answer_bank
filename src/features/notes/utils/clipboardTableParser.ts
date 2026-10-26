export function parseClipboardTable(html: string): string[][] | null {
  if (!html || typeof DOMParser === 'undefined') return null
  const document = new DOMParser().parseFromString(html, 'text/html')
  const table = document.querySelector('table')
  if (!table) return null
  const rows = [...table.querySelectorAll('tr')].map((row) => [...row.querySelectorAll('th,td')].map((cell) => cellText(cell).replace(/\u00a0/g, ' ')))
    .filter((row) => row.length > 0)
  if (!rows.length) return null
  const width = Math.max(...rows.map((row) => row.length))
  return rows.map((row) => Array.from({ length: width }, (_, index) => row[index] ?? ''))
}

function cellText(element: Element): string {
  const read = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue ?? ''
    if (node.nodeType !== Node.ELEMENT_NODE) return ''
    const tag = (node as Element).tagName.toLowerCase()
    if (tag === 'br') return '\n'
    const text = [...node.childNodes].map(read).join('')
    return ['div', 'p', 'li'].includes(tag) ? `${text}\n` : text
  }
  return [...element.childNodes].map(read).join('').replace(/\n$/, '')
}

export function parseClipboardTextTable(text: string): string[][] | null {
  if (!text.includes('\t')) return null
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++ }
      else quoted = !quoted
    } else if (char === '\t' && !quoted) {
      row.push(cell); cell = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += char
  }
  row.push(cell)
  if (row.some((value) => value.length > 0) || !rows.length) rows.push(row)
  if (!rows.length || Math.max(...rows.map((values) => values.length)) < 2) return null
  const width = Math.max(...rows.map((values) => values.length))
  return rows.map((values) => Array.from({ length: width }, (_, index) => values[index] ?? ''))
}

export function tableToPlainText(rows: string[][]) { return rows.map((row) => row.join('\t')).join('\n') }

export function tableToHtml(rows: string[][]) {
  const [header, ...body] = rows
  return `<table><thead><tr>${(header ?? []).map((cell) => `<th>${escapeHtml(cell)}</th>`).join('')}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
}

function escapeHtml(value: string) { return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }
