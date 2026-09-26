import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import subjectsData from '../data/subjects.json'
import { startLivePolling } from '../utils/liveSync'
import { fetchBookmarksFromApi, getBookmarks } from '../utils/progress'

function Bookmarks() {
  const [bookmarks, setBookmarks] = useState([])
  const [error, setError] = useState('')
  const bookmarkPreviewMap = new Map()

  useEffect(() => {
    let isMounted = true

    const syncBookmarks = async () => {
      try {
        const nextBookmarks = await fetchBookmarksFromApi()
        if (isMounted) {
          setBookmarks(nextBookmarks)
          setError('')
        }
      } catch (loadError) {
        if (isMounted) setError(loadError.message || 'Could not load saved bookmarks.')
      }
    }

    syncBookmarks()

    const stopPolling = startLivePolling({
      fetcher: fetchBookmarksFromApi,
      onData: (nextBookmarks) => {
        if (isMounted) {
          setBookmarks(nextBookmarks)
          setError('')
        }
      },
      intervalMs: 4000,
      enabled: true,
    })

    return () => {
      isMounted = false
      stopPolling()
    }
  }, [])

  for (const subject of subjectsData.subjects) {
    for (const topic of subject.topics || []) {
      if (Array.isArray(topic.images) && topic.images.length > 0) {
        for (let index = 0; index < topic.images.length; index += 1) {
          bookmarkPreviewMap.set(`${subject.id}::${topic.id}::${index}`, topic.images[index])
        }
      }
    }
  }

  const orderedBookmarks = [...bookmarks].sort((a, b) => {
    const subjectCompare = (subjectsData.subjects.findIndex((subject) => subject.id === a.subjectId) ?? 0) - (subjectsData.subjects.findIndex((subject) => subject.id === b.subjectId) ?? 0)
    if (subjectCompare !== 0) {
      return subjectCompare
    }

    return (b.page ?? 0) - (a.page ?? 0)
  })

  const groupedBookmarks = new Map()
  for (const bookmark of orderedBookmarks) {
    const groupKey = bookmark.subjectId
    if (!groupedBookmarks.has(groupKey)) {
      groupedBookmarks.set(groupKey, [])
    }

    groupedBookmarks.get(groupKey).push(bookmark)
  }

  return (
    <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Bookmarks</h2>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
          {orderedBookmarks.length}
        </span>
      </div>

      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      {orderedBookmarks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
          No bookmarks saved yet.
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(groupedBookmarks.entries()).map(([subjectId, group]) => {
            const subjectMeta = subjectsData.subjects.find((subject) => subject.id === subjectId)
            const sortedGroup = [...group].sort((a, b) => (b.page ?? 0) - (a.page ?? 0))

            return (
              <div key={subjectId} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{subjectMeta?.name || 'Subject'}</h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {sortedGroup.length}
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {sortedGroup.map((bookmark) => {
                    const previewImage = bookmark.imageUrl || bookmarkPreviewMap.get(`${bookmark.subjectId}::${bookmark.topicId}::${bookmark.page}`)

                    return (
                      <Link
                        key={bookmark.id}
                        to={`/subjects/${bookmark.subjectId}/${bookmark.topicId}?page=${bookmark.page}`}
                        className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition hover:border-emerald-200 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-800/80 dark:hover:border-slate-500 dark:hover:bg-slate-800"
                      >
                        <div className="p-3">
                          {previewImage ? (
                            <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900">
                              <img
                                src={previewImage}
                                alt={`${bookmark.topicName} preview`}
                                className="h-28 w-full object-contain bg-slate-50 dark:bg-slate-950"
                              />
                            </div>
                          ) : null}

                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">{bookmark.subjectName}</p>
                              <h4 className="mt-2 truncate text-base font-semibold text-slate-900 dark:text-slate-100">{bookmark.topicName}</h4>
                            </div>
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">
                              P{bookmark.page + 1}
                            </span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Bookmarks
