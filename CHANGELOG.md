# Changelog

## 1.0.0 (2026-08-17)

- `delegate_ranked` tool: role-based model routing with failover (frontend / backend / reasoning / vision / bulk / analysis / review / adversary / general).
- Fork delegation (`fork: true`): children inherit the conversation and still route by role.
- Per-route reasoning effort: routes.json rows carry `[provider, model, effort]`; the effort is stamped onto subagent agents and applied by an `agent/request` listener.
- Transparent labels: every delegated subagent shows `[provider/model] role 委派` in the subagent tree.
- Visual route editor in Settings → 预设工作室 (Preset Studio): three-column rows, reorder / delete / add, save without restart.
- Preset editing: list / read composition / save name-description / save persona (mount-validated, auto-revert on failure).
- Policy hint section reminding agents to delegate, review, and report the model used.
- Routes stored in `$DSH_HOME/data/dsh-delegation-suite/routes.json`, seeded on first run, never clobbered by upgrades.
- Peer dependencies on `@deepseek-ai/dsh-tools`, `dsh-subagent`, `dsh-typert-protocol` with an explicit prerelease branch.
- CI: syntax checks every `lib/*.js` and validates the bundle manifest.
