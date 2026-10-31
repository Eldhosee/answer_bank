import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import {
  DocumentReference,
  GeoPoint,
  Timestamp,
  getFirestore,
} from 'firebase-admin/firestore'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const COLLECTIONS = ['answers', 'notes', 'folders']
const BATCH_SIZE = 450
const BACKUP_DIRECTORY = resolve('firestore-backup')

function readArguments(args) {
  const options = new Map()
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--apply') {
      options.set('apply', true)
      continue
    }
    if (argument === '--target-uid' || argument === '--confirm-target-uid') {
      const value = args[index + 1]
      if (!value || value.startsWith('--')) {
        throw new Error(`${argument} requires a value.`)
      }
      if (options.has(argument)) {
        throw new Error(`${argument} may only be specified once.`)
      }
      options.set(argument, value)
      index += 1
      continue
    }
    throw new Error(`Unknown argument: ${argument}`)
  }
  return options
}

function hasValidOwnerId(data) {
  return (
    typeof data.ownerId === 'string' &&
    data.ownerId.trim().length > 0
  )
}

function ownershipCategory(data) {
  if (!Object.hasOwn(data, 'ownerId')) return '[missing]'
  if (data.ownerId === null) return '[null]'
  if (typeof data.ownerId === 'string') {
    return data.ownerId.trim() ? data.ownerId : '[empty string]'
  }
  return `[invalid ${typeof data.ownerId}]`
}

function summarizeCollection(name, documents, targetUid) {
  const distribution = new Map()
  let eligibleForUpdate = 0
  let alreadyTarget = 0

  for (const document of documents) {
    const data = document.data()
    const category = ownershipCategory(data)
    distribution.set(category, (distribution.get(category) ?? 0) + 1)

    if (!hasValidOwnerId(data)) continue
    if (data.ownerId === targetUid) {
      alreadyTarget += 1
    } else {
      eligibleForUpdate += 1
    }
  }

  return {
    collection: name,
    inspected: documents.length,
    eligibleForUpdate,
    alreadyTarget,
    ownerIdDistribution: Object.fromEntries(
      [...distribution.entries()].sort(([a], [b]) => a.localeCompare(b)),
    ),
  }
}

function serializeFirestoreValue(value) {
  if (value instanceof Timestamp) {
    return {
      $firestoreType: 'timestamp',
      seconds: value.seconds,
      nanoseconds: value.nanoseconds,
    }
  }
  if (value instanceof GeoPoint) {
    return {
      $firestoreType: 'geopoint',
      latitude: value.latitude,
      longitude: value.longitude,
    }
  }
  if (value instanceof DocumentReference) {
    return { $firestoreType: 'reference', path: value.path }
  }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return {
      $firestoreType: 'bytes',
      base64: Buffer.from(value).toString('base64'),
    }
  }
  if (Array.isArray(value)) {
    return value.map(serializeFirestoreValue)
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        serializeFirestoreValue(item),
      ]),
    )
  }
  return value
}

async function writeBackup(candidates) {
  const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-')
  const filePath = join(
    BACKUP_DIRECTORY,
    `owner-id-update-${timestamp}-${process.pid}.json`,
  )
  const backup = candidates.map(({ collection, document }) => ({
    collection,
    path: document.ref.path,
    id: document.id,
    data: serializeFirestoreValue(document.data()),
  }))

  await mkdir(BACKUP_DIRECTORY, { recursive: true })
  await writeFile(filePath, `${JSON.stringify(backup, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o600,
  })
  return filePath
}

async function updateCandidates(firestore, candidates, targetUid) {
  const results = new Map(
    COLLECTIONS.map((collection) => [
      collection,
      { updated: 0, failedBatchDocuments: 0, verifiedAtTarget: 0 },
    ]),
  )

  for (const collection of COLLECTIONS) {
    const documents = candidates
      .filter((candidate) => candidate.collection === collection)
      .map((candidate) => candidate.document)

    for (let start = 0; start < documents.length; start += BATCH_SIZE) {
      const batchDocuments = documents.slice(start, start + BATCH_SIZE)
      const batch = firestore.batch()
      for (const document of batchDocuments) {
        batch.update(document.ref, { ownerId: targetUid })
      }

      try {
        await batch.commit()
        results.get(collection).updated += batchDocuments.length
      } catch (error) {
        results.get(collection).failedBatchDocuments += batchDocuments.length
        console.error(
          `${collection}: batch ${Math.floor(start / BATCH_SIZE) + 1} failed:`,
          error instanceof Error ? error.message : String(error),
        )
      }
    }
  }

  for (const collection of COLLECTIONS) {
    const snapshot = await firestore.collection(collection).get()
    const collectionCandidates = candidates.filter(
      (candidate) => candidate.collection === collection,
    )
    const finalDocuments = new Map(
      snapshot.docs.map((document) => [document.id, document]),
    )

    for (const candidate of collectionCandidates) {
      const document = finalDocuments.get(candidate.document.id)
      if (document?.get('ownerId') === targetUid) {
        results.get(collection).verifiedAtTarget += 1
      }
    }
  }

  return results
}

export async function migrateAllOwnerIds(
  targetUid,
  { apply = false, confirmation } = {},
) {
  if (typeof targetUid !== 'string' || targetUid.trim().length === 0) {
    throw new Error('A non-empty Firebase Authentication UID is required.')
  }

  const projectId =
    process.env.VITE_FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT
  if (!projectId) {
    throw new Error(
      'Firebase project ID is missing. Run with --env-file=.env or set VITE_FIREBASE_PROJECT_ID.',
    )
  }

  initializeApp({ credential: applicationDefault(), projectId })
  const firestore = getFirestore()
  const user = await getAuth().getUser(targetUid)
  if (!user.providerData.some((provider) => provider.providerId === 'google.com')) {
    throw new Error(
      'The target UID must belong to an existing Google-linked Firebase Authentication account.',
    )
  }

  const snapshots = await Promise.all(
    COLLECTIONS.map(async (collection) => [
      collection,
      await firestore.collection(collection).get(),
    ]),
  )
  const snapshotByCollection = new Map(snapshots)
  const summaries = COLLECTIONS.map((collection) =>
    summarizeCollection(
      collection,
      snapshotByCollection.get(collection).docs,
      targetUid,
    ),
  )
  const candidates = COLLECTIONS.flatMap((collection) =>
    snapshotByCollection
      .get(collection)
      .docs.filter(
        (document) =>
          hasValidOwnerId(document.data()) &&
          document.get('ownerId') !== targetUid,
      )
      .map((document) => ({ collection, document })),
  )

  console.info(`Firebase project: ${projectId}`)
  console.info(`Verified Google-linked destination UID: ${targetUid}`)
  console.info('Read-only inventory:')
  console.info(JSON.stringify(summaries, null, 2))
  console.info(`Total eligible for update: ${candidates.length}`)

  if (!apply) {
    console.info('Dry run only. No Firestore documents were changed.')
    return { mode: 'dry-run', summaries, eligibleForUpdate: candidates.length }
  }

  if (confirmation !== targetUid) {
    throw new Error(
      'Actual updates require --confirm-target-uid with the exact target UID.',
    )
  }

  const backupPath = await writeBackup(candidates)
  console.info(`Pre-update backup written to: ${backupPath}`)
  const results = await updateCandidates(firestore, candidates, targetUid)
  const finalResults = summaries.map((summary) => ({
    collection: summary.collection,
    inspected: summary.inspected,
    eligibleForUpdate: summary.eligibleForUpdate,
    updated: results.get(summary.collection).updated,
    failedBatchDocuments:
      results.get(summary.collection).failedBatchDocuments,
    verifiedAtTarget: results.get(summary.collection).verifiedAtTarget,
    unsuccessful:
      summary.eligibleForUpdate -
      results.get(summary.collection).verifiedAtTarget,
    alreadyTarget: summary.alreadyTarget,
  }))
  console.info('Update and verification results:')
  console.info(JSON.stringify(finalResults, null, 2))

  const unsuccessful = finalResults.reduce(
    (total, result) => total + result.unsuccessful,
    0,
  )
  if (unsuccessful > 0) {
    process.exitCode = 1
  }
  return {
    mode: 'apply',
    backupPath,
    results: finalResults,
    unsuccessful,
  }
}

async function runCli() {
  const options = readArguments(process.argv.slice(2))
  const targetUid = options.get('--target-uid')
  if (!targetUid) {
    throw new Error(
      'Usage: node --env-file=.env scripts\\migrate-owner-ids.mjs --target-uid <verified-google-firebase-uid> [--apply --confirm-target-uid <same-uid>]',
    )
  }
  if (
    options.get('--confirm-target-uid') &&
    options.get('--confirm-target-uid') !== targetUid
  ) {
    throw new Error('--confirm-target-uid must exactly match --target-uid.')
  }
  if (
    options.get('apply') === true &&
    options.get('--confirm-target-uid') !== targetUid
  ) {
    throw new Error(
      'Actual updates require --confirm-target-uid with the exact target UID.',
    )
  }

  await migrateAllOwnerIds(targetUid, {
    apply: options.get('apply') === true,
    confirmation: options.get('--confirm-target-uid'),
  })
}

runCli().catch((error) => {
  console.error(
    'Owner ID update failed:',
    error instanceof Error ? error.message : String(error),
  )
  process.exitCode = 1
})
