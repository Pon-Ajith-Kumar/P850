const RESUME_KEY = 'p850-last-resume'
const TOPIC_PROGRESS_KEY = 'p850-topic-progress'
const BOOKMARK_KEY = 'p850-bookmarks'
const BOOKMARKS_API = '/api/bookmarks'

function safeRead(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function safeWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore storage failures in restricted environments
  }
}

export function getResumeState() {
  return safeRead(RESUME_KEY, null)
}

export function resolveResumePage(subjectId, topicId, totalPages = 0) {
  const resume = getResumeState()
  if (!resume || resume.subjectId !== subjectId || resume.topicId !== topicId) {
    return 0
  }

  const maxPage = Math.max(totalPages - 1, 0)
  const nextPage = Number.isInteger(resume.currentPage) ? resume.currentPage : 0
  return Math.max(0, Math.min(nextPage, maxPage))
}

export function resolvePageFromLocation(subjectId, topicId, totalPages = 0, search = '') {
  const params = new URLSearchParams(search)
  const directPage = Number(params.get('page'))
  if (Number.isInteger(directPage) && directPage >= 0) {
    return Math.min(directPage, Math.max(totalPages - 1, 0))
  }

  return resolveResumePage(subjectId, topicId, totalPages)
}

function getNormalizedResumeState(subjects) {
  const resume = getResumeState()
  if (!resume || !Array.isArray(subjects) || subjects.length === 0) {
    return null
  }

  const validSubject = subjects.find((entry) => entry?.id && entry.id === resume.subjectId)
  if (!validSubject) {
    return null
  }

  const validTopic = validSubject?.topics?.find((entry) => entry?.id && entry.id === resume.topicId)
  if (!validTopic) {
    return null
  }

  const maxPages = Array.isArray(validTopic.images) ? validTopic.images.length : 0
  const currentPage = Number.isInteger(resume.currentPage) ? Math.max(0, Math.min(resume.currentPage, Math.max(maxPages - 1, 0))) : 0

  return {
    subjectId: validSubject.id,
    topicId: validTopic.id,
    currentPage,
    updatedAt: Date.now(),
  }
}

export function saveResumeState(subjectId, topicId, currentPage, totalPages = 0) {
  const safePage = Number.isInteger(currentPage) ? Math.max(0, currentPage) : 0
  const normalizedPage = Number.isFinite(totalPages) && totalPages > 0 ? Math.min(safePage, totalPages - 1) : safePage

  safeWrite(RESUME_KEY, { subjectId, topicId, currentPage: normalizedPage, updatedAt: Date.now() })

  const progressState = safeRead(TOPIC_PROGRESS_KEY, {})
  if (Number.isFinite(totalPages) && totalPages > 0 && normalizedPage >= totalPages - 1) {
    safeWrite(TOPIC_PROGRESS_KEY, { ...progressState, [topicId]: 0 })
    return
  }

  const nextState = {
    ...progressState,
    [topicId]: Math.max(progressState[topicId] || 0, normalizedPage + 1),
  }

  safeWrite(TOPIC_PROGRESS_KEY, nextState)
}

export async function fetchBookmarksFromApi() {
  if (typeof fetch !== 'function') return getBookmarks()

  const response = await fetch(BOOKMARKS_API, { cache: 'no-store' })
  if (!response.ok) throw new Error('Could not load saved bookmarks.')
  const payload = await response.json()
  const nextBookmarks = Array.isArray(payload) ? payload : []
  safeWrite(BOOKMARK_KEY, nextBookmarks)
  return nextBookmarks
}

export function getBookmarks() {
  return safeRead(BOOKMARK_KEY, [])
}

export async function toggleBookmark({ subjectId, topicId, subjectName, topicName, page, imageUrl }) {
  const safePage = Number.isInteger(page) ? Math.max(0, page) : 0
  const bookmarkId = subjectId + '::' + topicId + '::' + safePage
  const existing = getBookmarks()
  const currentBookmark = existing.find((item) => item.id === bookmarkId)

  if (currentBookmark) {
    if (typeof fetch === 'function') {
      const response = await fetch(BOOKMARKS_API + '/' + encodeURIComponent(bookmarkId), { method: 'DELETE' })
      if (!response.ok) throw new Error('Could not remove the bookmark.')
      const payload = await response.json()
      safeWrite(BOOKMARK_KEY, Array.isArray(payload) ? payload : existing.filter((item) => item.id !== bookmarkId))
    } else {
      safeWrite(BOOKMARK_KEY, existing.filter((item) => item.id !== bookmarkId))
    }
    return { bookmark: null, removed: true }
  }

  const entry = {
    id: bookmarkId,
    subjectId,
    topicId,
    subjectName,
    topicName,
    page: safePage,
    imageUrl: imageUrl || '',
    updatedAt: Date.now(),
  }

  if (typeof fetch !== 'function') {
    safeWrite(BOOKMARK_KEY, [entry, ...existing])
    return { bookmark: entry, removed: false }
  }

  const response = await fetch(BOOKMARKS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  })
  if (!response.ok) throw new Error('Could not save the bookmark.')
  const payload = await response.json()
  const nextBookmarks = Array.isArray(payload) ? payload : [entry, ...existing]
  safeWrite(BOOKMARK_KEY, nextBookmarks)
  return { bookmark: nextBookmarks.find((item) => item.id === bookmarkId) || entry, removed: false }
}

export function removeBookmark(subjectId, topicId) {
  const nextBookmarks = getBookmarks().filter((item) => !(item.subjectId === subjectId && item.topicId === topicId))
  safeWrite(BOOKMARK_KEY, nextBookmarks)
  if (typeof fetch === 'function') {
    const bookmarkIds = getBookmarks().filter((item) => item.subjectId === subjectId && item.topicId === topicId).map((item) => item.id)
    for (const bookmarkId of bookmarkIds) {
      fetch(`${BOOKMARKS_API}/${bookmarkId}`, { method: 'DELETE' }).catch(() => undefined)
    }
  }
}

export function getBookmark(subjectId, topicId, page = null) {
  const safePage = Number.isInteger(page) ? Math.max(0, page) : null
  const bookmarks = getBookmarks()

  if (safePage !== null) {
    return bookmarks.find((item) => item.subjectId === subjectId && item.topicId === topicId && item.page === safePage) || null
  }

  return bookmarks.find((item) => item.subjectId === subjectId && item.topicId === topicId) || null
}

export function getTopicReadPages(topicId) {
  const progressState = safeRead(TOPIC_PROGRESS_KEY, {})
  return Number(progressState[topicId] || 0)
}

export function getSubjectProgress(subject) {
  if (!subject || !Array.isArray(subject.topics)) {
    return 0
  }

  const totalPages = subject.topics.reduce((sum, topic) => sum + (Array.isArray(topic.images) ? topic.images.length : 0), 0)
  if (!totalPages) {
    return 0
  }

  const readPages = subject.topics.reduce((sum, topic) => {
    const maxRead = Math.min(getTopicReadPages(topic.id), Array.isArray(topic.images) ? topic.images.length : 0)
    return sum + maxRead
  }, 0)

  const progress = Math.min(Math.round((readPages / totalPages) * 100), 100)
  return progress >= 100 ? 0 : progress
}

export function resolveSubjectAndTopic(subjects, subjectId, topicId) {
  const list = Array.isArray(subjects) ? subjects : []
  const fallbackSubject = list[0]
  const fallbackTopic = fallbackSubject?.topics?.[0]

  const subject = list.find((entry) => entry?.id === subjectId) || fallbackSubject
  if (!subject) {
    return { subject: undefined, topic: undefined }
  }

  const topic = subject.topics?.find((entry) => entry?.id === topicId) || subject.topics?.[0] || fallbackTopic

  return { subject, topic }
}

export function getContinueStudy(subjects) {
  const fallbackSubject = Array.isArray(subjects) ? subjects[0] : undefined
  const fallbackTopic = fallbackSubject?.topics?.[0]

  const resume = getNormalizedResumeState(subjects)
  if (!resume) {
    return { subject: fallbackSubject, topic: fallbackTopic, currentPage: 0 }
  }

  const subject = subjects.find((entry) => entry.id === resume.subjectId) || fallbackSubject
  const topic = subject?.topics?.find((entry) => entry.id === resume.topicId) || fallbackTopic

  return {
    subject,
    topic,
    currentPage: Number.isInteger(resume.currentPage) ? Math.max(0, resume.currentPage) : 0,
  }
}
