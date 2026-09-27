import test from 'node:test'
import assert from 'node:assert/strict'

const packageJson = await import('../package.json', { with: { type: 'json' } })
const viteConfig = await import('../vite.config.js')

const devScript = packageJson.default.scripts.dev
const proxy = viteConfig.default.server?.proxy ?? viteConfig.default.proxy

test('dev workflow starts the API server and proxies /api to it', () => {
  assert.match(devScript, /node server\.js/i)
  assert.ok(proxy && proxy['/api'])
})
