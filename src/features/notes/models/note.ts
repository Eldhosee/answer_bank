export type Note = {
  id: string
  title: string
  content: string
  folderId?: string | null
  createdAt?: unknown
  updatedAt?: unknown
}

export type NoteInput = Pick<Note, 'title' | 'content' | 'folderId'>
