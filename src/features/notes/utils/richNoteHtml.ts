const ALLOWED_TAGS = new Set([
  'a', 'b', 'blockquote', 'br', 'code', 'del', 'div', 'em', 'h1', 'h2', 'h3', 'hr', 'i',
  'li', 'mark', 'ol', 'p', 'pre', 's', 'span', 'strong', 'sub', 'sup', 'table',
  'tbody', 'td', 'th', 'thead', 'tr', 'u', 'ul',
])
const DROP_CONTENT_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'form', 'input', 'button', 'video', 'audio'])
const ALIGNMENTS = new Set(['left', 'center', 'right', 'justify'])

export function sanitizeNoteHtml(input: string): string {
  if (typeof DOMParser === 'undefined') return escapeHtml(input)
  const doc = new DOMParser().parseFromString(input, 'text/html')
  const cleanChildren = (parent: ParentNode) => {
    for (const node of [...parent.childNodes]) {
      if (node.nodeType === Node.COMMENT_NODE) { node.remove(); continue }
      if (node.nodeType !== Node.ELEMENT_NODE) continue
      const element = node as HTMLElement
      const tag = element.tagName.toLowerCase()
      if (DROP_CONTENT_TAGS.has(tag)) { element.remove(); continue }
      cleanChildren(element)
      if (!ALLOWED_TAGS.has(tag)) {
        element.replaceWith(...element.childNodes)
        continue
      }

      const href = tag === 'a' ? safeUrl(element.getAttribute('href') ?? '') : null
      const textAlign = ALIGNMENTS.has(element.style.textAlign) ? element.style.textAlign : ''
      const bg = safeColor(element.style.backgroundColor)
      const fontWeight = element.style.fontWeight
      const fontStyle = element.style.fontStyle
      const textDecoration = `${element.style.textDecoration} ${element.style.textDecorationLine}`
      for (const attribute of [...element.attributes]) element.removeAttribute(attribute.name)
      if (tag === 'a' && href) {
        element.setAttribute('href', href)
        element.setAttribute('rel', 'noopener noreferrer')
      }
      if (tag === 'a' && !href) element.replaceWith(...element.childNodes)
      if (tag === 'span' && (bg || /^(bold|[6-9]00)$/.test(fontWeight) || fontStyle === 'italic' || /underline/i.test(textDecoration))) {
        let wrapper: HTMLElement | DocumentFragment = doc.createDocumentFragment()
        wrapper.append(...element.childNodes)
        for (const semanticTag of [
          ...(fontWeight === 'bold' || /^[6-9]00$/.test(fontWeight) ? ['strong'] : []),
          ...(fontStyle === 'italic' ? ['em'] : []),
          ...(/underline/i.test(textDecoration) ? ['u'] : []),
          ...(bg ? ['mark'] : []),
        ]) {
          const semantic = doc.createElement(semanticTag)
          if (semanticTag === 'mark' && bg) semantic.style.backgroundColor = bg
          semantic.append(wrapper)
          wrapper = semantic
        }
        element.replaceWith(wrapper)
        continue
      }
      if (textAlign && ['div', 'p', 'h1', 'h2', 'h3', 'blockquote', 'td', 'th'].includes(tag)) element.style.textAlign = textAlign
      if (bg && tag === 'span') {
        const mark = doc.createElement('mark')
        mark.style.backgroundColor = bg
        mark.append(...element.childNodes)
        element.replaceWith(mark)
      } else if (bg && tag === 'mark') {
        element.style.backgroundColor = bg
      }
    }
  }
  cleanChildren(doc.body)
  return doc.body.innerHTML.trim()
}

function safeUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed
  if (/^(\/|#|\?)/.test(trimmed) && !trimmed.startsWith('//')) return trimmed
  return null
}

function safeColor(value: string): string {
  const color = value.trim().toLowerCase()
  if (/^#[\da-f]{3,8}$/.test(color)) return color
  if (/^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(?:\s*,\s*[\d.]+)?\s*\)$/.test(color)) return color
  if (['yellow', 'gold', 'lime', 'lightgreen', 'pink', 'lightskyblue'].includes(color)) return color
  return ''
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export function markdownToNoteHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  const output: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }
    const heading = line.match(/^\s*(#{1,3})\s+(.+?)\s*#*\s*$/)
    if (heading) { const level = heading[1].length; output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`); i++; continue }
    if (/^\s*(?:---+|___+|\*\s*\*\s*\*\s*)$/.test(line)) { output.push('<hr>'); i++; continue }
    if (isTableStart(lines, i)) {
      const table: string[][] = [splitTableRow(lines[i])]
      i += 2
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) table.push(splitTableRow(lines[i++]))
      output.push(rowsToTable(table)); continue
    }
    if (/^\s*>/.test(line)) {
      const quote: string[] = []
      while (i < lines.length && /^\s*>/.test(lines[i])) quote.push(inlineMarkdown(lines[i++].replace(/^\s*>\s?/, '')))
      output.push(`<blockquote>${quote.join('<br>')}</blockquote>`); continue
    }
    if (listMarker(line)) { const parsed = parseList(lines, i); output.push(parsed.html); i = parsed.next; continue }
    const paragraph: string[] = []
    while (i < lines.length && lines[i].trim() && !startsBlock(lines, i)) paragraph.push(inlineMarkdown(lines[i++]))
    if (paragraph.length) output.push(`<p>${paragraph.join('<br>')}</p>`)
  }
  return sanitizeNoteHtml(output.join(''))
}

function inlineMarkdown(value: string): string {
  let text = escapeHtml(value)
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>')
  text = text.replace(/\[([^\]]+)\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g, (_match, label: string, url: string) => `<a href="${escapeHtml(url)}">${label}</a>`)
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/__(.+?)__/g, '<u>$1</u>')
  text = text.replace(/~~(.+?)~~/g, '<del>$1</del>').replace(/==(.+?)==/g, '<mark>$1</mark>')
  text = text.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>').replace(/(^|[^_])_([^_\n]+)_(?!_)/g, '$1<em>$2</em>')
  return text
}

function splitTableRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((cell) => cell.replace(/\\\|/g, '|').trim())
}
function isTableStart(lines: string[], index: number): boolean { return /^\s*\|.*\|\s*$/.test(lines[index] ?? '') && /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1] ?? '') }
function rowsToTable(rows: string[][]): string {
  const width = Math.max(1, ...rows.map((row) => row.length))
  const normalized = rows.map((row) => Array.from({ length: width }, (_, column) => row[column] ?? ''))
  const header = normalized[0] ?? []
  return `<table><thead><tr>${header.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join('')}</tr></thead><tbody>${normalized.slice(1).map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
}

type Marker = { indent: number; ordered: boolean; content: string }
function listMarker(line: string): Marker | null {
  const match = line.match(/^(\s*)(?:([-+*])|\d+[.)])\s+(.*)$/)
  return match ? { indent: match[1].replace(/\t/g, '  ').length, ordered: /^\d/.test(line.trimStart()), content: match[3] } : null
}
function parseList(lines: string[], start: number): { html: string; next: number } {
  const first = listMarker(lines[start])!
  const tag = first.ordered ? 'ol' : 'ul'
  const items: string[] = []
  let i = start
  while (i < lines.length) {
    const marker = listMarker(lines[i])
    if (!marker) break
    if (marker.indent < first.indent) break
    if (marker.indent > first.indent) {
      if (items.length) {
        const nested = parseList(lines, i)
        items[items.length - 1] = items[items.length - 1].replace(/<\/li>$/, `${nested.html}</li>`)
        i = nested.next
        continue
      }
      i++
      continue
    }
    if (marker.ordered !== first.ordered) break
    items.push(`<li>${inlineMarkdown(marker.content)}</li>`)
    i++
    while (i < lines.length && !lines[i].trim()) {
      const nextMarker = listMarker(lines[i + 1] ?? '')
      if (nextMarker && nextMarker.indent > first.indent) break
      if (!nextMarker) { i++; break }
      i++
    }
  }
  return { html: `<${tag}>${items.join('')}</${tag}>`, next: i }
}
function startsBlock(lines: string[], index: number): boolean {
  const line = lines[index]
  return /^\s*(?:#{1,3}\s|>|(?:---+|___+)|\|.*\|\s*$)/.test(line) || Boolean(listMarker(line)) || isTableStart(lines, index)
}

export function plainTextToNoteHtml(text: string): string {
  return text.split(/\n{2,}/).map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('')
}

export function hasRichFormatting(html: string): boolean {
  if (typeof DOMParser === 'undefined') return false
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return Boolean(doc.querySelector('h1,h2,h3,h4,strong,b,em,i,u,mark,ul,ol,li,blockquote,table,hr,a,pre,code'))
}

export function noteBlocksToHtml(blocks: ({ type: 'text'; text: string } | { type: 'table'; rows: string[][] })[]): string {
  return blocks.map((block) => block.type === 'table' ? rowsToTable(block.rows) : markdownToNoteHtml(block.text)).join('')
}

export function richHtmlToText(html: string): string {
  if (typeof DOMParser === 'undefined') return html.replace(/<[^>]*>/g, ' ')
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent ?? ''
}
