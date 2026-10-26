export type TextBlock = { type: 'text'; text: string }
export type TableBlock = { type: 'table'; rows: string[][] }
export type NoteBlock = TextBlock | TableBlock

const marker = '{"version":1,"blocks":'

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

export function noteSearchText(content: string): string {
  return parseNoteContent(content).map((block) => block.type === 'text' ? block.text : block.rows.flat().join(' ')).join('\n')
}
