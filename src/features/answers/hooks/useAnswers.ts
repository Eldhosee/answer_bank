import { useCallback, useEffect, useState } from 'react'
import type { Answer, AnswerInput } from '../models/answer'
import { createAnswer, deleteAnswer, listAnswers, toggleFavourite, updateAnswer } from '../services/answerService'

export function useAnswers() {
  const [answers, setAnswers] = useState<Answer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true); setError('')
    try { setAnswers(await listAnswers()) } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load answers.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const add = async (input: AnswerInput) => { await createAnswer(input); await refresh() }
  const update = async (id: string, input: AnswerInput) => { await updateAnswer(id, input); await refresh() }
  const remove = async (id: string) => { await deleteAnswer(id); await refresh() }
  const favourite = async (answer: Answer) => { await toggleFavourite(answer); await refresh() }

  return { answers, loading, error, refresh, add, update, remove, favourite }
}
