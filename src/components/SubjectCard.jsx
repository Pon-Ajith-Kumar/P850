import { ArrowRight, BookText, FolderOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getSubjectProgress } from '../utils/progress'

function SubjectCard({ subject }) {
  const totalNotes = subject.topics.reduce((sum, topic) => sum + topic.images.length, 0)
  const totalTopics = subject.topics.length
  const progress = getSubjectProgress(subject)

  return (
    <Link
      to={`/subjects/${subject.id}`}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">{subject.shortName}</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">{subject.name}</h3>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
          {progress}%
        </span>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-300">
        <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
          <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100">
            <FolderOpen size={15} />
            {totalTopics}
          </div>
          <span className="text-xs">Topics</span>
        </div>
        <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
          <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100">
            <BookText size={15} />
            {totalNotes}
          </div>
          <span className="text-xs">Notes</span>
        </div>
      </div>

      <div className="mt-auto">
        <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        Open topic
        <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
}

export default SubjectCard
