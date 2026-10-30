export type Folder = {
  id: string
  name: string
  parentId: string | null
  createdAt?: unknown
  updatedAt?: unknown
  isPinned?: boolean
  pinnedAt?: unknown
}
