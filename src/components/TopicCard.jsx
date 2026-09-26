import { ChevronRight, NotebookPen } from 'lucide-react'
import { Link } from 'react-router-dom'

function TopicCard({ subjectId, topic }) {
  return (
    <Link
      to={`/subjects/${subjectId}/${topic.id}`}
      className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-200 hover:bg-emerald-50/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-500 dark:hover:bg-slate-800/80"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <NotebookPen size={16} />
        </div>
        <div>
          <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">{topic.name}</h4>
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            {topic.images.length} notes
          </p>
        </div>
      </div>

      <ChevronRight size={18} className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-600" />
    </Link>
  )
}

export default TopicCard
