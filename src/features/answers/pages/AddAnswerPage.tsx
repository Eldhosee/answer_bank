import { ArrowLeft } from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import type { AnswerInput, Subject } from '../models/answer'
import { createAnswer, getAnswer, updateAnswer } from '../services/answerService'
import { listFolders as listDriveFolders } from '../../notes/services/foldersService'
import { FolderSelector } from '../../notes/components/FolderSelector'
import type { Folder } from '../../notes/models/folder'

const initial: AnswerInput = { question: '', subject: 'ARD', topic: '', marks: 15, wordLimit: 250, answer: '', isFavourite: false }

export function AddAnswerPage() {
  const navigate = useNavigate(); const { id } = useParams(); const [params] = useSearchParams(); const editing = Boolean(id); const requestedSubject = params.get('subject'); const [form, setForm] = useState({ ...initial, subject: requestedSubject === 'ESI' || requestedSubject === 'English' ? requestedSubject : initial.subject, folderId: params.get('folder') || null }); const [folders, setFolders] = useState<Folder[]>([]); const [loading, setLoading] = useState(editing); const [saving, setSaving] = useState(false); const [error, setError] = useState('')
  useEffect(() => { void listDriveFolders().then(setFolders).catch(() => undefined) }, [])
  useEffect(() => { if (!id) return; void getAnswer(id).then((answer) => { if (answer) setForm({ question: answer.question, subject: answer.subject, topic: answer.topic, marks: answer.marks, wordLimit: answer.wordLimit, answer: answer.answer, isFavourite: answer.isFavourite, folderId: answer.folderId ?? null }); else setError('Answer not found.') }).catch(() => setError('Could not load the answer.')).finally(() => setLoading(false)) }, [id])
  const update = <K extends keyof AnswerInput>(key: K, value: AnswerInput[K]) => setForm((f) => ({ ...f, [key]: value }))
  const save = async () => {
    if (!form.question.trim() || !form.topic.trim() || !form.answer.trim()) { setError('Please fill the question, topic and model answer.'); return }
    setSaving(true); setError('')
    try { if (id) { await updateAnswer(id, form); navigate(`/answers/${id}`) } else { const newId = await createAnswer(form); navigate(`/answers/${newId}`) } } catch (e) { setError(e instanceof Error ? e.message : 'Could not save the answer.') } finally { setSaving(false) }
  }
  if (loading) return <div className="py-20 text-center text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">Loading answer...</div>
  return <div className="mx-auto max-w-4xl space-y-6"><button onClick={() => navigate(-1)} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--accent)] dark:text-[var(--text-muted)] dark:hover:text-[var(--accent)]"><ArrowLeft size={17} />Back</button><div><p className="text-sm font-semibold text-[var(--accent)] dark:text-[var(--accent)]">Your personal study notebook</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--text-primary)] dark:text-[var(--text-primary)]">{editing ? 'Edit Answer' : 'Add Answer'}</h1><p className="mt-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">Save a model answer for quick reference later.</p></div><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm shadow-[var(--accent)]/5 sm:p-7 dark:border-[var(--border)] dark:bg-[var(--surface)] dark:shadow-none"><div className="space-y-6">
    <Field label="Question *" hint="Write the exact exam prompt for easy reference."><textarea className="!min-h-32 !bg-[var(--accent-soft)] !text-base !leading-7 dark:!bg-[var(--surface)]" value={form.question} onChange={(e) => update('question', e.target.value)} rows={4} placeholder="Enter the question here..." /></Field>
    <div className="grid gap-5 sm:grid-cols-2"><Field label="Subject *"><select value={form.subject} onChange={(e) => update('subject', e.target.value as Subject)}><option>ARD</option><option>ESI</option><option>English</option></select></Field><Field label="Topic *"><input value={form.topic} onChange={(e) => update('topic', e.target.value)} placeholder="e.g. Rural Development" /></Field></div>
    <Field label="Folder"><FolderSelector folders={folders} value={form.folderId ?? null} onChange={(folderId) => update('folderId', folderId)} /></Field>
    <div className="grid gap-5 sm:grid-cols-2"><Field label="Marks *"><input type="number" min="1" value={form.marks} onChange={(e) => update('marks', Number(e.target.value))} /></Field><Field label="Word Limit *"><input type="number" min="1" value={form.wordLimit} onChange={(e) => update('wordLimit', Number(e.target.value))} /></Field></div>
    <Field label="Model Answer *" hint="Use clear sections and paragraphs; line breaks are preserved when reading."><textarea className="!min-h-[22rem] !bg-[var(--accent-soft)] !text-[15px] !leading-7 dark:!bg-[var(--surface)]" value={form.answer} onChange={(e) => update('answer', e.target.value)} rows={18} placeholder="Write or paste the model answer here..." /></Field>
    {error && <p role="alert" className="rounded-xl border border-[var(--danger-soft)] bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)] dark:border-[var(--danger-soft)] dark:bg-[var(--danger-soft)] dark:text-[var(--danger)]">{error}</p>}
    <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-5 dark:border-[var(--border)] sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button><Button onClick={() => void save()} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update Answer' : 'Save Answer'}</Button></div>
  </div></div></div>
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) { return <label className="block text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--border)]">{label}<div className="mt-2">{children}</div>{hint && <span className="mt-1.5 block text-xs font-normal leading-5 text-[var(--text-muted)] dark:text-[var(--text-muted)]">{hint}</span>}</label> }
