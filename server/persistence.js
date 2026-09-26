import fs from 'node:fs'
import path from 'node:path'
import { Pool } from 'pg'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const COLLECTION_FILES = {
  'test-entries': 'test-entries.json',
  bookmarks: 'bookmarks.json',
  mistakes: 'mistakes.json',
}

let pool = null

function ensureLocalFiles() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  for (const fileName of Object.values(COLLECTION_FILES)) {
    const filePath = path.join(DATA_DIR, fileName)
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '[]\n', 'utf8')
  }
}

function readLocal(kind) {
  const filePath = path.join(DATA_DIR, COLLECTION_FILES[kind])
  try {
    const entries = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    return Array.isArray(entries) ? entries : []
  } catch {
    return []
  }
}

function writeLocal(kind, entries) {
  const filePath = path.join(DATA_DIR, COLLECTION_FILES[kind])
  const temporaryPath = `${filePath}.tmp`
  fs.writeFileSync(temporaryPath, `${JSON.stringify(entries, null, 2)}\n`, 'utf8')
  fs.renameSync(temporaryPath, filePath)
}

function assertKind(kind) {
  if (!Object.hasOwn(COLLECTION_FILES, kind)) throw new Error('Unknown data collection.')
}

export async function initializePersistence() {
  ensureLocalFiles()

  const connectionString = String(process.env.DATABASE_URL || '').trim()
  if (!connectionString) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL is required in production; refusing ephemeral app-data storage.')
    }
    console.warn('[server] DATABASE_URL is not set; using local JSON files for development only.')
    return
  }

  pool = new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  })

  await pool.query(`
    CREATE TABLE IF NOT EXISTS p850_records (
      kind TEXT NOT NULL CHECK (kind IN ('test-entries', 'bookmarks', 'mistakes')),
      id TEXT NOT NULL,
      payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (kind, id)
    )
  `)

  await migrateLocalRecords()
  console.log('[server] PostgreSQL persistence is ready.')
}

async function migrateLocalRecords() {
  for (const kind of Object.keys(COLLECTION_FILES)) {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM p850_records WHERE kind = $1', [kind])
    if (rows[0].count > 0) continue

    const entries = readLocal(kind).filter((entry) => entry && typeof entry === 'object' && entry.id != null)
    if (entries.length === 0) continue

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      for (const entry of entries) {
        await client.query(
          'INSERT INTO p850_records (kind, id, payload) VALUES ($1, $2, $3::jsonb) ON CONFLICT (kind, id) DO NOTHING',
          [kind, String(entry.id), JSON.stringify(entry)],
        )
      }
      await client.query('COMMIT')
      console.log(`[server] Imported ${entries.length} local ${kind} records into PostgreSQL.`)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}

export async function checkPersistence() {
  if (!pool) return true
  await pool.query('SELECT 1')
  return true
}

export async function listRecords(kind) {
  assertKind(kind)
  if (!pool) return readLocal(kind)

  const direction = kind === 'test-entries' ? 'ASC' : 'DESC'
  const { rows } = await pool.query(
    `SELECT payload FROM p850_records WHERE kind = $1 ORDER BY created_at ${direction}, id ${direction}`,
    [kind],
  )
  return rows.map((row) => row.payload)
}

export async function insertRecord(kind, record, { upsert = false } = {}) {
  assertKind(kind)
  if (!record || typeof record !== 'object' || Array.isArray(record) || record.id == null || String(record.id).trim() === '') {
    throw new Error('A record with an id is required.')
  }

  if (pool) {
    const conflictAction = upsert
      ? 'DO UPDATE SET payload = EXCLUDED.payload, created_at = NOW(), updated_at = NOW()'
      : 'DO NOTHING'
    const { rowCount } = await pool.query(
      `INSERT INTO p850_records (kind, id, payload) VALUES ($1, $2, $3::jsonb) ON CONFLICT (kind, id) ${conflictAction}`,
      [kind, String(record.id), JSON.stringify(record)],
    )
    if (!upsert && rowCount === 0) throw new Error('A record with this id already exists.')
    return listRecords(kind)
  }

  const entries = readLocal(kind).filter((entry) => String(entry.id) !== String(record.id))
  const nextEntries = kind === 'test-entries' ? [...entries, record] : [record, ...entries]
  writeLocal(kind, nextEntries)
  return nextEntries
}

export async function updateRecord(kind, id, updates) {
  assertKind(kind)
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) throw new Error('Update data must be an object.')

  if (pool) {
    await pool.query(
      `UPDATE p850_records SET payload = payload || $3::jsonb, updated_at = NOW() WHERE kind = $1 AND id = $2`,
      [kind, String(id), JSON.stringify(updates)],
    )
    return listRecords(kind)
  }

  const entries = readLocal(kind).map((entry) => (String(entry.id) === String(id) ? { ...entry, ...updates } : entry))
  writeLocal(kind, entries)
  return entries
}

export async function deleteRecord(kind, id) {
  assertKind(kind)
  if (pool) {
    await pool.query('DELETE FROM p850_records WHERE kind = $1 AND id = $2', [kind, String(id)])
    return listRecords(kind)
  }

  const entries = readLocal(kind).filter((entry) => String(entry.id) !== String(id))
  writeLocal(kind, entries)
  return entries
}
