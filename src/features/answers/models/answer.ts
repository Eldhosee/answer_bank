import type { Timestamp } from 'firebase/firestore'

export type Subject = 'ARD' | 'ESI' | 'English'

export type Answer = {
  id: string
  question: string
  subject: Subject
  topic: string
  marks: number
  wordLimit: number
  answer: string
  isFavourite: boolean
  folderId?: string | null
  ownerId?: string
  createdAt?: Timestamp | Date | string | null
  updatedAt?: Timestamp | Date | string | null
  isPinned?: boolean
  pinnedAt?: Timestamp | Date | string | null
}

export type AnswerInput = Omit<Answer, 'id' | 'createdAt' | 'updatedAt'>
