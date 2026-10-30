import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db, firebaseConfigured } from '../../../firebase/config'
import { ensureAnonymousUser } from '../../../firebase/auth'
import type { Note, NoteInput } from '../models/note'
import { readThroughCache, updateCached } from '../../../shared/clientCache'

const LOCAL_KEY = 'nabard-answer-bank-notes'
const CACHE_KEY = 'notes:local'
const cacheKey = (uid: string) => `notes:${uid}`

function readLocal(): Note[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]') as Note[] } catch { return [] }
}

function writeLocal(notes: Note[]) { localStorage.setItem(LOCAL_KEY, JSON.stringify(notes)) }

async function userNotesCollection() {
  const user = await ensureAnonymousUser()
  if (!db || !user) throw new Error('Could not authenticate to save notes.')
  return { notes: collection(db, 'notes'), uid: user.uid }
}

export async function listNotes(): Promise<Note[]> {
  if (!firebaseConfigured || !db) return readThroughCache(CACHE_KEY, async () => readLocal())
  const { notes, uid } = await userNotesCollection()
  return readThroughCache(cacheKey(uid), async () => {
    const snapshot = await getDocs(query(notes, where('ownerId', '==', uid)))
    return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Note, 'id'>) })).sort((a, b) => noteTime(b.createdAt) - noteTime(a.createdAt))
  })
}

function noteTime(value: unknown): number { if (typeof value === 'string' || typeof value === 'number') return new Date(value).getTime() || 0; if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') return (value.toDate() as Date).getTime(); return 0 }

export async function getNote(id: string): Promise<Note | null> {
  if (!firebaseConfigured || !db) return (await listNotes()).find((note) => note.id === id) ?? null
  const firestore = db
  const user = await ensureAnonymousUser()
  if (!user) throw new Error('Could not authenticate to access this note.')
  return readThroughCache(`note:${user.uid}:${id}`, async () => {
    const snapshot = await getDoc(doc(firestore, 'notes', id))
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...(snapshot.data() as Omit<Note, 'id'>) }
  })
}

export async function createNote(input: NoteInput): Promise<string> {
  if (!firebaseConfigured || !db) {
    const id = crypto.randomUUID()
    const items = [{ ...input, folderId: input.folderId ?? null, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...readLocal()]
    writeLocal(items); updateCached<Note[]>(CACHE_KEY, () => items)
    return id
  }
  const { notes, uid } = await userNotesCollection()
  const ref = await addDoc(notes, { ...input, ownerId: uid, folderId: input.folderId ?? null, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  updateCached<Note[]>(cacheKey(uid), (items) => [{ ...input, ownerId: uid, folderId: input.folderId ?? null, id: ref.id, createdAt: new Date(), updatedAt: new Date() }, ...items])
  return ref.id
}

export async function updateNote(id: string, input: NoteInput) {
  if (!firebaseConfigured || !db) {
    const now = new Date().toISOString()
    const items = readLocal().map((note) => note.id === id ? { ...note, ...input, updatedAt: now } : note)
    writeLocal(items); updateCached<Note[]>(CACHE_KEY, () => items)
    return
  }
  const { notes, uid } = await userNotesCollection()
  await updateDoc(doc(notes, id), { ...input, ownerId: uid, updatedAt: serverTimestamp() })
  const updated = { ...input, ownerId: uid, updatedAt: new Date() }
  updateCached<Note[]>(cacheKey(uid), (items) => items.map((note) => note.id === id ? { ...note, ...updated } : note))
  updateCached<Note | null>(`note:${uid}:${id}`, (note) => note ? { ...note, ...updated } : note)
}

export async function setNotePinned(note: Note, isPinned: boolean): Promise<void> {
  const pinnedAt = isPinned ? new Date() : null
  if (!firebaseConfigured || !db) {
    const items = readLocal().map((item) => item.id === note.id ? { ...item, isPinned, pinnedAt: pinnedAt?.toISOString() ?? null } : item)
    writeLocal(items); updateCached<Note[]>(CACHE_KEY, () => items); return
  }
  const { notes, uid } = await userNotesCollection()
  await updateDoc(doc(notes, note.id), { isPinned, pinnedAt: isPinned ? serverTimestamp() : null, ownerId: uid })
  updateCached<Note[]>(cacheKey(uid), (items) => items.map((item) => item.id === note.id ? { ...item, isPinned, pinnedAt } : item))
  updateCached<Note | null>(`note:${uid}:${note.id}`, (item) => item ? { ...item, isPinned, pinnedAt } : item)
}

export async function setNoteFavourite(note: Note, isFavourite: boolean): Promise<void> {
  if (!firebaseConfigured || !db) {
    const items = readLocal().map((item) => item.id === note.id ? { ...item, isFavourite } : item)
    writeLocal(items); updateCached<Note[]>(CACHE_KEY, () => items); return
  }
  const { notes, uid } = await userNotesCollection()
  await updateDoc(doc(notes, note.id), { isFavourite, ownerId: uid })
  updateCached<Note[]>(cacheKey(uid), (items) => items.map((item) => item.id === note.id ? { ...item, isFavourite } : item))
  updateCached<Note | null>(`note:${uid}:${note.id}`, (item) => item ? { ...item, isFavourite } : item)
}

export async function listPinnedNotes(): Promise<Note[]> {
  if (!firebaseConfigured || !db) return readLocal().filter((item) => item.isPinned)
  const { notes, uid } = await userNotesCollection()
  const snapshot = await getDocs(query(notes, where('ownerId', '==', uid), where('isPinned', '==', true)))
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Note, 'id'>) }))
}

export async function listFavouriteNotes(): Promise<Note[]> {
  if (!firebaseConfigured || !db) return readLocal().filter((item) => item.isFavourite)
  const { notes, uid } = await userNotesCollection()
  const snapshot = await getDocs(query(notes, where('ownerId', '==', uid), where('isFavourite', '==', true)))
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Note, 'id'>) }))
}

export async function deleteNote(id: string) {
  if (!firebaseConfigured || !db) {
    const items = readLocal().filter((note) => note.id !== id)
    writeLocal(items); updateCached<Note[]>(CACHE_KEY, () => items)
    return
  }
  const { notes, uid } = await userNotesCollection()
  await deleteDoc(doc(notes, id))
  updateCached<Note[]>(cacheKey(uid), (items) => items.filter((note) => note.id !== id))
  updateCached<Note | null>(`note:${uid}:${id}`, () => null)
}
