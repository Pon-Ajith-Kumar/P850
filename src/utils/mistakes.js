const MISTAKES_KEY = 'p850-mistakes'
const MISTAKES_API = '/api/mistakes'
const MEMORY_STORE = {}

function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) return globalThis.localStorage
  return {
    getItem: (key) => (key in MEMORY_STORE ? MEMORY_STORE[key] : null),
    setItem: (key, value) => { MEMORY_STORE[key] = value },
    removeItem: (key) => { delete MEMORY_STORE[key] },
  }
}

function safeRead(key, fallback = []) {
  try {
    const raw = getStorage().getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function safeWrite(key, value) {
  try {
    getStorage().setItem(key, JSON.stringify(value))
  } catch {
    // The server remains the source of truth if browser storage is unavailable.
  }
}

export async function fetchMistakesFromApi() {
  if (typeof fetch !== 'function') return getMistakes()

  const response = await fetch(MISTAKES_API, { cache: 'no-store' })
  if (!response.ok) throw new Error('Could not load saved mistakes.')
  const payload = await response.json()
  const entries = Array.isArray(payload) ? payload : []
  safeWrite(MISTAKES_KEY, entries)
  return entries
}

export function getMistakes() {
  const entries = safeRead(MISTAKES_KEY, [])
  return Array.isArray(entries) ? entries : []
}

export async function addMistake({ subjectId, subjectName, text }) {
  const trimmed = String(text || '').trim()
  if (!subjectId || !trimmed) return null

  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    subjectId,
    subjectName: subjectName || 'Unknown Subject',
    text: trimmed,
    createdAt: Date.now(),
  }

  if (typeof fetch !== 'function') {
    const nextEntries = [entry, ...getMistakes()]
    safeWrite(MISTAKES_KEY, nextEntries)
    return entry
  }

  const response = await fetch(MISTAKES_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  })
  if (!response.ok) throw new Error('Could not save the mistake.')
  const payload = await response.json()
  const nextEntries = Array.isArray(payload) ? payload : [entry, ...getMistakes()]
  safeWrite(MISTAKES_KEY, nextEntries)
  return nextEntries.find((item) => item.id === entry.id) || entry
}

export async function updateMistake(id, { subjectId, subjectName, text } = {}) {
  const existing = getMistakes().find((entry) => String(entry.id) === String(id))
  const trimmed = String(text ?? '').trim()
  const nextSubjectId = String(subjectId || existing?.subjectId || '').trim()

  if (!id || !nextSubjectId || !trimmed) return null

  const updates = {
    subjectId: nextSubjectId,
    subjectName: subjectName || existing?.subjectName || 'Unknown Subject',
    text: trimmed,
    updatedAt: Date.now(),
  }

  const currentEntries = getMistakes()
  const nextEntries = currentEntries.map((entry) => (String(entry.id) === String(id) ? { ...entry, ...updates } : entry))

  if (typeof fetch !== 'function') {
    safeWrite(MISTAKES_KEY, nextEntries)
    return nextEntries.find((entry) => String(entry.id) === String(id)) || null
  }

  const response = await fetch(MISTAKES_API + '/' + encodeURIComponent(id), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!response.ok) throw new Error('Could not update the mistake.')
  const payload = await response.json()
  const savedEntries = Array.isArray(payload) ? payload : nextEntries
  safeWrite(MISTAKES_KEY, savedEntries)
  return savedEntries.find((entry) => String(entry.id) === String(id)) || nextEntries.find((entry) => String(entry.id) === String(id)) || null
}

export async function deleteMistake(id) {
  const nextEntries = getMistakes().filter((entry) => entry.id !== id)
  if (typeof fetch !== 'function') {
    safeWrite(MISTAKES_KEY, nextEntries)
    return nextEntries
  }

  const response = await fetch(MISTAKES_API + '/' + encodeURIComponent(id), { method: 'DELETE' })
  if (!response.ok) throw new Error('Could not delete the mistake.')
  const payload = await response.json()
  const savedEntries = Array.isArray(payload) ? payload : nextEntries
  safeWrite(MISTAKES_KEY, savedEntries)
  return savedEntries
}

export function getMistakesBySubject(subjectId) {
  return getMistakes().filter((entry) => entry.subjectId === subjectId)
}

export function getRecentMistakes(limit = 3) {
  return getMistakes().slice(0, Math.max(0, Number(limit) || 0))
}
