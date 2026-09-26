import fs from 'node:fs'
import { Pool } from 'pg'

function loadDotEnvFile() {
  const envPath = new URL('../.env', import.meta.url)
  if (!fs.existsSync(envPath)) return

  for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const separatorIndex = line.indexOf('=')
    const key = line.slice(0, separatorIndex).trim()
    if (!key || String(process.env[key] || '').trim()) continue
    process.env[key] = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')
  }
}

loadDotEnvFile()

const LIVE_APP_URL = (process.env.P850_LIVE_APP_URL || 'https://p850.onrender.com').replace(/\/$/, '')
const databaseUrl = String(process.env.DATABASE_URL || '').trim()
const collections = ['test-entries', 'mistakes', 'bookmarks']

if (!databaseUrl) {
  console.error('Set DATABASE_URL to the new PostgreSQL connection URL before running this migration.')
  process.exit(1)
}

const pool = new Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 10000 })
try {
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

  for (const kind of collections) {
    const response = await fetch(`${LIVE_APP_URL}/api/${kind}`)
    if (!response.ok) throw new Error(`Live ${kind} endpoint returned HTTP ${response.status}`)
    const records = await response.json()
    if (!Array.isArray(records)) throw new Error(`Live ${kind} response was not an array; stopping without importing it.`)
    let imported = 0
    for (const record of records) {
      if (!record || typeof record !== 'object' || record.id == null) {
        console.warn(`Skipping ${kind} record without an id.`)
        continue
      }
      const result = await pool.query(
        'INSERT INTO p850_records (kind, id, payload) VALUES ($1, $2, $3::jsonb) ON CONFLICT (kind, id) DO NOTHING',
        [kind, String(record.id), JSON.stringify(record)],
      )
      imported += result.rowCount
    }
    console.log(`${kind}: fetched ${records.length}; imported ${imported}; existing IDs preserved.`)
  }
  console.log(`Migration finished from ${LIVE_APP_URL}. Keep this output and check the collections in the app after deployment.`)
} catch (error) {
  console.error(`Migration stopped: ${error.message}`)
  process.exitCode = 1
} finally {
  await pool.end()
}
