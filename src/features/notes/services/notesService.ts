import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db, firebaseConfigured } from '../../../firebase/config'
import { ensureAnonymousUser } from '../../../firebase/auth'
import type { Note, NoteInput } from '../models/note'

const LOCAL_KEY = 'nabard-answer-bank-notes'

function readLocal(): Note[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]') as Note[] } catch { return [] }
}

function writeLocal(notes: Note[]) { localStorage.setItem(LOCAL_KEY, JSON.stringify(notes)) }

async function userNotesCollection() {
  const user = await ensureAnonymousUser()
  if (!db || !user) throw new Error('Could not authenticate to save notes.')
  return collection(db, 'notes')
}

export async function listNotes(): Promise<Note[]> {
  if (!firebaseConfigured || !db) return readLocal()
  const notes = await userNotesCollection()
  const snapshot = await getDocs(query(notes, orderBy('createdAt', 'desc')))
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Note, 'id'>) }))
}

export async function getNote(id: string): Promise<Note | null> {
  return (await listNotes()).find((note) => note.id === id) ?? null
}

export async function createNote(input: NoteInput): Promise<string> {
  if (!firebaseConfigured || !db) {
    const id = crypto.randomUUID()
    writeLocal([{ ...input, folderId: input.folderId ?? null, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...readLocal()])
    return id
  }
  const notes = await userNotesCollection()
  return (await addDoc(notes, { ...input, folderId: input.folderId ?? null, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })).id
}

export async function updateNote(id: string, input: NoteInput) {
  if (!firebaseConfigured || !db) {
    const now = new Date().toISOString()
    writeLocal(readLocal().map((note) => note.id === id ? { ...note, ...input, updatedAt: now } : note))
    return
  }
  const notes = await userNotesCollection()
  await updateDoc(doc(notes, id), { ...input, updatedAt: serverTimestamp() })
}

export async function deleteNote(id: string) {
  if (!firebaseConfigured || !db) {
    writeLocal(readLocal().filter((note) => note.id !== id))
    return
  }
  const notes = await userNotesCollection()
  await deleteDoc(doc(notes, id))
}
