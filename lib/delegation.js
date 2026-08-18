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

function apply(ctx, config) {
  const maxDepth = (config && typeof config.maxDepth === 'number') ? config.maxDepth : 3

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
