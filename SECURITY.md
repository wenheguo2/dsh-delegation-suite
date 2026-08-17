# Security

## Scope

`dsh-delegation-suite` is a host-plane plugin bundle for DeepSeek Harness. It:

- registers one model-facing tool (`delegate_ranked`) and a policy prompt section;
- listens on `agent/request` to apply per-route reasoning effort to **subagent** requests only (main-agent requests and explicit efforts are never touched);
- reads and writes `$DSH_HOME/data/dsh-delegation-suite/routes.json` (routes are read on every call; the visual editor writes through the preset-studio service).

## What the plugin never does

- Never removes or restricts the host's tools, contexts, or the session model route.
- Never executes commands itself; it only spawns subagents through the harness `subagents` registry (delegation depth capped, default 3).
- Never reads or writes files outside `$DSH_HOME/data/dsh-delegation-suite/`.
- Contains no obfuscated code and makes no network calls of its own.

## Reporting a vulnerability

Open an issue in this repository. The maintainer will respond within a week.
