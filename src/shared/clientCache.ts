type Entry<T> = { value?: T; pending?: Promise<T>; storedAt?: number }

const entries = new Map<string, Entry<unknown>>()
const CACHE_TTL_MS = 2 * 60 * 1000

/** Share an initial read between consumers and keep its result for this app session. */
export function readThroughCache<T>(key: string, load: () => Promise<T>): Promise<T> {
  const existing = entries.get(key) as Entry<T> | undefined
  if (existing?.value !== undefined && existing.storedAt && Date.now() - existing.storedAt < CACHE_TTL_MS) return Promise.resolve(existing.value)
  if (existing?.pending) return existing.pending

  const entry: Entry<T> = {}
  const pending = load().then((value) => {
    if (entries.get(key) === entry) { entry.value = value; entry.storedAt = Date.now() }
    return value
  }).catch((error: unknown) => {
    if (entries.get(key) === entry) entries.delete(key)
    throw error
  }).finally(() => { if (entries.get(key) === entry) entry.pending = undefined })
  entry.pending = pending
  entries.set(key, entry)
  return pending
}

/** Update only a collection that has already been loaded; never seed a partial cache. */
export function updateCached<T>(key: string, update: (value: T) => T): boolean {
  const entry = entries.get(key) as Entry<T> | undefined
  if (!entry || entry.value === undefined) return false
  entry.value = update(entry.value)
  return true
}

export function invalidateCache(key: string) { entries.delete(key) }
