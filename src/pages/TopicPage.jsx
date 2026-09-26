import { ArrowLeft, Bookmark, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import subjectsData from '../data/subjects.json'
import { sortNoteImages } from '../utils/notePaths'
import { getBookmark, resolvePageFromLocation, resolveSubjectAndTopic, saveResumeState, toggleBookmark } from '../utils/progress'

function TopicPage() {
  const { subjectId, topicId } = useParams()
  const location = useLocation()
  const { subject, topic } = resolveSubjectAndTopic(subjectsData.subjects, subjectId, topicId)

  const [zoom, setZoom] = useState(1)
  const pinchRef = useRef(null)
  const swipeStartRef = useRef(null)
  const sortedImages = useMemo(() => sortNoteImages(topic?.images ?? []), [topic])
  const [currentPage, setCurrentPage] = useState(0)
  const [bookmark, setBookmark] = useState(null)
  const hasInitializedResume = useRef(false)
  const pageCount = sortedImages.length
  const currentImage = useMemo(() => sortedImages[currentPage] ?? '', [sortedImages, currentPage])

  useEffect(() => {
    if (!subject || !topic) {
      setBookmark(null)
      return
    }

    setBookmark(getBookmark(subject.id, topic.id, currentPage))
  }, [subject, topic, currentPage])

  useEffect(() => {
    if (!subject || !topic) {
      return
    }

    const restoredPage = resolvePageFromLocation(subjectId, topicId, sortedImages.length, location.search)
    setCurrentPage(restoredPage)
    hasInitializedResume.current = true
  }, [subject, topic, subjectId, topicId, sortedImages.length, location.search])

  useEffect(() => {
    if (!subject || !topic || !hasInitializedResume.current) {
      return
    }

    saveResumeState(subjectId, topicId, currentPage, pageCount)
  }, [subject, topic, subjectId, topicId, currentPage, pageCount])

  const clampZoom = (value) => Math.min(3, Math.max(1, value))

  const handleTouchStart = (event) => {
    if (event.touches.length === 1) {
      swipeStartRef.current = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      }
    }

    if (event.touches.length === 2) {
      const distance = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY,
      )

      pinchRef.current = { distance, scale: zoom }
    }
  }

  const handleTouchMove = (event) => {
    if (event.touches.length === 2 && pinchRef.current) {
      event.preventDefault()
      const nextDistance = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY,
      )
      const nextZoom = clampZoom((pinchRef.current.scale * nextDistance) / Math.max(pinchRef.current.distance, 1))
      setZoom(nextZoom)
    }
  }

  const handleTouchEnd = (event) => {
    pinchRef.current = null

    if (!swipeStartRef.current || !event.changedTouches || event.changedTouches.length === 0) {
      swipeStartRef.current = null
      return
    }

    const touch = event.changedTouches[0]
    const deltaX = touch.clientX - swipeStartRef.current.x
    const deltaY = touch.clientY - swipeStartRef.current.y

    swipeStartRef.current = null

    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        goToNext()
      } else {
        goToPrev()
      }
    }
  }

  if (!subject || !topic) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
        Topic not found.
      </div>
    )
  }

  const canGoPrev = currentPage > 0
  const canGoNext = currentPage < pageCount - 1

  const goToPrev = () => {
    if (!canGoPrev) {
      return
    }

    setZoom(1)
    setCurrentPage((page) => page - 1)
  }

  const goToNext = () => {
    setZoom(1)
    setCurrentPage((page) => {
      if (page >= pageCount - 1) return 0
      return page + 1
    })
  }

  return (
    <div className="space-y-6">
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={`/subjects/${subject.id}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label="Back to topic list"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">{subject.shortName}</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{topic.name}</h2>
          </div>
        </div>

        <button
          type="button"
          aria-label="Bookmark note"
          onClick={() => {
            if (!subject || !topic) return
            const result = toggleBookmark({
              subjectId: subject.id,
              topicId: topic.id,
              subjectName: subject.name,
              topicName: topic.name,
              page: currentPage,
              imageUrl: currentImage,
            })
            setBookmark(result.bookmark)
          }}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border shadow-sm transition ${bookmark ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'}`}
        >
          <Bookmark size={18} />
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-sm text-slate-500 dark:text-slate-400">Page {currentPage + 1} / {pageCount}</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToPrev}
              disabled={!canGoPrev}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <button
              type="button"
              onClick={goToNext}
              disabled={!canGoNext}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/60">
          {currentImage ? (
            <>
              <img
                src={currentImage}
                alt={`${topic.name} page ${currentPage + 1}`}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onDoubleClick={() => setZoom((value) => (value > 1 ? 1 : 2))}
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease',
                  touchAction: 'pan-x pan-y pinch-zoom',
                  maxHeight: '72vh',
                  maxWidth: '100%',
                  width: 'auto',
                  height: 'auto',
                  display: 'block',
                  objectFit: 'contain',
                }}
                className="rounded-xl shadow-sm"
              />

              <button
                type="button"
                onClick={() => setZoom((value) => (value > 1 ? 1 : 2))}
                className="absolute bottom-4 right-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white/90 text-slate-700 shadow-md backdrop-blur-sm transition hover:bg-white dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200"
                aria-label="Toggle zoom"
              >
                <ZoomIn size={18} />
              </button>
            </>
          ) : (
            <div className="text-slate-500 dark:text-slate-400">No note image available.</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TopicPage
