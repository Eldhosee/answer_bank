import { markdownToNoteHtml, noteBlocksToHtml, plainTextToNoteHtml, richHtmlToText, sanitizeNoteHtml } from './richNoteHtml'

export type TextBlock = { type: 'text'; text: string }
export type TableBlock = { type: 'table'; rows: string[][] }
export type NoteBlock = TextBlock | TableBlock

const marker = '{"version":1,"blocks":'
const richMarker = '{"version":2,"html":'

export function parseNoteContent(content: string): NoteBlock[] {
  if (content.startsWith(marker)) {
    try {
      const value = JSON.parse(content) as { version?: number; blocks?: NoteBlock[] }
      if (value.version === 1 && Array.isArray(value.blocks)) return value.blocks
    } catch { /* Treat malformed structured content as legacy text. */ }
  }
  return [{ type: 'text', text: content }]
}

export function serializeNoteContent(blocks: NoteBlock[]): string {
  return JSON.stringify({ version: 1, blocks })
}

export function getNoteEditorHtml(content: string): string {
  if (content.startsWith(richMarker)) {
    try {
      const value = JSON.parse(content) as { version?: number; html?: string }
      if (value.version === 2 && typeof value.html === 'string') return sanitizeNoteHtml(value.html)
    } catch { /* Fall back to legacy content. */ }
  }
  if (content.startsWith(marker)) {
    const blocks = parseNoteContent(content)
    return noteBlocksToHtml(blocks)
  }
  if (looksLikeMarkdown(content)) return markdownToNoteHtml(content)
  return plainTextToNoteHtml(content)
}

export function serializeRichNoteContent(html: string): string {
  return JSON.stringify({ version: 2, html: sanitizeNoteHtml(html) })
}

export function noteSearchText(content: string): string {
  if (content.startsWith(richMarker)) return richHtmlToText(getNoteEditorHtml(content))
  return parseNoteContent(content).map((block) => block.type === 'text' ? block.text : block.rows.flat().join(' ')).join('\n')
}

function looksLikeMarkdown(content: string) {
  return /(^|\n)\s*(#{1,3}\s|>\s?|[-+*]\s+|\d+[.)]\s+|\|.+\|\s*$|(?:---+|___+))/.test(content)
    || /\*\*[^*]+\*\*|__[^_]+__|==[^=]+==|\[[^\]]+\]\([^)]+\)/.test(content)
}
