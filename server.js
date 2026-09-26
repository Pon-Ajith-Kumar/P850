import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const ROOT_DIR = process.cwd()
const DIST_DIR = path.join(ROOT_DIR, 'dist')
const DATA_DIR = path.join(ROOT_DIR, 'data')
const TEST_ENTRIES_FILE = path.join(DATA_DIR, 'test-entries.json')
const BOOKMARKS_FILE = path.join(DATA_DIR, 'bookmarks.json')
const MISTAKES_FILE = path.join(DATA_DIR, 'mistakes.json')
const NOTES_ROOT = process.env.P850_NOTES_ROOT
  ? path.resolve(process.env.P850_NOTES_ROOT)
  : path.join(ROOT_DIR, 'notes')
const PORT = Number(process.env.PORT || 3000)
const HOST = process.env.HOST || '0.0.0.0'
const ACCESS_CODE = String(process.env.P850_ACCESS_CODE || '').trim()
const ACCESS_PIN = String(process.env.P850_ACCESS_PIN || '').trim()

function ensureDataFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(TEST_ENTRIES_FILE)) {
    fs.writeFileSync(TEST_ENTRIES_FILE, '[]\n', 'utf8')
  }
  if (!fs.existsSync(BOOKMARKS_FILE)) {
    fs.writeFileSync(BOOKMARKS_FILE, '[]\n', 'utf8')
  }
  if (!fs.existsSync(MISTAKES_FILE)) {
    fs.writeFileSync(MISTAKES_FILE, '[]\n', 'utf8')
  }
}

function readJsonArray(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeJsonArray(filePath, entries) {
  fs.writeFileSync(filePath, `${JSON.stringify(entries, null, 2)}\n`, 'utf8')
}

function readEntries() {
  return readJsonArray(TEST_ENTRIES_FILE)
}

function writeEntries(entries) {
  writeJsonArray(TEST_ENTRIES_FILE, entries)
}

function readBookmarks() {
  return readJsonArray(BOOKMARKS_FILE)
}

function writeBookmarks(entries) {
  writeJsonArray(BOOKMARKS_FILE, entries)
}

function readMistakes() {
  return readJsonArray(MISTAKES_FILE)
}

function writeMistakes(entries) {
  writeJsonArray(MISTAKES_FILE, entries)
}

function startNotesWatcher() {
  try {
    const child = spawn(process.execPath, ['scripts/watch-notes.mjs'], {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' },
    })

    child.on('error', (error) => {
      console.error('[server] notes watcher error:', error)
    })

    return child
  } catch (error) {
    console.error('[server] failed to start notes watcher:', error)
    return null
  }
}

function runStaticGeneration() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/generate-subjects.mjs'], {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: process.env,
    })

    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`generate-subjects exited with ${code}`))
    })

    child.on('error', (error) => {
      reject(error)
    })
  })
}

export function isAccessAllowed(value) {
  const normalized = String(value || '').trim()
  if (!normalized) {
    return false
  }

  const allowed = new Set([
    String(process.env.P850_ACCESS_CODE || '').trim(),
    String(process.env.P850_ACCESS_PIN || '').trim(),
  ].filter(Boolean))

  return allowed.has(normalized)
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(payload))
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''

    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 1_000_000) {
        req.destroy(new Error('Request too large'))
      }
    })

    req.on('end', () => {
      if (!body) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(body))
      } catch (error) {
        reject(new Error('Invalid JSON body'))
      }
    })

    req.on('error', reject)
  })
}

async function handleApi(req, res, pathname) {
  if (pathname === '/api/health') {
    sendJson(res, 200, { ok: true, status: 'healthy' })
    return
  }

  if (pathname === '/api/access/verify' && req.method === 'POST') {
    try {
      const { value } = await parseJsonBody(req)
      sendJson(res, 200, { valid: isAccessAllowed(value) })
    } catch (error) {
      sendJson(res, 400, { valid: false, message: 'Invalid request' })
    }
    return
  }

  if (pathname === '/api/test-entries' && req.method === 'GET') {
    sendJson(res, 200, readEntries())
    return
  }

  if (pathname === '/api/test-entries' && req.method === 'POST') {
    try {
      const parsed = await parseJsonBody(req)
      const entries = readEntries()
      const nextEntries = [...entries, parsed]
      writeEntries(nextEntries)
      sendJson(res, 200, nextEntries)
    } catch (error) {
      sendJson(res, 400, { message: error.message || 'Bad request' })
    }
    return
  }

  if (pathname === '/api/bookmarks' && req.method === 'GET') {
    sendJson(res, 200, readBookmarks())
    return
  }

  if (pathname === '/api/bookmarks' && req.method === 'POST') {
    try {
      const parsed = await parseJsonBody(req)
      const entries = readBookmarks()
      const nextEntries = [parsed, ...entries.filter((entry) => entry.id !== parsed.id)]
      writeBookmarks(nextEntries)
      sendJson(res, 200, nextEntries)
    } catch (error) {
      sendJson(res, 400, { message: error.message || 'Bad request' })
    }
    return
  }

  if (pathname === '/api/mistakes' && req.method === 'GET') {
    sendJson(res, 200, readMistakes())
    return
  }

  if (pathname === '/api/mistakes' && req.method === 'POST') {
    try {
      const parsed = await parseJsonBody(req)
      const entries = readMistakes()
      const nextEntries = [parsed, ...entries.filter((entry) => entry.id !== parsed.id)]
      writeMistakes(nextEntries)
      sendJson(res, 200, nextEntries)
    } catch (error) {
      sendJson(res, 400, { message: error.message || 'Bad request' })
    }
    return
  }

  const bookmarkMatch = pathname.match(/^\/api\/bookmarks\/([^/]+)$/)
  if (bookmarkMatch) {
    const bookmarkId = decodeURIComponent(bookmarkMatch[1])

    if (req.method === 'DELETE') {
      const entries = readBookmarks().filter((entry) => entry.id !== bookmarkId)
      writeBookmarks(entries)
      sendJson(res, 200, entries)
      return
    }
  }

  const mistakeMatch = pathname.match(/^\/api\/mistakes\/([^/]+)$/)
  if (mistakeMatch) {
    const mistakeId = decodeURIComponent(mistakeMatch[1])

    if (req.method === 'DELETE') {
      const entries = readMistakes().filter((entry) => entry.id !== mistakeId)
      writeMistakes(entries)
      sendJson(res, 200, entries)
      return
    }
  }

  const testEntriesMatch = pathname.match(/^\/api\/test-entries\/([^/]+)$/)
  if (testEntriesMatch) {
    const entryId = decodeURIComponent(testEntriesMatch[1])

    if (req.method === 'PUT') {
      try {
        const parsed = await parseJsonBody(req)
        const entries = readEntries().map((entry) => (entry.id === entryId ? { ...entry, ...parsed } : entry))
        writeEntries(entries)
        sendJson(res, 200, entries)
      } catch (error) {
        sendJson(res, 400, { message: error.message || 'Bad request' })
      }
      return
    }

    if (req.method === 'DELETE') {
      const entries = readEntries().filter((entry) => entry.id !== entryId)
      writeEntries(entries)
      sendJson(res, 200, entries)
      return
    }
  }

  sendJson(res, 404, { message: 'API route not found' })
}

function serveStaticFile(res, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('Not found')
        return
      }

      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Internal server error')
      return
    }

    const extension = path.extname(filePath).toLowerCase()
    const contentType = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.ico': 'image/x-icon',
    }[extension] || 'application/octet-stream'

    res.writeHead(200, { 'Content-Type': contentType })
    res.end(content)
  })
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost')
  const pathname = url.pathname

  if (pathname.startsWith('/api/')) {
    await handleApi(req, res, pathname)
    return
  }

  const requestedPath = pathname === '/' ? '/index.html' : pathname
  const safePath = path.normalize(requestedPath).replace(/^\/+/, '')
  const filePath = path.join(DIST_DIR, safePath)

  if (filePath.startsWith(DIST_DIR) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    serveStaticFile(res, filePath)
    return
  }

  serveStaticFile(res, path.join(DIST_DIR, 'index.html'))
})

async function main() {
  ensureDataFile()

  if (!fs.existsSync(NOTES_ROOT)) {
    console.warn(`[server] Notes root not found at ${NOTES_ROOT}. The app may show empty subject data until that folder is available.`)
  } else {
    try {
      await runStaticGeneration()
    } catch (error) {
      console.error('[server] failed to generate subject metadata on startup:', error)
    }
  }

  startNotesWatcher()

  server.listen(PORT, HOST, () => {
    console.log(`[server] P850 app is running at http://${HOST}:${PORT}`)
  })
}

const entryPath = fileURLToPath(import.meta.url)
if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  main()
}

export default server
