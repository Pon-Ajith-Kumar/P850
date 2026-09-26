import { AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import subjectsData from '../data/subjects.json'
import { startLivePolling } from '../utils/liveSync'
import { addMistake, deleteMistake, fetchMistakesFromApi, getMistakes, getMistakesBySubject } from '../utils/mistakes'

const defaultFormState = {
  subjectId: 'c-programming',
  text: '',
}

function Mistakes() {
  const [mistakesBySubject, setMistakesBySubject] = useState({})
  const [form, setForm] = useState(defaultFormState)
  const [error, setError] = useState('')

  const subjects = subjectsData.subjects

  useEffect(() => {
    let isMounted = true

    const syncMistakes = async () => {
      try {
        const nextEntries = await fetchMistakesFromApi()
        if (!isMounted) return
        const grouped = {}
        for (const subject of subjects) grouped[subject.id] = nextEntries.filter((entry) => entry.subjectId === subject.id)
        setMistakesBySubject(grouped)
        setError('')
      } catch (loadError) {
        if (isMounted) setError(loadError.message || 'Could not load saved mistakes.')
      }
    }

    const stopPolling = startLivePolling({
      fetcher: fetchMistakesFromApi,
      onData: (nextEntries) => {
        if (!isMounted) return
        const grouped = {}
        for (const subject of subjects) {
          grouped[subject.id] = nextEntries.filter((entry) => entry.subjectId === subject.id)
        }
        setMistakesBySubject(grouped)
      },
      intervalMs: 4000,
      enabled: true,
    })

    return () => {
      isMounted = false
      stopPolling()
    }
  }, [subjects])

  const recentMistakes = useMemo(() => getMistakes().slice(0, 5), [])

  const handleAddMistake = async (event) => {
    event.preventDefault()
    const subject = subjects.find((item) => item.id === form.subjectId)

    try {
      const nextEntry = await addMistake({
        subjectId: subject?.id || form.subjectId,
        subjectName: subject?.name || 'Unknown Subject',
        text: form.text,
      })

      if (!nextEntry) {
        setError('Type a mistake before saving.')
        return
      }

      setForm(defaultFormState)
      setError('')
      setMistakesBySubject((prev) => ({
        ...prev,
        [subject?.id || form.subjectId]: [nextEntry, ...(prev[subject?.id || form.subjectId] || [])],
      }))
    } catch (saveError) {
      setError(saveError.message || 'Could not save the mistake.')
    }
  }

  const handleDelete = async (subjectId, mistakeId) => {
    try {
      const nextEntries = await deleteMistake(mistakeId)
      const grouped = {}
      for (const subject of subjects) grouped[subject.id] = nextEntries.filter((entry) => entry.subjectId === subject.id)
      setMistakesBySubject(grouped)
      setError('')
    } catch (deleteError) {
      setError(deleteError.message || 'Could not delete the mistake.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="text-amber-600" size={20} />
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Mistakes</h2>
        </div>

        <form onSubmit={handleAddMistake} className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)_auto]">
          <select
            value={form.subjectId}
            onChange={(event) => setForm((prev) => ({ ...prev, subjectId: event.target.value }))}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>

          <input
            value={form.text}
            onChange={(event) => setForm((prev) => ({ ...prev, text: event.target.value }))}
            placeholder="Type the mistake you want to remember..."
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-400"
          >
            <Plus size={16} />
            Add
          </button>
        </form>

        {error ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      </div>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Recent mistakes</h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject) => {
            const entries = mistakesBySubject[subject.id] || []
            if (entries.length === 0) return null

            return (
              <div key={subject.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700 dark:text-slate-200">{subject.name}</h4>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    {entries.length}
                  </span>
                </div>

                <ul className="space-y-2">
                  {entries.map((entry) => (
                    <li key={entry.id} className="rounded-xl border border-amber-200 bg-white p-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-slate-700 dark:text-slate-200">{entry.text}</p>
                        <button
                          type="button"
                          onClick={() => handleDelete(subject.id, entry.id)}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                          aria-label="Delete mistake"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}

export default Mistakes
