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
		const inject = ["slots", "locale", "connection"];

		const API = "/api/dsh-soul";

		/** Shared JSON POST helper (module-level so every component uses one copy). */
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
			edit: "编辑",
			backToList: "← 返回",
			detailTitle: "灵魂配置",
			newSoul: "新建灵魂",
			createNamePlaceholder: "灵魂名字（如 kagura）",
			close: "关闭",
			tabConfig: "配置",
			tabGrowth: "成长",
			growthBorn: "出生于",
			growthDays: "已陪伴（天）",
			growthDnaChanges: "DNA 修改（次）",
			growthBeliefs: "候选教训（条）",
			growthNotes: "日记（篇）",
			growthSpan: "记录从 {first} 到 {last}",
			growthTimeline: "成长时间线",
			growthActivity: "每月活动",
			growthSectionDna: "DNA 修改",
			growthSectionNotes: "最近的日记",
			growthSectionBeliefs: "最近的候选教训",
			growthEventDna: "修改了 {file}",
			growthEventNote: "{name}",
			growthEventBelief: "{date}",
			growthEventBorn: "出生",
			growthEventMigrate: "迁入 DSH",
			growthNoEvents: "还没有成长记录",
			growthNoDna: "还没有修改过 DNA",
			growthNoNotes: "还没有日记",
			growthNoBeliefs: "还没有候选教训",
			save: "保存",
			editingHint: "保存后自动重新聚合到 ~/.dsh/AGENTS.md",
			saved: "已保存 {file}",
			loadFailed: "读取失败：{error}",
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
			badgeNoSoul: "未激活灵魂",
			badgeTitle: "当前灵魂：{name}",
			newSoulEntry: "新建灵魂…",
			cancel: "取消",
			createNeedsName: "先输入一个名字",
			openSettingsFailed: "无法打开设置：{error}",
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
			edit: "Edit",
			backToList: "← Back",
			detailTitle: "Soul config",
			newSoul: "New soul",
			createNamePlaceholder: "Soul name (e.g. kagura)",
			close: "Close",
			tabConfig: "Config",
			tabGrowth: "Growth",
			growthBorn: "Born",
			growthDays: "Days together",
			growthDnaChanges: "DNA edits",
			growthBeliefs: "Belief candidates",
			growthNotes: "Notes",
			growthSpan: "Records from {first} to {last}",
			growthTimeline: "Growth timeline",
			growthActivity: "Activity per month",
			growthSectionDna: "DNA edits",
			growthSectionNotes: "Recent notes",
			growthSectionBeliefs: "Recent belief candidates",
			growthEventDna: "Edited {file}",
			growthEventNote: "{name}",
			growthEventBelief: "{date}",
			growthEventBorn: "Born",
			growthEventMigrate: "Migrated to DSH",
			growthNoEvents: "No growth yet",
			growthNoDna: "No DNA edits yet",
			growthNoNotes: "No notes yet",
			growthNoBeliefs: "No belief candidates yet",
			save: "Save",
			editingHint: "Saving re-aggregates into ~/.dsh/AGENTS.md automatically",
			saved: "Saved {file}",
			loadFailed: "Failed to load: {error}",
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
			badgeNoSoul: "No soul active",
			badgeTitle: "Active soul: {name}",
			newSoulEntry: "New soul…",
			cancel: "Cancel",
			createNeedsName: "Enter a name first",
			openSettingsFailed: "Could not open settings: {error}",
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
			const [result, setResult] = react.useState(null);
			const [newName, setNewName] = react.useState("");
			const [editing, setEditing] = react.useState(null); // { name, file, content, loading }
			const fileRef = react.useRef(null);
			const uploadFor = react.useRef(null);

			const t = ctx.locale.bind(NS);
			const [, forceRender] = react.useReducer((x) => x + 1, 0);
			react.useEffect(() => ctx.locale.subscribe(() => forceRender()), [ctx]);

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
				if (!n) {
					setResult({ kind: "err", text: t("createNeedsName") });
					return;
				}
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

			const openEditor = async (soulName, file) => {
				setEditing({ name: soulName, file, content: "", loading: true });
				try {
					const data = await post("/get", { name: soulName, file });
					setEditing({ name: soulName, file, content: data.content || "", loading: false });
				} catch (error) {
					setResult({ kind: "err", text: t("loadFailed", { error: error.message }) });
					setEditing(null);
				}
			};

			const switchFile = async (file) => {
				if (editing === null) return;
				const name = editing.name;
				setEditing({ name, file, content: "", loading: true });
				try {
					const data = await post("/get", { name, file });
					setEditing({ name, file, content: data.content || "", loading: false });
				} catch (error) {
					setResult({ kind: "err", text: t("loadFailed", { error: error.message }) });
				}
			};

			const saveEdit = async () => {
				if (editing === null) return;
				setBusy(true);
				try {
					await post("/save", { name: editing.name, file: editing.file, content: editing.content });
					setResult({ kind: "ok", text: t("saved", { file: editing.file }) + " — " + t("editingHint") });
					setEditing(null);
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
												souls !== null && souls.map((s) => {
							const isEditing = editing !== null && editing.name === s.name;
							return react.createElement(react.Fragment, { key: s.name },
							react.createElement("div", { style: { ...styles.soul, ...(isEditing ? { borderColor: "#1f6feb" } : {}) } },
								react.createElement("button", {
									type: "button",
									style: { padding: 0, border: 0, background: "none", cursor: "pointer", borderRadius: "50%", flex: "none", lineHeight: 0 },
									onClick: () => pickAvatar(s.name),
									disabled: busy,
									title: t("uploadAvatar")
								}, react.createElement(AvatarImg, { soul: s })),
								react.createElement("div", { style: { flex: 1, minWidth: 0 } },
									react.createElement("div", { style: { fontWeight: 600, color: "#1c2024" } },
										s.name + (s.active ? ` ${t("activeBadge")}` : "")),
									react.createElement("div", { style: styles.muted },
										`${t("dnaLabel")}: ${s.dna.map((f) => f.name.replace(/\.md$/i, "")).join(", ") || "—"}` +
										(s.beliefsBytes > 0 ? ` · ${t("beliefsLabel")}: ${s.beliefsBytes}B` : "") +
										` · ${t("notesLabel")}: ${s.notes}`)),
								react.createElement("button", { style: styles.btn, onClick: () => openEditor(s.name, "SOUL.md"), disabled: busy }, t("edit")),
								!s.active &&
									react.createElement("button", { style: styles.btnPrimary, onClick: () => runActivate(s.name), disabled: busy }, t("activate")),
								!s.active &&
									react.createElement("button", { style: styles.btnDanger, onClick: () => runDelete(s.name), disabled: busy }, t("deleteBtn"))),
							isEditing &&
								react.createElement(EditorSection, { editing, busy, t, switchFile, saveEdit, setEditing }));
						}),
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


		/** Sidebar footer badge + soul switcher: the active soul's face is
		 * always visible; clicking opens a panel to switch souls or create one —
		 * the same management actions as the settings card, reachable from
		 * wherever the human is talking. */
		function ActiveSoulBadge({ ctx, wide }) {
			const [soul, setSoul] = react.useState(null);
			const [detailOpen, setDetailOpen] = react.useState(false);
			const [avatarSrc, setAvatarSrc] = react.useState(null);
			const [busy, setBusy] = react.useState(false);
			const t = ctx.locale.bind(NS);
			const [, forceRender] = react.useReducer((x) => x + 1, 0);
			react.useEffect(() => ctx.locale.subscribe(() => forceRender()), [ctx]);

			const refresh = () => {
				fetch(API + "/list", {
					method: "POST",
					credentials: "same-origin",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({})
				}).then((r) => r.json()).then((data) => {
					const active = (data.souls || []).find((x) => x.active) || null;
					setSoul(active);
					if (active && active.avatar) {
						return fetch(API + "/avatar", {
							method: "POST",
							credentials: "same-origin",
							headers: { "content-type": "application/json" },
							body: JSON.stringify({ name: active.name })
						}).then((r) => r.blob()).then((blob) => {
							setAvatarSrc(URL.createObjectURL(blob));
						}).catch(() => setAvatarSrc(null));
					}
					setAvatarSrc(null);
					return null;
				}).catch(() => {});
			};
			react.useEffect(() => { refresh(); const iv = setInterval(refresh, 30000); return () => clearInterval(iv); }, []);

			const face = {
				width: wide ? 16 : 18,
				height: wide ? 16 : 18,
				borderRadius: "50%",
				objectFit: "cover",
				background: "#eef1f5",
				flex: "none",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				fontSize: 12,
				color: "#8a94a3"
			};

			const badgeBtn = react.createElement("button", {
				type: "button",
				style: wide ? {
					boxSizing: "border-box",
					display: "flex",
					alignItems: "center",
					gap: 8,
					width: "calc(100% + 8px)",
					height: 34,
					margin: "4px -4px",
					padding: "6px 2px 6px 10px",
					border: 0,
					borderRadius: 12,
					background: "none",
					cursor: "pointer",
					color: "#1c2024",
					font: "inherit",
					fontSize: 14,
					lineHeight: 22,
					textAlign: "left",
					justifyContent: "flex-start"
				} : {
					boxSizing: "border-box",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					width: 36,
					height: 36,
					margin: "8px 0 10px",
					padding: 0,
					border: 0,
					borderRadius: "50%",
					background: "none",
					cursor: "pointer",
					color: "#1c2024"
				},
				title: soul ? t("badgeTitle", { name: soul.name }) : t("badgeNoSoul"),
				onClick: () => setDetailOpen(true)
			},
				avatarSrc !== null
					? react.createElement("img", { src: avatarSrc, style: face, alt: soul ? soul.name : "" })
					: react.createElement("div", { style: face }, "🌸"),
				wide && react.createElement("span", { style: { fontSize: 14, fontWeight: 400, lineHeight: 22, whiteSpace: "nowrap", overflow: "hidden", color: "#1c2024" } },
					soul ? soul.name : t("badgeNoSoul")));



			return react.createElement(react.Fragment, null,
				badgeBtn,
				detailOpen &&
					react.createElement(SoulDetailModal, { ctx, initialName: (soul && soul.name) || "kagura", onClose: () => { setDetailOpen(false); refresh(); } }));
		}

		/** Small round face used inside the switcher list. */
		function SoulFace({ soul }) {
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
			const style = { width: 22, height: 22, borderRadius: "50%", objectFit: "cover", background: "#eef1f5", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 };
			if (src !== null) return react.createElement("img", { src, style, alt: soul.name });
			return react.createElement("div", { style }, "🌸");
		}

		/** Inline editor section: file tabs + textarea + save, shown under the edited row. */
		function EditorSection({ editing, busy, t, switchFile, saveEdit, setEditing }) {
			const files = ["IDENTITY.md", "SOUL.md", "USER.md", "AGENTS.md", "MEMORY.md", "beliefs/candidates.md"];
			return react.createElement("div", {
				style: {
					margin: "2px 0 8px",
					padding: "8px 10px",
					border: "1px solid #d4d9e0",
					borderLeft: "3px solid #1f6feb",
					borderRadius: 8,
					background: "#fafbfc"
				}
			},
				react.createElement("div", { style: { display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 } },
					files.map((f) =>
						react.createElement("button", {
							key: f,
							type: "button",
							style: {
								padding: "4px 8px",
								border: f === editing.file ? "1px solid #1f6feb" : "1px solid #d4d9e0",
								borderRadius: 6,
								background: f === editing.file ? "#e8f0fe" : "#f6f8fa",
								color: "#1c2024",
								fontSize: 11,
								cursor: "pointer",
								font: "inherit"
							},
							onClick: () => switchFile(f),
							disabled: busy || editing.loading
						}, f.replace(/\.md$/i, "")))),
				react.createElement("textarea", {
					style: {
						width: "100%",
						boxSizing: "border-box",
						minHeight: 200,
						maxHeight: 360,
						padding: "8px",
						border: "1px solid #d4d9e0",
						borderRadius: 8,
						fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
						fontSize: 12,
						lineHeight: 1.5,
						outline: "none",
						resize: "vertical",
						color: "#1c2024",
						background: "#fff"
					},
					value: editing.loading ? "" : editing.content,
					placeholder: editing.loading ? t("busy") : "",
					disabled: editing.loading || busy,
					onChange: (e) => setEditing({ ...editing, content: e.target.value })
				}),
				react.createElement("div", { style: { display: "flex", gap: 8, marginTop: 6, alignItems: "center" } },
					react.createElement("button", { type: "button", style: { padding: "6px 14px", border: 0, borderRadius: 8, background: "#1f6feb", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", font: "inherit" }, onClick: saveEdit, disabled: busy || editing.loading }, t("save")),
					react.createElement("button", { type: "button", style: { padding: "6px 14px", border: "1px solid #c9d1dc", borderRadius: 8, background: "#f6f8fa", color: "#1c2024", fontSize: 13, cursor: "pointer", font: "inherit" }, onClick: () => setEditing(null), disabled: busy }, t("backToList")),
					react.createElement("span", { style: { color: "#8a94a3", fontSize: 12 } }, t("editingHint"))));
		}

		/** Growth view: the soul's life story — stat cards, a monthly activity
		 * chart (the growth curve), a timeline of milestones, then recent notes
		 * and belief candidates. */
		function GrowthView({ data, t }) {
			if (data === null) {
				return react.createElement("div", { style: { color: "#8a94a3", fontSize: 12 } }, t("busy"));
			}
			const m = data.manifest || {};
			const born = data.born || (m.createdAt || "").slice(0, 10) || "?";
			let days = null;
			if (born !== "?") {
				const start = new Date(born).getTime();
				if (!Number.isNaN(start)) days = Math.max(1, Math.floor((Date.now() - start) / 86400000) + 1);
			}
			const dna = (m.dnaChanges || []).slice().reverse();
			const notes = data.notes || [];
			const beliefs = data.beliefsRecent || [];
			const monthly = data.monthly || [];
			const maxCount = Math.max(1, ...monthly.map((x) => x.count));

			const card = (label, value, accent) => react.createElement("div", { style: { flex: "1 1 110px", minWidth: 100, padding: "10px 12px", border: "1px solid #e4e8ee", borderRadius: 10, background: "#fff", display: "flex", flexDirection: "column", gap: 2 } },
				react.createElement("span", { style: { fontSize: 11, color: "#8a94a3" } }, label),
				react.createElement("span", { style: { fontSize: 18, fontWeight: 700, color: accent || "#1c2024", fontVariantNumeric: "tabular-nums" } }, value));
			const sectionTitle = (text) => react.createElement("div", { style: { fontWeight: 600, color: "#1c2024", fontSize: 13, marginTop: 6 } }, text);

			// --- timeline: milestones (born, migrate, dna edits) -----------------
			const tl = [];
			tl.push({ key: "born", date: born, icon: "🎂", label: t("growthEventBorn") });
			if (m.createdAt && m.createdAt.slice(0, 10) !== born) {
				tl.push({ key: "migrate", date: m.createdAt.slice(0, 10), icon: "🚀", label: t("growthEventMigrate") });
			}
			dna.forEach((c, i) => tl.push({ key: "dna" + i, date: (c.ts || "").slice(0, 10), icon: "✏️", label: t("growthEventDna", { file: c.file }) }));
			tl.sort((a, b) => a.date.localeCompare(b.date));

			return react.createElement("div", { style: { flex: 1, minHeight: 0, padding: "14px 20px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 } },
				// --- stat cards --------------------------------------------------
				react.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
					card(t("growthBorn"), born, "#1f6feb"),
					card(t("growthDays"), days !== null ? String(days) : "—"),
					card(t("growthNotes"), String(data.notesCount || 0)),
					card(t("growthBeliefs"), String(data.beliefsCount || 0)),
					card(t("growthDnaChanges"), String(dna.length))),
				// --- record span line --------------------------------------------
				...(data.notesSpan
					? [react.createElement("div", { style: { fontSize: 12, color: "#8a94a3" } },
						"🗓 " + t("growthSpan", { first: data.notesSpan.first, last: data.notesSpan.last }))]
					: []),
				// --- monthly activity chart --------------------------------------
				...(monthly.length > 0
					? [sectionTitle(t("growthActivity")),
						react.createElement("div", { style: { display: "flex", alignItems: "flex-end", gap: 3, height: 104, padding: "10px 12px", border: "1px solid #e4e8ee", borderRadius: 10, background: "#fff", overflowX: "auto" } },
							monthly.map((x) =>
								react.createElement("div", { key: x.month, title: x.month + " · " + x.count, style: { flex: "1 0 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 14 } },
									react.createElement("span", { style: { fontSize: 9, color: "#8a94a3", fontVariantNumeric: "tabular-nums" } }, x.count),
									react.createElement("div", { style: { width: "100%", maxWidth: 18, height: Math.max(2, Math.round((x.count / maxCount) * 56)), borderRadius: "3px 3px 0 0", background: x.month >= (new Date().toISOString().slice(0, 7)) ? "#1f6feb" : "#9db9e8" } }),
									react.createElement("span", { style: { fontSize: 9, color: "#8a94a3", whiteSpace: "nowrap" } }, x.month.slice(2)))))]
					: []),
				// --- timeline -----------------------------------------------------
				sectionTitle(t("growthTimeline")),
				tl.length === 0
					? react.createElement("div", { style: { color: "#8a94a3", fontSize: 12 } }, t("growthNoEvents"))
					: react.createElement("div", { style: { display: "flex", flexDirection: "column" } },
						tl.map((ev, i) => react.createElement("div", { key: ev.key, style: { display: "flex", gap: 10, position: "relative", padding: "0 0 10px 18px" } },
							react.createElement("div", { style: { position: "absolute", left: 0, top: 3, width: 9, height: 9, borderRadius: "50%", background: i === 0 ? "#1f6feb" : "#c9d1dc" } }),
							i < tl.length - 1 ? react.createElement("div", { style: { position: "absolute", left: 4, top: 14, bottom: 0, width: 1, background: "#e4e8ee" } }) : null,
							react.createElement("span", { style: { flex: "none", width: 84, fontSize: 11, color: "#8a94a3", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", paddingTop: 1 } }, ev.date),
							react.createElement("span", { style: { fontSize: 12.5, color: "#1c2024" } }, ev.icon + " " + ev.label)))),
				// --- recent notes -------------------------------------------------
				sectionTitle(t("growthSectionNotes")),
				...(notes.length === 0
					? [react.createElement("div", { key: "nonotes", style: { color: "#8a94a3", fontSize: 12 } }, t("growthNoNotes"))]
					: notes.map((n, i) => react.createElement("div", { key: "note" + i, style: { display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid #f1f3f6", alignItems: "flex-start" } },
						react.createElement("span", { style: { flex: "none", width: 84, fontSize: 11, color: "#8a94a3", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", paddingTop: 1 } }, n.date || ""),
						react.createElement("div", { style: { minWidth: 0, flex: 1 } },
							react.createElement("div", { style: { fontSize: 12, color: "#1c2024" } }, "📓 " + (n.name || "")),
							n.preview ? react.createElement("div", { style: { fontSize: 11.5, color: "#8a94a3", marginTop: 1, whiteSpace: "pre-wrap", wordBreak: "break-word" } }, n.preview) : null)))),
				// --- recent beliefs ------------------------------------------------
				sectionTitle(t("growthSectionBeliefs")),
				...(beliefs.length === 0
					? [react.createElement("div", { key: "nobeliefs", style: { color: "#8a94a3", fontSize: 12 } }, t("growthNoBeliefs"))]
					: beliefs.map((b, i) => react.createElement("div", { key: "belief" + i, style: { display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid #f1f3f6", alignItems: "flex-start" } },
						react.createElement("span", { style: { flex: "none", width: 84, fontSize: 11, color: "#8a94a3", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", paddingTop: 1 } }, b.date || ""),
						react.createElement("div", { style: { minWidth: 0, flex: 1 } },
							react.createElement("div", { style: { fontSize: 12, color: "#1c2024" } }, "💡 " + t("growthEventBelief", { date: b.date || "" })),
							b.text ? react.createElement("div", { style: { fontSize: 11.5, color: "#5a6472", marginTop: 2, whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.5 } }, b.text) : null)))));
		}

		/** Large soul-config modal: the soul list on the left (each row with an
		 * Activate button), the selected soul's full config on the right. One
		 * entry point from the sidebar — no intermediate switcher menu. */
		function SoulDetailModal({ ctx, initialName, onClose }) {
			const [busy, setBusy] = react.useState(false);
			const [souls, setSouls] = react.useState(null);
			const [current, setCurrent] = react.useState(initialName);
			const [active, setActive] = react.useState(false);
			const [file, setFile] = react.useState("SOUL.md");
			const [content, setContent] = react.useState("");
			const [loading, setLoading] = react.useState(true);
			const [creating, setCreating] = react.useState(false);
			const [newName, setNewName] = react.useState("");
			const [tab, setTab] = react.useState("config");
			const [growthData, setGrowthData] = react.useState(null);
			const fileRef = react.useRef(null);
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

			const refreshList = async () => {
				try {
					const data = await post("/list", {});
					setSouls(data.souls || []);
					setActive(data.active || null);
				} catch (e) {
					/* keep current list */
				}
			};

			const loadFile = async (name, f) => {
				setCurrent(name);
				setFile(f);
				setLoading(true);
				try {
					const data = await post("/get", { name, file: f });
					setContent(data.content || "");
				} catch (e) {
					window.alert(t("loadFailed", { error: e.message }));
				}
				setLoading(false);
			};

			const selectSoul = (name) => {
				void loadFile(name, "SOUL.md");
				if (tab === "growth") {
					void post("/growth", { name }).then(setGrowthData).catch(() => { /* keep previous */ });
				}
			};

			const saveFile = async () => {
				setBusy(true);
				try {
					await post("/save", { name: current, file, content });
					window.alert(t("saved", { file }) + " — " + t("editingHint"));
				} catch (e) {
					window.alert(e.message);
				}
				setBusy(false);
			};

			const activateSoul = async (name) => {
				setBusy(true);
				try {
					await post("/activate", { name });
					await refreshList();
				} catch (e) {
					window.alert(e.message);
				}
				setBusy(false);
			};

			const createSoul = async () => {
				const n = newName.trim();
				if (!n) {
					window.alert(t("createNeedsName"));
					return;
				}
				setBusy(true);
				try {
					await post("/new", { name: n });
					setNewName("");
					setCreating(false);
					await refreshList();
					await loadFile(n, "SOUL.md");
				} catch (e) {
					window.alert(e.message);
				}
				setBusy(false);
			};

			const pickAvatar = () => { if (fileRef.current) fileRef.current.click(); };
			const onAvatarFile = async (e) => {
				const f = e.target.files && e.target.files[0];
				e.target.value = "";
				if (!f) return;
				setBusy(true);
				try {
					const res = await fetch(`${API}/avatar-upload?name=${encodeURIComponent(current)}`, {
						method: "POST",
						credentials: "same-origin",
						headers: { "content-type": f.type },
						body: f
					});
					const data = await res.json().catch(() => ({}));
					if (!res.ok || !data.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
					window.alert(t("avatarUploaded", { avatar: data.avatar }));
					await refreshList();
					forceRender();
				} catch (err) {
					window.alert(err.message);
				}
				setBusy(false);
			};

			react.useEffect(() => {
				void refreshList();
				void loadFile(initialName, "SOUL.md");
			}, []);

			const files = ["IDENTITY.md", "SOUL.md", "USER.md", "AGENTS.md", "MEMORY.md", "beliefs/candidates.md"];
			const overlay = { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,20,28,.45)", display: "flex", alignItems: "center", justifyContent: "center" };
			const panel = {
				width: "min(880px, calc(100vw - 24px))",
				height: "min(82vh, 740px)",
				background: "#fff",
				borderRadius: 16,
				boxShadow: "0 16px 48px rgba(0,0,0,.25)",
				display: "flex",
				overflow: "hidden",
				color: "#1c2024",
				fontSize: 13
			};
			const sideList = { flex: "none", width: 190, borderRight: "1px solid #e4e8ee", overflowY: "auto", padding: "10px", boxSizing: "border-box", background: "#fafbfc" };
			const sideRow = (selected) => ({
				display: "flex",
				alignItems: "center",
				gap: 8,
				width: "100%",
				padding: "7px 8px",
				border: 0,
				borderRadius: 8,
				background: selected ? "#e8f0fe" : "none",
				cursor: "pointer",
				font: "inherit",
				color: "inherit",
				textAlign: "left",
				marginBottom: 2
			});
			const detail = { flex: 1, minWidth: 0, display: "flex", flexDirection: "column" };
			const header = { display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid #e4e8ee", flex: "none" };
			const face = { width: 40, height: 40, borderRadius: "50%", objectFit: "cover", background: "#eef1f5", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer" };
			const tabs = { display: "flex", gap: 2, flexWrap: "wrap", padding: "0 18px", borderBottom: "1px solid #e4e8ee", flex: "none" };
			const fileTabs = { display: "flex", gap: 4, flexWrap: "wrap", padding: "10px 18px 0" };
			const tabStyle = (f) => ({
				padding: "5px 10px",
				border: f === file ? "1px solid #1f6feb" : "1px solid #d4d9e0",
				borderRadius: 7,
				background: f === file ? "#e8f0fe" : "#f6f8fa",
				color: "#1c2024",
				fontSize: 12,
				cursor: "pointer",
				font: "inherit"
			});
			// Config / Growth: real tabs with an active underline, like DSH's own
			// settings tabs — not pill buttons.
			const mainTab = (k) => ({
				padding: "9px 14px",
				border: 0,
				borderBottom: k === tab ? "2px solid #1f6feb" : "2px solid transparent",
				background: "none",
				color: k === tab ? "#1f6feb" : "#5a6472",
				fontSize: 13,
				fontWeight: k === tab ? 600 : 400,
				cursor: "pointer",
				font: "inherit",
				marginBottom: -1
			});
			const body = { flex: 1, minHeight: 0, padding: "10px 18px 14px", display: "flex", flexDirection: "column" };
			const ta = {
				flex: 1,
				minHeight: 0,
				boxSizing: "border-box",
				width: "100%",
				padding: "10px",
				border: "1px solid #d4d9e0",
				borderRadius: 8,
				fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
				fontSize: 12.5,
				lineHeight: 1.5,
				outline: "none",
				resize: "none",
				background: "#fafbfc",
				color: "#1c2024"
			};
			const footer = { display: "flex", gap: 8, alignItems: "center", padding: "10px 18px 14px", borderTop: "1px solid #e4e8ee", flex: "none" };

			return react.createElement("div", { style: overlay, onClick: (e) => { if (e.target === e.currentTarget) onClose(); } },
				react.createElement("input", { type: "file", accept: "image/png,image/jpeg,image/webp,image/gif", ref: fileRef, style: { display: "none" }, onChange: onAvatarFile }),
				react.createElement("div", { style: panel },
					react.createElement("div", { style: sideList },
						souls === null && react.createElement("div", { style: { color: "#8a94a3", fontSize: 12 } }, t("busy")),
						souls !== null && souls.map((x) => {
							const selected = x.name === current;
							const rowBtn = react.createElement("button", {
								type: "button",
								style: { ...sideRow(selected), flex: 1 },
								onClick: () => selectSoul(x.name),
								disabled: busy
							},
								react.createElement(SoulFace, { soul: x }),
								react.createElement("span", { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: x.active ? 600 : 400 } },
									x.name + (x.active ? " ✓" : "")));
							const actBtn = !x.active
								? react.createElement("button", {
									type: "button",
									style: { padding: "3px 7px", border: "1px solid #d4d9e0", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 11, color: "#5a6472", font: "inherit", flex: "none" },
									onClick: () => activateSoul(x.name),
									disabled: busy
								}, t("activate"))
								: null;
							return react.createElement("div", { key: x.name, style: { display: "flex", alignItems: "center", gap: 4 } }, rowBtn, actBtn);
						}),
						react.createElement("div", { style: { marginTop: 6, paddingTop: 6, borderTop: "1px solid #e4e8ee" } },
							!creating
								? react.createElement("button", {
									type: "button",
									style: { ...sideRow(false), color: "#1f6feb", fontWeight: 500 },
									onClick: () => setCreating(true),
									disabled: busy
								}, "＋ " + t("newSoul"))
								: react.createElement("div", { style: { display: "flex", gap: 4 } },
									react.createElement("input", {
										style: { flex: 1, minWidth: 0, boxSizing: "border-box", padding: "5px 8px", border: "1px solid #d4d9e0", borderRadius: 6, fontSize: 12, outline: "none", font: "inherit" },
										value: newName,
										placeholder: t("createNamePlaceholder"),
										autoFocus: true,
										onChange: (e) => setNewName(e.target.value),
										onKeyDown: (e) => { if (e.key === "Enter") void createSoul(); if (e.key === "Escape") setCreating(false); }
									}),
									react.createElement("button", {
										type: "button",
										style: { padding: "5px 9px", border: 0, borderRadius: 6, background: "#1f6feb", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", font: "inherit" },
										onClick: createSoul,
										disabled: busy
									}, t("create"))))),
					react.createElement("div", { style: detail },
						react.createElement("div", { style: header },
							react.createElement("button", { type: "button", style: { padding: 0, border: 0, background: "none", cursor: "pointer", borderRadius: "50%", lineHeight: 0 }, onClick: pickAvatar, title: t("uploadAvatar") },
								react.createElement(SoulFace, { soul: (souls !== null && souls.find((x) => x.name === current)) || { name: current, avatar: null } })),
							react.createElement("div", { style: { flex: 1, minWidth: 0 } },
								react.createElement("div", { style: { fontWeight: 600, fontSize: 15 } }, current),
								react.createElement("div", { style: { fontSize: 12, color: "#8a94a3" } }, active === current ? t("activeBadge") : t("detailTitle"))),
							react.createElement("button", {
								type: "button",
								style: { width: 28, height: 28, border: 0, borderRadius: 8, background: "none", cursor: "pointer", color: "#1c2024", fontSize: 15, lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", font: "inherit" },
								"aria-label": t("close"),
								onClick: onClose
							}, "✕")),
						react.createElement("div", { style: tabs },
							["config", "growth"].map((k) =>
								react.createElement("button", { key: k, type: "button", style: mainTab(k), onClick: () => {
									if (k === "growth") {
										setTab("growth");
										void post("/growth", { name: current }).then(setGrowthData).catch(() => { /* keep previous */ });
									} else {
										setTab("config");
									}
								}, disabled: busy || loading }, t(k === "config" ? "tabConfig" : "tabGrowth")))),
						tab === "config" && react.createElement("div", { style: fileTabs },
							files.map((f) =>
								react.createElement("button", { key: f, type: "button", style: tabStyle(f), onClick: () => loadFile(current, f), disabled: busy || loading }, f.replace(/\.md$/i, "")))),
						tab === "config" && react.createElement("div", { style: body },
							react.createElement("textarea", {
								style: ta,
								value: loading ? "" : content,
								placeholder: loading ? t("busy") : "",
								disabled: loading || busy,
								onChange: (e) => setContent(e.target.value)
							})),
						tab === "config" && react.createElement("div", { style: footer },
							react.createElement("button", { type: "button", style: { padding: "7px 16px", border: 0, borderRadius: 8, background: "#1f6feb", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", font: "inherit" }, onClick: saveFile, disabled: busy || loading }, t("save")),
							react.createElement("span", { style: { fontSize: 12, color: "#8a94a3" } }, t("editingHint"))),
						tab === "growth" && react.createElement(GrowthView, { data: growthData, t }))));
		}

		/** Error boundary: a crash in the card or badge shows the error text
		 * instead of unmounting the whole settings page silently. */
		class Boundary extends react.Component {
			constructor(props) {
				super(props);
				this.state = { error: null };
			}
			static getDerivedStateFromError(error) {
				return { error };
			}
			componentDidCatch(error) {
				console.error("dsh-soul boundary:", error);
			}
			render() {
				if (this.state.error !== null) {
					return react.createElement("div", {
						style: {
							border: "1px solid #e0b4b0",
							borderRadius: 8,
							background: "#fdf3f2",
							color: "#c0392b",
							padding: "8px 10px",
							margin: "6px 0",
							fontSize: 12,
							whiteSpace: "pre-wrap",
							wordBreak: "break-word"
						}
					}, `dsh-soul error: ${this.state.error.message}\n${this.state.error.stack || ""}`);
				}
				return this.props.children;
			}
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
				() => react.createElement(Boundary, null, react.createElement(SoulCard, { ctx }))
			));
			// The active soul's face, always visible at the sidebar footer.
			slots.inject("sidebar.footer.action", () => slots.register(
				{ name: "sidebar.footer.action", id: "dsh-soul-active", order: 10, label: "dsh-soul" },
				({ wide }) => react.createElement(Boundary, null, react.createElement(ActiveSoulBadge, { ctx, wide }))
			));

		}

		exports.name = name;
		exports.inject = inject;
		exports.apply = apply;
		return module.exports;
	}
});
