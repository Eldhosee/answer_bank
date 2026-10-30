import { getNoteEditorHtml } from '../utils/noteDocument'

export function NoteContent({ content }: { content: string }) {
  const html = getNoteEditorHtml(content)
  return <div className="note-content" dangerouslySetInnerHTML={{ __html: html }} />
}
