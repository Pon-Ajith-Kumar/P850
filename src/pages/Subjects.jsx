import { AlertTriangle, ArrowRight, Check, Pencil, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SubjectCard from '../components/SubjectCard'
import subjectsData from '../data/subjects.json'
import { getRecentMistakes, updateMistake } from '../utils/mistakes'
import { getContinueStudy } from '../utils/progress'

function Subjects() {
  const subjects = subjectsData.subjects
  const { subject: continueSubject, topic: continueTopic, currentPage } = getContinueStudy(subjects)
  const safePageNumber = continueTopic?.images?.length
    ? Math.min(Math.max(currentPage, 0), continueTopic.images.length - 1) + 1
    : 1
  const resumeImage = continueTopic?.images?.[Math.min(Math.max(currentPage, 0), (continueTopic.images?.length || 1) - 1)] || null
  const recentMistakes = useMemo(() => getRecentMistakes(20), [])
  const [activeMistakeIndex, setActiveMistakeIndex] = useState(0)
  const [touchStartX, setTouchStartX] = useState(null)
  const [editingMistakeId, setEditingMistakeId] = useState(null)
  const [editingText, setEditingText] = useState('')
  const [editError, setEditError] = useState('')

  const moveMistake = (direction) => {
    if (recentMistakes.length <= 1) return
    setActiveMistakeIndex((prev) => {
      const nextIndex = (prev + direction + recentMistakes.length) % recentMistakes.length
      return nextIndex
    })
  }

  useEffect(() => {
    if (recentMistakes.length <= 1) return undefined

    const timer = window.setTimeout(() => {
      moveMistake(1)
    }, 10000)

    return () => window.clearTimeout(timer)
  }, [activeMistakeIndex, recentMistakes.length])

  const handleSwipeStart = (event) => {
    const touchX = event.touches?.[0]?.clientX ?? event.clientX
    if (typeof touchX === 'number') setTouchStartX(touchX)
  }

  const handleSwipeEnd = (event) => {
    if (touchStartX == null) return

    const touchX = event.changedTouches?.[0]?.clientX ?? event.clientX
    if (typeof touchX !== 'number') {
      setTouchStartX(null)
      return
    }

    const deltaX = touchX - touchStartX
    if (Math.abs(deltaX) > 40) {
      moveMistake(deltaX < 0 ? 1 : -1)
    }

    setTouchStartX(null)
  }

  const handleOpenEdit = () => {
    if (!activeMistake) return
    setEditingMistakeId(activeMistake.id)
    setEditingText(activeMistake.text)
    setEditError('')
  }

  const handleSaveEdit = async (event) => {
    event.preventDefault()
    if (!editingMistakeId) return

    try {
      const updated = await updateMistake(editingMistakeId, {
        subjectId: activeMistake.subjectId,
        subjectName: activeMistake.subjectName,
        text: editingText,
      })

      if (!updated) {
        setEditError('Type a mistake before saving.')
        return
      }

      setEditingMistakeId(null)
      setEditingText('')
      setEditError('')
      window.location.reload()
    } catch (saveError) {
      setEditError(saveError.message || 'Could not update the mistake.')
    }
  }

  const activeMistake = recentMistakes[activeMistakeIndex] || recentMistakes[0]

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <Link
          to={continueSubject && continueTopic ? `/subjects/${continueSubject.id}/${continueTopic.id}?page=${safePageNumber - 1}` : '/subjects'}
          className="block p-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            {resumeImage && (
              <div className="mx-auto flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[1.2rem] border border-slate-200 bg-slate-100 p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:h-28 sm:w-28">
                <img
                  src={resumeImage}
                  alt={`${continueTopic?.name || 'Resume'} preview`}
                  className="h-full w-full rounded-[0.9rem] object-contain bg-slate-50 dark:bg-slate-950"
                />
              </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-400">Continue</p>
                <h2 className="mt-1 truncate text-lg font-semibold text-slate-900 dark:text-slate-100 sm:text-xl">{continueSubject?.name}</h2>
                <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">{continueTopic?.name}</p>
              </div>

              <span className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500">
                Resume
                <ArrowRight size={16} />
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              Page {safePageNumber} of {continueTopic?.images?.length || 0}
            </span>
          </div>
        </Link>
      </section>

      {recentMistakes.length > 0 ? (
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/80 p-3 shadow-sm transition hover:shadow-md dark:border-amber-800 dark:bg-amber-950/20">
          <div className="mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <AlertTriangle size={16} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em]">Recent mistakes</span>
          </div>

          <div
            className="relative overflow-hidden rounded-2xl border border-amber-200 bg-white/80 p-3 dark:border-amber-800 dark:bg-slate-900/70"
            onTouchStart={handleSwipeStart}
            onTouchEnd={handleSwipeEnd}
            onMouseDown={handleSwipeStart}
            onMouseUp={handleSwipeEnd}
          >
            <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span>{activeMistake.subjectName}</span>
                <button
                  type="button"
                  onClick={handleOpenEdit}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                  aria-label="Edit active mistake"
                  title="Edit mistake"
                >
                  <Pencil size={12} />
                </button>
              </div>
              <span>{activeMistakeIndex + 1}/{recentMistakes.length}</span>
            </div>

            {editingMistakeId === activeMistake.id ? (
              <form onSubmit={handleSaveEdit} className="space-y-2">
                <input
                  value={editingText}
                  onChange={(event) => setEditingText(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm text-slate-700 outline-none transition focus:border-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-400"
                  >
                    <Check size={12} />
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMistakeId(null)
                      setEditingText('')
                      setEditError('')
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <X size={12} />
                    Cancel
                  </button>
                </div>
                {editError ? <p className="text-xs text-red-600 dark:text-red-400">{editError}</p> : null}
              </form>
            ) : (
              <div className="text-sm text-slate-700 transition-all duration-500 dark:text-slate-200">
                {activeMistake.text}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Subjects</h3>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default Subjects
