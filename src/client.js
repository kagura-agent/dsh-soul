// dsh-persona client half — persona management card in the settings plugin list.
//
// Lists persona packs stored under ~/.dsh/personas/, shows which one is active
// (aggregated into ~/.dsh/AGENTS.md), and offers: activate / new / delete.
// All work happens through the host half's /api/dsh-persona/* routes.
// UI copy is localized through the host locale service (en + zh dictionaries).
window.__ModuleLoader__.load({
	id: "dsh-persona",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		var react = require("react");

		const name = "dsh-persona-client";
		const inject = ["slots", "locale"];

		const API = "/api/dsh-persona";
		/** Locale namespace owning this card's copy. */
		const NS = "dsh-persona";
		const zh = {
			subtitle: "Agent 人格管理：多套人格存储 + 一键激活",
			expand: "展开",
			collapse: "收起",
			active: "当前激活",
			none: "（未激活人格）",
			activate: "激活",
			activeBadge: "✓ 激活中",
			noPersonas: "还没有人格包。输入名字新建一个，或先用 dsh-migrate-openclaw 导入。",
			newPlaceholder: "新人格名字（如 kagura）",
			create: "新建人格",
			deleteBtn: "删除",
			filesLabel: "文件",
			refresh: "刷新",
			busy: "处理中…",
			err: "失败：{error}",
			created: "已创建人格 {name}（骨架就绪，点「激活」生效）",
			activated: "已激活 {name} → {target}（{bytes} 字节{backedUp}）\n{note}",
			backedUp: "，旧文件已备份",
			deleted: "已删除人格 {name}",
			activeProtected: "不能删除激活中的人格",
		};
		const en = {
			subtitle: "Agent persona management: multiple personas, one-click activation",
			expand: "Expand",
			collapse: "Collapse",
			active: "Active",
			none: "(no persona active)",
			activate: "Activate",
			activeBadge: "✓ active",
			noPersonas: "No persona packs yet. Enter a name to create one, or import one with dsh-migrate-openclaw first.",
			newPlaceholder: "New persona name (e.g. kagura)",
			create: "New persona",
			deleteBtn: "Delete",
			filesLabel: "Files",
			refresh: "Refresh",
			busy: "Working…",
			err: "Failed: {error}",
			created: "Created persona {name} (skeleton ready; hit Activate to apply)",
			activated: "Activated {name} → {target} ({bytes} bytes{backedUp})\n{note}",
			backedUp: ", previous file backed up",
			deleted: "Deleted persona {name}",
			activeProtected: "Cannot delete the active persona",
		};

		const styles = {
			li: { listStyle: "none" },
			article: {
				border: "1px solid #d4d9e0",
				borderRadius: 12,
				background: "#fff",
				color: "#1c2024",
				overflow: "hidden"
			},
			headerBtn: {
				width: "100%",
				display: "flex",
				alignItems: "center",
				gap: 12,
				padding: "14px 16px",
				border: 0,
				background: "none",
				cursor: "pointer",
				textAlign: "left",
				font: "inherit",
				color: "inherit"
			},
			body: {
				borderTop: "1px solid #e4e8ee",
				padding: "12px 16px 14px",
				fontSize: 13,
				color: "#5a6472",
				lineHeight: 1.6
			},
			row: { display: "flex", gap: 8, margin: "10px 0", flexWrap: "wrap", alignItems: "center" },
			input: {
				flex: 1,
				minWidth: 160,
				boxSizing: "border-box",
				padding: "8px 10px",
				border: "1px solid #d4d9e0",
				borderRadius: 8,
				fontSize: 13,
				outline: "none"
			},
			btn: {
				padding: "8px 14px",
				border: "1px solid #c9d1dc",
				borderRadius: 8,
				background: "#f6f8fa",
				color: "#1c2024",
				fontSize: 13,
				cursor: "pointer"
			},
			btnPrimary: {
				padding: "8px 14px",
				border: 0,
				borderRadius: 8,
				background: "#1f6feb",
				color: "#ffffff",
				fontSize: 13,
				fontWeight: 600,
				cursor: "pointer"
			},
			btnDanger: {
				padding: "6px 10px",
				border: "1px solid #e0b4b0",
				borderRadius: 8,
				background: "#fdf3f2",
				color: "#c0392b",
				fontSize: 12,
				cursor: "pointer"
			},
			persona: {
				display: "flex",
				alignItems: "center",
				gap: 10,
				padding: "8px 10px",
				border: "1px solid #e4e8ee",
				borderRadius: 8,
				margin: "6px 0",
				background: "#fafbfc"
			},
			msg: { margin: "8px 0 0", whiteSpace: "pre-wrap", wordBreak: "break-word" },
			ok: { color: "#1a7f37" },
			err: { color: "#c0392b" },
			muted: { color: "#8a94a3", fontSize: 12 }
		};

		function PersonaCard({ ctx }) {
			const [open, setOpen] = react.useState(false);
			const [busy, setBusy] = react.useState(false);
			const [personas, setPersonas] = react.useState(null);
			const [active, setActive] = react.useState(null);
			const [newName, setNewName] = react.useState("");
			const [result, setResult] = react.useState(null); // { kind, text }

			const t = ctx.locale.bind(NS);
			const [, forceRender] = react.useReducer((x) => x + 1, 0);
			react.useEffect(() => ctx.locale.subscribe(() => forceRender()), [ctx]);

			const post = async (path, payload) => {
				const res = await fetch(API + path, {
					method: "POST",
					credentials: "same-origin",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(payload)
				});
				const data = await res.json().catch(() => ({}));
				if (!res.ok || !data.ok) {
					throw new Error((data && data.error) || `HTTP ${res.status}`);
				}
				return data;
			};

			const load = async (silent) => {
				try {
					const data = await post("/list", {});
					setPersonas(data.personas || []);
					setActive(data.active || null);
					if (!silent) setResult(null);
				} catch (error) {
					setResult({ kind: "err", text: t("err", { error: error.message }) });
				}
			};

			const runActivate = async (personaName) => {
				setBusy(true);
				try {
					const data = await post("/activate", { name: personaName });
					setActive(personaName);
					setResult({
						kind: "ok",
						text: t("activated", {
							name: personaName,
							target: data.target,
							bytes: data.bytes,
							backedUp: data.backedUp ? t("backedUp") : "",
							note: data.note || ""
						})
					});
					await load(true);
				} catch (error) {
					setResult({ kind: "err", text: t("err", { error: error.message }) });
				}
				setBusy(false);
			};

			const runCreate = async () => {
				const n = newName.trim();
				if (!n) return;
				setBusy(true);
				try {
					const data = await post("/new", { name: n });
					setNewName("");
					setResult({ kind: "ok", text: t("created", { name: n }) });
					await load(true);
				} catch (error) {
					setResult({ kind: "err", text: t("err", { error: error.message }) });
				}
				setBusy(false);
			};

			const runDelete = async (personaName) => {
				if (!window.confirm(`Delete persona "${personaName}"?`)) return;
				setBusy(true);
				try {
					await post("/delete", { name: personaName });
					setResult({ kind: "ok", text: t("deleted", { name: personaName }) });
					await load(true);
				} catch (error) {
					setResult({ kind: "err", text: t("err", { error: error.message }) });
				}
				setBusy(false);
			};

			return react.createElement("li", { style: styles.li },
				react.createElement("article", { style: styles.article },
					react.createElement("button", {
						type: "button",
						"aria-label": `${open ? t("collapse") : t("expand")}: dsh-persona`,
						"aria-expanded": open,
						onClick: () => { const next = !open; setOpen(next); if (next) void load(false); },
						style: styles.headerBtn
					},
						react.createElement("div", { style: { flex: 1, minWidth: 0 } },
							react.createElement("div", { style: { fontSize: 15, fontWeight: 600 } }, "dsh-persona"),
							react.createElement("div", { style: { fontSize: 13, color: "#8a94a3", marginTop: 2 } }, t("subtitle"))),
						react.createElement("span", {
							style: { color: "#8a94a3", fontSize: 12, transition: "transform .14s", transform: open ? "rotate(180deg)" : "none" }
						}, "▾")),
					open && react.createElement("div", { style: styles.body },
						react.createElement("div", { style: { fontWeight: 500, color: "#1c2024", margin: "4px 0 6px" } },
							`${t("active")}: ${active || t("none")}`),
						personas !== null && personas.length === 0 &&
							react.createElement("p", { style: styles.muted }, t("noPersonas")),
						personas !== null && personas.map((p) =>
							react.createElement("div", { key: p.name, style: styles.persona },
								react.createElement("div", { style: { flex: 1, minWidth: 0 } },
									react.createElement("div", { style: { fontWeight: 600, color: "#1c2024" } },
										p.name + (p.active ? ` ${t("activeBadge")}` : "")),
									react.createElement("div", { style: styles.muted },
										`${t("filesLabel")}: ${p.files.map((f) => f.name.replace(/\.md$/i, "")).join(", ") || "—"}`)),
								!p.active &&
									react.createElement("button", { style: styles.btnPrimary, onClick: () => runActivate(p.name), disabled: busy }, t("activate")),
								!p.active &&
									react.createElement("button", { style: styles.btnDanger, onClick: () => runDelete(p.name), disabled: busy }, t("deleteBtn")))),
						react.createElement("div", { style: styles.row },
							react.createElement("input", {
								style: styles.input,
								value: newName,
								placeholder: t("newPlaceholder"),
								onChange: (e) => setNewName(e.target.value),
								onKeyDown: (e) => { if (e.key === "Enter") void runCreate(); }
							}),
							react.createElement("button", { style: styles.btnPrimary, onClick: runCreate, disabled: busy }, t("create")),
							react.createElement("button", { style: styles.btn, onClick: () => load(false), disabled: busy }, t("refresh"))),
						busy && react.createElement("p", { style: { ...styles.msg, color: "#1c2024" } }, t("busy")),
						result !== null &&
							react.createElement("p", { style: { ...styles.msg, ...(result.kind === "ok" ? styles.ok : styles.err) } }, result.text))));
		}

		function apply(ctx) {
			const slots = ctx.get("slots");
			if (slots === void 0) return;
			const locale = ctx.get("locale");
			if (locale !== void 0) {
				ctx.effect(() => locale.register(NS, { zh, en }), "dsh-persona: card dictionaries");
			}
			slots.inject("settings.plugin.item", () => slots.register(
				{ name: "settings.plugin.item", id: "dsh-persona", order: 45, label: "dsh-persona" },
				() => react.createElement(PersonaCard, { ctx })
			));
		}

		exports.name = name;
		exports.inject = inject;
		exports.apply = apply;
		return module.exports;
	}
});
