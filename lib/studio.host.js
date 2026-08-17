// dsh-delegation-suite / studio.host — host half of the Preset Studio.
// Exposes a Typert Remote service `presetStudio` for the Settings editor:
// list / readComposition / saveMeta (preset.yml) / savePersona (persona block
// in agent.cordis.yml, validated by a full standing mount, auto-reverted on
// failure) / readRoutes / saveRoutes (the delegation routes.json, stored in
// $DSH_HOME/data/dsh-delegation-suite/ so package upgrades never clobber it).
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

const name = 'preset-studio'
const inject = ['agentPresets']

const DEFAULT_ROUTES = {
  frontend: [['deepseek-official', 'deepseek-v4-flash', 'high'], ['deepseek-official', 'deepseek-v4-pro', 'high']],
  backend: [['deepseek-official', 'deepseek-v4-flash', 'high'], ['deepseek-official', 'deepseek-v4-pro', 'high']],
  reasoning: [['deepseek-official', 'deepseek-v4-pro', 'max'], ['deepseek-official', 'deepseek-v4-flash', 'high']],
  vision: [['deepseek-official', 'deepseek-v4-flash', '']],
  bulk: [['deepseek-official', 'deepseek-v4-flash', 'high']],
  analysis: [['deepseek-official', 'deepseek-v4-pro', 'high'], ['deepseek-official', 'deepseek-v4-flash', 'high']],
  review: [['deepseek-official', 'deepseek-v4-pro', 'high'], ['deepseek-official', 'deepseek-v4-flash', 'high']],
  adversary: [['deepseek-official', 'deepseek-v4-pro', 'high']],
  general: [['deepseek-official', 'deepseek-v4-flash', 'high'], ['deepseek-official', 'deepseek-v4-pro', 'high']],
}

function routesPath() {
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, 'data', 'dsh-delegation-suite', 'routes.json')
}

function ensureRoutesFile() {
  const path = routesPath()
  if (!existsSync(path)) {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify(DEFAULT_ROUTES, null, 2), 'utf8')
  }
  return path
}

class PresetStudioService extends TypertRemoteService {
  constructor(ctx) {
    super(ctx, 'presetStudio')
  }

  async list() {
    const presets = await this.ctx.agentPresets.list()
    return presets.map((p) => {
      let meta = null
      try {
        const metaPath = join(dirname(p.path), 'preset.yml')
        if (existsSync(metaPath)) {
          const text = readFileSync(metaPath, 'utf8')
          const nameMatch = text.match(/^name:\s*(.+)$/m)
          const descMatch = text.match(/^description:\s*(.+)$/m)
          const orderMatch = text.match(/^order:\s*(.+)$/m)
          meta = {
            name: nameMatch ? nameMatch[1].trim().replace(/^["']|["']$/g, '') : null,
            description: descMatch ? descMatch[1].trim().replace(/^["']|["']$/g, '') : null,
            order: orderMatch ? orderMatch[1].trim() : null,
          }
        }
      } catch (error) {
        meta = { error: String(error) }
      }
      return {
        id: p.id,
        trust: p.trust,
        broken: p.broken ?? null,
        path: p.path,
        name: meta && !meta.error && meta.name ? meta.name : p.id,
        description: meta && !meta.error && meta.description ? meta.description : '',
        editable: p.trust === 'user',
        metaError: meta && meta.error ? meta.error : null,
      }
    })
  }

  async readComposition({ id }) {
    const p = await this._find(id)
    return { text: readFileSync(p.path, 'utf8') }
  }

  async saveMeta({ id, name, description }) {
    const p = await this._find(id)
    this._assertEditable(p)
    const metaPath = join(dirname(p.path), 'preset.yml')
    const oldText = existsSync(metaPath) ? readFileSync(metaPath, 'utf8') : null
    const order = oldText ? (oldText.match(/^order:\s*(.+)$/m) || [])[1] : undefined
    let out = ''
    if (name && String(name).trim()) out += 'name: ' + String(name).trim() + '\n'
    if (description !== undefined) out += 'description: ' + String(description ?? '') + '\n'
    if (order) out += 'order: ' + order.trim() + '\n'
    writeFileSync(metaPath, out, 'utf8')
    return { ok: true }
  }

  async savePersona({ id, persona }) {
    const p = await this._find(id)
    this._assertEditable(p)
    const file = p.path
    const oldText = readFileSync(file, 'utf8')
    const lines = oldText.split('\n')
    let personaIdx = -1
    let textIdx = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '- id: persona') {
        personaIdx = i
        continue
      }
      if (personaIdx >= 0 && lines[i].includes('text: >-')) {
        textIdx = i
        break
      }
    }
    if (textIdx < 0) throw new Error('该预设没有可编辑的 persona 段落')
    let end = lines.length
    for (let i = textIdx + 1; i < lines.length; i++) {
      if (/^-\s/.test(lines[i])) {
        end = i
        break
      }
    }
    const indent = '      '
    const body = String(persona ?? '').split('\n').map((l) => indent + l).join('\n')
    const newText = [...lines.slice(0, textIdx + 1), body, ...lines.slice(end)].join('\n')
    writeFileSync(file, newText, 'utf8')
    try {
      await this.ctx.agentPresets.standingKeyFor(id)
    } catch (error) {
      writeFileSync(file, oldText, 'utf8')
      throw new Error('保存后挂载校验失败，已自动回滚: ' + error.message)
    }
    return { ok: true }
  }

  async readRoutes() {
    const path = ensureRoutesFile()
    const text = existsSync(path) ? readFileSync(path, 'utf8') : '{}'
    let routes = {}
    try {
      routes = JSON.parse(text)
    } catch (error) {
      routes = {}
    }
    return { routes, path, exists: existsSync(path), error: existsSync(path) ? null : 'routes.json 未找到' }
  }

  async saveRoutes({ routes }) {
    if (!routes || typeof routes !== 'object' || Array.isArray(routes)) throw new Error('routes 必须是对象')
    const entries = Object.entries(routes)
    if (entries.length === 0) throw new Error('routes 不能为空')
    for (const [role, list] of entries) {
      if (!Array.isArray(list) || list.length === 0) throw new Error('角色 ' + role + ' 的模型列表不能为空')
      for (const row of list) {
        if (!Array.isArray(row) || (row.length !== 2 && row.length !== 3) || typeof row[0] !== 'string' || typeof row[1] !== 'string' || !row[0] || !row[1]) {
          throw new Error('角色 ' + role + ' 存在非法行（需要 [provider, model] 或 [provider, model, effort]）')
        }
        if (row.length === 3 && (typeof row[2] !== 'string' || row[2] === '')) {
          throw new Error('角色 ' + role + ' 的思考强度列必须是非空字符串（如 max/high/low/off；不指定请省略该列）')
        }
      }
    }
    const path = ensureRoutesFile()
    writeFileSync(path, JSON.stringify(routes, null, 2), 'utf8')
    return { ok: true, path }
  }

  async _find(id) {
    const presets = await this.ctx.agentPresets.list()
    const p = presets.find((x) => x.id === id)
    if (!p) throw new Error('预设不存在: ' + id)
    return p
  }

  _assertEditable(p) {
    if (p.trust !== 'user') throw new Error('内置预设只读（' + p.id + '）')
  }
}

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

function apply(ctx) {
  const svc = new PresetStudioService(ctx, 'presetStudio')
  for (const method of ['list', 'readComposition', 'saveMeta', 'savePersona', 'readRoutes', 'saveRoutes']) {
    markRemote(svc, method, method)
  }
}

export { apply, inject, name }
