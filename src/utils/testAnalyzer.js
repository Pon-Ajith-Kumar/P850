const TEST_ANALYZER_KEY = 'p850-test-analyzer-entries'
const TEST_ANALYZER_API = '/api/test-entries'

const CATEGORY_LABELS = {
  dpp: 'DPP',
  'test-series': 'Test Series',
  'full-length': 'Full Length',
  'previous-paper': 'Previous Gate Paper',
}

const SOURCE_LABELS = {
  pw: 'PW',
  go: 'GO',
  vg: 'VG',
  nptel: 'NPTEL',
  other: 'Other',
}

function safeRead(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function safeWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore storage write failures
  }
}

export function normalizeCategory(value) {
  const normalized = String(value || '').trim().toLowerCase()

  if (normalized === 'dpp') return 'dpp'
  if (normalized === 'test-series' || normalized === 'test series') return 'test-series'
  if (normalized === 'full-length' || normalized === 'full length') return 'full-length'
  if (normalized === 'previous-paper' || normalized === 'previous paper' || normalized === 'gate paper' || normalized === 'previous gate paper') return 'previous-paper'

  return 'dpp'
}

export function normalizeSource(value) {
  const normalized = String(value || '').trim().toLowerCase()

  if (normalized === 'pw') return 'pw'
  if (normalized === 'go') return 'go'
  if (normalized === 'vg') return 'vg'
  if (normalized === 'nptel') return 'nptel'

  return 'other'
}

export function parseDateString(date) {
  const raw = typeof date === 'string' ? date.trim() : ''
  if (!raw) return new Date(0)

  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!match) return new Date(raw)

  const [, day, month, yearText] = match
  const year = Number(yearText.length === 2 ? `20${yearText}` : yearText)
  const parsed = new Date(year, Number(month) - 1, Number(day))
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed
}

export function normalizeTestEntry(rawEntry = {}) {
  const category = normalizeCategory(rawEntry.category)
  const subject = String(rawEntry.subject || '').trim() || (category === 'dpp' || category === 'test-series' ? 'Combined Subjects' : '')
  const obtained = Number(rawEntry.obtained ?? 0)
  const total = Number(rawEntry.total ?? 0)
  const safeTotal = total > 0 ? total : 1

  return {
    id: rawEntry.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    category,
    source: normalizeSource(rawEntry.source),
    subject,
    name: String(rawEntry.name || 'Untitled Test').trim() || 'Untitled Test',
    date: String(rawEntry.date || '').trim(),
    comment: String(rawEntry.comment || '').trim(),
    obtained: Number.isFinite(obtained) ? obtained : 0,
    total: Number.isFinite(total) ? total : 0,
    createdAt: rawEntry.createdAt || Date.now(),
    correctPercent: Math.min(Math.max((obtained / safeTotal) * 100, 0), 100),
    wrongPercent: Math.min(Math.max(((safeTotal - obtained) / safeTotal) * 100, 0), 100),
    accuracyPercent: Math.min(Math.max((obtained / safeTotal) * 100, 0), 100),
    displayDate: String(rawEntry.date || '').trim(),
    type: category,
    provider: normalizeSource(rawEntry.source),
  }
}

export function calculatePerformance(obtained, total) {
  const safeObtained = Number(obtained) || 0
  const safeTotal = Number(total) > 0 ? Number(total) : 1
  const correctPercent = Number(Math.min(Math.max((safeObtained / safeTotal) * 100, 0), 100).toFixed(2))
  const wrongPercent = Number(Math.min(Math.max(((safeTotal - safeObtained) / safeTotal) * 100, 0), 100).toFixed(2))

  return {
    correctPercent,
    wrongPercent,
    accuracyPercent: correctPercent,
    obtained: safeObtained,
    total: safeTotal,
  }
}

export async function fetchTestEntriesFromApi() {
  if (typeof fetch !== 'function') return getTestEntries()

  const response = await fetch(TEST_ANALYZER_API, { cache: 'no-store' })
  if (!response.ok) throw new Error('Could not load saved test results.')

  const payload = await response.json()
  const entries = Array.isArray(payload) ? payload.map((entry) => normalizeTestEntry(entry)) : []
  safeWrite(TEST_ANALYZER_KEY, entries)
  return entries
}

export function getTestEntries() {
  const entries = safeRead(TEST_ANALYZER_KEY, [])
  return (Array.isArray(entries) ? entries : []).map((entry) => normalizeTestEntry(entry))
}

export function saveTestEntries(entries) {
  safeWrite(TEST_ANALYZER_KEY, Array.isArray(entries) ? entries.map((entry) => normalizeTestEntry(entry)) : [])
}

export async function addTestEntry(entry) {
  const normalized = normalizeTestEntry(entry)
  if (typeof fetch !== 'function') {
    const nextEntries = [...getTestEntries(), normalized]
    saveTestEntries(nextEntries)
    return nextEntries
  }

  const response = await fetch(TEST_ANALYZER_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(normalized),
  })
  if (!response.ok) throw new Error('Could not save the test result.')
  const payload = await response.json()
  const nextEntries = Array.isArray(payload) ? payload.map((item) => normalizeTestEntry(item)) : [...getTestEntries(), normalized]
  saveTestEntries(nextEntries)
  return nextEntries
}

export async function updateTestEntry(id, updates) {
  const currentEntries = getTestEntries()
  const nextEntries = currentEntries.map((entry) => entry.id === id ? normalizeTestEntry({ ...entry, ...updates }) : entry)
  if (typeof fetch !== 'function') {
    saveTestEntries(nextEntries)
    return nextEntries
  }

  const response = await fetch(TEST_ANALYZER_API + '/' + encodeURIComponent(id), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!response.ok) throw new Error('Could not update the test result.')
  const payload = await response.json()
  const savedEntries = Array.isArray(payload) ? payload.map((item) => normalizeTestEntry(item)) : nextEntries
  saveTestEntries(savedEntries)
  return savedEntries
}

export async function deleteTestEntry(id) {
  const currentEntries = getTestEntries()
  const nextEntries = currentEntries.filter((entry) => entry.id !== id)
  if (typeof fetch !== 'function') {
    saveTestEntries(nextEntries)
    return nextEntries
  }

  const response = await fetch(TEST_ANALYZER_API + '/' + encodeURIComponent(id), { method: 'DELETE' })
  if (!response.ok) throw new Error('Could not delete the test result.')
  const payload = await response.json()
  const savedEntries = Array.isArray(payload) ? payload.map((item) => normalizeTestEntry(item)) : nextEntries
  saveTestEntries(savedEntries)
  return savedEntries
}

export function sortTestEntries(entries) {
  return [...entries].sort((a, b) => {
    const dateA = parseDateString(a.date)
    const dateB = parseDateString(b.date)
    const byDate = dateB.getTime() - dateA.getTime()
    if (byDate !== 0) return byDate
    return (b.createdAt || 0) - (a.createdAt || 0)
  })
}

export function getCategoryLabel(category) {
  return CATEGORY_LABELS[normalizeCategory(category)] || 'DPP'
}

export function getSourceLabel(source) {
  return SOURCE_LABELS[normalizeSource(source)] || 'Other'
}

export function getTestSummary(entries) {
  const safeEntries = Array.isArray(entries) ? entries : []
  const total = safeEntries.length
  const correct = safeEntries.reduce((sum, entry) => sum + (Number(entry.obtained) || 0), 0)
  const maxMarks = safeEntries.reduce((sum, entry) => sum + (Number(entry.total) || 0), 0)
  const averagePercentage = maxMarks > 0 ? (correct / maxMarks) * 100 : 0

  return {
    total,
    averagePercentage,
    totalMarks: maxMarks,
    obtainedMarks: correct,
  }
}

export function exportTestEntriesJson(entries) {
  const safeEntries = Array.isArray(entries) ? entries : []
  return JSON.stringify(safeEntries.map((entry) => normalizeTestEntry(entry)), null, 2)
}

export function exportTestEntriesTable(entries) {
  const safeEntries = Array.isArray(entries) ? entries : []
  const rows = [
    ['Type', 'Series', 'Test', 'Date', 'Marks', 'Correct', 'Wrong', 'Comment'],
    ...safeEntries.map((entry) => {
      const correctPercent = Number(entry.correctPercent ?? calculatePerformance(entry.obtained, entry.total).correctPercent) || 0
      const wrongPercent = Number(entry.wrongPercent ?? calculatePerformance(entry.obtained, entry.total).wrongPercent) || 0
      return [
        getCategoryLabel(entry.category),
        getSourceLabel(entry.source),
        entry.name || 'Untitled Test',
        entry.date || '',
        `${entry.obtained ?? 0}/${entry.total ?? 0}`,
        `${correctPercent.toFixed(1)}%`,
        `${wrongPercent.toFixed(1)}%`,
        entry.comment || '',
      ]
    }),
  ]

  const escapeCell = (value) => {
    const text = String(value ?? '')
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }

  return rows.map((row) => row.map(escapeCell).join(',')).join('\r\n')
}

export function importTestEntriesJson(rawText) {
  if (!rawText || !String(rawText).trim()) {
    return []
  }

  const parsed = JSON.parse(rawText)
  if (!Array.isArray(parsed)) {
    throw new Error('Import JSON must contain an array of test entries.')
  }

  return parsed.map((entry) => normalizeTestEntry(entry))
}

export function getTrendSummary(entries) {
  const categories = ['test-series', 'full-length', 'dpp', 'previous-paper']
  const sourceColorByValue = {
    pw: 'black',
    go: 'red',
    vg: 'orange',
    nptel: 'yellow',
    other: 'slate',
  }
  const colorByCategory = {
    dpp: 'emerald',
    'test-series': 'violet',
    'full-length': 'sky',
    'previous-paper': 'amber',
  }

  return categories.map((category) => {
    const categoryEntries = entries.filter((entry) => entry.category === category)
    const recentEntries = sortTestEntries(categoryEntries).slice(0, 5)
    const average = categoryEntries.length
      ? categoryEntries.reduce((sum, entry) => sum + (Number(entry.correctPercent) || 0), 0) / categoryEntries.length
      : 0

    const subjectGroups = []
    if (category === 'dpp' || category === 'test-series') {
      const grouped = new Map()

      for (const entry of categoryEntries) {
        const subjectName = entry.subject || 'Combined Subjects'
        if (!grouped.has(subjectName)) {
          grouped.set(subjectName, { subject: subjectName, values: [] })
        }
        grouped.get(subjectName).values.push({
          value: Number(entry.correctPercent) || 0,
          source: entry.source,
          color: sourceColorByValue[entry.source] || sourceColorByValue.other,
        })
      }

      for (const [subjectName, group] of grouped.entries()) {
        const subjectAverage = group.values.length
          ? group.values.reduce((sum, item) => sum + item.value, 0) / group.values.length
          : 0

        subjectGroups.push({
          subject: subjectName,
          average: subjectAverage,
          values: group.values,
          color: colorByCategory[category],
        })
      }
    }

    return {
      category,
      label: getCategoryLabel(category),
      average,
      count: categoryEntries.length,
      color: colorByCategory[category],
      subjects: subjectGroups,
      trend: recentEntries.map((entry) => ({
        value: Number(entry.correctPercent) || 0,
        source: entry.source,
        color: sourceColorByValue[entry.source] || sourceColorByValue.other,
        subject: entry.subject || 'Combined Subjects',
        scored: Number(entry.obtained) || 0,
        total: Number(entry.total) || 0,
      })),
    }
  })
}
