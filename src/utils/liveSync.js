export function startLivePolling({ fetcher, onData, intervalMs = 4000, enabled = true }) {
  if (typeof fetcher !== 'function' || typeof onData !== 'function' || !enabled) {
    return () => {}
  }

  let timer = null
  let cancelled = false

  const run = async () => {
    if (cancelled) return
    try {
      const nextData = await fetcher()
      onData(nextData)
    } catch {
      // ignore transient refresh failures; the app should keep working
    }
  }

  run()

  timer = setInterval(() => {
    run()
  }, intervalMs)

  return () => {
    cancelled = true
    if (timer) clearInterval(timer)
  }
}
