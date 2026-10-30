import { addDoc, collection, doc, getDocs, query, serverTimestamp, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db, firebaseConfigured } from '../../../firebase/config'
import { ensureAnonymousUser } from '../../../firebase/auth'
import type { Folder } from '../models/folder'
import { listNotes } from './notesService'
import { listAnswers } from '../../answers/services/answerService'
import { readThroughCache, updateCached } from '../../../shared/clientCache'

const LOCAL_KEY = 'nabard-answer-bank-folders'
const CACHE_KEY = 'folders:local'
const cacheKey = (uid: string) => `folders:${uid}`
function readLocal(): Folder[] { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]') as Folder[] } catch { return [] } }
function writeLocal(folders: Folder[]) { localStorage.setItem(LOCAL_KEY, JSON.stringify(folders)) }
async function foldersCollection() {
  const user = await ensureAnonymousUser()
  if (!db || !user) throw new Error('Could not authenticate to access folders.')
  return { collection: collection(db, 'folders'), user }
}

export async function listFolders(): Promise<Folder[]> {
  if (!firebaseConfigured || !db) return readThroughCache(CACHE_KEY, async () => readLocal())
  const { collection: folders, user } = await foldersCollection()
  return readThroughCache(cacheKey(user.uid), async () => {
    const snapshot = await getDocs(query(folders, where('ownerId', '==', user.uid)))
    return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Folder, 'id'>) }))
  })
}

export async function createFolder(name: string, parentId: string | null): Promise<string> {
  const duplicate = (await listFolders()).some((folder) => folder.parentId === parentId && folder.name.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase())
  if (duplicate) throw new Error('A folder with this name already exists here.')
  if (!firebaseConfigured || !db) {
    const id = crypto.randomUUID()
    const items = [...readLocal(), { id, name, parentId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
    writeLocal(items); updateCached<Folder[]>(CACHE_KEY, () => items)
    return id
  }
  const { collection: folders, user } = await foldersCollection()
  const ref = await addDoc(folders, { name, parentId, ownerId: user.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  updateCached<Folder[]>(cacheKey(user.uid), (items) => [...items, { id: ref.id, name, parentId, createdAt: new Date(), updatedAt: new Date() }])
  return ref.id
}

export async function setFolderPinned(folder: Folder, isPinned: boolean): Promise<void> {
  const pinnedAt = isPinned ? new Date() : null
  if (!firebaseConfigured || !db) {
    const items = readLocal().map((item) => item.id === folder.id ? { ...item, isPinned, pinnedAt: pinnedAt?.toISOString() ?? null } : item)
    writeLocal(items); updateCached<Folder[]>(CACHE_KEY, () => items); return
  }
  const { collection: folders, user } = await foldersCollection()
  await updateDoc(doc(folders, folder.id), { isPinned, pinnedAt: isPinned ? serverTimestamp() : null, ownerId: user.uid })
  updateCached<Folder[]>(cacheKey(user.uid), (items) => items.map((item) => item.id === folder.id ? { ...item, isPinned, pinnedAt } : item))
}

export async function listPinnedFolders(): Promise<Folder[]> {
  if (!firebaseConfigured || !db) return readLocal().filter((item) => item.isPinned)
  const { collection: folders, user } = await foldersCollection()
  const snapshot = await getDocs(query(folders, where('ownerId', '==', user.uid), where('isPinned', '==', true)))
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Folder, 'id'>) }))
}

export async function renameFolder(id: string, name: string) {
  const allFolders = await listFolders()
  const target = allFolders.find((folder) => folder.id === id)
  if (!target) throw new Error('Folder not found.')
  if (allFolders.some((folder) => folder.id !== id && folder.parentId === target.parentId && folder.name.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase())) throw new Error('A folder with this name already exists here.')
  if (!firebaseConfigured || !db) { const items = allFolders.map((folder) => folder.id === id ? { ...folder, name, updatedAt: new Date().toISOString() } : folder); writeLocal(items); updateCached<Folder[]>(CACHE_KEY, () => items); return }
  const { collection: folders, user } = await foldersCollection()
  await updateDoc(doc(folders, id), { name, updatedAt: serverTimestamp() })
  updateCached<Folder[]>(cacheKey(user.uid), (items) => items.map((folder) => folder.id === id ? { ...folder, name, updatedAt: new Date() } : folder))
}

export async function moveFolder(id: string, parentId: string | null) {
  const allFolders = await listFolders()
  const target = allFolders.find((folder) => folder.id === id)
  if (!target) throw new Error('Folder not found.')
  const descendants = new Set<string>([id])
  let changed = true
  while (changed) { changed = false; for (const folder of allFolders) if (folder.parentId && descendants.has(folder.parentId) && !descendants.has(folder.id)) { descendants.add(folder.id); changed = true } }
  if (parentId && descendants.has(parentId)) throw new Error('A folder cannot be moved inside itself or one of its subfolders.')
  if (allFolders.some((folder) => folder.id !== id && folder.parentId === parentId && folder.name.trim().toLocaleLowerCase() === target.name.trim().toLocaleLowerCase())) throw new Error('A folder with this name already exists in the destination.')
  if (!firebaseConfigured || !db) {
    const items = allFolders.map((folder) => folder.id === id ? { ...folder, parentId, updatedAt: new Date().toISOString() } : folder)
    writeLocal(items); updateCached<Folder[]>(CACHE_KEY, () => items); return
  }
  const { collection: folders, user } = await foldersCollection()
  await updateDoc(doc(folders, id), { parentId, updatedAt: serverTimestamp() })
  updateCached<Folder[]>(cacheKey(user.uid), (items) => items.map((folder) => folder.id === id ? { ...folder, parentId, updatedAt: new Date() } : folder))
}

export async function deleteFolderTree(id: string, moveTo: string | null = null) {
  const all = await listFolders()
  const target = all.find((folder) => folder.id === id)
  if (!target) throw new Error('Folder not found.')
  const removeIds = new Set([id])
  let changed = true
  while (changed) { changed = false; for (const folder of all) if (folder.parentId && removeIds.has(folder.parentId) && !removeIds.has(folder.id)) { removeIds.add(folder.id); changed = true } }
  const notes = await listNotes()
  const affected = notes.filter((note) => note.folderId && removeIds.has(note.folderId))
  const answers = await listAnswers()
  const affectedAnswers = answers.filter((answer) => answer.folderId && removeIds.has(answer.folderId))
  if (!firebaseConfigured || !db) {
    writeLocal(readLocal().filter((folder) => !removeIds.has(folder.id)))
    const key = 'nabard-answer-bank-notes'
    const stored = JSON.parse(localStorage.getItem(key) ?? '[]') as Array<Record<string, unknown> & { id: string }>
    const updatedNotes = stored.map((note) => affected.some((item) => item.id === note.id) ? { ...note, folderId: moveTo, updatedAt: new Date().toISOString() } : note)
    localStorage.setItem(key, JSON.stringify(updatedNotes))
    const answerKey = 'nabard-answer-bank-answers'
    const storedAnswers = JSON.parse(localStorage.getItem(answerKey) ?? '[]') as Array<Record<string, unknown> & { id: string }>
    const updatedAnswers = storedAnswers.map((answer) => affectedAnswers.some((item) => item.id === answer.id) ? { ...answer, folderId: moveTo, updatedAt: new Date().toISOString() } : answer)
    localStorage.setItem(answerKey, JSON.stringify(updatedAnswers))
    updateCached<Folder[]>(CACHE_KEY, (folders) => folders.filter((folder) => !removeIds.has(folder.id)))
    updateCached('notes:local', (items: typeof notes) => items.map((note) => affected.some((item) => item.id === note.id) ? { ...note, folderId: moveTo, updatedAt: new Date().toISOString() } : note))
    updateCached('answers:local', (items: typeof answers) => items.map((answer) => affectedAnswers.some((item) => item.id === answer.id) ? { ...answer, folderId: moveTo, updatedAt: new Date().toISOString() } : answer))
    return
  }
  const user = await ensureAnonymousUser()
  const firestore = db
  if (!user || !firestore) throw new Error('Could not authenticate to delete folder.')
  const writes: Array<(batch: ReturnType<typeof writeBatch>) => void> = []
  for (const folderId of removeIds) writes.push((batch) => batch.delete(doc(firestore, 'folders', folderId)))
  for (const note of affected) writes.push((batch) => batch.update(doc(firestore, 'notes', note.id), { folderId: moveTo, updatedAt: serverTimestamp() }))
  for (const answer of affectedAnswers) writes.push((batch) => batch.update(doc(firestore, 'answers', answer.id), { folderId: moveTo, updatedAt: serverTimestamp() }))
  for (let start = 0; start < writes.length; start += 450) {
    const batch = writeBatch(firestore)
    writes.slice(start, start + 450).forEach((write) => write(batch))
    await batch.commit()
  }
  updateCached<Folder[]>(cacheKey(user.uid), (folders) => folders.filter((folder) => !removeIds.has(folder.id)))
  updateCached(`notes:${user.uid}`, (items: typeof notes) => items.map((note) => affected.some((item) => item.id === note.id) ? { ...note, folderId: moveTo, updatedAt: new Date() } : note))
  updateCached(`answers:${user.uid}`, (items: typeof answers) => items.map((answer) => affectedAnswers.some((item) => item.id === answer.id) ? { ...answer, folderId: moveTo, updatedAt: new Date() } : answer))
}
