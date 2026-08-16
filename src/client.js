// dsh-soul client half — soul management card in the settings plugin list.
//
// Lists soul packs under ~/.dsh/souls/, shows the active one (rendered into
// ~/.dsh/AGENTS.md) with its avatar, and offers activate / new / delete /
// avatar upload. DNA and beliefs files are editable through the host save
// route (full editor UI is a later step). UI copy is localized through the
// host locale service (en + zh dictionaries).
window.__ModuleLoader__.load({
	id: "dsh-soul",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		var react = require("react");

		const name = "dsh-soul-client";
		const inject = ["slots", "locale"];

		const API = "/api/dsh-soul";
		const NS = "dsh-soul";
		const zh = {
			subtitle: "养一个会自进化的 AI 伙伴：灵魂 DNA + 经历 + 成长",
			expand: "展开",
			collapse: "收起",
			active: "当前灵魂",
			none: "（未激活灵魂）",
			activate: "激活",
			activeBadge: "✓ 陪伴中",
			noSouls: "还没有灵魂。输入名字新建一个，或用 dsh-migrate-openclaw 导入。",
			newPlaceholder: "灵魂名字（如 kagura）",
			create: "新灵魂",
			deleteBtn: "删除",
			dnaLabel: "DNA",
			beliefsLabel: "信念候选",
			notesLabel: "日记",
			avatarLabel: "头像",
			uploadAvatar: "上传头像",
			avatarUploaded: "头像已更新（{avatar}）",
			avatarMissing: "无头像",
			refresh: "刷新",
			busy: "处理中…",
			err: "失败：{error}",
			created: "已创建灵魂 {name}（骨架就绪，点「激活」开始陪伴）",
			activated: "已激活 {name} → {target}（{bytes} 字节{backedUp}，第 {n} 次激活）\n{note}",
			backedUp: "，旧文件已备份",
			deleted: "已删除灵魂 {name}",
			activeProtected: "不能删除陪伴中的灵魂",
			syncHint: "DNA 修改后自动重新聚合到 ~/.dsh/AGENTS.md（下次访问时生效）",
		};
		const en = {
			subtitle: "Raise an evolving AI companion: soul DNA + experiences + growth",
			expand: "Expand",
			collapse: "Collapse",
			active: "Active soul",
			none: "(no soul active)",
			activate: "Activate",
			activeBadge: "✓ active",
			noSouls: "No souls yet. Enter a name to create one, or import one with dsh-migrate-openclaw first.",
			newPlaceholder: "Soul name (e.g. kagura)",
			create: "New soul",
			deleteBtn: "Delete",
			dnaLabel: "DNA",
			beliefsLabel: "Beliefs",
			notesLabel: "Notes",
			avatarLabel: "Avatar",
			uploadAvatar: "Upload avatar",
			avatarUploaded: "Avatar updated ({avatar})",
			avatarMissing: "no avatar",
			refresh: "Refresh",
			busy: "Working…",
			err: "Failed: {error}",
			created: "Created soul {name} (skeleton ready; hit Activate to start)",
			activated: "Activated {name} → {target} ({bytes} bytes{backedUp}, activation #{n})\n{note}",
			backedUp: ", previous file backed up",
			deleted: "Deleted soul {name}",
			activeProtected: "Cannot delete the active soul",
			syncHint: "DNA edits re-aggregate into ~/.dsh/AGENTS.md automatically (on next visit)",
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
			soul: {
				display: "flex",
				alignItems: "center",
				gap: 12,
				padding: "10px",
				border: "1px solid #e4e8ee",
				borderRadius: 8,
				margin: "6px 0",
				background: "#fafbfc"
			},
			avatar: {
				width: 40,
				height: 40,
				borderRadius: "50%",
				objectFit: "cover",
				background: "#eef1f5",
				flex: "none",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				fontSize: 20,
				color: "#8a94a3"
			},
			msg: { margin: "8px 0 0", whiteSpace: "pre-wrap", wordBreak: "break-word" },
			ok: { color: "#1a7f37" },
			err: { color: "#c0392b" },
			muted: { color: "#8a94a3", fontSize: 12 }
		};

		function AvatarImg({ soul }) {
			const [src, setSrc] = react.useState(null);
			react.useEffect(() => {
				let cancelled = false;
				if (!soul.avatar) { setSrc(null); return; }
				fetch(API + "/avatar", {
					method: "POST",
					credentials: "same-origin",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ name: soul.name })
				}).then((r) => r.blob()).then((blob) => {
					if (!cancelled) setSrc(URL.createObjectURL(blob));
				}).catch(() => { if (!cancelled) setSrc(null); });
				return () => { cancelled = true; };
			}, [soul.name, soul.avatar]);
			if (src !== null) {
				return react.createElement("img", { src, style: styles.avatar, alt: soul.name });
			}
			return react.createElement("div", { style: styles.avatar }, "🌸");
		}

		function SoulCard({ ctx }) {
			const [open, setOpen] = react.useState(false);
			const [busy, setBusy] = react.useState(false);
			const [souls, setSouls] = react.useState(null);
			const [active, setActive] = react.useState(null);
			const [newName, setNewName] = react.useState("");
			const [result, setResult] = react.useState(null);
			const fileRef = react.useRef(null);
			const uploadFor = react.useRef(null);

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
				if (!res.ok || !data.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
				return data;
			};

			const load = async () => {
				try {
					const data = await post("/list", {});
					setSouls(data.souls || []);
					setActive(data.active || null);
				} catch (error) {
					setResult({ kind: "err", text: t("err", { error: error.message }) });
				}
			};

			const runActivate = async (soulName) => {
				setBusy(true);
				try {
					const data = await post("/activate", { name: soulName });
					setActive(soulName);
					setResult({
						kind: "ok",
						text: t("activated", {
							name: soulName,
							target: data.target,
							bytes: data.bytes,
							backedUp: data.backedUp ? t("backedUp") : "",
							n: data.activations
						}) + `\n${data.note || ""}`
					});
					await load();
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
					await post("/new", { name: n });
					setNewName("");
					setResult({ kind: "ok", text: t("created", { name: n }) });
					await load();
				} catch (error) {
					setResult({ kind: "err", text: t("err", { error: error.message }) });
				}
				setBusy(false);
			};

			const runDelete = async (soulName) => {
				if (!window.confirm(`Delete soul "${soulName}"?`)) return;
				setBusy(true);
				try {
					await post("/delete", { name: soulName });
					setResult({ kind: "ok", text: t("deleted", { name: soulName }) });
					await load();
				} catch (error) {
					setResult({ kind: "err", text: t("err", { error: error.message }) });
				}
				setBusy(false);
			};

			const pickAvatar = (soulName) => {
				uploadFor.current = soulName;
				if (fileRef.current) fileRef.current.click();
			};

			const onAvatarFile = async (e) => {
				const file = e.target.files && e.target.files[0];
				e.target.value = "";
				if (!file || !uploadFor.current) return;
				const soulName = uploadFor.current;
				setBusy(true);
				try {
					const res = await fetch(`${API}/avatar-upload?name=${encodeURIComponent(soulName)}`, {
						method: "POST",
						credentials: "same-origin",
						headers: { "content-type": file.type },
						body: file
					});
					const data = await res.json().catch(() => ({}));
					if (!res.ok || !data.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
					setResult({ kind: "ok", text: t("avatarUploaded", { avatar: data.avatar }) });
					await load();
				} catch (error) {
					setResult({ kind: "err", text: t("err", { error: error.message }) });
				}
				setBusy(false);
			};

			return react.createElement("li", { style: styles.li },
				react.createElement("article", { style: styles.article },
					react.createElement("button", {
						type: "button",
						"aria-label": `${open ? t("collapse") : t("expand")}: dsh-soul`,
						"aria-expanded": open,
						onClick: () => { const next = !open; setOpen(next); if (next) void load(); },
						style: styles.headerBtn
					},
						react.createElement("div", { style: { flex: 1, minWidth: 0 } },
							react.createElement("div", { style: { fontSize: 15, fontWeight: 600 } }, "dsh-soul"),
							react.createElement("div", { style: { fontSize: 13, color: "#8a94a3", marginTop: 2 } }, t("subtitle"))),
						react.createElement("span", {
							style: { color: "#8a94a3", fontSize: 12, transition: "transform .14s", transform: open ? "rotate(180deg)" : "none" }
						}, "▾")),
					open && react.createElement("div", { style: styles.body },
						react.createElement("input", { type: "file", accept: "image/png,image/jpeg,image/webp,image/gif", ref: fileRef, style: { display: "none" }, onChange: onAvatarFile }),
						react.createElement("div", { style: { fontWeight: 500, color: "#1c2024", margin: "4px 0 6px" } },
							`${t("active")}: ${active || t("none")}`),
						souls !== null && souls.length === 0 &&
							react.createElement("p", { style: styles.muted }, t("noSouls")),
						souls !== null && souls.map((s) =>
							react.createElement("div", { key: s.name, style: styles.soul },
								react.createElement(AvatarImg, { soul: s }),
								react.createElement("div", { style: { flex: 1, minWidth: 0 } },
									react.createElement("div", { style: { fontWeight: 600, color: "#1c2024" } },
										s.name + (s.active ? ` ${t("activeBadge")}` : "")),
									react.createElement("div", { style: styles.muted },
										`${t("dnaLabel")}: ${s.dna.map((f) => f.name.replace(/\.md$/i, "")).join(", ") || "—"}` +
										(s.beliefsBytes > 0 ? ` · ${t("beliefsLabel")}: ${s.beliefsBytes}B` : "") +
										` · ${t("notesLabel")}: ${s.notes}`)),
								react.createElement("button", { style: styles.btn, onClick: () => pickAvatar(s.name), disabled: busy, title: t("uploadAvatar") }, "🖼️"),
								!s.active &&
									react.createElement("button", { style: styles.btnPrimary, onClick: () => runActivate(s.name), disabled: busy }, t("activate")),
								!s.active &&
									react.createElement("button", { style: styles.btnDanger, onClick: () => runDelete(s.name), disabled: busy }, t("deleteBtn")))),
						react.createElement("div", { style: styles.row },
							react.createElement("input", {
								style: styles.input,
								value: newName,
								placeholder: t("newPlaceholder"),
								onChange: (e) => setNewName(e.target.value),
								onKeyDown: (e) => { if (e.key === "Enter") void runCreate(); }
							}),
							react.createElement("button", { style: styles.btnPrimary, onClick: runCreate, disabled: busy }, t("create")),
							react.createElement("button", { style: styles.btn, onClick: load, disabled: busy }, t("refresh"))),
						react.createElement("div", { style: { ...styles.muted, marginTop: 4 } }, t("syncHint")),
						busy && react.createElement("p", { style: { ...styles.msg, color: "#1c2024" } }, t("busy")),
						result !== null &&
							react.createElement("p", { style: { ...styles.msg, ...(result.kind === "ok" ? styles.ok : styles.err) } }, result.text))));
		}

		function apply(ctx) {
			const slots = ctx.get("slots");
			if (slots === void 0) return;
			const locale = ctx.get("locale");
			if (locale !== void 0) {
				ctx.effect(() => locale.register(NS, { zh, en }), "dsh-soul: card dictionaries");
			}
			slots.inject("settings.plugin.item", () => slots.register(
				{ name: "settings.plugin.item", id: "dsh-soul", order: 45, label: "dsh-soul" },
				() => react.createElement(SoulCard, { ctx })
			));
		}

		exports.name = name;
		exports.inject = inject;
		exports.apply = apply;
		return module.exports;
	}
});
