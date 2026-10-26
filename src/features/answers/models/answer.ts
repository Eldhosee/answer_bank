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
  createdAt?: Timestamp | null
  updatedAt?: Timestamp | null
}

export type AnswerInput = Omit<Answer, 'id' | 'createdAt' | 'updatedAt'>
