const MISTAKES_KEY = 'p850-mistakes'
const MISTAKES_API = '/api/mistakes'
const MEMORY_STORE = {}

function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
    return globalThis.localStorage
  }
  return { getItem: (key) => (key in MEMORY_STORE ? MEMORY_STORE[key] : null), setItem: (key, value) => { MEMORY_STORE[key] = value }, removeItem: (key) => { delete MEMORY_STORE[key] } }
}

function safeRead(key, fallback = []) {
  try {
    const storage = getStorage()
    const raw = storage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function safeWrite(key, value) {
  try {
    const storage = getStorage()
    storage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore storage write failures
  }
}

export async function fetchMistakesFromApi() {
  if (typeof fetch !== 'function') {
    return getMistakes()
  }

  try {
    const response = await fetch(MISTAKES_API, { cache: 'no-store' })
    if (!response.ok) {
      throw new Error(`Mistakes API failed with ${response.status}`)
    }

    const payload = await response.json()
    const nextEntries = Array.isArray(payload) ? payload : []
    safeWrite(MISTAKES_KEY, nextEntries)
    return nextEntries
  } catch {
    return getMistakes()
  }
}

export function getMistakes() {
  const entries = safeRead(MISTAKES_KEY, [])
  return Array.isArray(entries) ? entries : []
}

export function addMistake({ subjectId, subjectName, text }) {
  const trimmed = String(text || '').trim()
  if (!subjectId || !trimmed) {
    return null
  }

  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    subjectId,
    subjectName: subjectName || 'Unknown Subject',
    text: trimmed,
    createdAt: Date.now(),
  }

  const nextEntries = [entry, ...getMistakes()]
  safeWrite(MISTAKES_KEY, nextEntries)
  if (typeof fetch === 'function') {
    fetch(MISTAKES_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }).catch(() => undefined)
  }
  return entry
}

export function deleteMistake(id) {
  const nextEntries = getMistakes().filter((entry) => entry.id !== id)
  safeWrite(MISTAKES_KEY, nextEntries)
  if (typeof fetch === 'function') {
    fetch(`${MISTAKES_API}/${id}`, { method: 'DELETE' }).catch(() => undefined)
  }
  return nextEntries
}

export function getMistakesBySubject(subjectId) {
  return getMistakes().filter((entry) => entry.subjectId === subjectId)
}

export function getRecentMistakes(limit = 3) {
  return getMistakes().slice(0, Math.max(0, Number(limit) || 0))
}
