export type Note = {
  id: string
  title: string
  content: string
  folderId?: string | null
  ownerId?: string
  createdAt?: unknown
  updatedAt?: unknown
  isPinned?: boolean
  pinnedAt?: unknown
  isFavourite?: boolean
}

export type NoteInput = Pick<Note, 'title' | 'content' | 'folderId'>
