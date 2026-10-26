import type { ReactNode } from 'react'
import { parseNoteContent } from '../utils/noteDocument'
import { NoteTable } from './NoteTable'

const inlinePattern = /(\*\*[^*\n]+\*\*|__[^_\n]+__|==[^=\n]+==|\*[^*\n]+\*)/g

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  let cursor = 0
  for (const match of text.matchAll(inlinePattern)) {
    const token = match[0]
    const start = match.index ?? 0
    if (start > cursor) parts.push(text.slice(cursor, start))
    const content = token.slice(token.startsWith('**') || token.startsWith('__') || token.startsWith('==') ? 2 : 1, -(token.startsWith('**') || token.startsWith('__') || token.startsWith('==') ? 2 : 1))
    if (token.startsWith('**')) parts.push(<strong key={start}>{content}</strong>)
    else if (token.startsWith('__')) parts.push(<u key={start}>{content}</u>)
    else if (token.startsWith('==')) parts.push(<mark key={start}>{content}</mark>)
    else parts.push(<em key={start}>{content}</em>)
    cursor = start + token.length
  }
  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts
}

function renderLines(lines: string[], start: number): ReactNode[] {
  const output: ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }
    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      const level = heading[1].length
      const Tag = level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4'
      output.push(<Tag key={start + i}>{renderInline(heading[2])}</Tag>); i++; continue
    }
    if (/^>\s?/.test(line)) {
      const quote: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ''))
      output.push(<blockquote key={start + i - quote.length}>{quote.map((item, n) => <span key={n}>{n > 0 && <br />}{renderInline(item)}</span>)}</blockquote>); continue
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, ''))
      output.push(<ul key={start + i - items.length}>{items.map((item, n) => <li key={n}>{renderInline(item)}</li>)}</ul>); continue
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ''))
      output.push(<ol key={start + i - items.length}>{items.map((item, n) => <li key={n}>{renderInline(item)}</li>)}</ol>); continue
    }
    const paragraph: string[] = []
    while (i < lines.length && lines[i].trim() && !/^(#{1,3})\s+/.test(lines[i]) && !/^>\s?/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i]) && !/^\s*\d+[.)]\s+/.test(lines[i])) paragraph.push(lines[i++])
    output.push(<p key={start + i - paragraph.length}>{paragraph.map((item, n) => <span key={n}>{n > 0 && <br />}{renderInline(item)}</span>)}</p>)
  }
  return output
}

export function NoteContent({ content }: { content: string }) {
  const blocks = parseNoteContent(content)
  return <div className="note-content">{blocks.map((block, index) => block.type === 'table' ? <NoteTable key={index} block={block} /> : <div key={index}>{renderLines(block.text.split(/\r?\n/), index * 10000)}</div>)}</div>
}
