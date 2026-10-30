import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

function readFlag(name) {
  const prefix = `--${name}=`
  return process.argv.slice(2).find((argument) => argument.startsWith(prefix))?.slice(prefix.length)
}

const projectId = readFlag('project')
const ownerId = readFlag('uid')
if (!projectId || !ownerId) {
  throw new Error('Usage: node scripts/migrate-legacy-ownership.mjs --project=<firebase-project-id> --uid=<authenticated-user-uid>')
}

initializeApp({ credential: applicationDefault(), projectId })
const firestore = getFirestore()
const marker = firestore.doc('_migrations/legacy-owner-id-v1')
const existingMarker = await marker.get()
if (existingMarker.exists) {
  if (existingMarker.get('ownerId') !== ownerId) throw new Error('This migration was already run for a different UID; refusing to reassign legacy records.')
  console.info('Legacy ownership migration is already complete for this UID.')
  process.exit(0)
}

const totals = {}
for (const collectionName of ['answers', 'notes', 'folders']) {
  const snapshot = await firestore.collection(collectionName).get()
  const legacyDocs = snapshot.docs.filter((document) => document.get('ownerId') == null)
  let adopted = 0
  for (let index = 0; index < legacyDocs.length; index += 25) {
    const chunk = legacyDocs.slice(index, index + 25)
    const results = await Promise.all(chunk.map((document) => firestore.runTransaction(async (transaction) => {
      const current = await transaction.get(document.ref)
      if (!current.exists || current.get('ownerId') != null) return false
      transaction.update(document.ref, { ownerId })
      return true
    })))
    adopted += results.filter(Boolean).length
  }
  totals[collectionName] = { scanned: snapshot.size, adopted }
  console.info(`${collectionName}: scanned ${snapshot.size}, assigned ${adopted} ownerless documents`)
}

await marker.create({ ownerId, completedAt: FieldValue.serverTimestamp(), totals })
console.info('Legacy ownership migration completed. Existing document IDs and fields were preserved.')
