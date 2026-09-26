import { ArrowRight, BookOpenCheck, FolderKanban, Layers3 } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import SubjectCard from '../components/SubjectCard'
import subjectsData from '../data/subjects.json'

const RESUME_KEY = 'p850-last-resume'

function Dashboard() {
  const subjects = subjectsData.subjects
  const totalTopics = subjects.reduce((sum, subject) => sum + subject.topics.length, 0)
  const totalNotes = subjects.reduce(
    (sum, subject) => sum + subject.topics.reduce((topicSum, topic) => topicSum + topic.images.length, 0),
    0,
  )

  const resume = useMemo(() => {
    try {
      const saved = localStorage.getItem(RESUME_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  }, [])

  const defaultSubject = subjects[3] ?? subjects[0]
  const defaultTopic = defaultSubject?.topics[0]

  const continueSubject =
    (resume && subjects.find((subject) => subject.id === resume.subjectId)) || defaultSubject
  const continueTopic =
    (continueSubject && continueSubject.topics.find((topic) => topic.id === resume?.topicId)) ||
    defaultTopic
  const continuePage = Number.isInteger(resume?.currentPage) ? resume.currentPage : 0
  const currentPageDisplay = Math.min(Math.max(continuePage + 1, 1), continueTopic?.images?.length || 1)

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400">P850</p>
            <h2 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">MISSION GATE CSE</h2>
          </div>

          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
            <span className="font-semibold">Overall progress</span>
            <span className="ml-2">64%</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-3">
        {[
          { label: 'Total subjects', value: subjects.length, icon: FolderKanban },
          { label: 'Total topics', value: totalTopics, icon: Layers3 },
          { label: 'Total notes', value: totalNotes, icon: BookOpenCheck },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
              <div className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300">
                <Icon size={16} />
              </div>
            </div>
            <p className="mt-4 text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Continue Studying</h3>
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Last opened</span>
        </div>

        <div className="flex flex-col gap-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/80 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{continueSubject?.name}</p>
            <h4 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{continueTopic?.name}</h4>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Page {currentPageDisplay} of {continueTopic?.images.length || 0}</p>
          </div>

          <Link
            to={continueSubject && continueTopic ? `/subjects/${continueSubject.id}/${continueTopic.id}?page=${Math.max(continuePage, 0)}` : '/subjects'}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-500"
          >
            Continue
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Subjects</h3>
          <Link to="/subjects" className="text-sm font-medium text-amber-600 dark:text-amber-400">View all</Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      </section>
    </div>
  )
}

export default Dashboard
