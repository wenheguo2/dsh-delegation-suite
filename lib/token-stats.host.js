// dsh-delegation-suite / token-stats.host — universal token usage statistics.
//
// Listens on the llm/stream waterfall, collects per-request usage for every
// provider/model, and buckets it by current week, per-month (current year) and
// per-session. Persisted to $DSH_HOME/data/dsh-delegation-suite/token-stats.json
// (debounced) so stats survive restarts and package upgrades never touch them.
//
// Remote service `tokenStats`: summary / breakdown / session / reset.
// Best-effort provider balance/quota queries live in a small built-in adapter
// table (deepseek-official, kimi-coding); providers without an adapter report
// local usage only — nothing is hard-wired to a specific vendor's API shape.
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

const name = 'token-stats'
const inject = ['timer']

const DATA_FILE = join(
  process.env.DSH_HOME || join(homedir(), '.dsh'),
  'data', 'dsh-delegation-suite', 'token-stats.json',
)
const SAVE_DEBOUNCE_MS = 3000

/** Emulate the @Remote decorator for plain-JS methods (typert marker table). */
function markRemote(instance, method, exportName) {
  const fake = {
    kind: 'method',
    name: method,
    static: false,
    private: false,
    addInitializer(fn) { fn.call(instance) },
  }
  Remote(exportName)(instance[method], fake)
}

function zeroEntry(provider, model) {
  return {
    provider,
    model,
    requests: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    reasoningTokens: 0,
    lastAt: 0,
  }
}

function weekKeyOf(ms) {
  const d = new Date(ms)
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7))
  return m.getFullYear() + '-' + String(m.getMonth() + 1).padStart(2, '0') + '-' + String(m.getDate()).padStart(2, '0')
}

function monthKeyOf(ms) {
  const d = new Date(ms)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}

function jsonSafe(value) {
  if (Array.isArray(value)) return value.map(jsonSafe)
  if (value && typeof value === 'object') {
    const out = {}
    for (const key of Object.keys(value)) {
      const v = value[key]
      if (v !== undefined) out[key] = jsonSafe(v)
    }
    return out
  }
  return value
}

class TokenStatsService extends TypertRemoteService {
  constructor(ctx) {
    super(ctx, 'tokenStats')
    this.weeks = new Map()
    this.months = new Map()
    this.perSession = new Map()
    this.startedAt = Date.now()
    this._saveTimer = null
    this._load()
    this._prune()
  }

  _addTo(entry, usage) {
    entry.requests += 1
    entry.inputTokens += usage.inputTokens || 0
    entry.outputTokens += usage.outputTokens || 0
    entry.cacheReadTokens += usage.cacheReadTokens || 0
    entry.cacheWriteTokens += usage.cacheWriteTokens || 0
    entry.reasoningTokens += usage.reasoningTokens || 0
    entry.lastAt = Math.max(entry.lastAt, Date.now())
  }

  _writeBucket(map, key, provider, model, usage) {
    let entry = map.get(key)
    if (!entry) {
      entry = zeroEntry(provider, model)
      map.set(key, entry)
    }
    this._addTo(entry, usage)
  }

  recordUsage(options, usage) {
    if (!options || !usage || typeof usage !== 'object') return
    const provider = String(options.provider || 'unknown')
    const model = String(options.model || '?')
    const now = Date.now()
    this._writeBucket(this.weeks, weekKeyOf(now) + '|' + provider + '/' + model, provider, model, usage)
    this._writeBucket(this.months, monthKeyOf(now) + '|' + provider + '/' + model, provider, model, usage)
    const sessionKey = this.startedAt + '|' + provider + '/' + model
    this._writeBucket(this.perSession, sessionKey, provider, model, usage)
    this._scheduleSave()
  }

  _scheduleSave() {
    if (this._saveTimer) return
    this._saveTimer = this.ctx.timer.setTimeout(() => {
      this._saveTimer = null
      this._save()
    }, SAVE_DEBOUNCE_MS)
  }

  _load() {
    try {
      if (!existsSync(DATA_FILE)) return
      const parsed = JSON.parse(readFileSync(DATA_FILE, 'utf8'))
      const revive = (src) => {
        const out = new Map()
        for (const key of Object.keys(src || {})) out.set(key, src[key])
        return out
      }
      this.weeks = revive(parsed.weeks)
      this.months = revive(parsed.months)
      this.perSession = revive(parsed.perSession)
      if (typeof parsed.startedAt === 'number') this.startedAt = parsed.startedAt
    } catch (error) {
      // corrupt file: start fresh
    }
  }

  _save() {
    try {
      mkdirSync(dirname(DATA_FILE), { recursive: true })
      writeFileSync(DATA_FILE, JSON.stringify(jsonSafe({
        startedAt: this.startedAt,
        weeks: Object.fromEntries(this.weeks),
        months: Object.fromEntries(this.months),
        perSession: Object.fromEntries(this.perSession),
      })), 'utf8')
    } catch (error) {
      // best-effort persistence
    }
  }

  _prune() {
    const now = Date.now()
    const wk = weekKeyOf(now)
    const mk = monthKeyOf(now)
    for (const key of this.weeks.keys()) if (!key.startsWith(wk)) this.weeks.delete(key)
    for (const key of this.months.keys()) if (!key.startsWith(mk)) this.months.delete(key)
    for (const key of this.perSession.keys()) if (!key.startsWith(String(this.startedAt))) this.perSession.delete(key)
  }

  _rows(map) {
    return [...map.values()]
      .sort((a, b) => (b.inputTokens + b.outputTokens) - (a.inputTokens + a.outputTokens))
      .map((e) => ({ ...e }))
  }

  _total(rows) {
    return rows.reduce((acc, e) => {
      acc.requests += e.requests
      acc.inputTokens += e.inputTokens
      acc.outputTokens += e.outputTokens
      acc.cacheReadTokens += e.cacheReadTokens
      acc.cacheWriteTokens += e.cacheWriteTokens
      acc.reasoningTokens += e.reasoningTokens
      return acc
    }, { requests: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0 })
  }

  async summary() {
    this._prune()
    const weekRows = this._rows(this.weeks)
    const monthRows = this._rows(this.months)
    const sessionRows = this._rows(this.perSession)
    return {
      week: { total: this._total(weekRows), rows: weekRows },
      month: { total: this._total(monthRows), rows: monthRows },
      session: { total: this._total(sessionRows), rows: sessionRows },
      startedAt: this.startedAt,
      dataFile: DATA_FILE,
    }
  }

  async breakdown(scope) {
    this._prune()
    const map = scope === 'month' ? this.months : scope === 'session' ? this.perSession : this.weeks
    return { scope: scope || 'week', rows: this._rows(map), total: this._total(this._rows(map)) }
  }

  async session() {
    this._prune()
    return { rows: this._rows(this.perSession), total: this._total(this._rows(this.perSession)) }
  }

  async reset() {
    this.weeks.clear()
    this.months.clear()
    this.perSession.clear()
    this.startedAt = Date.now()
    this._save()
    return { ok: true }
  }
}

// Best-effort provider balance adapters are intentionally NOT shipped: balance
// endpoints need each vendor's credential shape, which would hard-wire the
// plugin to specific providers. Local usage statistics are the universal,
// zero-config core; a provider's quota/balance can be read from its own
// dashboard. This keeps the plugin vendor-agnostic and honest.
const BALANCE_ADAPTERS = []

function apply(ctx) {
  const svc = new TokenStatsService(ctx)
  ctx.on('llm/stream', (options, next) => {
    return (async function* () {
      let usage = null
      for await (const chunk of next()) {
        if (chunk && chunk.type === 'usage' && chunk.usage) usage = chunk.usage
        yield chunk
      }
      if (usage) svc.recordUsage(options, usage)
    })()
  })
  for (const method of ['summary', 'breakdown', 'session', 'reset']) {
    markRemote(svc, method, method)
  }
}

export { apply, inject, name }
