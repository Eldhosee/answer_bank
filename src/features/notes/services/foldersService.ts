import { addDoc, collection, doc, getDocs, query, serverTimestamp, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db, firebaseConfigured } from '../../../firebase/config'
import { ensureAnonymousUser } from '../../../firebase/auth'
import type { Folder } from '../models/folder'
import { listNotes } from './notesService'

const LOCAL_KEY = 'nabard-answer-bank-folders'
function readLocal(): Folder[] { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]') as Folder[] } catch { return [] } }
function writeLocal(folders: Folder[]) { localStorage.setItem(LOCAL_KEY, JSON.stringify(folders)) }
async function foldersCollection() {
  const user = await ensureAnonymousUser()
  if (!db || !user) throw new Error('Could not authenticate to access folders.')
  return { collection: collection(db, 'folders'), user }
}

export async function listFolders(): Promise<Folder[]> {
  if (!firebaseConfigured || !db) return readLocal()
  const { collection: folders, user } = await foldersCollection()
  const snapshot = await getDocs(query(folders, where('ownerId', '==', user.uid)))
  return snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<Folder, 'id'>) }))
}

export async function createFolder(name: string, parentId: string | null): Promise<string> {
  const duplicate = (await listFolders()).some((folder) => folder.parentId === parentId && folder.name.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase())
  if (duplicate) throw new Error('A folder with this name already exists here.')
  if (!firebaseConfigured || !db) {
    const id = crypto.randomUUID()
    writeLocal([...readLocal(), { id, name, parentId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }])
    return id
  }
  const { collection: folders, user } = await foldersCollection()
  return (await addDoc(folders, { name, parentId, ownerId: user.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })).id
}

export async function renameFolder(id: string, name: string) {
  const allFolders = await listFolders()
  const target = allFolders.find((folder) => folder.id === id)
  if (!target) throw new Error('Folder not found.')
  if (allFolders.some((folder) => folder.id !== id && folder.parentId === target.parentId && folder.name.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase())) throw new Error('A folder with this name already exists here.')
  if (!firebaseConfigured || !db) { writeLocal(allFolders.map((folder) => folder.id === id ? { ...folder, name, updatedAt: new Date().toISOString() } : folder)); return }
  const { collection: folders } = await foldersCollection()
  await updateDoc(doc(folders, id), { name, updatedAt: serverTimestamp() })
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
  if (!firebaseConfigured || !db) {
    writeLocal(readLocal().filter((folder) => !removeIds.has(folder.id)))
    const key = 'nabard-answer-bank-notes'
    const stored = JSON.parse(localStorage.getItem(key) ?? '[]') as Array<Record<string, unknown> & { id: string }>
    localStorage.setItem(key, JSON.stringify(stored.map((note) => affected.some((item) => item.id === note.id) ? { ...note, folderId: moveTo, updatedAt: new Date().toISOString() } : note)))
    return
  }
  const user = await ensureAnonymousUser()
  const firestore = db
  if (!user || !firestore) throw new Error('Could not authenticate to delete folder.')
  const writes: Array<(batch: ReturnType<typeof writeBatch>) => void> = []
  for (const folderId of removeIds) writes.push((batch) => batch.delete(doc(firestore, 'folders', folderId)))
  for (const note of affected) writes.push((batch) => batch.update(doc(firestore, 'notes', note.id), { folderId: moveTo, updatedAt: serverTimestamp() }))
  for (let start = 0; start < writes.length; start += 450) {
    const batch = writeBatch(firestore)
    writes.slice(start, start + 450).forEach((write) => write(batch))
    await batch.commit()
  }
}
