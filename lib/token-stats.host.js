// dsh-delegation-suite / token-stats.host — host half.
// Current-week and current-year (per-month) token usage buckets, persisted to
// $DSH_HOME/data/dsh-delegation-suite/token-stats.json, plus best-effort
// provider balance/quota queries (deepseek, kimi, zai/glm, codebuddy,
// xiaomi/mimo, ...).
// Remote service `tokenStats`: summary / accounts / session / reset.
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const name = 'token-stats'
const inject = ['timer']

const DATA_DIR = join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'data', 'dsh-delegation-suite')
const DATA_FILE = join(DATA_DIR, 'token-stats.json')
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

/** Recursively drop undefined values so RPC payloads stay lossless JSON. */
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

  // ---------- bucket helpers ----------
  static zeroEntry(provider, model) {
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

  static weekKeyOf(ms) {
    const d = new Date(ms)
    const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7))
    return String(m.getFullYear()) + '-' + String(m.getMonth() + 1).padStart(2, '0') + '-' + String(m.getDate()).padStart(2, '0')
  }

  static monthKeyOf(ms) {
    const d = new Date(ms)
    return String(d.getFullYear()) + '-' + String(d.getMonth() + 1).padStart(2, '0')
  }

  _addTo(entry, usage) {
    entry.requests += 1
    entry.inputTokens += usage.inputTokens || 0
    entry.outputTokens += usage.outputTokens || 0
    entry.cacheReadTokens += usage.cacheReadTokens || 0
    entry.cacheWriteTokens += usage.cacheWriteTokens || 0
    entry.reasoningTokens += usage.reasoningTokens || 0
    entry.lastAt = Date.now()
  }

  _writeBucket(map, key, options, usage) {
    let entry = map.get(key)
    if (!entry) {
      entry = TokenStatsService.zeroEntry(options.provider, options.model)
      map.set(key, entry)
    }
    this._addTo(entry, usage)
  }

  _prune() {
    const now = Date.now()
    const wk = TokenStatsService.weekKeyOf(now)
    const yearKey = String(new Date(now).getFullYear())
    const curMKey = TokenStatsService.monthKeyOf(now)
    // weeks: 只保留当前周
    for (const k of this.weeks.keys()) {
      if (k.slice(0, k.indexOf('|')) !== wk) this.weeks.delete(k)
    }
    // months: 只保留当前年且不超过当前月的月份桶（年度统计）
    for (const k of this.months.keys()) {
      const bk = k.slice(0, k.indexOf('|'))
      if (bk.indexOf(yearKey + '-') !== 0 || bk > curMKey) this.months.delete(k)
    }
  }

  recordUsage(options, usage) {
    const modelKey = options.provider + '::' + options.model
    const now = Date.now()
    const wk = TokenStatsService.weekKeyOf(now)
    const mk = TokenStatsService.monthKeyOf(now)
    this._writeBucket(this.weeks, wk + '|' + modelKey, options, usage)
    this._writeBucket(this.months, mk + '|' + modelKey, options, usage)
    this._prune()
    if (options.sessionId) {
      let entry = this.perSession.get(String(options.sessionId))
      if (!entry) {
        entry = TokenStatsService.zeroEntry(options.provider, options.model)
        this.perSession.set(String(options.sessionId), entry)
      }
      this._addTo(entry, usage)
    }
    this._scheduleSave()
  }

  // ---------- persistence ----------
  _scheduleSave() {
    if (this._saveTimer !== null) return
    this._saveTimer = this.ctx.timeout(() => {
      this._saveTimer = null
      try { this._save() } catch { /* non-fatal */ }
    }, SAVE_DEBOUNCE_MS)
  }

  _save() {
    try {
      mkdirSync(DATA_DIR, { recursive: true })
      const payload = {
        version: 1,
        savedAt: Date.now(),
        weeks: [...this.weeks.entries()],
        months: [...this.months.entries()],
      }
      writeFileSync(DATA_FILE, JSON.stringify(payload), 'utf8')
    } catch (err) {
      this.ctx.logger?.error?.('token-stats: save failed ' + String(err))
    }
  }

  _load() {
    try {
      if (!existsSync(DATA_FILE)) return
      const payload = JSON.parse(readFileSync(DATA_FILE, 'utf8'))
      if (!payload || payload.version !== 1) return
      if (Array.isArray(payload.weeks)) {
        for (const [k, e] of payload.weeks) this.weeks.set(k, e)
      }
      if (Array.isArray(payload.months)) {
        for (const [k, e] of payload.months) this.months.set(k, e)
      }
    } catch (err) {
      this.ctx.logger?.error?.('token-stats: load failed ' + String(err))
    }
  }

  // ---------- queries ----------
  _collect(map, bucketKey) {
    const prefix = bucketKey + '|'
    const rows = new Map()
    const total = TokenStatsService.zeroEntry('', '')
    for (const [k, e] of map) {
      if (k.indexOf(prefix) !== 0) continue
      total.requests += e.requests
      total.inputTokens += e.inputTokens
      total.outputTokens += e.outputTokens
      total.cacheReadTokens += e.cacheReadTokens
      total.cacheWriteTokens += e.cacheWriteTokens
      total.reasoningTokens += e.reasoningTokens
      if (e.lastAt > total.lastAt) total.lastAt = e.lastAt
      const mk = e.provider + '::' + e.model
      let r = rows.get(mk)
      if (!r) {
        r = TokenStatsService.zeroEntry(e.provider, e.model)
        rows.set(mk, r)
      }
      r.requests += e.requests
      r.inputTokens += e.inputTokens
      r.outputTokens += e.outputTokens
      r.cacheReadTokens += e.cacheReadTokens
      r.cacheWriteTokens += e.cacheWriteTokens
      r.reasoningTokens += e.reasoningTokens
      if (e.lastAt > r.lastAt) r.lastAt = e.lastAt
    }
    const billed = (x) => x.inputTokens + x.cacheReadTokens + x.cacheWriteTokens + x.outputTokens
    return {
      total,
      rows: [...rows.values()].sort((a, b) => billed(b) - billed(a)),
    }
  }

  summary() {
    // 先按当前时间清理桶（跨年空闲窗口、时钟调整后 year 与 months 口径一致）
    this._prune()
    const now = Date.now()
    const curW = TokenStatsService.weekKeyOf(now)
    const d = new Date(now)
    const year = d.getFullYear()
    const curMonth = d.getMonth() + 1
    // 本周（单桶）
    const weekList = [{
      key: curW,
      label: '本周（' + curW.slice(5).replace('-', '/') + ' 起）',
      ...this._collect(this.weeks, curW),
    }]
    // 今年 1 月 ~ 当前月（升序）
    const monthList = []
    for (let m = 1; m <= curMonth; m++) {
      const key = String(year) + '-' + String(m).padStart(2, '0')
      monthList.push({ key, label: m + '月', ...this._collect(this.months, key) })
    }
    // 年度聚合：今年所有月桶之和
    const yearTotal = TokenStatsService.zeroEntry('', '')
    const yearRows = new Map()
    for (const [, e] of this.months) {
      if (!e || typeof e !== 'object') continue
      yearTotal.requests += e.requests
      yearTotal.inputTokens += e.inputTokens
      yearTotal.outputTokens += e.outputTokens
      yearTotal.cacheReadTokens += e.cacheReadTokens
      yearTotal.cacheWriteTokens += e.cacheWriteTokens
      yearTotal.reasoningTokens += e.reasoningTokens
      if (e.lastAt > yearTotal.lastAt) yearTotal.lastAt = e.lastAt
      const mk = e.provider + '::' + e.model
      let r = yearRows.get(mk)
      if (!r) {
        r = TokenStatsService.zeroEntry(e.provider, e.model)
        yearRows.set(mk, r)
      }
      r.requests += e.requests
      r.inputTokens += e.inputTokens
      r.outputTokens += e.outputTokens
      r.cacheReadTokens += e.cacheReadTokens
      r.cacheWriteTokens += e.cacheWriteTokens
      r.reasoningTokens += e.reasoningTokens
      if (e.lastAt > r.lastAt) r.lastAt = e.lastAt
    }
    const billedY = (x) => x.inputTokens + x.cacheReadTokens + x.cacheWriteTokens + x.outputTokens
    const yearResult = {
      total: yearTotal,
      rows: [...yearRows.values()].sort((a, b) => billedY(b) - billedY(a)),
    }
    return jsonSafe({
      startedAt: this.startedAt,
      now,
      summary: { weeks: weekList, months: monthList, year: yearResult },
    })
  }

  session(args) {
    const key = args && typeof args.sessionId === 'string' ? args.sessionId : ''
    if (!key) return null
    const entry = this.perSession.get(key)
    return entry ? jsonSafe({ ...entry }) : null
  }

  reset() {
    this.weeks.clear()
    this.months.clear()
    this.perSession.clear()
    try { this._save() } catch { /* non-fatal */ }
    return jsonSafe({ ok: true, now: Date.now() })
  }

  // ---------- accounts ----------
  async accounts(args) {
    const force = !!(args && args.force)
    const now = Date.now()
    if (!force && this._accountCache && now - this._accountCache.fetchedAt < 60 * 1000) {
      return jsonSafe(this._accountCache)
    }
    const discovered = await this._fetchAccounts()
    const results = await Promise.all(discovered.map(async (a) => {
      const base = { provider: a.provider, displayName: a.displayName }
      try {
        const result = await a.fetcher.fetch(a.profile, a.key, a.provider)
        return { ...base, status: 'ok', fetchedAt: Date.now(), ...result }
      } catch (err) {
        return { ...base, status: 'error', error: String((err && err.message) || err), fetchedAt: Date.now() }
      }
    }))
    this._accountCache = { fetchedAt: Date.now(), accounts: results }
    return jsonSafe(this._accountCache)
  }

  // ---------- provider fetchers ----------
  async _nodeExecutable() {
    if (this._nodePath !== undefined) return this._nodePath
    const subprocess = this.ctx.get('subprocess')
    if (subprocess === undefined) {
      this._nodeError = 'subprocess 服务不可用'
      this._nodePath = null
      return null
    }
    try {
      this._nodePath = await subprocess.resolveExecutable('node')
    } catch (err) {
      this._nodeError = '未找到 node 可执行文件: ' + String((err && err.message) || err)
      this._nodePath = null
    }
    return this._nodePath
  }

  async _httpJson(url, apiKey, auth, extraHeaders, method, body) {
    const subprocess = this.ctx.get('subprocess')
    if (subprocess === undefined) throw new Error('subprocess 服务不可用')
    const sp = this.ctx.get('sandboxPolicy')
    const root = sp && typeof sp.workspaceRoot === 'string' ? sp.workspaceRoot : undefined
    if (!root) throw new Error('无法确定工作目录')
    const node = await this._nodeExecutable()
    if (!node) throw new Error(this._nodeError || '未找到 node 可执行文件')
    const mode = auth === 'raw' ? 'raw' : 'bearer'
    const headers = extraHeaders || {}
    const script = [
      'const u=process.env.TS_URL,k=process.env.TS_KEY,m=process.env.TS_AUTH,H=JSON.parse(process.env.TS_HEADERS||"{}"),M=process.env.TS_METHOD||"GET",B=process.env.TS_BODY||"";',
      'const h={...H};(m==="raw"?h.authorization=k:h.authorization="Bearer "+k);',
      'const ac=new AbortController();const t=setTimeout(()=>ac.abort(),20000);',
      'fetch(u,{method:M,headers:h,body:B?B:undefined,signal:ac.signal})',
      '.then(r=>r.text().then(txt=>console.log(JSON.stringify({status:r.status,body:txt}))))',
      '.catch(e=>console.log(JSON.stringify({error:String((e&&e.message)||e)})))',
      '.finally(()=>clearTimeout(t))',
    ].join('')
    const handle = subprocess.spawn({
      argv: [node, '-e', script],
      cwd: root,
      stdio: { stdin: 'ignore', stdout: { maxBytes: 2097152 }, stderr: { maxBytes: 262144 } },
      graceMs: 3000,
      env: {
        TS_URL: url,
        TS_KEY: apiKey,
        TS_AUTH: mode,
        TS_HEADERS: JSON.stringify(headers),
        TS_METHOD: method || 'GET',
        TS_BODY: body === undefined || body === null ? '' : JSON.stringify(body),
      },
    })
    const outcome = await handle.done
    const out = handle.collected.stdout ? handle.collected.stdout.readFrom(0).text : ''
    const errOut = handle.collected.stderr ? handle.collected.stderr.readFrom(0).text : ''
    if (outcome.exitCode !== 0) {
      throw new Error('查询进程退出码 ' + outcome.exitCode + (errOut ? ' · ' + String(errOut).slice(0, 200) : ''))
    }
    let parsed
    const lines = out.trim().split(/\r?\n/)
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim()
      if (!line) continue
      try { parsed = JSON.parse(line); break } catch { /* scan */ }
    }
    if (!parsed) throw new Error('无法解析查询结果: ' + out.slice(0, 300))
    if (parsed.error) throw new Error(parsed.error)
    if (typeof parsed.status !== 'number') throw new Error('响应缺少状态码')
    if (parsed.status < 200 || parsed.status >= 300) {
      throw new Error('HTTP ' + parsed.status + (parsed.body ? ' · ' + String(parsed.body).slice(0, 160) : ''))
    }
    try { return JSON.parse(parsed.body) } catch { throw new Error('响应不是 JSON: ' + String(parsed.body).slice(0, 300)) }
  }

  static _num(v) {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }

  static _numericFields(obj) {
    const fields = []
    if (obj && typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        const v = obj[key]
        if (typeof v === 'number') fields.push({ label: key, value: v })
      }
    }
    return fields
  }

  static _resetText(item) {
    const v = item.resetTime || item.reset_at || item.reset_time || item.nextResetTime || item.next_reset_time
    if (v !== undefined && v !== null && v !== '') {
      const n = TokenStatsService._num(v)
      let ts
      if (n !== null) {
        const digits = String(v).replace(/^[-+]/, '').replace(/\.\d+$/, '').length
        ts = digits <= 10 ? n * 1000 : (digits <= 13 ? n : NaN)
      } else {
        const t = new Date(String(v).replace('Z', '+00:00'))
        ts = Number.isNaN(t.getTime()) ? NaN : t.getTime()
      }
      if (Number.isFinite(ts)) {
        const diff = ts - Date.now()
        if (diff > 0) {
          const mins = Math.floor(diff / 60000)
          const h = Math.floor(mins / 60)
          const m = mins % 60
          return (h > 0 ? h + 'h ' : '') + m + 'm 后重置'
        }
        return '即将重置'
      }
    }
    const ri = TokenStatsService._num(item.reset_in)
    if (ri !== null && ri > 0) {
      const h = Math.floor(ri / 3600)
      const m = Math.floor((ri % 3600) / 60)
      return (h > 0 ? h + 'h ' : '') + m + 'm 后重置'
    }
    return undefined
  }

  static _usageRow(item, defaultLabel) {
    const limit = TokenStatsService._num(item.limit !== undefined ? item.limit : item.limit_amount)
    let used = TokenStatsService._num(item.used !== undefined ? item.used : (item.usage !== undefined ? item.usage : item.used_amount))
    if (used === null && limit !== null) {
      const rem = TokenStatsService._num(item.remaining)
      if (rem !== null) used = limit - rem
    }
    const current = TokenStatsService._num(item.currentValue)
    if (used === null && current !== null) used = current
    if (used === null && limit === null && item.percentage === undefined) return null
    const percent = TokenStatsService._num(item.percentage)
    const label = item.name || item.title || item.model_name || defaultLabel
    return {
      label: String(label),
      used: used === null ? 0 : used,
      limit: limit === null ? 0 : limit,
      percent: percent !== null ? Math.round(percent) : (limit !== null && limit > 0 && used !== null ? Math.round((used / limit) * 100) : undefined),
      reset: TokenStatsService._resetText(item),
    }
  }

  static _parseKimiPayload(payload) {
    const rows = []
    const list = Array.isArray(payload.data) ? payload.data : null
    if (list) {
      for (const item of list) {
        const row = TokenStatsService._usageRow(item, '用量')
        if (row) rows.push(row)
      }
      return rows
    }
    const usage = payload.usage
    if (usage && typeof usage === 'object') {
      const row = TokenStatsService._usageRow(usage, '本周用量')
      if (row) rows.push(row)
    }
    if (Array.isArray(payload.limits)) {
      payload.limits.forEach((it, idx) => {
        const detail = it.detail && typeof it.detail === 'object' ? it.detail : it
        const win = it.window && typeof it.window === 'object' ? it.window : {}
        const duration = TokenStatsService._num(win.duration)
        const unit = String(win.timeUnit || win.time_unit || '').toUpperCase()
        let label = '额度 ' + (idx + 1)
        if (duration !== null) {
          if (unit.indexOf('MINUTE') !== -1) label = (duration >= 60 && duration % 60 === 0 ? duration / 60 + '小时' : duration + '分钟') + '窗口'
          else if (unit.indexOf('HOUR') !== -1) label = duration + '小时窗口'
          else if (unit.indexOf('DAY') !== -1) label = duration + '天窗口'
          else if (unit.indexOf('MONTH') !== -1) label = duration + '月窗口'
          else if (unit.indexOf('YEAR') !== -1) label = duration + '年窗口'
          else label = duration + unit + '窗口'
        }
        const row = TokenStatsService._usageRow(detail, label)
        if (row) rows.push(row)
      })
    }
    return rows
  }

  static _parseZaiLimits(limits) {
    const rows = []
    if (!Array.isArray(limits)) return rows
    const unitMap = { 3: '小时', 6: '天' }
    limits.forEach((item) => {
      if (!item || typeof item !== 'object') return
      const used = TokenStatsService._num(item.currentValue)
      const limit = TokenStatsService._num(item.usage)
      if (used === null && limit === null) return
      const percent = TokenStatsService._num(item.percentage)
      let label
      if (item.type === 'TOKENS_LIMIT') {
        const u = unitMap[item.unit]
        label = u ? (String(item.number) + u + '窗口') : ('Token 额度')
      } else if (item.type === 'TIME_LIMIT') {
        label = '月度调用额度'
      } else {
        label = (item.type || '额度') + ' 额度'
      }
      rows.push({
        label,
        used: used === null ? 0 : used,
        limit: limit === null ? 0 : limit,
        percent: percent !== null ? Math.round(percent) : undefined,
        reset: TokenStatsService._resetText(item),
      })
    })
    return rows
  }

  async _fetchZaiBalance(root, key) {
    const [report, tokens] = await Promise.all([
      this._httpJson(root + '/api/biz/account/query-customer-account-report', key, 'bearer'),
      this._httpJson(root + '/api/biz/tokenAccounts/list/my', key, 'bearer'),
    ])
    const d = (report && report.data) || {}
    const fields = [
      { label: '账户余额', value: d.balance, unit: '¥' },
      { label: '可用余额', value: d.availableBalance, unit: '¥' },
      { label: '充值金额', value: d.rechargeAmount, unit: '¥' },
      { label: '赠送金额', value: d.giveAmount, unit: '¥' },
      { label: '冻结余额', value: d.frozenBalance, unit: '¥' },
      { label: '累计消费', value: d.totalSpendAmount, unit: '¥' },
    ]
    const tokenRows = tokens && Array.isArray(tokens.rows) ? tokens.rows : []
    const tRows = tokenRows.map((tr) => ({
      label: tr.resourcePackageName || tr.suitableModel || 'token 包',
      value: tr.tokenBalance !== undefined ? tr.tokenBalance : undefined,
      unit: tr.tokensMagnitude === 1 ? 'K' : undefined,
    })).filter((tr) => tr.value !== undefined)
    return [...fields, ...tRows.map((tr) => ({ label: tr.label, value: tr.value, unit: tr.unit }))]
  }

  _providerTotals(providerId) {
    const t = { requests: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }
    const prefix = '|' + providerId + '::'
    for (const [k, e] of this.months) {
      if (k.indexOf(prefix) === -1) continue
      t.requests += e.requests
      t.inputTokens += e.inputTokens
      t.outputTokens += e.outputTokens
      t.cacheReadTokens += e.cacheReadTokens
      t.cacheWriteTokens += e.cacheWriteTokens
    }
    return t
  }

  // ---------- CodeBuddy (Tencent) integration ----------
  get _cbFile() {
    return join(DATA_DIR, 'codebuddy-token.json')
  }

  _cbLoad() {
    try {
      if (!existsSync(this._cbFile)) return null
      return JSON.parse(readFileSync(this._cbFile, 'utf8'))
    } catch { return null }
  }

  _cbSave(state) {
    try {
      mkdirSync(DATA_DIR, { recursive: true })
      writeFileSync(this._cbFile, JSON.stringify(state), 'utf8')
    } catch (err) {
      this.ctx.logger?.error?.('codebuddy save failed ' + String(err))
    }
  }

  async _cbRequest(path, opts) {
    const url = 'https://www.codebuddy.cn' + path
    const headers = {
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    }
    const j = await this._httpJson(url, opts.token || '', 'bearer', headers, opts.method, opts.body)
    if (j && typeof j.code === 'number' && j.code !== 0 && j.code !== 200) {
      throw new Error((j.message || j.msg) || ('code ' + j.code))
    }
    return j
  }

  async codebuddyLogin() {
    const j = await this._cbRequest('/v2/plugin/auth/state?platform=ide', { method: 'POST', body: {} })
    const data = (j && j.data) || {}
    const state = data.state
    if (!state) throw new Error('CodeBuddy 登录启动失败：响应缺少 state')
    this._cbPending = { state, expiresAt: Date.now() + 10 * 60 * 1000 }
    const authUrl = data.authUrl || data.auth_url || data.url || ''
    const verificationUri = authUrl || ('https://www.codebuddy.cn/login?state=' + encodeURIComponent(state))
    return { verificationUri, state, expiresIn: 600 }
  }

  async codebuddyLoginPoll() {
    const pending = this._cbPending
    if (!pending) return { ok: false, error: '请先发起登录' }
    if (Date.now() > pending.expiresAt) {
      this._cbPending = null
      return { ok: false, error: '登录超时，请重新发起' }
    }
    const j = await this._cbRequest('/v2/plugin/auth/token?state=' + encodeURIComponent(pending.state), {})
    const data = (j && j.data) || {}
    const accessToken = data.accessToken || data.access_token || ''
    if (!accessToken) return { ok: false, waiting: true }
    const refreshToken = data.refreshToken || data.refresh_token || ''
    const expiresAt = Number(data.expiresAt || data.expires_at) || 0
    const domain = data.domain || ''
    let uid = ''
    let enterpriseId = ''
    let nickname = ''
    let email = ''
    try {
      const acc = await this._cbRequest('/v2/plugin/login/account', { token: accessToken })
      const ad = (acc && acc.data) || {}
      uid = String(ad.uid || '')
      nickname = String(ad.nickname || '')
      email = String(ad.email || '')
      enterpriseId = String(ad.enterpriseId || ad.enterprise_id || '')
    } catch { /* 账号信息失败不致命 */ }
    this._cbState = { accessToken, refreshToken, expiresAt, uid, enterpriseId, nickname, email, domain, savedAt: Date.now() }
    this._cbSave(this._cbState)
    this._cbPending = null
    this._accountCache = null
    return { ok: true, account: nickname || email || 'CodeBuddy' }
  }

  async _cbRefreshToken() {
    const s = this._cbState || this._cbLoad()
    if (!s || !s.refreshToken) return null
    try {
      const j = await this._cbRequest('/v2/plugin/auth/token/refresh', {
        method: 'POST',
        token: s.accessToken,
        headers: { 'X-Refresh-Token': s.refreshToken },
      })
      const d = (j && j.data) || {}
      const accessToken = d.accessToken || d.access_token
      if (accessToken) {
        this._cbState = {
          ...s,
          accessToken,
          refreshToken: d.refreshToken || d.refresh_token || s.refreshToken,
          expiresAt: Number(d.expiresAt || d.expires_at) || 0,
          savedAt: Date.now(),
        }
        this._cbSave(this._cbState)
        return this._cbState
      }
    } catch { /* ignore */ }
    return null
  }

  static _cbTimeString(ms) {
    const d = new Date(ms)
    const p = (n) => String(n).padStart(2, '0')
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
      + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
  }

  async _cbQueryResource() {
    let s = this._cbState || this._cbLoad()
    if (!s || !s.accessToken) throw new Error('codebuddy-not-logged-in')
    const attempt = async () => {
      const headers = {}
      if (s.uid) headers['X-User-Id'] = s.uid
      if (s.enterpriseId) {
        headers['X-Enterprise-Id'] = s.enterpriseId
        headers['X-Tenant-Id'] = s.enterpriseId
      }
      if (s.domain) headers['X-Domain'] = s.domain
      return this._cbRequest('/v2/billing/meter/get-user-resource', {
        method: 'POST',
        token: s.accessToken,
        headers,
        body: {
          PageNumber: 1,
          PageSize: 100,
          ProductCode: 'p_tcaca',
          Status: [0, 3],
          PackageEndTimeRangeBegin: TokenStatsService._cbTimeString(Date.now()),
          PackageEndTimeRangeEnd: TokenStatsService._cbTimeString(Date.now() + 365 * 101 * 24 * 3600 * 1000),
        },
      })
    }
    let j
    try {
      j = await attempt()
    } catch (err) {
      if (String((err && err.message) || '').indexOf('HTTP 401') !== -1) {
        const refreshed = await this._cbRefreshToken()
        if (refreshed) {
          s = refreshed
          j = await attempt()
        } else {
          throw new Error('codebuddy-token-expired')
        }
      } else {
        throw err
      }
    }
    return j
  }

  _cbParseResources(body) {
    const rows = []
    let arr = null
    let dosage = null
    const d = body && body.data
    // 真实结构：data.Response.Data.Accounts（腾讯云计费口径）
    if (d && typeof d === 'object' && d.Response && d.Response.Data) {
      const rd = d.Response.Data
      if (Array.isArray(rd.Accounts)) arr = rd.Accounts
      if (typeof rd.TotalDosage === 'number' || typeof rd.TotalDosage === 'string') dosage = rd.TotalDosage
    }
    if (!arr && d && typeof d === 'object') {
      for (const k of Object.keys(d)) {
        const v = d[k]
        if (Array.isArray(v) && v.length > 0 && v[0] && typeof v[0] === 'object'
          && (Object.prototype.hasOwnProperty.call(v[0], 'PackageCode')
            || Object.prototype.hasOwnProperty.call(v[0], 'CycleCapacitySize')
            || Object.prototype.hasOwnProperty.call(v[0], 'CapacitySize'))) {
          arr = v
          break
        }
      }
    }
    if (!arr) arr = []
    for (const item of arr) {
      if (!item || typeof item !== 'object') continue
      const status = TokenStatsService._num(item.Status)
      if (status !== null && status !== 0 && status !== 3) continue
      const total = TokenStatsService._num(item.CycleCapacitySizePrecise)
        ?? TokenStatsService._num(item.CycleCapacitySize)
        ?? TokenStatsService._num(item.CapacitySizePrecise)
        ?? TokenStatsService._num(item.CapacitySize)
      const remain = TokenStatsService._num(item.CycleCapacityRemainPrecise)
        ?? TokenStatsService._num(item.CycleCapacityRemain)
        ?? TokenStatsService._num(item.CapacityRemainPrecise)
        ?? TokenStatsService._num(item.CapacityRemain)
      if (total === null && remain === null) continue
      const used = total !== null && remain !== null ? Math.max(0, total - remain) : null
      const percent = total !== null && total > 0 && remain !== null
        ? Math.round(((total - remain) / total) * 100)
        : undefined
      const expire = item.ExpiredTime || item.CycleEndTime || item.DeductionEndTime
      rows.push({
        label: String(item.PackageName || item.PackageCode || '积分包'),
        used: used !== null ? used : 0,
        limit: total !== null ? total : 0,
        percent,
        reset: expire ? ('到期 ' + String(expire).slice(0, 10)) : undefined,
      })
    }
    return { rows, dosage }
  }

  get _fetchers() {
    if (this._fetcherTable) return this._fetcherTable
    const self = this
    this._fetcherTable = [
      {
        match: (id) => id.indexOf('deepseek') !== -1,
        async fetch(profile, key) {
          const base = (profile && typeof profile.baseURL === 'string' && profile.baseURL) || 'https://api.deepseek.com'
          const j = await self._httpJson(base.replace(/\/+$/, '') + '/user/balance', key)
          const infos = Array.isArray(j.balance_infos) ? j.balance_infos : []
          const cur = infos.find((i) => i && i.currency) || infos[0] || {}
          const result = {
            fields: [
              { label: '总余额', value: cur.total_balance, unit: cur.currency },
              { label: '充值余额', value: cur.topped_up_balance, unit: cur.currency },
              { label: '赠送余额', value: cur.granted_balance, unit: cur.currency },
            ],
          }
          if (j.is_available === false) result.note = '账户不可用'
          return result
        },
      },
      {
        match: (id) => id.indexOf('kimi') !== -1 || id.indexOf('moonshot') !== -1,
        async fetch(profile, key) {
          const planBase = 'https://api.kimi.com/coding/v1'
          const platformBase = (profile && typeof profile.baseURL === 'string' && profile.baseURL) || 'https://api.moonshot.cn'
          const errors = []
          const result = {}
          try {
            let payload = await self._httpJson(planBase + '/usages', key, 'bearer', { 'user-agent': 'KimiCLI/1.6' })
            let rows = TokenStatsService._parseKimiPayload(payload)
            if (!rows.length && payload && typeof payload === 'object') {
              payload = await self._httpJson(planBase + '/usage', key, 'bearer', { 'user-agent': 'KimiCLI/1.6' })
              rows = TokenStatsService._parseKimiPayload(payload)
            }
            if (rows.length) {
              result.quota = { rows }
              result.quotaLabel = '计划用量（5小时/周/月/年窗口）'
            } else {
              errors.push('Kimi Code 用量接口响应为空')
            }
          } catch (err) {
            errors.push('计划用量: ' + String((err && err.message) || err))
          }
          try {
            const j = await self._httpJson(platformBase.replace(/\/+$/, '') + '/v1/users/me/balance', key)
            const d = (j && j.data) || {}
            result.fields = [
              { label: '可用余额', value: d.available_balance, unit: '¥' },
              { label: '现金余额', value: d.cash_balance, unit: '¥' },
              { label: '赠金余额', value: d.voucher_balance, unit: '¥' },
              { label: '缓存 tokens', value: d.cached_tokens },
              { label: '累计用量', value: d.total_usage },
            ]
          } catch (err) {
            errors.push('平台余额: ' + String((err && err.message) || err))
          }
          if (!result.quota && !result.fields) {
            throw new Error('Kimi 接口均不可用（' + errors.join('；') + '）。提示：Kimi Code 计划 Key 格式为 sk-kimi-xxx，开放平台 Key 为 sk-xxx，两种不通用')
          }
          if (result.fields && !result.quota && errors.length) {
            result.quota = { error: errors.join('；') }
          }
          return result
        },
      },
      {
        match: (id) => id.indexOf('zai') !== -1 || id.indexOf('glm') !== -1 || id.indexOf('zhipu') !== -1 || id.indexOf('bigmodel') !== -1,
        async fetch(profile, key) {
          const configured = profile && typeof profile.baseURL === 'string' && profile.baseURL ? profile.baseURL.replace(/\/+$/, '') : undefined
          const stations = configured
            ? [{ root: configured, auth: configured.indexOf('bigmodel') !== -1 ? 'raw' : 'bearer' }]
            : [
              { root: 'https://api.z.ai', auth: 'bearer' },
              { root: 'https://open.bigmodel.cn', auth: 'raw' },
            ]
          const quotaErrors = []
          const balanceErrors = []
          const result = {}
          for (const station of stations) {
            if (result.quota) break
            try {
              const [sub, quota] = await Promise.all([
                self._httpJson(station.root + '/api/biz/subscription/list', key, station.auth),
                self._httpJson(station.root + '/api/monitor/usage/quota/limit', key, station.auth),
              ])
              const plan = sub && Array.isArray(sub.data) ? sub.data[0] : undefined
              if (plan && (plan.productName || plan.nextRenewTime)) {
                result.note = (plan.productName || 'GLM 计划') + (plan.nextRenewTime ? ' · 续期 ' + String(plan.nextRenewTime).slice(0, 10) : '')
              }
              const limits = quota && quota.data ? (Array.isArray(quota.data) ? quota.data : quota.data.limits) : null
              const rows = TokenStatsService._parseZaiLimits(limits)
              if (rows.length) {
                result.quota = { rows }
                result.quotaLabel = 'Coding Plan 配额'
              } else {
                quotaErrors.push('配额响应中未找到额度（' + station.root + '）')
              }
            } catch (err) {
              quotaErrors.push('计划配额 ' + station.root + ': ' + String((err && err.message) || err))
            }
            if (!result.quota) {
              try {
                result.fields = await self._fetchZaiBalance(station.root, key)
              } catch (err) {
                balanceErrors.push('标准余额: ' + String((err && err.message) || err))
              }
            }
          }
          if (!result.quota && !result.fields) {
            throw new Error('GLM 接口均不可用（' + [...quotaErrors, ...balanceErrors].join('；') + '）')
          }
          if (result.fields && !result.quota && quotaErrors.length) {
            result.quota = { error: quotaErrors.join('；') }
          }
          return result
        },
      },
      {
        // CodeBuddy (Tencent): credits require the web-account OAuth login
        // (API key only drives inference). Show local usage + a login action.
        match: (id) => id.indexOf('codebuddy') !== -1 || id.indexOf('copilot') !== -1,
        async fetch(profile, key, providerId) {
          const t = self._providerTotals(providerId)
          const localFields = [
            { label: '本地请求（今年）', value: t.requests },
            { label: '本地输入（今年）', value: t.inputTokens },
            { label: '本地输出（今年）', value: t.outputTokens },
            { label: '本地缓存命中（今年）', value: t.cacheReadTokens },
          ]
          const s = self._cbState || self._cbLoad()
          if (!s || !s.accessToken) {
            return {
              fields: localFields,
              note: 'CodeBuddy 积分需登录网页账号查询（API Key 查不了），点「登录 CodeBuddy」授权一次即可',
              needLogin: true,
            }
          }
          try {
            const j = await self._cbQueryResource()
            const parsed = self._cbParseResources(j)
            // 汇总：总剩余积分（所有资源包剩余之和）
            let totalRemain = 0
            let totalLimit = 0
            for (const r of parsed.rows) {
              if (r.limit > 0) {
                totalLimit += r.limit
                totalRemain += Math.max(0, r.limit - r.used)
              }
            }
            // 30 天内会过期的条目（含到期时间，升序）
            const nowMs = Date.now()
            const expiring = []
            for (const r of parsed.rows) {
              const d = r.reset && r.reset.indexOf('到期 ') === 0 ? r.reset.slice(3) : ''
              const ts = d ? Date.parse(d) : NaN
              if (Number.isNaN(ts)) continue
              const days = (ts - nowMs) / 86400000
              if (days >= -1 && days <= 30) {
                expiring.push({
                  label: r.label,
                  remain: r.limit > 0 ? Math.max(0, r.limit - r.used) : 0,
                  reset: r.reset,
                })
              }
            }
            expiring.sort((a, b) => a.reset.localeCompare(b.reset))
            // 过滤已用尽的包，按剩余降序，最多展示 10 条，其余聚合
            const useful = expiring.filter((e) => e.remain > 0).sort((a, b) => b.remain - a.remain)
            const shown = useful.slice(0, 10)
            const rest = useful.slice(10)
            const expiringTotal = useful.reduce((s, e) => s + e.remain, 0)
            const restTotal = rest.reduce((s, e) => s + e.remain, 0)
            const fields = [
              { label: '总剩余积分', value: Math.round(totalRemain * 100) / 100, unit: 'credits' },
              { label: '积分总量', value: Math.round(totalLimit * 100) / 100, unit: 'credits' },
              { label: '累计消耗', value: parsed.dosage !== null && parsed.dosage !== undefined ? parsed.dosage : 0, unit: 'credits' },
              ...localFields,
            ]
            const result = { fields }
            const who = s.nickname || s.email
            if (who) result.note = '账号：' + who + (expiringTotal > 0 ? ' · 30 天内过期合计 ' + Math.round(expiringTotal * 100) / 100 + ' credits' : '')
            if (shown.length > 0) {
              result.quota = {
                rows: [
                  ...shown.map((e) => ({ label: e.label, used: Math.round(e.remain * 100) / 100, limit: 0, percent: undefined, reset: e.reset })),
                  ...(rest.length > 0 ? [{ label: '其余 ' + rest.length + ' 个小包', used: Math.round(restTotal * 100) / 100, limit: 0, percent: undefined, reset: undefined }] : []),
                ],
              }
              result.quotaLabel = '30 天内过期'
            }
            return result
          } catch (err) {
            const msg = String((err && err.message) || err)
            if (msg === 'codebuddy-not-logged-in' || msg === 'codebuddy-token-expired') {
              return { fields: localFields, note: 'CodeBuddy 登录已失效，请重新登录', needLogin: true }
            }
            return { fields: localFields, note: '积分查询失败：' + msg }
          }
        },
      },
      {
        match: (id) => id.indexOf('xiaomi') !== -1 || id.indexOf('mimo') !== -1,
        async fetch(profile, key, providerId) {
          const t = self._providerTotals(providerId)
          return {
            fields: [
              { label: '本地请求（今年）', value: t.requests },
              { label: '本地输入（今年）', value: t.inputTokens },
              { label: '本地输出（今年）', value: t.outputTokens },
              { label: '本地缓存命中（今年）', value: t.cacheReadTokens },
            ],
            note: 'MiMo 官方无 API 配额/余额查询（仅网页控制台，需登录态），以上为今年 DSH 本地使用统计',
          }
        },
      },
      {
        match: (id) => id.indexOf('minimax') !== -1 || id.indexOf('mimo') !== -1,
        async fetch(profile, key) {
          const base = (profile && typeof profile.baseURL === 'string' && profile.baseURL) || 'https://api2.minimaxi.com'
          const j = await self._httpJson(base.replace(/\/+$/, '') + '/v1/token_plan/remains', key)
          const resp = j && j.base_resp
          if (resp && typeof resp.status_code === 'number' && resp.status_code !== 0) {
            throw new Error(resp.status_msg || ('status ' + resp.status_code))
          }
          const d = (j && (j.data || j.quota)) || {}
          const fields = TokenStatsService._numericFields(d)
          if (!fields.length) {
            const extra = TokenStatsService._numericFields(j).slice(0, 10)
            if (extra.length) {
              return { quota: { fields: extra }, quotaLabel: '账户配额' }
            }
            throw new Error('响应中未找到配额字段: ' + JSON.stringify(j).slice(0, 200))
          }
          return { quota: { fields }, quotaLabel: 'Token 计划剩余' }
        },
      },
    ]
    return this._fetcherTable
  }

  async _fetchAccounts() {
    const llm = this.ctx.get('llm')
    const settings = this.ctx.get('settings')
    const credentials = this.ctx.get('credentials')
    if (!llm || !settings) return []
    const entries = llm.listConfigurableProviders()
    const accounts = []
    for (const entry of entries) {
      let profile
      try { profile = settings.get(entry.settingsNs) } catch { profile = undefined }
      if (Array.isArray(entry.settingsPath) && entry.settingsPath.length) {
        for (const k of entry.settingsPath) {
          profile = profile && typeof profile === 'object' ? profile[k] : undefined
        }
      }
      let key
      if (profile && typeof profile.apiKeyEnv === 'string') {
        if (credentials) {
          try {
            const hit = await credentials.resolve(profile.apiKeyEnv)
            key = hit ? hit.value : undefined
          } catch { key = undefined }
        }
      } else if (profile && typeof profile.apiKey === 'string' && profile.apiKey) {
        key = profile.apiKey
      }
      if (!key) continue
      const fetcher = this._fetchers.find((f) => f.match(entry.provider))
      if (!fetcher) continue
      accounts.push({ provider: entry.provider, displayName: entry.displayName, key, fetcher, profile })
    }
    return accounts
  }
}

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
  for (const method of ['summary', 'accounts', 'session', 'reset', 'codebuddyLogin', 'codebuddyLoginPoll']) {
    markRemote(svc, method, method)
  }
}

export { apply, inject, name }
