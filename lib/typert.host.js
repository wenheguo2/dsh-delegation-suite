/* Hand-written typert host artifact for dsh-delegation-suite.
   Mirrors the format emitted by @deepseek-ai/dsh-typert-generator. */
import { z } from 'zod'

const presetRowSchema = z.object({
  id: z.string(),
  trust: z.string(),
  broken: z.unknown().nullable(),
  path: z.string(),
  name: z.string(),
  description: z.string(),
  editable: z.boolean(),
  metaError: z.unknown().nullable(),
})
const listResultSchema = z.array(presetRowSchema)
const idParamSchema = z.object({ id: z.string() })
const textResultSchema = z.object({ text: z.string() })
const saveMetaParamSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
})
const savePersonaParamSchema = z.object({ id: z.string(), persona: z.string() })
const okResultSchema = z.object({ ok: z.boolean() })
const routesResultSchema = z.object({ routes: z.unknown(), path: z.string(), exists: z.boolean().optional(), error: z.string().nullable().optional() })
const saveRoutesParamSchema = z.object({ routes: z.unknown() })
const saveRoutesResultSchema = z.object({ ok: z.boolean(), path: z.string() })
const emptyParamSchema = z.object({})
const accountsParamSchema = z.object({ force: z.boolean().optional() })
const sessionParamSchema = z.object({ sessionId: z.string() })
const anythingSchema = z.unknown()
const resetResultSchema = z.object({ ok: z.boolean(), now: z.number() })

const mkParam = (name, schema, symbol) => ({
  name,
  wire: name,
  source: 'json',
  codec: { mode: 'strict', typeSymbol: symbol, schema },
})
const mkResult = (symbol, schema) => ({ mode: 'strict', typeSymbol: symbol, schema })

const PKG = 'dsh-delegation-suite'

export const TYPERT = {
  package: PKG,
  face: 'host',
  schemas: [],
  invocations: [
    {
      id: PKG + '#presetStudio/list',
      service: 'presetStudio',
      namespace: 'presetStudio',
      method: 'list',
      invocation: { kind: 'direct' },
      parameters: [mkParam('request', emptyParamSchema, PKG + '/types#EmptyRequest')],
      result: mkResult(PKG + '/types#PresetListResult', listResultSchema),
      sourceLocation: { file: 'lib/studio.host.js', line: 1, column: 1 },
    },
    {
      id: PKG + '#presetStudio/readComposition',
      service: 'presetStudio',
      namespace: 'presetStudio',
      method: 'readComposition',
      invocation: { kind: 'direct' },
      parameters: [mkParam('request', idParamSchema, PKG + '/types#PresetIdRequest')],
      result: mkResult(PKG + '/types#CompositionResult', textResultSchema),
      sourceLocation: { file: 'lib/studio.host.js', line: 1, column: 1 },
    },
    {
      id: PKG + '#presetStudio/saveMeta',
      service: 'presetStudio',
      namespace: 'presetStudio',
      method: 'saveMeta',
      invocation: { kind: 'direct' },
      parameters: [mkParam('request', saveMetaParamSchema, PKG + '/types#SaveMetaRequest')],
      result: mkResult(PKG + '/types#SaveResult', okResultSchema),
      sourceLocation: { file: 'lib/studio.host.js', line: 1, column: 1 },
    },
    {
      id: PKG + '#presetStudio/savePersona',
      service: 'presetStudio',
      namespace: 'presetStudio',
      method: 'savePersona',
      invocation: { kind: 'direct' },
      parameters: [mkParam('request', savePersonaParamSchema, PKG + '/types#SavePersonaRequest')],
      result: mkResult(PKG + '/types#SaveResult', okResultSchema),
      sourceLocation: { file: 'lib/studio.host.js', line: 1, column: 1 },
    },
    {
      id: PKG + '#presetStudio/readRoutes',
      service: 'presetStudio',
      namespace: 'presetStudio',
      method: 'readRoutes',
      invocation: { kind: 'direct' },
      parameters: [mkParam('request', emptyParamSchema, PKG + '/types#EmptyRequest')],
      result: mkResult(PKG + '/types#RoutesResult', routesResultSchema),
      sourceLocation: { file: 'lib/studio.host.js', line: 1, column: 1 },
    },
    {
      id: PKG + '#presetStudio/saveRoutes',
      service: 'presetStudio',
      namespace: 'presetStudio',
      method: 'saveRoutes',
      invocation: { kind: 'direct' },
      parameters: [mkParam('request', saveRoutesParamSchema, PKG + '/types#SaveRoutesRequest')],
      result: mkResult(PKG + '/types#SaveRoutesResult', saveRoutesResultSchema),
      sourceLocation: { file: 'lib/studio.host.js', line: 1, column: 1 },
    },
    {
      id: PKG + '#tokenStats/summary',
      service: 'tokenStats',
      namespace: 'tokenStats',
      method: 'summary',
      invocation: { kind: 'direct' },
      parameters: [mkParam('request', emptyParamSchema, PKG + '/types#EmptyRequest')],
      result: mkResult(PKG + '/types#SummaryResult', anythingSchema),
      sourceLocation: { file: 'lib/token-stats.host.js', line: 1, column: 1 },
    },
    {
      id: PKG + '#tokenStats/accounts',
      service: 'tokenStats',
      namespace: 'tokenStats',
      method: 'accounts',
      invocation: { kind: 'direct' },
      parameters: [mkParam('request', accountsParamSchema, PKG + '/types#AccountsRequest')],
      result: mkResult(PKG + '/types#AccountsResult', anythingSchema),
      sourceLocation: { file: 'lib/token-stats.host.js', line: 1, column: 1 },
    },
    {
      id: PKG + '#tokenStats/session',
      service: 'tokenStats',
      namespace: 'tokenStats',
      method: 'session',
      invocation: { kind: 'direct' },
      parameters: [mkParam('request', sessionParamSchema, PKG + '/types#SessionRequest')],
      result: mkResult(PKG + '/types#SessionResult', anythingSchema),
      sourceLocation: { file: 'lib/token-stats.host.js', line: 1, column: 1 },
    },
    {
      id: PKG + '#tokenStats/reset',
      service: 'tokenStats',
      namespace: 'tokenStats',
      method: 'reset',
      invocation: { kind: 'direct' },
      parameters: [mkParam('request', emptyParamSchema, PKG + '/types#EmptyRequest')],
      result: mkResult(PKG + '/types#ResetResult', resetResultSchema),
      sourceLocation: { file: 'lib/token-stats.host.js', line: 1, column: 1 },
    },
    {
      id: PKG + '#tokenStats/codebuddyLogin',
      service: 'tokenStats',
      namespace: 'tokenStats',
      method: 'codebuddyLogin',
      invocation: { kind: 'direct' },
      parameters: [mkParam('request', emptyParamSchema, PKG + '/types#EmptyRequest')],
      result: mkResult(PKG + '/types#LoginStartResult', anythingSchema),
      sourceLocation: { file: 'lib/token-stats.host.js', line: 1, column: 1 },
    },
    {
      id: PKG + '#tokenStats/codebuddyLoginPoll',
      service: 'tokenStats',
      namespace: 'tokenStats',
      method: 'codebuddyLoginPoll',
      invocation: { kind: 'direct' },
      parameters: [mkParam('request', emptyParamSchema, PKG + '/types#EmptyRequest')],
      result: mkResult(PKG + '/types#LoginPollResult', anythingSchema),
      sourceLocation: { file: 'lib/token-stats.host.js', line: 1, column: 1 },
    },
  ],
  model: {
    services: [
      {
        description: 'Visual editor for agent presets and delegation routes.',
        summary: 'Preset studio remote service.',
        tags: [],
        jsDoc: '/** Preset studio */',
        key: 'presetStudio',
        exportName: 'PresetStudioService',
        members: [
          { kind: 'method', name: 'list', signature: 'list(): Promise<PresetListResult>', summary: 'List presets with metadata.' },
          { kind: 'method', name: 'readComposition', signature: 'readComposition(id: string): Promise<CompositionResult>', summary: 'Read one preset composition.' },
          { kind: 'method', name: 'saveMeta', signature: 'saveMeta(request: SaveMetaRequest): Promise<SaveResult>', summary: 'Save preset name/description.' },
          { kind: 'method', name: 'savePersona', signature: 'savePersona(request: SavePersonaRequest): Promise<SaveResult>', summary: 'Save preset persona.' },
          { kind: 'method', name: 'readRoutes', signature: 'readRoutes(): Promise<RoutesResult>', summary: 'Read delegation routes.' },
          { kind: 'method', name: 'saveRoutes', signature: 'saveRoutes(request: SaveRoutesRequest): Promise<SaveRoutesResult>', summary: 'Save delegation routes.' },
        ],
        types: [
          { name: 'EmptyRequest', declaration: 'export interface EmptyRequest {}' },
          { name: 'PresetListResult', declaration: 'export type PresetListResult = unknown[]' },
          { name: 'PresetIdRequest', declaration: 'export interface PresetIdRequest { readonly id: string }' },
          { name: 'CompositionResult', declaration: 'export interface CompositionResult { readonly text: string }' },
          { name: 'SaveMetaRequest', declaration: 'export interface SaveMetaRequest { readonly id: string; readonly name?: string; readonly description?: string }' },
          { name: 'SavePersonaRequest', declaration: 'export interface SavePersonaRequest { readonly id: string; readonly persona: string }' },
          { name: 'SaveResult', declaration: 'export interface SaveResult { readonly ok: boolean }' },
          { name: 'RoutesResult', declaration: 'export interface RoutesResult { readonly routes: unknown; readonly path: string }' },
          { name: 'SaveRoutesRequest', declaration: 'export interface SaveRoutesRequest { readonly routes: unknown }' },
          { name: 'SaveRoutesResult', declaration: 'export interface SaveRoutesResult { readonly ok: boolean; readonly path: string }' },
        ],
      },
      {
        description: 'Token usage statistics with rolling weekly/monthly windows and provider balance/quota queries.',
        summary: 'Token usage stats remote service.',
        tags: [],
        jsDoc: '/** Token usage stats */',
        key: 'tokenStats',
        exportName: 'TokenStatsService',
        members: [
          { kind: 'method', name: 'summary', signature: 'summary(): Promise<SummaryResult>', summary: 'Rolling weekly (4) and monthly (3) usage windows per model.' },
          { kind: 'method', name: 'accounts', signature: 'accounts(request: AccountsRequest): Promise<AccountsResult>', summary: 'Provider balances and plan quotas (best-effort).' },
          { kind: 'method', name: 'session', signature: 'session(request: SessionRequest): Promise<SessionResult | null>', summary: 'Token usage of one session.' },
          { kind: 'method', name: 'reset', signature: 'reset(): Promise<ResetResult>', summary: 'Clear all recorded statistics.' },
          { kind: 'method', name: 'codebuddyLogin', signature: 'codebuddyLogin(): Promise<LoginStartResult>', summary: 'Start CodeBuddy web-account OAuth login.' },
          { kind: 'method', name: 'codebuddyLoginPoll', signature: 'codebuddyLoginPoll(): Promise<LoginPollResult>', summary: 'Poll CodeBuddy OAuth login status.' },
        ],
        types: [
          { name: 'EmptyRequest', declaration: 'export interface EmptyRequest {}' },
          { name: 'AccountsRequest', declaration: 'export interface AccountsRequest { readonly force?: boolean }' },
          { name: 'SessionRequest', declaration: 'export interface SessionRequest { readonly sessionId: string }' },
          { name: 'SummaryResult', declaration: 'export type SummaryResult = unknown' },
          { name: 'AccountsResult', declaration: 'export type AccountsResult = unknown' },
          { name: 'SessionResult', declaration: 'export type SessionResult = unknown' },
          { name: 'ResetResult', declaration: 'export interface ResetResult { readonly ok: boolean; readonly now: number }' },
          { name: 'LoginStartResult', declaration: 'export type LoginStartResult = unknown' },
          { name: 'LoginPollResult', declaration: 'export type LoginPollResult = unknown' },
        ],
      },
    ],
    events: [],
    objects: [],
  },
}
