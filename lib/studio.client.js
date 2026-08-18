window.__ModuleLoader__.load({
	id: "dsh-delegation-suite",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		const h = react.createElement;

		const name = "preset-studio";
		const inject = ["slots", "remote", "timer"];

		const CSS = `
.ts-page { display: flex; flex-direction: column; gap: 14px; font-size: 13px; color: var(--dsw-alias-label-primary, #1c1c1e); }

/* ---------- header ---------- */
.ts-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.ts-title-row { display: flex; align-items: center; gap: 7px; min-width: 0; }
.ts-title { margin: 0; font-size: 15px; font-weight: 650; letter-spacing: -0.01em; line-height: 1.3; color: var(--dsw-alias-label-primary, #1c1c1e); }
.ts-live { width: 7px; height: 7px; border-radius: 50%; background: var(--dsw-alias-state-success-primary, #1a7f37); flex: none; animation: ts-pulse 2.4s ease-in-out infinite; }
.ts-sub { color: var(--dsw-alias-label-secondary, #6b6b70); font-size: 11.5px; line-height: 1.55; margin-top: 3px; }

/* ---------- segmented tabs ---------- */
.ts-tabs { display: flex; gap: 2px; padding: 2px; background: var(--dsw-alias-bg-layer-1, #f4f4f5); border: 1px solid var(--dsw-alias-border-l1, #e5e5e8); border-radius: 9px; }
.ts-tab { flex: 1 1 0; min-width: 0; border: 0; background: transparent; color: var(--dsw-alias-label-secondary, #6b6b70); font-size: 12px; font-weight: 500; line-height: 1; padding: 7px 0; border-radius: 7px; cursor: pointer; transition: background 0.15s ease, color 0.15s ease; }
.ts-tab:hover { color: var(--dsw-alias-label-primary, #1c1c1e); }
.ts-tab-on { background: var(--dsw-alias-bg-overlay, #fff); color: var(--dsw-alias-label-primary, #1c1c1e); font-weight: 600; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08); }

/* ---------- metric strip ---------- */
.ts-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--dsw-alias-border-l1, #e5e5e8); border: 1px solid var(--dsw-alias-border-l1, #e5e5e8); border-radius: 10px; overflow: hidden; }
.ts-tile { position: relative; min-width: 0; background: var(--dsw-alias-bg-layer-1, #f4f4f5); padding: 11px 12px 12px; }
.ts-tile::before { content: ""; position: absolute; top: 0; left: 10px; right: 10px; height: 2px; border-radius: 0 0 2px 2px; background: var(--ts-acc, var(--dsw-alias-brand-primary, #4f6ef7)); opacity: 0.9; }
.ts-tile-k { font-size: 10.5px; letter-spacing: 0.02em; color: var(--dsw-alias-label-secondary, #6b6b70); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ts-tile-v { margin-top: 5px; font-size: 16.5px; font-weight: 650; letter-spacing: -0.01em; line-height: 1.2; font-variant-numeric: tabular-nums; color: var(--dsw-alias-label-primary, #1c1c1e); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ts-tile-brand { --ts-acc: var(--dsw-alias-brand-primary, #4f6ef7); }
.ts-tile-ok { --ts-acc: var(--dsw-alias-state-success-primary, #1a7f37); }
.ts-tile-warn { --ts-acc: var(--dsw-alias-state-warn-primary, #b45309); }
.ts-tile-err { --ts-acc: var(--dsw-alias-state-error-primary, #b3261e); }
.ts-tile-v-ok { color: var(--dsw-alias-state-success-primary, #1a7f37); }

/* ---------- table ---------- */
.ts-table-wrap { --ts-row-hover: color-mix(in srgb, var(--dsw-alias-bg-base, #fff) 55%, var(--dsw-alias-bg-layer-1, #f4f4f5)); border: 1px solid var(--dsw-alias-border-l1, #e5e5e8); border-radius: 10px; background: var(--dsw-alias-bg-layer-1, #f4f4f5); overflow: auto; scrollbar-width: thin; scrollbar-color: var(--dsw-alias-border-l2, #d4d4d8) transparent; }
.ts-table-wrap::-webkit-scrollbar { height: 8px; }
.ts-table-wrap::-webkit-scrollbar-track { background: transparent; }
.ts-table-wrap::-webkit-scrollbar-thumb { background: var(--dsw-alias-border-l2, #d4d4d8); border-radius: 4px; border: 2px solid transparent; background-clip: content-box; }
.ts-table { width: 100%; min-width: 640px; border-collapse: separate; border-spacing: 0; font-size: 12px; }
.ts-table-wrap--multi .ts-table { min-width: 440px; }
.ts-table th, .ts-table td { padding: 7px 10px; text-align: right; white-space: nowrap; border-bottom: 1px solid var(--dsw-alias-border-l1, #e5e5e8); }
.ts-table th:first-child, .ts-table td:first-child { text-align: left; padding-left: 14px; }
.ts-table th { font-size: 10.5px; font-weight: 600; letter-spacing: 0.04em; color: var(--dsw-alias-label-secondary, #6b6b70); background: color-mix(in srgb, var(--dsw-alias-bg-base, #fff) 42%, var(--dsw-alias-bg-layer-1, #f4f4f5)); }
.ts-table td { color: var(--dsw-alias-label-primary, #1c1c1e); font-variant-numeric: tabular-nums; }
.ts-table th:first-child, .ts-table td:first-child { position: sticky; left: 0; z-index: 1; background: var(--dsw-alias-bg-layer-1, #f4f4f5); box-shadow: inset -1px 0 0 var(--dsw-alias-border-l1, #e5e5e8); }
.ts-table th:first-child { z-index: 2; background: color-mix(in srgb, var(--dsw-alias-bg-base, #fff) 42%, var(--dsw-alias-bg-layer-1, #f4f4f5)); }
.ts-table tbody tr:hover td { background: var(--ts-row-hover); }
.ts-table tbody tr:hover td:first-child { background: var(--ts-row-hover); }
.ts-table tbody tr:last-child td { border-bottom: none; }
.ts-table tr.ts-total td { border-top: 1px solid var(--dsw-alias-border-l2, #d4d4d8); font-weight: 600; background: color-mix(in srgb, var(--dsw-alias-bg-base, #fff) 28%, var(--dsw-alias-bg-layer-1, #f4f4f5)); }
.ts-table tr.ts-total td:first-child { background: color-mix(in srgb, var(--dsw-alias-bg-base, #fff) 28%, var(--dsw-alias-bg-layer-1, #f4f4f5)); }
.ts-table tbody tr.ts-total:hover td { background: color-mix(in srgb, var(--dsw-alias-bg-base, #fff) 36%, var(--dsw-alias-bg-layer-1, #f4f4f5)); }
.ts-table tbody tr.ts-total:hover td:first-child { background: color-mix(in srgb, var(--dsw-alias-bg-base, #fff) 36%, var(--dsw-alias-bg-layer-1, #f4f4f5)); }

.ts-model { display: flex; flex-direction: column; gap: 2px; min-width: 120px; max-width: 180px; }
.ts-model .ts-model-m { font-size: 12px; font-weight: 550; color: var(--dsw-alias-label-primary, #1c1c1e); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ts-model .ts-model-p { font-size: 10px; color: var(--dsw-alias-label-secondary, #6b6b70); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ts-hit { color: var(--dsw-alias-state-success-primary, #1a7f37); font-weight: 550; }
.ts-muted { color: var(--dsw-alias-label-secondary, #6b6b70); font-size: 11px; }
.ts-cell2 { display: flex; flex-direction: column; gap: 2px; }
.ts-cell2 .ts-cell2-1 { font-size: 11.5px; font-weight: 500; color: var(--dsw-alias-label-primary, #1c1c1e); }
.ts-cell2 .ts-cell2-2 { font-size: 10.5px; color: var(--dsw-alias-label-secondary, #6b6b70); font-variant-numeric: tabular-nums; }

/* ---------- buttons ---------- */
.ts-btn { display: inline-flex; align-items: center; justify-content: center; gap: 5px; height: 26px; padding: 0 12px; border-radius: 7px; border: 1px solid var(--dsw-alias-border-l1, #e5e5e8); background: transparent; color: var(--dsw-alias-label-primary, #1c1c1e); font-size: 12px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, opacity 0.15s ease; }
.ts-btn:hover { background: var(--dsw-alias-bg-layer-1, #f4f4f5); border-color: var(--dsw-alias-border-l2, #d4d4d8); }
.ts-btn:active { transform: translateY(1px); }
.ts-btn:disabled { opacity: 0.5; cursor: default; pointer-events: none; }
.ts-btn-primary { color: var(--dsw-alias-brand-primary, #4f6ef7); background: color-mix(in srgb, var(--dsw-alias-brand-primary, #4f6ef7) 9%, transparent); border-color: color-mix(in srgb, var(--dsw-alias-brand-primary, #4f6ef7) 32%, transparent); }
.ts-btn-primary:hover { background: color-mix(in srgb, var(--dsw-alias-brand-primary, #4f6ef7) 15%, transparent); border-color: color-mix(in srgb, var(--dsw-alias-brand-primary, #4f6ef7) 45%, transparent); }
.ts-btn-danger { color: var(--dsw-alias-state-error-primary, #b3261e); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #b3261e) 7%, transparent); border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary, #b3261e) 28%, transparent); }
.ts-btn-danger:hover { background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #b3261e) 13%, transparent); border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary, #b3261e) 42%, transparent); }

/* ---------- accounts ---------- */
.ts-section { display: flex; flex-direction: column; gap: 10px; }
.ts-section-title { font-size: 14px; font-weight: 640; letter-spacing: -0.01em; color: var(--dsw-alias-label-primary, #1c1c1e); }
.ts-acc-list { display: flex; flex-direction: column; gap: 10px; }
.ts-acc-card { background: var(--dsw-alias-bg-layer-1, #f4f4f5); border: 1px solid var(--dsw-alias-border-l1, #e5e5e8); border-radius: 10px; padding: 12px 14px 11px; transition: border-color 0.15s ease; }
.ts-acc-card:hover { border-color: var(--dsw-alias-border-l2, #d4d4d8); }
.ts-acc-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
.ts-acc-name { font-size: 13px; font-weight: 600; color: var(--dsw-alias-label-primary, #1c1c1e); }
.ts-chip { font-size: 10px; font-weight: 550; padding: 2px 8px; border-radius: 999px; letter-spacing: 0.02em; white-space: nowrap; }
.ts-chip-ok { color: var(--dsw-alias-state-success-primary, #1a7f37); background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #1a7f37) 12%, transparent); }
.ts-chip-err { color: var(--dsw-alias-state-error-primary, #b3261e); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #b3261e) 12%, transparent); }
.ts-acc-field { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 5px 0; font-size: 12px; border-bottom: 1px solid color-mix(in srgb, var(--dsw-alias-border-l1, #e5e5e8) 65%, transparent); }
.ts-acc-field:last-of-type { border-bottom: none; }
.ts-acc-field .ts-acc-field-k { color: var(--dsw-alias-label-secondary, #6b6b70); }
.ts-acc-field .ts-acc-field-v { color: var(--dsw-alias-label-primary, #1c1c1e); font-weight: 550; font-variant-numeric: tabular-nums; }
.ts-acc-sub { color: var(--dsw-alias-label-secondary, #6b6b70); font-size: 10.5px; font-weight: 400; padding-left: 8px; }
.ts-acc-note { color: var(--dsw-alias-state-warn-primary, #b45309); font-size: 11.5px; line-height: 1.5; margin-top: 7px; }
.ts-acc-err { color: var(--dsw-alias-state-error-primary, #b3261e); font-size: 12px; line-height: 1.55; margin-top: 2px; word-break: break-all; }
.ts-acc-time { color: var(--dsw-alias-label-secondary, #6b6b70); font-size: 10.5px; margin-top: 9px; padding-top: 7px; border-top: 1px solid var(--dsw-alias-border-l1, #e5e5e8); }

/* ---------- quota ---------- */
.ts-quota-title { font-size: 10.5px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--dsw-alias-label-secondary, #6b6b70); margin: 9px 0 5px; }
.ts-quota { padding: 4px 0 3px; }
.ts-quota-top { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; font-size: 11.5px; }
.ts-quota-label { color: var(--dsw-alias-label-primary, #1c1c1e); font-weight: 550; }
.ts-quota-meta { color: var(--dsw-alias-label-secondary, #6b6b70); font-variant-numeric: tabular-nums; }
.ts-quota-meta b { color: var(--dsw-alias-label-primary, #1c1c1e); font-weight: 600; }
.ts-quota-pct { font-weight: 600; }
.ts-quota-pct.ts-bar-ok { color: var(--dsw-alias-state-success-primary, #1a7f37); }
.ts-quota-pct.ts-bar-warn { color: var(--dsw-alias-state-warn-primary, #b45309); }
.ts-quota-pct.ts-bar-err { color: var(--dsw-alias-state-error-primary, #b3261e); }
.ts-bar { height: 4px; border-radius: 999px; background: color-mix(in srgb, var(--dsw-alias-bg-base, #fff) 55%, transparent); margin: 6px 0 3px; overflow: hidden; }
.ts-bar > div { height: 100%; border-radius: 999px; transition: width 0.45s cubic-bezier(0.4, 0, 0.2, 1); }
.ts-bar-ok > div { background: var(--dsw-alias-state-success-primary, #1a7f37); }
.ts-bar-warn > div { background: var(--dsw-alias-state-warn-primary, #b45309); }
.ts-bar-err > div { background: var(--dsw-alias-state-error-primary, #b3261e); }
.ts-quota-reset { color: var(--dsw-alias-label-secondary, #6b6b70); font-size: 10.5px; margin-top: 2px; }

/* ---------- states ---------- */
.ts-empty { padding: 24px 14px; text-align: center; color: var(--dsw-alias-label-secondary, #6b6b70); font-size: 12px; line-height: 1.7; border: 1px dashed var(--dsw-alias-border-l1, #e5e5e8); border-radius: 10px; }
.ts-loading { display: flex; align-items: center; justify-content: center; gap: 9px; padding: 30px 0; color: var(--dsw-alias-label-secondary, #6b6b70); font-size: 12px; }
.ts-loading::before { content: ""; width: 9px; height: 9px; border-radius: 50%; background: var(--dsw-alias-brand-primary, #4f6ef7); animation: ts-pulse 1.2s ease-in-out infinite; }
.ts-errbox { padding: 12px 14px; border: 1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary, #b3261e) 30%, transparent); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #b3261e) 7%, transparent); color: var(--dsw-alias-state-error-primary, #b3261e); border-radius: 10px; font-size: 12px; line-height: 1.6; word-break: break-all; }

/* ---------- dock ---------- */
.ts-dock { display: inline-flex; align-items: center; gap: 8px; height: 24px; padding: 0 11px; border: 1px solid var(--dsw-alias-border-l1, #e5e5e8); border-radius: 999px; background: color-mix(in srgb, var(--dsw-alias-bg-layer-1, #f4f4f5) 85%, transparent); font-size: 11.5px; color: var(--dsw-alias-label-secondary, #6b6b70); font-variant-numeric: tabular-nums; }
.ts-dock-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-state-success-primary, #1a7f37); flex: none; }
.ts-dock-label { color: var(--dsw-alias-label-primary, #1c1c1e); font-weight: 600; }
.ts-dock-sep { width: 1px; height: 10px; background: var(--dsw-alias-border-l1, #e5e5e8); flex: none; }
.ts-dock-hit { color: var(--dsw-alias-state-success-primary, #1a7f37); font-weight: 550; }

@keyframes ts-pulse { 0%, 100% { opacity: 0.2; transform: scale(0.75); } 50% { opacity: 0.95; transform: scale(1.05); } }
`;

		const TABS = [
			{ id: "week", label: "本周" },
			{ id: "month", label: "本月" },
			{ id: "year", label: "年度" },
		];

		function fmt(n) {
			if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
			if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
			return String(n);
		}
		function money(v) {
			const n = Number(v);
			if (!Number.isFinite(n)) return v === undefined || v === null ? "—" : String(v);
			return n.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
		}
		function pct(read, billedInput) {
			if (!billedInput) return "—";
			return ((read / billedInput) * 100).toFixed(0) + "%";
		}
		function hitPctOf(e) {
			return pct(e.cacheReadTokens, e.inputTokens + e.cacheReadTokens + e.cacheWriteTokens);
		}
		function billedOf(e) {
			return e.inputTokens + e.cacheReadTokens + e.cacheWriteTokens + e.outputTokens;
		}
		function time(ts) {
			return ts ? new Date(ts).toLocaleTimeString() : "—";
		}

		class ErrorBoundary extends react.Component {
			constructor(props) {
				super(props);
				this.state = { error: null };
			}
			static getDerivedStateFromError(error) {
				return { error: error };
			}
			componentDidCatch(error) {
				console.error("token-stats UI error", error);
			}
			render() {
				if (this.state.error) {
					const msg = String((this.state.error && this.state.error.message) || this.state.error);
					return h("div", { className: "ts-errbox" }, "Token 统计渲染失败：" + msg);
				}
				return this.props.children;
			}
		}

		// Module-level diagnostics shared by the preset-studio section.
		let mountError = null;

		const PASSTHROUGH = { parse: function (v) { return v; } };		const mkParam = (name) => ({ name: name, wire: name, source: "json", codec: { mode: "strict", typeSymbol: "dsh-delegation-suite/types#" + name, schema: PASSTHROUGH } });
		const mkResult = () => ({ mode: "strict", typeSymbol: "dsh-delegation-suite/types#Result", schema: PASSTHROUGH });
		const TOKEN_STATS_CONTRIBUTION = {
			package: "dsh-delegation-suite",
			descriptors: [
				{ id: "dsh-delegation-suite#presetStudio/list", service: "presetStudio", namespace: "presetStudio", method: "list", invocation: { kind: "direct" }, parameters: [mkParam("request")], result: mkResult() },
				{ id: "dsh-delegation-suite#presetStudio/readComposition", service: "presetStudio", namespace: "presetStudio", method: "readComposition", invocation: { kind: "direct" }, parameters: [mkParam("request")], result: mkResult() },
				{ id: "dsh-delegation-suite#presetStudio/saveMeta", service: "presetStudio", namespace: "presetStudio", method: "saveMeta", invocation: { kind: "direct" }, parameters: [mkParam("request")], result: mkResult() },
				{ id: "dsh-delegation-suite#presetStudio/savePersona", service: "presetStudio", namespace: "presetStudio", method: "savePersona", invocation: { kind: "direct" }, parameters: [mkParam("request")], result: mkResult() },
				{ id: "dsh-delegation-suite#presetStudio/readRoutes", service: "presetStudio", namespace: "presetStudio", method: "readRoutes", invocation: { kind: "direct" }, parameters: [mkParam("request")], result: mkResult() },
				{ id: "dsh-delegation-suite#presetStudio/saveRoutes", service: "presetStudio", namespace: "presetStudio", method: "saveRoutes", invocation: { kind: "direct" }, parameters: [mkParam("request")], result: mkResult() },
				{ id: "dsh-delegation-suite#tokenStats/summary", service: "tokenStats", namespace: "tokenStats", method: "summary", invocation: { kind: "direct" }, parameters: [mkParam("request")], result: mkResult() },
				{ id: "dsh-delegation-suite#tokenStats/accounts", service: "tokenStats", namespace: "tokenStats", method: "accounts", invocation: { kind: "direct" }, parameters: [mkParam("request")], result: mkResult() },
				{ id: "dsh-delegation-suite#tokenStats/session", service: "tokenStats", namespace: "tokenStats", method: "session", invocation: { kind: "direct" }, parameters: [mkParam("request")], result: mkResult() },
				{ id: "dsh-delegation-suite#tokenStats/reset", service: "tokenStats", namespace: "tokenStats", method: "reset", invocation: { kind: "direct" }, parameters: [mkParam("request")], result: mkResult() },
				{ id: "dsh-delegation-suite#tokenStats/codebuddyLogin", service: "tokenStats", namespace: "tokenStats", method: "codebuddyLogin", invocation: { kind: "direct" }, parameters: [mkParam("request")], result: mkResult() },
				{ id: "dsh-delegation-suite#tokenStats/codebuddyLoginPoll", service: "tokenStats", namespace: "tokenStats", method: "codebuddyLoginPoll", invocation: { kind: "direct" }, parameters: [mkParam("request")], result: mkResult() },
			],
		};

		
		function extractPersona(text) {
			const lines = String(text).split("\n");
			let personaIdx = -1, textIdx = -1;
			for (let i = 0; i < lines.length; i++) {
				if (lines[i].trim() === "- id: persona") { personaIdx = i; continue; }
				if (personaIdx >= 0 && lines[i].includes("text: >-")) { textIdx = i; break; }
			}
			if (textIdx < 0) return null;
			let end = lines.length;
			for (let i = textIdx + 1; i < lines.length; i++) {
				if (/^-\s/.test(lines[i])) { end = i; break; }
			}
			const block = lines.slice(textIdx + 1, end).filter((l) => l.trim() !== "");
			const indent = block.length ? (block[0].match(/^\s*/)[0] || "") : "";
			return block.map((l) => l.startsWith(indent) ? l.slice(indent.length) : l).join("\n");
		}

		function PresetStudioSection(props) {
			const getRemote = props.getRemote;
			const [state, setState] = react.useState({
				status: "loading", presets: [], routes: null, routesPath: null, error: null, saved: null
			});
			const [drafts, setDrafts] = react.useState({});
			const [routesDraft, setRoutesDraft] = react.useState(null);
			const retries = react.useRef(0);

			const load = react.useCallback(() => {
				setState((s) => ({ ...s, status: "loading", error: null }));
				// The remote mount is async: if the first render races it, retry a
				// couple of times shortly after instead of failing hard.
				const maybeRetry = () => {
					if (retries.current < 3) {
						retries.current += 1;
						setTimeout(() => load(), 1200);
						return true;
					}
					retries.current = 0;
					return false;
				};
				Promise.resolve(typeof getRemote === "function" ? getRemote() : null)
					.then((api) => {
						if (!api) {
							if (maybeRetry()) return null;
							setState((s) => ({ ...s, status: "error", error: "无法访问远程服务" + (mountError ? "：" + mountError : "") }));
							return null;
						}
						const studio = api.presetStudio || api["preset-studio"];
						if (!studio) {
							if (maybeRetry()) return null;
							setState((s) => ({ ...s, status: "error", error: "presetStudio 服务未暴露" + (mountError ? "：" + mountError : "") }));
							return null;
						}
						const unwrap = (label) => (r) => {
							if (r && typeof r === "object" && r.ok === false) {
								throw new Error(label + "：" + JSON.stringify(r.error || r));
							}
							return r && typeof r === "object" && r.ok === true ? r.value : r;
						};
						return Promise.all([
							studio.list({}).then(unwrap("list")),
							studio.readRoutes({}).then(unwrap("readRoutes")),
						]);
					})
					.then((result) => {
						retries.current = 0;
						if (!Array.isArray(result)) return;
						const presets = result[0];
						const routesDoc = result[1];
						if (presets === undefined && routesDoc === undefined) return;
						setState((s) => ({ ...s, status: "ready", presets: presets || [], routes: (routesDoc && routesDoc.routes) || null, routesPath: (routesDoc && routesDoc.path) || null, error: null, saved: null }));
						setRoutesDraft((routesDoc && routesDoc.routes) || null);
					})
					.catch((e) => {
						if (maybeRetry()) return;
						setState((s) => ({ ...s, status: "error", error: ((e && (e.stack || e.message)) || String(e)).slice(0, 600) }));
					});
			}, [getRemote]);

			react.useEffect(() => { load(); }, [load]);

			const openPreset = (p) => {
				const id = p.id;
				Promise.resolve(getRemote()).then((api) => {
					if (!api) return;
					api.presetStudio.readComposition({ id }).then((doc) => {
						const text = doc && typeof doc === "object" && doc.ok === true ? doc.value && doc.value.text : doc && doc.text;
						if (typeof text !== "string") {
							setState((s) => ({ ...s, error: "读取组合失败：响应格式异常" }));
							return;
						}
						const persona = extractPersona(text);
						setDrafts((d) => ({ ...d, [id]: { name: p.name === p.id ? "" : p.name, description: p.description || "", persona: persona === null ? "" : persona, personaLoaded: persona !== null, composition: text, loaded: true } }));
					}).catch((e) => setState((s) => ({ ...s, error: "读取组合失败: " + String((e && e.message) || e) })));
				});
			};

			const draftFor = (id) => drafts[id] || null;

			const updateDraft = (id, field, value) => {
				setDrafts((d) => {
					const cur = d[id];
					if (!cur) return d;
					return { ...d, [id]: { ...cur, [field]: value } };
				});
			};

			const savePreset = (p) => {
				const d = draftFor(p.id);
				Promise.resolve(getRemote()).then((api) => {
					if (!api || !d) return;
					setState((s) => ({ ...s, saved: null, error: null }));
					const checkOk = (label) => (r) => {
						if (r && typeof r === "object" && r.ok === false) throw new Error(label + "：" + JSON.stringify(r.error || r));
						return r;
					};
					api.presetStudio.saveMeta({ id: p.id, name: d.name, description: d.description })
						.then(checkOk("saveMeta"))
						.then(() => (d.personaLoaded ? api.presetStudio.savePersona({ id: p.id, persona: d.persona }).then(checkOk("savePersona")) : undefined))
						.then(() => { setState((s) => ({ ...s, saved: "已保存: " + p.id, error: null })); load(); })
						.catch((e) => setState((s) => ({ ...s, error: "保存失败: " + String((e && e.message) || e) })));
				});
			};

			const patchRoutes = (role, index, patch, remove) => {
				setRoutesDraft((prev) => {
					if (!prev) return prev;
					const next = JSON.parse(JSON.stringify(prev));
					const list = next[role] || [];
					if (remove) { list.splice(index, 1); }
					else if (patch === "up") { if (index > 0) { const t = list[index - 1]; list[index - 1] = list[index]; list[index] = t; } }
					else if (patch === "down") { if (index < list.length - 1) { const t = list[index + 1]; list[index + 1] = list[index]; list[index] = t; } }
					else if (patch) { list[index] = patch.effort ? [patch.provider, patch.model, patch.effort] : [patch.provider, patch.model]; }
					next[role] = list;
					return next;
				});
			};

			const addRouteRow = (role) => {
				setRoutesDraft((prev) => {
					if (!prev) return prev;
					const next = JSON.parse(JSON.stringify(prev));
					next[role] = (next[role] || []).concat([["deepseek-official", "deepseek-v4-flash"]]);
					return next;
				});
			};

			const saveRoutes = () => {
				Promise.resolve(getRemote()).then((api) => {
					if (!api || !routesDraft) return;
					setState((s) => ({ ...s, saved: null, error: null }));
					api.presetStudio.saveRoutes({ routes: routesDraft })
						.then((r) => {
							if (r && typeof r === "object" && r.ok === false) throw new Error(JSON.stringify(r.error || r));
							const v = r && typeof r === "object" && r.ok === true ? r.value : r;
							setState((s) => ({ ...s, saved: "路由表已保存: " + ((v && v.path) || "ok") }));
						})
						.catch((e) => setState((s) => ({ ...s, error: "路由表保存失败: " + String((e && e.message) || e) })));
				});
			};

			if (state.status === "loading") return h("div", { style: sec }, h("p", { style: hint }, "加载中…"));
			if (state.status === "error") return h("div", { style: sec },
				h("p", { style: err }, state.error),
				h("button", { onClick: load, style: btnGhost }, "重试"));

			return h("div", { style: sec },
				h("div", { style: headerRow },
					h("h3", { style: pageTitle }, "预设工作室"),
					h("button", { onClick: load, style: btnPrimary }, "刷新")
				),
				h("p", { style: hint }, "编辑预设的名称/描述/人格，或调整委派路由排名。保存后即时生效；内置预设只读。"),
				state.saved ? h("p", { style: ok }, state.saved) : null,
				state.error ? h("p", { style: err }, state.error) : null,
				h("h4", { style: sectionTitle }, "预设"),
				...state.presets.map((p) => presetCard(p, draftFor(p.id), {
					open: () => openPreset(p),
					save: () => savePreset(p),
					update: updateDraft
				})),
				h("h4", { style: sectionTitle }, "委派路由（routes.json）"),
				h("p", { style: hint }, "每行 = 角色下的模型优先级；第三列是思考强度（off/low/medium/high/max，留空不指定）。保存后即时生效。"),
				state.routesPath ? h("p", { style: caption }, "文件: " + state.routesPath) : null,
				state.routes && routesDraft ? h("div", null,
					...Object.keys(routesDraft).map((role) => routeCard(role, routesDraft[role], patchRoutes, addRouteRow)),
					h("button", { onClick: saveRoutes, style: { ...btnPrimary, marginTop: 8 } }, "保存路由表")
				) : h("p", { style: hint }, "（无路由数据）")
			);
		}

		function presetCard(p, d, actions) {
			return h("div", { key: p.id, style: card },
				h("div", { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" } },
					h("strong", { style: cardTitle }, p.name || p.id),
					h("span", { style: { ...badgeBase, ...(p.trust === "user" ? badgeUser : badgeBuiltin) } }, p.trust === "user" ? "自定义" : "内置"),
					p.broken ? h("span", { style: { ...badgeBase, ...badgeBroken } }, "加载失败: " + p.broken) : null,
					!p.editable ? h("span", { style: hint }, "（只读）") : null
				),
				p.description ? h("p", { style: hint }, p.description) : null,
				h("p", { style: caption }, p.path),
				!p.editable ? null : (d && d.loaded ? h("div", { style: { marginTop: 4 } },
					h("label", { style: lbl }, "名称"),
					h("input", { value: d.name, style: inp, onChange: (e) => actions.update(p.id, "name", e.target.value) }),
					h("label", { style: lbl }, "描述"),
					h("textarea", { value: d.description, rows: 2, style: inp, onChange: (e) => actions.update(p.id, "description", e.target.value) }),
					h("label", { style: lbl }, "人格（persona）"),
					h("textarea", { value: d.persona, rows: 8, style: inpMono, onChange: (e) => actions.update(p.id, "persona", e.target.value) }),
					h("button", { onClick: actions.save, style: { ...btnPrimary, marginTop: 10 } }, "保存预设")
				) : h("button", { onClick: actions.open, style: { ...btnGhost, marginTop: 8 } }, "加载并编辑")),
				h("details", { style: { marginTop: 10 } },
					h("summary", { style: summaryStyle }, "查看组合文件"),
					d && d.loaded ? h("pre", { style: pre }, d.composition) : h("p", { style: hint }, "点击上方“加载并编辑”后可查看")
				)
			);
		}

		function routeCard(role, list, patch, add) {
			return h("div", { key: role, style: card },
				h("strong", { style: cardTitle }, role),
				...list.map((row, i) => h("div", { key: i, style: routeRow },
					h("input", { value: row[0], style: { ...routeInp, flex: 1 }, onChange: (e) => patch(role, i, { provider: e.target.value, model: row[1], effort: row[2] || "" }) }),
					h("input", { value: row[1], style: { ...routeInp, flex: 1.2 }, onChange: (e) => patch(role, i, { provider: row[0], model: e.target.value, effort: row[2] || "" }) }),
					h("input", { value: row[2] || "", placeholder: "强度", title: "思考强度: off/low/medium/high/max（留空不指定）", style: { ...routeInp, flex: 0.7 }, onChange: (e) => patch(role, i, { provider: row[0], model: row[1], effort: e.target.value }) }),
					h("button", { onClick: () => patch(role, i, "up", false), style: btnMini }, "↑"),
					h("button", { onClick: () => patch(role, i, "down", false), style: btnMini }, "↓"),
					h("button", { onClick: () => patch(role, i, null, true), style: btnMini }, "✕")
				)),
				h("button", { onClick: () => add(role), style: btnDashed }, "＋ 添加模型")
			);
		}

		const sec = {
			padding: "16px 20px",
			fontFamily: "var(--dsw-font-family)",
			fontSize: "var(--dsw-font-s-14-font-size)",
			color: "var(--dsw-alias-label-primary)",
		};
		const headerRow = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 };
		const pageTitle = { margin: 0, fontSize: "var(--dsw-font-base-16-font-size)", fontWeight: 600, color: "var(--dsw-alias-label-primary)" };
		const sectionTitle = {
			margin: "20px 0 4px",
			paddingTop: 16,
			borderTop: "1px solid var(--dsw-alias-border-l1)",
			fontSize: "var(--dsw-font-s-14-font-size)",
			fontWeight: 600,
			color: "var(--dsw-alias-label-secondary)",
		};
		const card = {
			background: "var(--dsw-alias-bg-layer-1)",
			border: "1px solid var(--dsw-alias-border-l1)",
			borderRadius: 10,
			padding: 12,
			margin: "10px 0",
			boxShadow: "var(--dsw-shadow-lv2)",
		};
		const cardTitle = { fontSize: "var(--dsw-font-s-14-font-size)", color: "var(--dsw-alias-label-primary)" };
		const badgeBase = { borderRadius: 4, padding: "1px 8px", fontSize: "var(--dsw-font-xxs-12-font-size)", lineHeight: "18px" };
		const badgeUser = { background: "var(--dsw-specific-bubble)", color: "var(--dsw-alias-state-business-primary)" };
		const badgeBuiltin = { background: "var(--dsw-specific-selector)", color: "var(--dsw-alias-label-secondary)" };
		const badgeBroken = { background: "var(--dsw-alias-state-warn-tertiary)", color: "var(--dsw-alias-state-error-secondary)" };
		const hint = { color: "var(--dsw-alias-label-tertiary)", fontSize: "var(--dsw-font-xs-13-font-size)", margin: "6px 0" };
		const caption = { color: "var(--dsw-alias-label-caption)", fontSize: "var(--dsw-font-xxxs-11-font-size)", margin: "6px 0 0", wordBreak: "break-all" };
		const ok = {
			background: "var(--dsw-alias-state-success-tertiary)",
			color: "var(--dsw-alias-state-success-primary)",
			borderRadius: 6,
			padding: "8px 12px",
			fontSize: "var(--dsw-font-xs-13-font-size)",
			margin: "8px 0",
		};
		const err = {
			background: "var(--dsw-alias-state-warn-tertiary)",
			color: "var(--dsw-alias-state-error-secondary)",
			borderRadius: 6,
			padding: "8px 12px",
			fontSize: "var(--dsw-font-xs-13-font-size)",
			margin: "8px 0",
			wordBreak: "break-all",
		};
		const lbl = { display: "block", marginTop: 10, fontSize: "var(--dsw-font-xxs-12-font-size)", color: "var(--dsw-alias-label-secondary)" };
		const inp = {
			display: "block",
			width: "100%",
			boxSizing: "border-box",
			marginTop: 4,
			fontFamily: "inherit",
			fontSize: "var(--dsw-font-xs-13-font-size)",
			color: "var(--dsw-alias-label-primary)",
			background: "var(--dsw-specific-input-major)",
			border: "1px solid var(--dsw-alias-border-l2)",
			borderRadius: 6,
			padding: "6px 8px",
		};
		const inpMono = { ...inp, fontFamily: "SF Mono, Consolas, monospace", lineHeight: 1.5 };
		const routeInp = {
			fontFamily: "inherit",
			fontSize: "var(--dsw-font-xs-13-font-size)",
			color: "var(--dsw-alias-label-primary)",
			background: "var(--dsw-specific-input-major)",
			border: "1px solid var(--dsw-alias-border-l2)",
			borderRadius: 6,
			padding: "5px 8px",
			minWidth: 0,
		};
		const routeRow = { display: "flex", gap: 6, alignItems: "center", marginTop: 6 };
		const btnPrimary = {
			background: "var(--dsw-alias-state-business-primary)",
			color: "var(--dsw-alias-label-primary-foreground)",
			border: "none",
			borderRadius: 6,
			padding: "6px 14px",
			fontSize: "var(--dsw-font-s-14-font-size)",
			fontFamily: "inherit",
			cursor: "pointer",
		};
		const btnGhost = {
			background: "transparent",
			color: "var(--dsw-alias-label-primary)",
			border: "1px solid var(--dsw-alias-border-l2)",
			borderRadius: 6,
			padding: "6px 14px",
			fontSize: "var(--dsw-font-s-14-font-size)",
			fontFamily: "inherit",
			cursor: "pointer",
		};
		const btnMini = {
			background: "transparent",
			color: "var(--dsw-alias-label-secondary)",
			border: "1px solid var(--dsw-alias-border-l2)",
			borderRadius: 6,
			width: 28,
			height: 28,
			padding: 0,
			fontFamily: "inherit",
			cursor: "pointer",
			flex: "0 0 auto",
		};
		const btnDashed = {
			background: "transparent",
			color: "var(--dsw-alias-state-business-primary)",
			border: "1px dashed var(--dsw-alias-border-l2)",
			borderRadius: 6,
			padding: "5px 12px",
			fontSize: "var(--dsw-font-xs-13-font-size)",
			fontFamily: "inherit",
			cursor: "pointer",
			marginTop: 8,
		};
		const btnDanger = {
			background: "transparent",
			color: "var(--dsw-alias-state-error-secondary)",
			border: "1px solid var(--dsw-alias-state-error-secondary)",
			borderRadius: 6,
			padding: "5px 12px",
			fontSize: "var(--dsw-font-xs-13-font-size)",
			fontFamily: "inherit",
			cursor: "pointer",
		};
		const summaryStyle = { cursor: "pointer", color: "var(--dsw-alias-label-secondary)", fontSize: "var(--dsw-font-xs-13-font-size)" };
		const pre = {
			background: "var(--dsw-specific-sidebar-fill)",
			borderRadius: 8,
			padding: 10,
			fontSize: "var(--dsw-font-xxs-12-font-size)",
			fontFamily: "SF Mono, Consolas, monospace",
			color: "var(--dsw-alias-label-secondary)",
			overflowX: "auto",
			maxHeight: 300,
			overflowY: "auto",
			margin: "8px 0 0",
		};

		async function apply(ctx) {
			// api-remotes mounts a fixed static package list; mount our own
			// contribution so the host typert model (already registered) reaches
			// this client as the `remote.tokenStats` / `remote.presetStudio` services.
			try {
				const remoteSvc = ctx.get("remote");
				if (remoteSvc && typeof remoteSvc.$mount === "function") {
					const disposeMount = await remoteSvc.$mount(TOKEN_STATS_CONTRIBUTION);
					if (typeof ctx.effect === "function") ctx.effect(() => disposeMount);
				}
			} catch (err) {
				console.error("token-stats remote mount failed", err);
			}
			const slots = ctx.get("slots");
			if (slots === undefined) return;

			if (typeof ctx.effect === "function") {
				ctx.effect(() => {
					const el = document.createElement("style");
					el.id = "dsh-token-stats-css";
					el.textContent = CSS;
					document.head.appendChild(el);
					return () => { if (el.parentNode) el.parentNode.removeChild(el); };
				});
			} else {
				const el = document.createElement("style");
				el.id = "dsh-token-stats-css";
				el.textContent = CSS;
				document.head.appendChild(el);
			}

			const presetStudioGetRemote = () => {
				try {
					const ns = ctx.get("remote.presetStudio");
					if (ns && typeof ns === "object") return { presetStudio: ns };
				} catch (err) { /* ignore */ }
				try {
					const remote = ctx.get("remote");
					if (remote && (remote.presetStudio || remote["preset-studio"])) return { presetStudio: remote.presetStudio || remote["preset-studio"] };
				} catch (err) { /* ignore */ }
				return null;
			};

			const getRemote = () => {
				try {
					const ns = ctx.get("remote.tokenStats");
					if (ns && typeof ns === "object") return ns;
				} catch (err) { /* ignore */ }
				try {
					const remote = ctx.get("remote");
					if (remote && (remote.tokenStats || remote["token-stats"])) return remote.tokenStats || remote["token-stats"];
				} catch (err) { /* ignore */ }
				return null;
			};

			slots.inject("settings.section", () => slots.register({
				name: "settings.section",
				id: "preset-studio",
				order: 21,
				label: () => "预设工作室"
			}, (props) => h(ErrorBoundary, null, h(PresetStudioSection, { getRemote: presetStudioGetRemote }))));

			slots.inject("settings.section", () => slots.register({
				name: "settings.section",
				id: "token-stats",
				order: 30,
				label: () => "Token 统计"
			}, () => h(ErrorBoundary, null, h(StatsPage, { getRemote }))));

			slots.inject("conversation.composer.dock", () => slots.register({
				name: "conversation.composer.dock",
				id: "token-stats-dock",
				order: 10
			}, (props) => h(ErrorBoundary, null, h(DockLine, { sessionId: props.sessionId, getRemote }))));
		}

		let remoteDiag = "";
		function apiOf(props) {
			try {
				const api = props.getRemote ? props.getRemote() : null;
				if (!api) {
					remoteDiag = "remote.tokenStats 与 remote 对象键均不可用（host 模型已注册，可能 client 未同步 contribution 或页面未刷新）";
					return null;
				}
				let keys = [];
				try { keys = Object.keys(api); } catch (err) { keys = ["(无法枚举)"]; }
				remoteDiag = "已获取 tokenStats：" + keys.slice(0, 20).join(", ");
				return api;
			} catch (err) {
				remoteDiag = "remote 查找异常: " + String((err && err.message) || err);
				console.error("token-stats remote lookup failed", err);
				return null;
			}
		}

		function ModelCell(e) {
			return h("div", { className: "ts-model" },
				h("span", { className: "ts-model-m" }, e.model),
				h("span", { className: "ts-model-p" }, e.provider)
			);
		}

		function StatsPage(props) {
			const [data, setData] = react.useState(null);
			const [tab, setTab] = react.useState("week");
			const [tick, setTick] = react.useState(0);
			const api = apiOf(props);

			react.useEffect(() => {
				let alive = true;
				const load = async () => {
					if (!api) return;
					try {
						const result = await api.summary({});
						if (alive && result && result.ok) setData(result.value);
					} catch (err) {
						console.error("token stats load failed", err);
					}
				};
				load();
				let timer = null;
				try { timer = window.setInterval(load, 3000); } catch (err) { console.error(err); }
				return () => { alive = false; if (timer !== null) window.clearInterval(timer); };
			}, [tick]);

			const reset = async () => {
				if (!api) return;
				try {
					const r = await api.reset({});
					if (r && r.ok) setTick((t) => t + 1);
				} catch (err) {
					console.error("token stats reset failed", err);
				}
			};

			if (!api) {
				return h("div", { className: "ts-page" },
					h("div", { className: "ts-errbox" }, "远程服务不可用：" + remoteDiag)
				);
			}
			if (!data) {
				return h("div", { className: "ts-page" },
					h("div", { className: "ts-loading" }, "加载中…")
				);
			}

			const summary = data.summary || {};
			const monthList = Array.isArray(summary.months) ? summary.months : [];
			const weekList = Array.isArray(summary.weeks) ? summary.weeks : [];
			const periods = tab === "year" ? monthList : null;
			const single = tab === "week" || tab === "month";
			const period = single
				? (tab === "week" ? weekList[0] : monthList[monthList.length - 1])
				: null;
			const t = period ? period.total : null;

			if (single && !period) {
				return h("div", { className: "ts-page" },
					h("div", { className: "ts-empty" }, "统计数据未就绪，请刷新页面")
				);
			}

			const card = (key, num, cap, accent, numCls) => h("div", { key: key, className: "ts-tile " + (accent || "ts-tile-brand") },
				h("div", { className: "ts-tile-k" }, cap),
				h("div", { className: numCls ? "ts-tile-v " + numCls : "ts-tile-v" }, num)
			);
			const td = (v, cls, key) => h("td", { key: key || v, className: cls || undefined }, v);

			let body;
			if (single) {
				const cells = ["模型", "请求", "输入", "输出", "缓存命中", "命中率", "缓存写入", "推理", "总计", "最后使用"]
					.map((hh) => h("th", { key: hh }, hh));
				const rows = period.rows.map((e) => h("tr", { key: e.provider + "::" + e.model },
					td(ModelCell(e), undefined, "m"),
					td(e.requests, undefined, "r"),
					td(fmt(e.inputTokens), undefined, "i"),
					td(fmt(e.outputTokens), undefined, "o"),
					td(fmt(e.cacheReadTokens), "ts-hit", "cr"),
					td(hitPctOf(e), "ts-hit", "p"),
					td(fmt(e.cacheWriteTokens), undefined, "cw"),
					td(fmt(e.reasoningTokens), undefined, "re"),
					td(fmt(billedOf(e)), undefined, "tot"),
					td(time(e.lastAt), "ts-muted", "t")
				));
				const totalRow = h("tr", { className: "ts-total", key: "total" },
					td("合计", undefined, "m"),
					td(t.requests, undefined, "r"),
					td(fmt(t.inputTokens), undefined, "i"),
					td(fmt(t.outputTokens), undefined, "o"),
					td(fmt(t.cacheReadTokens), "ts-hit", "cr"),
					td(hitPctOf(t), "ts-hit", "p"),
					td(fmt(t.cacheWriteTokens), undefined, "cw"),
					td(fmt(t.reasoningTokens), undefined, "re"),
					td(fmt(billedOf(t)), undefined, "tot"),
					td("—", "ts-muted", "t")
				);
				body = h("div", { className: "ts-table-wrap" },
					h("table", { className: "ts-table" },
						h("thead", null, h("tr", null, ...cells)),
						h("tbody", null, ...rows, totalRow)
					)
				);
			} else {
				const modelMap = new Map();
				periods.forEach((p, ci) => {
					p.rows.forEach((e) => {
						const mk = e.provider + "::" + e.model;
						let m = modelMap.get(mk);
						if (!m) { m = { provider: e.provider, model: e.model, cells: [] }; modelMap.set(mk, m); }
						m.cells[ci] = e;
					});
				});
				const models = [...modelMap.values()].sort((a, b) => {
					const ta = a.cells.reduce((s, c) => s + (c ? billedOf(c) : 0), 0);
					const tb = b.cells.reduce((s, c) => s + (c ? billedOf(c) : 0), 0);
					return tb - ta;
				});
				const colTotal = periods.map((p) => p.total);
				const grand = { requests: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0 };
				colTotal.forEach((c) => {
					grand.requests += c.requests;
					grand.inputTokens += c.inputTokens;
					grand.outputTokens += c.outputTokens;
					grand.cacheReadTokens += c.cacheReadTokens;
					grand.cacheWriteTokens += c.cacheWriteTokens;
					grand.reasoningTokens += c.reasoningTokens;
				});
				const cell2 = (e, key) => h("td", { key: key },
					h("div", { className: "ts-cell2" },
						h("span", { className: "ts-cell2-1" }, e && e.requests ? "总 " + fmt(billedOf(e)) : "—"),
						h("span", { className: "ts-cell2-2" }, e && e.requests ? "命中 " + hitPctOf(e) : "")
					)
				);
				const headers = [h("th", { key: "m" }, "模型"),
					...periods.map((p) => h("th", { key: p.key }, p.label)),
					h("th", { key: "tot" }, "合计")];
				const rows = models.map((m) => h("tr", { key: m.provider + "::" + m.model },
					td(ModelCell(m), undefined, "m"),
					...Array.from({ length: periods.length }, (_, ci) => cell2(m.cells[ci], "c" + ci)),
					td(fmt(m.cells.reduce((s, c) => s + (c ? billedOf(c) : 0), 0)), undefined, "tot")
				));
				const grandRow = h("tr", { className: "ts-total", key: "g" },
					td("合计", undefined, "m"),
					...colTotal.map((c, ci) => cell2(c, "g" + ci)),
					td(fmt(billedOf(grand)), undefined, "tot")
				);
				body = h("div", { className: "ts-table-wrap ts-table-wrap--multi" },
					h("table", { className: "ts-table" },
						h("thead", null, h("tr", null, ...headers)),
						h("tbody", null, ...rows, grandRow)
					)
				);
			}

			const yearTotal = (summary.year && summary.year.total) || grand;
			const cards = single
				? [
					card("k1", t.requests, "请求次数", "ts-tile-brand"),
					card("k2", fmt(t.inputTokens), "输入 tokens", "ts-tile-ok"),
					card("k3", fmt(t.outputTokens), "输出 tokens", "ts-tile-warn"),
					card("k4", fmt(t.cacheReadTokens), "缓存命中", "ts-tile-ok", "ts-tile-v-ok"),
					card("k5", fmt(t.cacheWriteTokens), "缓存写入", "ts-tile-err"),
					card("k6", fmt(t.reasoningTokens), "推理 tokens", "ts-tile-brand")
				]
				: [
					card("k1", yearTotal.requests, "请求次数", "ts-tile-brand"),
					card("k2", fmt(yearTotal.inputTokens), "输入 tokens", "ts-tile-ok"),
					card("k3", fmt(yearTotal.outputTokens), "输出 tokens", "ts-tile-warn"),
					card("k4", fmt(yearTotal.cacheReadTokens), "缓存命中", "ts-tile-ok", "ts-tile-v-ok"),
					card("k5", fmt(yearTotal.cacheWriteTokens), "缓存写入", "ts-tile-err"),
					card("k6", fmt(yearTotal.reasoningTokens), "推理 tokens", "ts-tile-brand")
				];
			const tabs = TABS.map((tb) => h("button", {
				key: tb.id,
				className: tab === tb.id ? "ts-tab ts-tab-on" : "ts-tab",
				onClick: () => setTab(tb.id)
			}, tb.label));

			return h("div", { className: "ts-page" },
				h("div", { className: "ts-head" },
					h("div", null,
						h("div", { className: "ts-title-row" },
							h("span", { className: "ts-live" }),
							h("h3", { className: "ts-title" }, "Token 用量统计")
						),
						h("div", { className: "ts-sub" }, "本周 / 本月 / 年度 · 年度含全年汇总与各月明细 · 命中 = 缓存命中 / 计费输入 · 数据已持久化")
					),
					h("button", { className: "ts-btn ts-btn-danger", onClick: reset }, "清零")
				),
				h("div", { className: "ts-tabs" }, ...tabs),
				h("div", { className: "ts-strip" }, ...cards),
				body,
				h(ErrorBoundary, null, h(AccountsBlock, { getRemote: props.getRemote }))
			);
		}

		function QuotaRow(r, key) {
			const p = r.percent !== undefined ? r.percent : (r.limit ? Math.round((r.used / r.limit) * 100) : 0);
			const level = p >= 85 ? "ts-bar-err" : p >= 60 ? "ts-bar-warn" : "ts-bar-ok";
			const width = Math.max(0, Math.min(100, p));
			return h("div", { className: "ts-quota", key: key },
				h("div", { className: "ts-quota-top" },
					h("span", { className: "ts-quota-label" }, r.label),
					h("span", { className: "ts-quota-meta" },
						h("b", null, fmt(r.used)), r.limit ? " / " + fmt(r.limit) : "",
						r.percent !== undefined ? h("span", { className: "ts-quota-pct " + level }, r.percent + "%") : null
					)
				),
				r.limit > 0 ? h("div", { className: "ts-bar " + level },
					h("div", { style: { width: width + "%" } })
				) : null,
				r.reset ? h("div", { className: "ts-quota-reset" }, r.reset) : null
			);
		}

		function AccountsBlock(props) {
			const [state, setState] = react.useState(null);
			const [busy, setBusy] = react.useState(false);
			const api = apiOf(props);

			react.useEffect(() => {
				let alive = true;
				const load = async () => {
					if (!api) return;
					try {
						const result = await api.accounts({});
						if (alive && result && result.ok) setState(result.value);
					} catch (err) {
						console.error("accounts load failed", err);
					}
				};
				load();
				let timer = null;
				try { timer = window.setInterval(load, 60000); } catch (err) { console.error(err); }
				return () => { alive = false; if (timer !== null) window.clearInterval(timer); };
			}, []);

			const refresh = async () => {
				if (!api) return;
				setBusy(true);
				try {
					const result = await api.accounts({ force: true });
					if (result && result.ok) setState(result.value);
				} catch (err) {
					console.error("accounts refresh failed", err);
				}
				setBusy(false);
			};

			const [cb, setCb] = react.useState(null);

			const cbLoginStart = async () => {
				if (!api) return;
				try {
					const r = await api.codebuddyLogin({});
					if (!r || !r.ok) return;
					const v = r.value || {};
					if (!v.verificationUri) {
						setCb({ phase: "error", error: "未获取到登录链接" });
						return;
					}
					setCb({ phase: "waiting", verificationUri: v.verificationUri });
					try { window.open(v.verificationUri, "_blank"); } catch (err) { /* popup blocked */ }
				} catch (err) {
					setCb({ phase: "error", error: String((err && err.message) || err) });
				}
			};

			react.useEffect(() => {
				if (!cb || cb.phase !== "waiting") return;
				let alive = true;
				const poll = async () => {
					if (!api) return;
					try {
						const r = await api.codebuddyLoginPoll({});
						if (!r || !r.ok) return;
						const v = r.value || {};
						if (v.ok) {
							if (alive) setCb({ phase: "done", account: v.account });
							const res = await api.accounts({ force: true });
							if (alive && res && res.ok) setState(res.value);
							if (alive) setCb(null);
						} else if (v.error) {
							if (alive) setCb({ phase: "error", error: v.error });
						}
					} catch (err) { /* transient */ }
				};
				poll();
				let timer = null;
				try { timer = window.setInterval(poll, 2000); } catch (err) { console.error(err); }
				return () => { alive = false; if (timer !== null) window.clearInterval(timer); };
			}, [cb]);

			const cbLoginBlock = (a) => h("div", { className: "ts-acc-note", key: "cblogin" },
				h("button", {
					className: "ts-btn ts-btn-primary",
					onClick: cbLoginStart,
					disabled: cb && cb.phase === "waiting",
					style: { marginTop: 6 }
				}, cb && cb.phase === "waiting" ? "等待授权…" : "登录 CodeBuddy"),
				cb && cb.phase === "waiting" ? h("div", { key: "w", style: { marginTop: 6 } },
					"请在新窗口完成授权；未弹出请打开 ",
					h("a", { href: cb.verificationUri, target: "_blank", rel: "noreferrer" }, "授权链接")
				) : null,
				cb && cb.phase === "error" ? h("div", { key: "e", style: { marginTop: 6 } }, cb.error) : null
			);

			const fieldRow = (f, key, sub) => h("div", { className: "ts-acc-field", key: key },
				h("span", { className: "ts-acc-field-k" }, f.label),
				h("span", { className: "ts-acc-field-v" },
					money(f.value) + (f.unit ? " " + f.unit : ""),
					sub ? h("span", { className: "ts-acc-sub" }, sub) : null
				)
			);

			const list = state ? state.accounts : [];
			const cards = list.map((a) => {
				if (a.status !== "ok") {
					return h("div", { className: "ts-acc-card", key: a.provider },
						h("div", { className: "ts-acc-top" },
							h("span", { className: "ts-acc-name" }, a.displayName),
							h("span", { className: "ts-chip ts-chip-err" }, "查询失败")
						),
						h("div", { className: "ts-acc-err", key: "e" }, a.error || "未知错误"),
						h("div", { className: "ts-acc-time", key: "tm" }, "更新于 " + time(a.fetchedAt))
					);
				}
				const fields = a.fields || [];
				const quotaRows = a.quota && a.quota.rows ? a.quota.rows : [];
				const quotaFields = a.quota && a.quota.fields ? a.quota.fields : [];
				return h("div", { className: "ts-acc-card", key: a.provider },
					h("div", { className: "ts-acc-top" },
						h("span", { className: "ts-acc-name" }, a.displayName),
						h("span", { className: "ts-chip ts-chip-ok" }, "正常")
					),
					...fields.map((f, i) => fieldRow(f, "f" + i)),
					a.note ? h("div", { className: "ts-acc-note", key: "note" }, a.note) : null,
					a.needLogin ? cbLoginBlock(a) : null,
					a.quota ? h("div", { className: "ts-quota-title", key: "qtitle" }, a.quotaLabel || "配额") : null,
					...quotaRows.map((r, i) => QuotaRow(r, "qr" + i)),
					...quotaFields.map((f, i) => fieldRow(f, "qf" + i)),
					a.quota && a.quota.error ? h("div", { className: "ts-acc-note", key: "qerr" }, "计划用量暂不可用：" + a.quota.error) : null,
					h("div", { className: "ts-acc-time", key: "tm" }, "更新于 " + time(a.fetchedAt))
				);
			});

			return h("div", { className: "ts-section" },
				h("div", { className: "ts-head" },
					h("div", null,
						h("div", { className: "ts-section-title" }, "账户余额与配额"),
						h("div", { className: "ts-sub" }, "仅显示已配置 API Key 的模型商 · " + (state ? "上次刷新 " + time(state.fetchedAt) : "刷新中…") + " · 每 60 秒自动刷新")
					),
					h("button", { className: "ts-btn ts-btn-primary", onClick: refresh, disabled: busy }, busy ? "刷新中…" : "立即刷新")
				),
				cards.length
					? h("div", { className: "ts-acc-list" }, ...cards)
					: h("div", { className: "ts-empty" }, "未检测到已配置密钥的模型商账户，在 设置 → 模型 中配置后会显示在此"),
				h("div", { className: "ts-acc-note", style: { marginTop: 8 } }, "未展示你的 API 或 Plan？让 DSH 适配一下即可（适配器表可扩展，支持 OpenAI / OpenRouter / 硅基流动等）")
			);
		}

		function DockLine(props) {
			const sessionId = props.sessionId;
			const api = apiOf(props);
			const [entry, setEntry] = react.useState(null);

			react.useEffect(() => {
				let alive = true;
				const load = async () => {
					if (!api) return;
					try {
						const result = await api.session({ sessionId });
						if (alive && result && result.ok) setEntry(result.value);
					} catch (err) { /* non-fatal */ }
				};
				load();
				let timer = null;
				try { timer = window.setInterval(load, 3000); } catch (err) { console.error(err); }
				return () => { alive = false; if (timer !== null) window.clearInterval(timer); };
			}, [sessionId]);

			if (!entry || entry.requests === 0) return null;
			const billed = billedOf(entry);
			const sep = (key) => h("span", { className: "ts-dock-sep", key: key });
			return h("div", { className: "ts-dock" },
				h("span", { className: "ts-dock-dot" }),
				h("span", { className: "ts-dock-label" }, "本会话"),
				sep("s1"),
				h("span", { key: "r" }, "请求 " + entry.requests),
				sep("s2"),
				h("span", { key: "i" }, "输入 " + fmt(billed)),
				sep("s3"),
				h("span", { key: "o" }, "输出 " + fmt(entry.outputTokens)),
				sep("s4"),
				h("span", { className: "ts-dock-hit", key: "h" }, "命中 " + fmt(entry.cacheReadTokens) + " (" + hitPctOf(entry) + ")")
			);
		}

		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});
