import test from 'node:test'
import assert from 'node:assert/strict'

const store = new Map()
globalThis.localStorage = {
  getItem(key) {
    return store.has(key) ? store.get(key) : null
  },
  setItem(key, value) {
    store.set(key, String(value))
  },
  removeItem(key) {
    store.delete(key)
  },
}

const { getContinueStudy, getSubjectProgress, resolveResumePage } = await import('../src/utils/progress.js')

test('getContinueStudy falls back when saved resume references stale subject or topic', () => {
  store.clear()
  store.set('p850-last-resume', JSON.stringify({ subjectId: 'missing-subject', topicId: 'missing-topic', currentPage: 7 }))

  const subjects = [
    {
      id: 'algorithms',
      topics: [
        { id: 'topic-a', images: ['one', 'two', 'three'] },
        { id: 'topic-b', images: ['four'] },
      ],
    },
    {
      id: 'aptitude',
      topics: [{ id: 'topic-c', images: ['five'] }],
    },
  ]

  const result = getContinueStudy(subjects)

  assert.equal(result.subject.id, 'algorithms')
  assert.equal(result.topic.id, 'topic-a')
  assert.equal(result.currentPage, 0)
})

test('getSubjectProgress ignores stale topic ids and invalid data', () => {
  store.clear()
  store.set('p850-topic-progress', JSON.stringify({ 'topic-a': 2, 'ghost-topic': 999 }))

  const subject = {
    id: 'algorithms',
    topics: [
      { id: 'topic-a', images: ['one', 'two'] },
      { id: 'topic-b', images: ['three'] },
    ],
  }

  assert.equal(getSubjectProgress(subject), 67)
  assert.equal(getSubjectProgress(null), 0)
})

test('resolveResumePage restores the saved page for the active subject/topic without resetting to 0', () => {
  store.clear()
  store.set('p850-last-resume', JSON.stringify({ subjectId: 'algorithms', topicId: 'topic-a', currentPage: 7 }))

  assert.equal(resolveResumePage('algorithms', 'topic-a', 10), 7)
  assert.equal(resolveResumePage('algorithms', 'topic-a', 5), 4)
  assert.equal(resolveResumePage('algorithms', 'topic-b', 5), 0)
})

test('saveResumeState resets progress and resume to the start after the final page is completed', async () => {
  store.clear()
  const { saveResumeState } = await import('../src/utils/progress.js')

  saveResumeState('algorithms', 'topic-a', 4, 5)

  assert.equal(JSON.parse(store.get('p850-last-resume')).currentPage, 4)
  assert.equal(JSON.parse(store.get('p850-topic-progress'))['topic-a'], 0)
})
