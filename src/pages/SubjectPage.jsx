import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import TopicCard from '../components/TopicCard'
import subjectsData from '../data/subjects.json'
import { getSubjectProgress, resolveSubjectAndTopic } from '../utils/progress'

function SubjectPage() {
  const { subjectId } = useParams()
  const { subject } = resolveSubjectAndTopic(subjectsData.subjects, subjectId, undefined)

  if (!subject) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
        Subject not found.
      </div>
    )
  }

  const totalNotes = subject.topics.reduce((sum, topic) => sum + topic.images.length, 0)
  const progress = getSubjectProgress(subject)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/subjects"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          aria-label="Back to subjects"
        >
          <ArrowLeft size={18} />
        </Link>
        <h2 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{subject.name}</h2>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 dark:bg-slate-800">{subject.topics.length} topics</span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 dark:bg-slate-800">{totalNotes} notes</span>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Progress: {progress}%</span>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Topics</h3>
        </div>

        <div className="space-y-3">
          {subject.topics.map((topic) => (
            <TopicCard key={topic.id} subjectId={subject.id} topic={topic} />
          ))}
        </div>
      </section>
    </div>
  )
}

export default SubjectPage
