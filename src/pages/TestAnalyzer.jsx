import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, Download, Filter, Plus, Trash2 } from 'lucide-react'
import { startLivePolling } from '../utils/liveSync'
import {
  addTestEntry,
  deleteTestEntry,
  exportTestEntriesTable,
  fetchTestEntriesFromApi,
  getCategoryLabel,
  getSourceLabel,
  getTestEntries,
  getTestSummary,
  getTrendSummary,
  importTestEntriesJson,
  normalizeTestEntry,
  sortTestEntries,
  updateTestEntry,
} from '../utils/testAnalyzer'

const defaultFormState = {
  category: 'dpp',
  source: 'pw',
  subject: 'Combined Subjects',
  name: '',
  date: '',
  obtained: '',
  total: '',
  comment: '',
}

const categoryOrder = ['dpp', 'test-series', 'full-length', 'previous-paper']
const categoryOptions = [
  { value: 'dpp', label: 'DPP' },
  { value: 'test-series', label: 'Test Series' },
  { value: 'full-length', label: 'Full Length' },
  { value: 'previous-paper', label: 'Previous Gate Paper' },
]

const sourceOptions = [
  { value: 'pw', label: 'PW' },
  { value: 'go', label: 'GO' },
  { value: 'vg', label: 'VG' },
  { value: 'nptel', label: 'NPTEL' },
  { value: 'other', label: 'Other' },
]

const subjectOptions = [
  'Combined Subjects',
  'Discrete Maths',
  'Engineering Maths',
  'Aptitude',
  'C Programming',
  'Data Structures',
  'Algorithms',
  'Theory of Computation',
  'Compiler Design',
  'Digital Logic',
  'COA',
  'Operating System',
  'DBMS',
  'Computer Networks',
]

const trendColorClasses = {
  emerald: 'from-emerald-500 to-emerald-300',
  violet: 'from-violet-500 to-violet-300',
  sky: 'from-sky-500 to-sky-300',
  amber: 'from-amber-500 to-amber-300',
  red: 'from-red-500 to-red-300',
  black: 'from-slate-900 to-slate-600',
  yellow: 'from-yellow-400 to-yellow-200',
  orange: 'from-orange-500 to-orange-300',
  slate: 'from-slate-500 to-slate-300',
}

const sourceToneMap = {
  pw: { fill: '#bfdbfe', stroke: '#3b82f6' },
  go: { fill: '#fecaca', stroke: '#ef4444' },
  vg: { fill: '#fed7aa', stroke: '#f97316' },
  nptel: { fill: '#fef3c7', stroke: '#f59e0b' },
  other: { fill: '#e2e8f0', stroke: '#64748b' },
}

function formatDateInput(value) {
  if (!value) return ''
  const digits = value.replace(/\D/g, '').slice(0, 6)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

function TestAnalyzer() {
  const [entries, setEntries] = useState([])
  const [form, setForm] = useState(defaultFormState)
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')
  const [activeDot, setActiveDot] = useState(null)

  useEffect(() => {
    const loadEntries = async () => {
      try {
        const nextEntries = await fetchTestEntriesFromApi()
        setEntries(nextEntries)
        setError('')
      } catch (loadError) {
        setError(loadError.message || 'Could not load saved test results.')
      }
    }

    const stopPolling = startLivePolling({
      fetcher: fetchTestEntriesFromApi,
      onData: setEntries,
      intervalMs: 4000,
      enabled: true,
    })

    return () => {
      stopPolling()
    }
  }, [])

  const filteredEntries = useMemo(() => {
    const sortedEntries = sortTestEntries(entries)
    if (filter === 'all') return sortedEntries
    return sortedEntries.filter((entry) => entry.category === filter)
  }, [entries, filter])

  const summary = useMemo(() => getTestSummary(entries), [entries])
  const trendSummary = useMemo(() => getTrendSummary(entries), [entries])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.name.trim()) {
      setError('Enter a valid test name.')
      return
    }

    const obtained = Number(form.obtained)
    const total = Number(form.total)
    if (!Number.isFinite(obtained) || !Number.isFinite(total) || total <= 0) {
      setError('Enter valid marks and total marks.')
      return
    }

    const normalized = normalizeTestEntry({
      ...form,
      subject: form.category === 'dpp' || form.category === 'test-series' ? form.subject || 'Combined Subjects' : '',
      obtained,
      total,
      date: form.date,
      comment: form.comment,
      createdAt: Date.now(),
    })

    try {
      const nextEntries = await addTestEntry(normalized)
      setEntries(nextEntries)
      resetForm()
    } catch (saveError) {
      setError(saveError.message || 'Could not save the test result.')
    }
  }

  const handleDelete = async (id) => {
    try {
      setEntries(await deleteTestEntry(id))
      setError('')
    } catch (deleteError) {
      setError(deleteError.message || 'Could not delete the test result.')
    }
  }

  const handleUpdate = async (id, field, value) => {
    try {
      setEntries(await updateTestEntry(id, { [field]: value }))
      setError('')
    } catch (updateError) {
      setError(updateError.message || 'Could not update the test result.')
    }
  }

  const resetForm = () => {
    setForm(defaultFormState)
    setError('')
  }

  const handleExport = () => {
    const table = exportTestEntriesTable(entries)
    const blob = new Blob([table], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'p850-test-analyzer-data.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-400">Analytics</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Test Analyzer</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              aria-label="Export test data"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Download size={17} />
            </button>

          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
          <div className="mb-3 flex items-center gap-2">
            <Filter size={16} className="text-emerald-600" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Mark entry</h3>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <label className="space-y-1 text-sm text-slate-600 dark:text-slate-300 xl:col-span-1">
              <span>Category</span>
              <select
                value={form.category}
                onChange={(event) => {
                  const nextCategory = event.target.value
                  setForm((prev) => ({
                    ...prev,
                    category: nextCategory,
                    subject:
                      nextCategory === 'dpp' || nextCategory === 'test-series'
                        ? prev.subject || 'Combined Subjects'
                        : '',
                  }))
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none ring-0 transition focus:border-emerald-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            {(form.category === 'dpp' || form.category === 'test-series') && (
              <label className="space-y-1 text-sm text-slate-600 dark:text-slate-300 xl:col-span-1">
                <span>Subject</span>
                <select
                  value={form.subject}
                  onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none ring-0 transition focus:border-emerald-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                >
                  {subjectOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            )}

            <label className="space-y-1 text-sm text-slate-600 dark:text-slate-300 xl:col-span-1">
              <span>Series</span>
              <select
                value={form.source}
                onChange={(event) => setForm((prev) => ({ ...prev, source: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none ring-0 transition focus:border-emerald-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              >
                {sourceOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm text-slate-600 dark:text-slate-300 xl:col-span-2">
              <span>Test name</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="For example: DPP-3 / GO Mock 1"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>

            <label className="space-y-1 text-sm text-slate-600 dark:text-slate-300 xl:col-span-1">
              <span>Date</span>
              <input
                type="text"
                inputMode="numeric"
                value={form.date}
                onChange={(event) => setForm((prev) => ({ ...prev, date: formatDateInput(event.target.value) }))}
                placeholder="DD/MM/YY"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>

            <label className="space-y-1 text-sm text-slate-600 dark:text-slate-300 xl:col-span-1">
              <span>Obtained</span>
              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={form.obtained}
                onChange={(event) => setForm((prev) => ({ ...prev, obtained: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>

            <label className="space-y-1 text-sm text-slate-600 dark:text-slate-300 xl:col-span-1">
              <span>Total</span>
              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={form.total}
                onChange={(event) => setForm((prev) => ({ ...prev, total: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>

            <label className="space-y-1 text-sm text-slate-600 dark:text-slate-300 xl:col-span-6">
              <span>Comment</span>
              <textarea
                value={form.comment}
                onChange={(event) => setForm((prev) => ({ ...prev, comment: event.target.value }))}
                rows={3}
                placeholder="Add notes about weak areas, mistakes, or strategy changes..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-emerald-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>

            <div className="flex items-end gap-2 xl:col-span-2">
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500"
              >
                Save result
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Clear
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex flex-row items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Filter size={16} className="shrink-0 text-emerald-600" />
            <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100 sm:text-xl">Results table</h3>
          </div>

          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="results-filter">Filter results</label>
            <select
              id="results-filter"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-700 outline-none transition focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 sm:px-3 sm:py-2 sm:text-xs"
            >
              {[
                { value: 'all', label: 'All' },
                ...categoryOptions,
              ].map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p> : null}

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950/90 p-2 dark:border-slate-700">
          <table className="min-w-full border-separate border-spacing-y-2 text-left text-[11px] uppercase tracking-[0.16em] text-slate-200">
            <thead>
              <tr className="text-slate-300">
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Series</th>
                <th className="px-3 py-2 font-medium">Test</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Marks</th>
                <th className="px-3 py-2 font-medium">Acc</th>
                <th className="px-3 py-2 font-medium">Correct</th>
                <th className="px-3 py-2 font-medium">Wrong</th>
                <th className="px-3 py-2 font-medium">Comment</th>
                <th className="px-3 py-2 font-medium">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-10 text-center text-sm text-slate-400">
                    No test records yet.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const performance = { correctPercent: entry.correctPercent, wrongPercent: entry.wrongPercent }
                  const percent = Number(performance.correctPercent) || 0
                  const rowClass =
                    percent < 45
                      ? 'bg-red-900/70 text-red-50 shadow-red-900/30'
                      : percent >= 45 && percent < 70
                        ? 'bg-yellow-500/20 text-yellow-50 shadow-yellow-900/20'
                        : 'bg-emerald-900/70 text-emerald-50 shadow-emerald-900/30'

                  return (
                    <tr key={entry.id} className={`rounded-2xl shadow-sm ${rowClass}`}>
                      <td className="rounded-l-2xl px-3 py-3 align-top text-[10px] font-medium">
                        <span className="inline-flex rounded-lg bg-slate-900/30 px-2 py-1 text-[10px] text-slate-100">
                          {getCategoryLabel(entry.category)}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-top text-[10px]">
                        <span className="inline-flex rounded-lg bg-slate-900/30 px-2 py-1 text-[10px] text-slate-100">
                          {getSourceLabel(entry.source)}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-top text-[10px] font-medium text-white">
                        <input
                          value={entry.name}
                          onChange={(event) => handleUpdate(entry.id, 'name', event.target.value)}
                          className="w-full min-w-[120px] rounded-lg border border-white/15 bg-slate-900/40 px-2 py-1 text-[10px] text-slate-100 outline-none"
                        />
                      </td>
                      <td className="px-3 py-3 align-top text-[10px]">
                        <div className="flex items-center gap-2">
                          <CalendarDays size={12} className="text-emerald-300" />
                          <span className="text-slate-100">{entry.date || '—'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top text-[10px]">
                        <div className="flex items-center gap-2 text-slate-100">
                          <span>{entry.obtained}</span>
                          <span>/</span>
                          <span>{entry.total}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top text-[10px] font-semibold text-white">
                        {performance.correctPercent.toFixed(1)}%
                      </td>
                      <td className="px-3 py-3 align-top text-[10px] font-semibold text-white">
                        {performance.correctPercent.toFixed(1)}%
                      </td>
                      <td className="px-3 py-3 align-top text-[10px] font-semibold text-white">
                        {performance.wrongPercent.toFixed(1)}%
                      </td>
                      <td className="px-3 py-3 align-top text-[10px]">
                        <textarea
                          value={entry.comment || ''}
                          onChange={(event) => handleUpdate(entry.id, 'comment', event.target.value)}
                          rows={2}
                          placeholder="Notes"
                          className="min-w-[150px] rounded-lg border border-white/15 bg-slate-900/40 px-2 py-1 text-[10px] text-slate-100 outline-none"
                        />
                      </td>
                      <td className="rounded-r-2xl px-3 py-3 align-top text-[10px]">
                        <button
                          type="button"
                          onClick={() => handleDelete(entry.id)}
                          className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-2.5 py-1.5 text-white transition hover:bg-white/20"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2">
          <Filter size={18} className="text-emerald-600" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Performance trend</h3>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {trendSummary.map((item) => (
            <div key={item.category} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
                <span className={`rounded-full bg-${item.color}-50 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-${item.color}-700 dark:bg-${item.color}-950/40 dark:text-${item.color}-300`}>
                  {item.count}
                </span>
              </div>

              <div className="h-40 w-full">
                {item.trend.length === 0 ? (
                  <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">No data</div>
                ) : (
                  <svg viewBox="0 0 180 110" className="h-full w-full overflow-visible" role="img" aria-label={`${item.label} performance trend`}>
                    {[0, 25, 50, 75, 100].map((tick) => {
                      const y = 88 - (tick / 100) * 64
                      return (
                        <g key={tick}>
                          <line x1="18" y1={y} x2="152" y2={y} stroke="rgba(148, 163, 184, 0.25)" strokeWidth="1" />
                          <text x="8" y={y + 4} fill="currentColor" fontSize="8" className="fill-slate-500 dark:fill-slate-300">{tick}</text>
                        </g>
                      )
                    })}

                    <line x1="18" y1="24" x2="18" y2="88" stroke="rgba(148, 163, 184, 0.55)" strokeWidth="1" />
                    <line x1="18" y1="88" x2="152" y2="88" stroke="rgba(148, 163, 184, 0.55)" strokeWidth="1" />

                    {item.trend.map((point, index) => {
                      const x = 18 + (index * 134) / Math.max(1, item.trend.length - 1)
                      const y = 88 - ((Number(point.value) || 0) / 100) * 64
                      const tone = sourceToneMap[point.source] || sourceToneMap.other
                      const nextPoint = item.trend[index + 1]
                      const nextX = nextPoint ? 18 + ((index + 1) * 134) / Math.max(1, item.trend.length - 1) : null
                      const nextY = nextPoint ? 88 - ((Number(nextPoint.value) || 0) / 100) * 64 : null

                      return (
                        <g key={`${item.category}-${index}`}>
                          {nextPoint && (
                            <path
                              d={`M ${x} ${y} L ${nextX} ${nextY}`}
                              fill="none"
                              stroke={tone.stroke}
                              strokeWidth="2"
                              strokeOpacity="0.75"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          )}
                          <circle
                            cx={x}
                            cy={y}
                            r="5"
                            fill={tone.fill}
                            stroke={tone.stroke}
                            strokeWidth="1.5"
                            opacity="0.95"
                            onMouseEnter={() => setActiveDot({ category: item.category, index, point })}
                            onMouseLeave={() => setActiveDot(null)}
                            onTouchStart={(event) => {
                              event.preventDefault()
                              setActiveDot({ category: item.category, index, point })
                            }}
                          />
                          {activeDot && activeDot.category === item.category && activeDot.index === index && (
                            <g transform={`translate(${x + 8}, ${Math.max(18, y - 16)})`}>
                              <rect width="58" height="28" rx="6" fill="rgba(15, 23, 42, 0.85)" />
                              <text x="8" y="12" fill="#e2e8f0" fontSize="7">
                                {point.subject || item.label}
                              </text>
                              <text x="8" y="22" fill="#bfdbfe" fontSize="7">
                                {point.scored}/{point.total}
                              </text>
                            </g>
                          )}
                        </g>
                      )
                    })}

                    {item.trend.map((point, index) => {
                      const x = 18 + (index * 134) / Math.max(1, item.trend.length - 1)
                      return (
                        <text key={`${item.category}-label-${index}`} x={x} y="104" fill="currentColor" fontSize="7" textAnchor="middle" className="fill-slate-500 dark:fill-slate-300">
                          {index + 1}
                        </text>
                      )
                    })}
                  </svg>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                <span>Tests</span>
                <span>{item.average.toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <style>{``}</style>
    </div>
  )
}

export default TestAnalyzer
