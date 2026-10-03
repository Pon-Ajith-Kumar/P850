import test from 'node:test'
import assert from 'node:assert/strict'

const { sortTestEntries, calculatePerformance, getTrendSummary, normalizeTestEntry, exportTestEntriesTable } = await import('../src/utils/testAnalyzer.js')
const { addMistake, deleteMistake, getRecentMistakes, updateMistake } = await import('../src/utils/mistakes.js')

if (typeof localStorage !== 'undefined') {
  localStorage.clear()
}

test('calculatePerformance returns correct and wrong percentages from marks and total marks', () => {
  const result = calculatePerformance(72, 100)

  assert.equal(result.correctPercent, 72)
  assert.equal(result.wrongPercent, 28)
  assert.equal(result.accuracyPercent, 72)
})

test('sortTestEntries orders the latest date first even when the stored format is dd/mm/yy', () => {
  const entries = [
    normalizeTestEntry({ id: 'b', category: 'dpp', source: 'pw', name: 'DPP 1', date: '12/06/25', obtained: 50, total: 100 }),
    normalizeTestEntry({ id: 'a', category: 'full-length', source: 'go', name: 'Mock G0', date: '28/04/25', obtained: 80, total: 100 }),
    normalizeTestEntry({ id: 'c', category: 'test-series', source: 'vg', name: 'VG Test', date: '30/06/25', obtained: 60, total: 100 }),
  ]

  const sorted = sortTestEntries(entries)

  assert.deepEqual(sorted.map((entry) => entry.id), ['c', 'b', 'a'])
})

test('normalizeTestEntry keeps the category and source labels consistent for display', () => {
  const normalized = normalizeTestEntry({
    id: 't-1',
    category: 'test-series',
    source: 'pw',
    name: 'PW Mock',
    date: '01/02/26',
    obtained: 40,
    total: 80,
  })

  assert.equal(normalized.category, 'test-series')
  assert.equal(normalized.source, 'pw')
  assert.equal(normalized.name, 'PW Mock')
})

test('getTrendSummary preserves subject groups for dpp and test-series entries and uses separate category colors', () => {
  const entries = [
    normalizeTestEntry({ id: 'dpp-a', category: 'dpp', source: 'pw', subject: 'Data Structures', name: 'DPP 1', date: '01/02/26', obtained: 60, total: 100 }),
    normalizeTestEntry({ id: 'dpp-b', category: 'dpp', source: 'pw', subject: 'Algorithms', name: 'DPP 2', date: '02/02/26', obtained: 70, total: 100 }),
    normalizeTestEntry({ id: 'ts-a', category: 'test-series', source: 'go', subject: 'Combined Subjects', name: 'Mock 1', date: '03/02/26', obtained: 80, total: 100 }),
  ]

  const summary = getTrendSummary(entries)
  const dppItem = summary.find((item) => item.category === 'dpp')
  const testSeriesItem = summary.find((item) => item.category === 'test-series')

  assert.equal(dppItem.subjects.length, 2)
  assert.equal(testSeriesItem.subjects.length, 1)
  assert.equal(dppItem.color, 'emerald')
  assert.equal(testSeriesItem.color, 'violet')
})

test('getTrendSummary orders categories as test-series, full-length, dpp, previous-paper and colors by source', () => {
  const entries = [
    normalizeTestEntry({ id: 'x1', category: 'dpp', source: 'pw', name: 'DPP', date: '01/02/26', obtained: 60, total: 100 }),
    normalizeTestEntry({ id: 'x2', category: 'test-series', source: 'go', name: 'GO Mock', date: '02/02/26', obtained: 70, total: 100 }),
    normalizeTestEntry({ id: 'x3', category: 'full-length', source: 'nptel', name: 'NPTEL Mock', date: '03/02/26', obtained: 80, total: 100 }),
    normalizeTestEntry({ id: 'x4', category: 'previous-paper', source: 'vg', name: 'VG Mock', date: '04/02/26', obtained: 90, total: 100 }),
  ]

  const summary = getTrendSummary(entries)
  assert.deepEqual(summary.map((item) => item.category), ['test-series', 'full-length', 'dpp', 'previous-paper'])
  assert.equal(summary[0].trend[0].source, 'go')
  assert.equal(summary[2].trend[0].source, 'pw')
  assert.equal(summary[3].trend[0].source, 'vg')
  assert.equal(summary[1].trend[0].source, 'nptel')
})

test('getTrendSummary includes subject, scored, and total metadata for chart tooltips in dpp and test-series logs', () => {
  const entries = [
    normalizeTestEntry({ id: 'ts-a', category: 'test-series', source: 'go', subject: 'Algorithms', name: 'GO Mock 1', date: '01/02/26', obtained: 80, total: 120 }),
    normalizeTestEntry({ id: 'dpp-a', category: 'dpp', source: 'pw', subject: 'Data Structures', name: 'DPP 2', date: '02/02/26', obtained: 72, total: 100 }),
  ]

  const summary = getTrendSummary(entries)
  const tsItem = summary.find((item) => item.category === 'test-series')
  const dppItem = summary.find((item) => item.category === 'dpp')

  assert.equal(tsItem.trend[0].subject, 'Algorithms')
  assert.equal(tsItem.trend[0].scored, 80)
  assert.equal(tsItem.trend[0].total, 120)
  assert.equal(dppItem.trend[0].subject, 'Data Structures')
  assert.equal(dppItem.trend[0].scored, 72)
  assert.equal(dppItem.trend[0].total, 100)
})

test('exportTestEntriesTable exports a spreadsheet-friendly CSV table', () => {
  const entries = [
    normalizeTestEntry({ category: 'dpp', source: 'pw', subject: 'Data Structures', name: 'DPP 1', date: '04/05/26', obtained: 72, total: 100, comment: 'Strong' }),
  ]

  const output = exportTestEntriesTable(entries)

  assert.match(output, /^Type,Series,Test,Date,Marks,Correct,Wrong,Comment\r?\n/)
  assert.match(output, /DPP,PW,DPP 1,04\/05\/26,72\/100,72\.0%,28\.0%,Strong/)
})

test('mistake entries can be updated before they are removed', async () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.clear()
  }

  const originalFetch = globalThis.fetch
  globalThis.fetch = undefined

  try {
    const created = await addMistake({ subjectId: 'c-programming', subjectName: 'C Programming', text: 'Forgot to initialize loop variable' })
    const updated = await updateMistake(created.id, {
      subjectId: 'data-structures',
      subjectName: 'Data Structures',
      text: 'Forgot to reset traversal pointer',
    })

    assert.equal(updated.subjectId, 'data-structures')
    assert.equal(updated.subjectName, 'Data Structures')
    assert.equal(updated.text, 'Forgot to reset traversal pointer')
    assert.equal(getRecentMistakes(1)[0].id, created.id)

    const remaining = await deleteMistake(created.id)
    assert.equal(remaining.some((entry) => entry.id === created.id), false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('mistake entries stay newest-first and can be removed', async () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.clear()
  }

  // addMistake/deleteMistake call the server API when fetch is available (as it is in
  // Node 22+); both must be awaited or the assertions below run before the entry is
  // actually saved. Force the localStorage-only fallback here since this test only
  // cares about the newest-first ordering logic, not the network round trip.
  const originalFetch = globalThis.fetch
  globalThis.fetch = undefined

  try {
    const first = await addMistake({ subjectId: 'c-programming', subjectName: 'C Programming', text: 'Forgot to initialize loop variable' })
    const second = await addMistake({ subjectId: 'c-programming', subjectName: 'C Programming', text: 'Used wrong pointer condition' })

    const recent = getRecentMistakes(2)
    assert.equal(recent[0].id, second.id)
    assert.equal(recent[0].text, 'Used wrong pointer condition')

    const remaining = await deleteMistake(first.id)
    assert.equal(remaining.some((entry) => entry.id === first.id), false)
    assert.equal(remaining.some((entry) => entry.id === second.id), true)
  } finally {
    globalThis.fetch = originalFetch
  }
})
