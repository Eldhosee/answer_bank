import type { Answer } from '../models/answer'

export const subjectOptions = ['All', 'ARD', 'ESI', 'English'] as const

export function filterAnswers(answers: Answer[], query: string, subject: string) {
  const q = query.trim().toLowerCase()
  return answers.filter((item) => {
    const subjectMatch = subject === 'All' || item.subject === subject
    const text = `${item.question} ${item.topic} ${item.answer}`.toLowerCase()
    return subjectMatch && (!q || text.includes(q))
  })
}

export function formatDate(value: Answer['createdAt']) {
  if (!value) return ''
  const date = typeof value === 'object' && 'toDate' in value ? value.toDate() : new Date()
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}
