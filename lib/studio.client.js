window.__ModuleLoader__.load({
	id: "dsh-delegation-suite",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		const h = react.createElement;

		const name = "preset-studio";
		const inject = ["slots", "locale", "connection", "remote"];

		// Module-level: one shared mount promise so the section and any caller
		// wait for the Remote namespace once.
		let mountPromise = null;
		let mountError = null;

		function apply(ctx) {
			const slots = ctx.get("slots");
			if (slots === undefined) return;
			slots.inject("settings.section", () => slots.register({
				name: "settings.section",
				id: "preset-studio",
				order: 21,
				label: () => "预设工作室",
				inject: () => ({
					getRemote: async () => {
						await ensureMounted(ctx);
						if (mountError) return null;
						// Path 1: the namespace service registers under the dotted key
						// "remote.presetStudio"; reach it directly through ctx.get.
						try {
							const ns = ctx.get("remote.presetStudio");
							if (ns !== undefined && ns !== null && typeof ns.list === "function") {
								return { presetStudio: ns };
							}
						} catch (error) {
							// fall through to path 2
						}
						// Path 2: guard-based property access (official pattern).
						try {
							if (ctx.remote.presetStudio !== undefined) return ctx.remote;
						} catch (error) {
							return null;
						}
						const connection = ctx.get("connection");
						if (connection !== undefined && connection.api && connection.api.presetStudio) return connection.api;
						return null;
					}
				})
			}, PresetStudioSection));
			void ensureMounted(ctx);
		}

		function ensureMounted(ctx) {
			if (mountPromise === null) {
				mountPromise = mountRemote(ctx).catch((error) => {
					mountError = String((error && error.message) || error);
					mountPromise = null;
				});
			}
			return mountPromise;
		}

		async function mountRemote(ctx) {
			const remote = ctx.get("remote");
			if (remote === undefined || typeof remote.$mount !== "function") return;
			const passthrough = { parse: (value) => value };
			const codec = {
				mode: "strict",
				typeSymbol: "dsh-delegation-suite/types#Remote",
				schema: passthrough,
			};
			const mkParam = (name) => ({ name, wire: name, source: "json", codec });
			const mk = (method) => ({
				id: "dsh-delegation-suite#presetStudio/" + method,
				service: "presetStudio",
				namespace: "presetStudio",
				method,
				invocation: { kind: "direct" },
				parameters: [mkParam("request")],
				result: codec,
			});
			await remote.$mount({
				package: "dsh-delegation-suite",
				descriptors: ["list", "readComposition", "saveMeta", "savePersona", "readRoutes", "saveRoutes"].map(mk),
			});
		}

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

			const load = react.useCallback(() => {
				setState((s) => ({ ...s, status: "loading", error: null }));
				Promise.resolve(typeof getRemote === "function" ? getRemote() : null)
					.then((api) => {
						if (!api) {
							setState((s) => ({ ...s, status: "error", error: "无法访问远程服务" + (mountError ? "：" + mountError : "") }));
							return null;
						}
						const studio = api.presetStudio || api["preset-studio"];
						if (!studio) {
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
						if (!Array.isArray(result)) return;
						const presets = result[0];
						const routesDoc = result[1];
						if (presets === undefined && routesDoc === undefined) return;
						setState((s) => ({ ...s, status: "ready", presets: presets || [], routes: (routesDoc && routesDoc.routes) || null, routesPath: (routesDoc && routesDoc.path) || null, error: null, saved: null }));
						setRoutesDraft((routesDoc && routesDoc.routes) || null);
					})
					.catch((e) => setState((s) => ({ ...s, status: "error", error: ((e && (e.stack || e.message)) || String(e)).slice(0, 600) })));
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

		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});
