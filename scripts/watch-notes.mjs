import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const ROOT_NOTES_DIR = process.env.P850_NOTES_ROOT
  ? path.resolve(process.env.P850_NOTES_ROOT)
  : path.resolve(process.cwd(), 'notes')
const GENERATE_SCRIPT = path.resolve(process.cwd(), 'scripts/generate-subjects.mjs')
const WATCH_DEBOUNCE_MS = 350
const POLL_INTERVAL_MS = 1500
const AUTO_PUSH_NOTES = process.env.P850_AUTO_PUSH_NOTES === '1'
const AUTO_PUSH_MESSAGE = process.env.P850_COMMIT_MESSAGE || 'Auto-refresh notes update'

let timer = null
let pollTimer = null
const watchedDirs = new Set()
const fileWatchers = []
let lastKnownSnapshot = null

function log(message) {
  console.log(`[watch-notes] ${message}`)
}

function runGenerator() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [GENERATE_SCRIPT], {
      stdio: 'inherit',
      env: process.env,
    })

    child.on('exit', (code) => {
      if (code === 0) {
        log('Regenerated subject metadata.')
        resolve()
      } else {
        reject(new Error(`Generator exited with code ${code}`))
      }
    })

    child.on('error', (error) => {
      reject(error)
    })
  })
}

function runGitCommand(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim())
        return
      }

      reject(new Error(stderr.trim() || `git ${args.join(' ')} exited with code ${code}`))
    })

    child.on('error', reject)
  })
}

async function maybeAutoCommitAndPush() {
  if (!AUTO_PUSH_NOTES) {
    return
  }

  try {
    const statusOutput = await runGitCommand(['status', '--porcelain', '--', 'notes', 'src/data/subjects.json', 'public/notes'])
    if (!statusOutput.trim()) {
      log('No relevant notes changes detected; skipping auto-commit.')
      return
    }

    await runGitCommand(['add', '--', 'notes', 'src/data/subjects.json', 'public/notes'])
    await runGitCommand(['commit', '-m', AUTO_PUSH_MESSAGE])
    await runGitCommand(['push', 'origin', 'main'])
    log('Auto-committed and pushed notes refresh to GitHub.')
  } catch (error) {
    console.warn('[watch-notes] Automatic git push skipped: this is manual-by-default. Set P850_AUTO_PUSH_NOTES=1 to enable it.', error.message)
  }
}

function scheduleRefresh() {
  if (timer) clearTimeout(timer)

  timer = setTimeout(async () => {
    timer = null

    try {
      await runGenerator()
      await maybeAutoCommitAndPush()
    } catch (error) {
      console.error('[watch-notes] Regeneration failed:', error)
    }
  }, WATCH_DEBOUNCE_MS)
}

function shouldIgnoreFile(filename) {
  if (!filename) return true
  return filename.startsWith('.') || filename === 'Thumbs.db'
}

function captureDirectorySnapshot(dirPath) {
  if (!fs.existsSync(dirPath)) return {}

  const snapshot = {}

  function walk(currentPath) {
    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue

      const childPath = path.join(currentPath, entry.name)
      const relativePath = path.relative(ROOT_NOTES_DIR, childPath)

      if (entry.isDirectory()) {
        walk(childPath)
        continue
      }

      try {
        const stat = fs.statSync(childPath)
        snapshot[relativePath] = {
          mtimeMs: stat.mtimeMs,
          size: stat.size,
        }
      } catch {
        // ignore transient file-stat errors
      }
    }
  }

  walk(dirPath)
  return snapshot
}

function compareSnapshots(previousSnapshot, nextSnapshot) {
  if (!previousSnapshot) return true

  const prevKeys = Object.keys(previousSnapshot)
  const nextKeys = Object.keys(nextSnapshot)

  if (prevKeys.length !== nextKeys.length) {
    return true
  }

  for (const key of nextKeys) {
    const prevEntry = previousSnapshot[key]
    const nextEntry = nextSnapshot[key]

    if (!prevEntry || !nextEntry) return true
    if (prevEntry.mtimeMs !== nextEntry.mtimeMs || prevEntry.size !== nextEntry.size) return true
  }

  return false
}

function watchDirectory(dirPath, recursive = false) {
  if (watchedDirs.has(`${dirPath}:${recursive}`)) return
  watchedDirs.add(`${dirPath}:${recursive}`)

  try {
    const watcher = fs.watch(dirPath, { persistent: true, recursive }, (_, filename) => {
      if (shouldIgnoreFile(filename)) return
      scheduleRefresh()
    })

    watcher.on('error', (error) => {
      console.error(`[watch-notes] Watcher error for ${dirPath}:`, error.message)
    })

    fileWatchers.push(watcher)
  } catch (error) {
    if (recursive && error.code === 'ERR_FEATURE_UNAVAILABLE_ON_PLATFORM') {
      log(`Recursive watch not supported for ${dirPath}; falling back to polling for nested directory changes.`)
    } else {
      console.error(`[watch-notes] Unable to watch ${dirPath}:`, error.message)
    }
  }
}

function scanDirectories(dirPath) {
  if (!fs.existsSync(dirPath)) return

  watchDirectory(dirPath, true)

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
    const childPath = path.join(dirPath, entry.name)
    if (!watchedDirs.has(`${childPath}:true`)) {
      scanDirectories(childPath)
    }
  }
}

function fallbackScan(dirPath) {
  if (!fs.existsSync(dirPath)) return

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const childPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      watchDirectory(childPath, false)
      fallbackScan(childPath)
    }
  }
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer)

  pollTimer = setInterval(() => {
    if (!fs.existsSync(ROOT_NOTES_DIR)) return

    const nextSnapshot = captureDirectorySnapshot(ROOT_NOTES_DIR)
    if (compareSnapshots(lastKnownSnapshot, nextSnapshot)) {
      lastKnownSnapshot = nextSnapshot
      scheduleRefresh()
    } else {
      lastKnownSnapshot = nextSnapshot
    }
  }, POLL_INTERVAL_MS)
}

function stopWatchers() {
  for (const watcher of fileWatchers) {
    try {
      watcher.close()
    } catch {
      // ignore close errors during shutdown
    }
  }

  if (pollTimer) clearInterval(pollTimer)
}

async function main() {
  if (!fs.existsSync(ROOT_NOTES_DIR)) {
    console.error(`[watch-notes] Root folder not found: ${ROOT_NOTES_DIR}`)
    process.exit(1)
  }

  lastKnownSnapshot = captureDirectorySnapshot(ROOT_NOTES_DIR)
  log(`Watching notes root: ${ROOT_NOTES_DIR}`)

  process.on('SIGINT', () => {
    stopWatchers()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    stopWatchers()
    process.exit(0)
  })

  try {
    await runGenerator()

    try {
      scanDirectories(ROOT_NOTES_DIR)
    } catch (error) {
      console.error('[watch-notes] Recursive scan failed, using fallback:', error)
      watchDirectory(ROOT_NOTES_DIR, false)
      fallbackScan(ROOT_NOTES_DIR)
    }

    startPolling()

    log('Ready. Changes in the notes directory will regenerate the app data, and Vite will reload when the generated JSON changes.')
  } catch (error) {
    console.error('[watch-notes] Startup failed:', error)
    process.exit(1)
  }

  if (process.argv.includes('--once')) {
    process.exit(0)
  }
}

main()
