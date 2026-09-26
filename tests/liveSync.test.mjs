import test from 'node:test'
import assert from 'node:assert/strict'
import { startLivePolling } from '../src/utils/liveSync.js'

test('startLivePolling invokes the fetcher immediately and on interval', async () => {
  let calls = 0
  const values = [
    [{ id: 'a', text: 'first' }],
    [{ id: 'b', text: 'second' }],
  ]

  const clear = startLivePolling({
    fetcher: async () => {
      calls += 1
      return values[calls - 1] || values[values.length - 1]
    },
    onData: () => {},
    intervalMs: 25,
    enabled: true,
  })

  await new Promise((resolve) => setTimeout(resolve, 55))
  clear()

  assert.equal(calls >= 2, true)
})
