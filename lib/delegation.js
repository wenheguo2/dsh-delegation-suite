// dsh-delegation-suite / delegation — host-plane ranked delegation tool.
//
// `delegate_ranked` picks the strongest available model for a task role and
// fails over down the ranking when a route errors (quota, auth, rate limit,
// transport, or the child failing to finish). Routes live in
// $DSH_HOME/data/dsh-delegation-suite/routes.json — read fresh on EVERY call,
// so editing the JSON (or the visual editor in Settings → 预设工作室) takes
// effect immediately. Each route row is [provider, model] or
// [provider, model, effort]; a non-empty effort is stamped onto the child
// agent and applied to every subagent request by the agent/request listener
// below. Labels always carry [provider/model] so the subagent tree shows the
// model at a glance.
import { defineTool } from '@deepseek-ai/dsh-tools'
import { delegationDepthOf } from '@deepseek-ai/dsh-subagent'
import Schema from '@deepseek-ai/schemastery'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

const name = 'delegation'
const inject = ['tools', 'subagents']

const DEFAULT_ROUTES = {
  frontend: [
    ['deepseek-official', 'deepseek-v4-flash', 'high'],
    ['deepseek-official', 'deepseek-v4-pro', 'high'],
  ],
  backend: [
    ['deepseek-official', 'deepseek-v4-flash', 'high'],
    ['deepseek-official', 'deepseek-v4-pro', 'high'],
  ],
  reasoning: [
    ['deepseek-official', 'deepseek-v4-pro', 'max'],
    ['deepseek-official', 'deepseek-v4-flash', 'high'],
  ],
  vision: [
    ['deepseek-official', 'deepseek-v4-flash', ''],
  ],
  bulk: [
    ['deepseek-official', 'deepseek-v4-flash', 'high'],
  ],
  analysis: [
    ['deepseek-official', 'deepseek-v4-pro', 'high'],
    ['deepseek-official', 'deepseek-v4-flash', 'high'],
  ],
  review: [
    ['deepseek-official', 'deepseek-v4-pro', 'high'],
    ['deepseek-official', 'deepseek-v4-flash', 'high'],
  ],
  adversary: [
    ['deepseek-official', 'deepseek-v4-pro', 'high'],
  ],
  general: [
    ['deepseek-official', 'deepseek-v4-flash', 'high'],
    ['deepseek-official', 'deepseek-v4-pro', 'high'],
  ],
}

// The routes table lives OUTSIDE the package so upgrades never clobber it.
function routesFile() {
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, 'data', 'dsh-delegation-suite', 'routes.json')
}

let routesCache = null
function routes() {
  try {
    const file = routesFile()
    if (!existsSync(file)) {
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, JSON.stringify(DEFAULT_ROUTES, null, 2), 'utf8')
    }
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
      routesCache = parsed
      return parsed
    }
  } catch (error) {
    // routes.json missing or broken: keep the last good table
  }
  return routesCache || DEFAULT_ROUTES
}

// Route-level failure markers: hitting any of these on a model means "the route
// is unusable right now" (quota, key, rate, transport) — fail over, don't retry.
const FAILOVER_MARKERS = [
  'QUOTA', 'AUTH', 'RATE_LIMIT', 'TRANSPORT', 'TIMEOUT', 'SERVER', 'HTTP_5',
  'MISSING_CREDENTIAL', 'INVALID_CREDENTIAL', 'STREAM_CLOSED', 'EMPTY_RESPONSE',
  'CONTEXT_WINDOW_EXCEEDED', 'insufficient', 'quota', 'unauthorized', 'balance',
]

function isFailoverError(message) {
  const text = String(message)
  return FAILOVER_MARKERS.some((marker) => text.includes(marker))
}

function stopReasonHeadline(reason) {
  switch (reason) {
    case 'completed': return ''
    case 'aborted': return 'subagent run was cancelled'
    case 'error': return 'subagent run failed'
    case 'max-tokens': return 'subagent run hit its token limit before finishing'
    case 'refusal': return 'subagent declined the task'
    default: return 'subagent run ended abnormally (' + String(reason) + ')'
  }
}

function textOf(output) {
  return (output || [])
    .filter((b) => b && typeof b === 'object' && b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('')
}

// Transcription instruction handed to the vision subagent. The user's own
// message (trimmed) gives it context; the transcription must stay plain text.
function transcriptionInstruction(contextText) {
  const context = typeof contextText === 'string' && contextText.trim() !== ''
    ? contextText.trim().slice(0, 2000)
    : ''
  const lines = [
    'The user attached the image(s) below because their main model cannot see images directly.',
    'Read EVERY image carefully and transcribe it in full detail:',
    '- all visible text verbatim (OCR), including code, tables and numbers,',
    '- layout and UI elements, charts and their data,',
    '- objects, scenes, people, colors, and any other relevant detail.',
    'Be objective and exhaustive; do not invent content that is not visible.',
    context ? 'The user\'s accompanying message (for context):\n"""\n' + context + '\n"""' : '',
    'Write the transcription in the language of the accompanying message; if there is none or it is ambiguous, use Chinese.',
    'Return the transcription as plain text (no markdown code fences, no preamble).',
  ]
  return lines.filter(Boolean).join('\n')
}

function apply(ctx, config) {
  const maxDepth = (config && typeof config.maxDepth === 'number') ? config.maxDepth : 3

  // Settings namespace (plugin-owned settings surface): the browser Plugins
  // settings tab serves every registered namespace. Live-read via scope.get()
  // so edits take effect without a restart. Guarded: a failed registration
  // (stale schema or hand-edited settings) degrades to defaults — the live
  // reads below fall back when visionScope is undefined.
  let visionScope
  try {
    const settings = ctx.get('settings')
    visionScope = settings && settings.register
      ? settings.register('dsh-delegation', Schema.object({
          transcribeEnabled: Schema.boolean().default(true).description('文本模型收到图片时，先由视觉子代理转写再继续（关闭=发送将收到转写失败提示，可用图片模型不受影响）'),
          transcribeModel: Schema.string().default('').description('专用视觉转写模型 provider/model；留空=跟随 routes.json 的 vision 表；指定后不回退'),
          transcribeTimeoutMs: Schema.number().default(180000).min(10000).max(600000).description('一次转写的总超时（毫秒）'),
        }))
      : undefined
  } catch (error) {
    visionScope = undefined
    if (ctx.logger && ctx.logger.warn) {
      ctx.logger.warn('dsh-delegation: settings namespace registration failed; vision transcription runs on defaults. ' + String(error))
    }
  }

  // Vision transcription service (optional consumer: api-proxy prompt
  // admission). When the session's model cannot accept image input, the host
  // saves the attachments and calls transcribe(); this implementation reads
  // them with a vision-role subagent (routes.json 'vision' table, failover
  // across every listed route) and returns the transcription text.
  ctx.provide('visionTranscriber', {
    async transcribe({ images, contextText, parent }) {
      const conf = visionScope ? visionScope.get() : undefined
      if (conf && conf.transcribeEnabled === false) {
        throw new Error('vision transcription disabled by settings (dsh-delegation.transcribeEnabled)')
      }
      const overrideModel = conf && typeof conf.transcribeModel === 'string'
        ? conf.transcribeModel.trim()
        : ''
      const timeoutMs = conf && typeof conf.transcribeTimeoutMs === 'number' && conf.transcribeTimeoutMs >= 10000
        ? conf.transcribeTimeoutMs
        : 180000
      const table = routes()
      let route
      if (overrideModel !== '' && overrideModel.includes('/')) {
        const slash = overrideModel.indexOf('/')
        route = [[overrideModel.slice(0, slash), overrideModel.slice(slash + 1)]]
      } else {
        route = Array.isArray(table.vision) && table.vision.length > 0
          ? table.vision
          : []
      }
      if (route.length === 0) {
        throw new Error('vision transcription unavailable: no vision route configured. Add a vision-capable model to the routes.json "vision" table (or set dsh-delegation.transcribeModel).')
      }
      const errors = []
      // One overall deadline for the whole transcription: the admission chain
      // holds the session's image operations, so a hung vision child must not
      // queue model switches and later image prompts behind it indefinitely.
      const deadline = AbortSignal.timeout(timeoutMs)
      for (const [provider, model, effort] of route) {
        const agentOptions = { provider, model }
        if (typeof effort === 'string' && effort !== '') agentOptions.reasoningEffort = effort
        const prompt = [{ type: 'text', text: transcriptionInstruction(contextText) }]
        for (const image of images || []) prompt.push({ type: 'image', attachment: image.ref })
        try {
          const run = await ctx.subagents.start('spawn', {
            label: '[vision-transcribe] ' + provider + '/' + model,
            prompt,
            parent,
            agentOptions,
            signal: deadline,
            maxDepth: 1,
            // A pure read-image-and-write-text child needs no tools at all;
            // keep the inherited toolbox (fs/pwsh/delegation/...) out of reach.
            toolFilter: { allow: [] },
          })
          let result
          try {
            result = await run.result
          } finally {
            try { await run.dispose() } catch { /* disposal is best-effort */ }
          }
          if (result.stopReason === 'completed') {
            const text = textOf(result.output).trim()
            if (text.length > 0) return text
            errors.push(provider + '/' + model + ': empty transcription')
            continue
          }
          errors.push(provider + '/' + model + ': ' + stopReasonHeadline(result.stopReason))
        } catch (error) {
          errors.push(provider + '/' + model + ': ' + String(error))
        }
      }
      throw new Error('vision transcription failed; all routes exhausted:\n' + errors.join('\n'))
    },
  })

  // Reasoning-effort for SUBAGENTS only: every agent request flows through the
  // agent/request waterfall. delegate_ranked stamps each child's AgentOptions
  // with the route row's third element (the effort column of routes.json), so
  // here we read it back: when the caller did not state an effort explicitly
  // (subagent calls never do) and the agent is a delegation child (depth > 0),
  // apply that stamped effort. Main-agent requests and any explicit effort —
  // e.g. the session model selector's choice — are always left untouched. The
  // llm layer validates the value against the model's supported levels and
  // rejects unsupported ones.
  ctx.on('agent/request', async ({ agent }, next) => {
    const config = await next()
    if (config.reasoningEffort !== undefined) return config
    if (!agent || delegationDepthOf(agent) <= 0) return config
    const effort = agent.options && agent.options.reasoningEffort
    if (typeof effort !== 'string' || effort === '') return config
    return { ...config, reasoningEffort: effort }
  })

  ctx.tools.register(defineTool({
    name: 'delegate_ranked',
    description: 'Delegate a self-contained task to a subagent, automatically picking the strongest available model for the task type (role) and failing over to the next-ranked model when a route errors — quota exhausted, auth failure, rate limit, transport, or the child failing to finish. Returns which provider/model completed the work plus the attempt log. Roles are defined in the routes.json file and currently include: frontend, backend, reasoning, vision, bulk, analysis, review, adversary, general. Use when the task is a distinct work package and model reliability matters more than a single attempt. Set fork=true when the task builds on this conversation\u2019s context (inherits all completed turns) and still needs role-based model routing.',
    parameters: {
      task: {
        type: 'string',
        required: true,
        description: 'The task for the subagent. With fork=false (default) it is self-contained: the child does not share this conversation, so include everything it needs. With fork=true the child inherits this conversation\u2019s completed turns, so state only what is new (delta instructions).',
      },
      role: {
        type: 'string',
        required: true,
        description: 'Task type, resolved against routes.json. Current roles: frontend (UI/TS/CSS), backend (logic/API/infra), reasoning (hard analysis/architecture), vision (image understanding), bulk (repetitive mechanical edits), analysis (large repo/document review), review (independent code review, use a model different from the coder), adversary (red-team the plan), general (default). Unknown roles fall back to general.',
      },
      max_tokens: {
        type: 'number',
        description: 'Optional output cap for the subagent.',
      },
      run_in_background: {
        type: 'boolean',
        description: 'Optional. When true, start the subagent in the background as a continuable child (appears in the WebUI subagent tree) on the first-ranked model with the model shown in its label, and return its subagent id immediately. Background mode does not auto-failover; foreground mode (default) keeps full ranked failover. Ignored when fork=true (fork always runs in the background).',
      },
      fork: {
        type: 'boolean',
        description: 'Optional. When true, fork a continuable child that INHERITS this conversation (all completed turns) and routes it to the first-ranked model for the role, with the model shown in its label. Fork mode always runs in the background and does not auto-failover. Use when the task builds on this conversation\u2019s context (follow-up analysis, continuation, review of the current thread) instead of the plain subagent_fork tool, so role-based model routing still applies.',
      },
      name: {
        type: 'string',
        description: 'Optional. Give this delegation a short task name (e.g. "重构核心模块"). It appears in the subagent tree label next to the model, making the tree readable at a glance. Keep it to a few words.',
      },
    },
    output: {
      schema: { type: 'string' },
      render(_args, value) { return [{ type: 'text', text: value }] },
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const parent = exec.agent
      if (!parent) throw new Error('delegate_ranked requires a calling agent (exec.agent was undefined)')
      if (delegationDepthOf(parent) >= maxDepth) {
        throw new Error('delegate_ranked: delegation depth limit (' + maxDepth + ') reached; finish the current delegation chain instead of nesting further')
      }
      const table = routes()
      const route = table[args.role] || table.general || DEFAULT_ROUTES.general
      const taskName = (typeof args.name === 'string' && args.name.trim()) ? '·' + args.name.trim() : ''
      if (args.fork) {
        const [provider, model, effort] = route[0]
        const label = '[' + provider + '/' + model + '] ' + args.role + ' 委派(fork)' + taskName
        const agentOptions = { provider, model }
        if (typeof effort === 'string' && effort !== '') agentOptions.reasoningEffort = effort
        if (typeof args.max_tokens === 'number') agentOptions.maxTokens = args.max_tokens
        const childId = (await ctx.subagents.startContinuable({
          provider: 'fork',
          label,
          request: {
            label,
            prompt: [{ type: 'text', text: args.task }],
            parent,
            agentOptions,
          },
          signal: exec.signal,
        })).childId
        return 'started fork subagent ' + childId + ' on ' + provider + '/' + model + ' (fork inherits this conversation\u2019s context; first-ranked model, no auto-failover; continue it later with send_message)'
      }
      if (args.run_in_background) {
        const [provider, model, effort] = route[0]
        const label = '[' + provider + '/' + model + '] ' + args.role + ' 委派' + taskName
        const agentOptions = { provider, model }
        if (typeof effort === 'string' && effort !== '') agentOptions.reasoningEffort = effort
        if (typeof args.max_tokens === 'number') agentOptions.maxTokens = args.max_tokens
        const childId = (await ctx.subagents.startContinuable({
          provider: 'spawn',
          label,
          request: {
            label,
            prompt: [{ type: 'text', text: args.task }],
            parent,
            agentOptions,
          },
          signal: exec.signal,
        })).childId
        return 'started background ranked subagent ' + childId + ' on ' + provider + '/' + model + ' (background mode uses the first-ranked model; no auto-failover)'
      }
      const attempts = []
      for (let i = 0; i < route.length; i++) {
        if (exec.signal.aborted) {
          attempts.push({ provider: route[i][0], model: route[i][1], outcome: 'skipped', reason: 'caller aborted' })
          break
        }
        const [provider, model, effort] = route[i]
        const agentOptions = { provider, model }
        if (typeof effort === 'string' && effort !== '') agentOptions.reasoningEffort = effort
        if (typeof args.max_tokens === 'number') agentOptions.maxTokens = args.max_tokens
        const request = {
          label: '[' + provider + '/' + model + '] ' + args.role + ' 委派' + taskName,
          prompt: [{ type: 'text', text: args.task }],
          parent,
          agentOptions,
          signal: exec.signal,
        }
        try {
          const run = await ctx.subagents.start('spawn', request)
          let result
          try {
            result = await run.result
          } catch (error) {
            attempts.push({ provider, model, outcome: 'failed', reason: String(error) })
            if (!isFailoverError(String(error))) break
            continue
          }
          let disposeError = null
          try { await run.dispose() } catch (error) { disposeError = String(error) }
          const headline = stopReasonHeadline(result.stopReason)
          if (!headline) {
            const log = attempts.map((a) => '- ' + a.provider + '/' + a.model + ': ' + a.reason).join('\n')
            return 'succeeded via ' + provider + '/' + model + ' (attempt ' + (i + 1) + '/' + route.length + ')\n' +
              textOf(result.output) +
              (log ? '\n\nfailover log:\n' + log : '') +
              (disposeError ? '\n[note: run disposal failed: ' + disposeError + ']' : '')
          }
          attempts.push({ provider, model, outcome: 'failed', reason: headline })
          continue
        } catch (error) {
          const message = String(error)
          attempts.push({ provider, model, outcome: 'failed', reason: message })
          if (!isFailoverError(message)) break
        }
      }
      return 'delegate_ranked: all models failed for role ' + args.role + '\n' +
        attempts.map((a) => '- ' + a.provider + '/' + a.model + ' [' + a.outcome + ']: ' + a.reason).join('\n') +
        '\nCheck Settings -> Models for provider keys/balance, then retry.'
    },
  }))
}

export { apply, inject, name }
