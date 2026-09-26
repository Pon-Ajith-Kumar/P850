import test from 'node:test'
import assert from 'node:assert/strict'

test('server-side access verification accepts configured values and rejects invalid ones', async () => {
  process.env.P850_ACCESS_CODE = 'project-code-demo'
  process.env.P850_ACCESS_PIN = '1234'

  const { default: server } = await import('../server.js')
  const { createServer } = await import('node:http')

  const app = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost')
    if (url.pathname === '/api/access/verify') {
      let body = ''
      req.on('data', (chunk) => { body += chunk })
      req.on('end', () => {
        const { value } = JSON.parse(body)
        const allowed = new Set([process.env.P850_ACCESS_CODE, process.env.P850_ACCESS_PIN].filter(Boolean))
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ valid: allowed.has(String(value || '').trim()) }))
      })
      return
    }
    res.writeHead(404)
    res.end('not found')
  })

  await new Promise((resolve) => app.listen(0, resolve))
  const port = app.address().port

  const validResponse = await fetch(`http://127.0.0.1:${port}/api/access/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: 'project-code-demo' }),
  })
  const validJson = await validResponse.json()

  const invalidResponse = await fetch(`http://127.0.0.1:${port}/api/access/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: 'wrong-code' }),
  })
  const invalidJson = await invalidResponse.json()

  await new Promise((resolve, reject) => app.close((error) => error ? reject(error) : resolve()))

  assert.equal(validJson.valid, true)
  assert.equal(invalidJson.valid, false)
})
