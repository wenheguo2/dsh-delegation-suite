// DSH CodeBuddy forwarder: pi-ai sends the system prompt as role "developer",
// which the Tencent copilot gateway's content audit always rejects (content_filter).
// This forwarder rewrites role:developer -> role:system, then forwards to
// copilot.tencent.com. Point the codebuddy-cn provider's baseURL at
// http://127.0.0.1:8790 and keep this process running alongside DSH.
// Usage: node dsh-codebuddy-forwarder.js  (listens on 127.0.0.1:8790)
const http = require('http')
const https = require('https')

const PORT = 8790
const UPSTREAM_HOST = 'copilot.tencent.com'
const UPSTREAM_PATH = '/v2/chat/completions'
const LOG = (msg) => console.log(new Date().toISOString() + ' ' + msg)

const server = http.createServer((req, res) => {
  let raw = ''
  req.on('data', (c) => (raw += c))
  req.on('end', () => {
    let body = raw
    let rewritten = 0
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.messages)) {
        for (const m of parsed.messages) {
          if (m.role === 'developer') {
            m.role = 'system'
            rewritten++
          }
        }
      }
      if (rewritten > 0) body = JSON.stringify(parsed)
    } catch { /* pass through non-JSON untouched */ }

    const auth = req.headers.authorization || req.headers['x-api-key'] || ''
    const outbound = https.request(
      {
        hostname: UPSTREAM_HOST,
        path: UPSTREAM_PATH,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          ...(auth ? { Authorization: auth } : {}),
        },
      },
      (up) => {
        res.writeHead(up.statusCode, { 'Content-Type': up.headers['content-type'] || 'text/plain' })
        up.pipe(res)
      },
    )
    outbound.on('error', (e) => {
      res.writeHead(502, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: { message: String(e.message) } }))
    })
    outbound.end(body)
    if (rewritten > 0) LOG('rewrote ' + rewritten + ' developer message(s)')
  })
})
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    LOG('port ' + PORT + ' already in use - forwarder already running, exiting')
    process.exit(0)
  }
  throw e
})
server.listen(PORT, '127.0.0.1', () => LOG('DSH CodeBuddy forwarder listening on http://127.0.0.1:' + PORT))
