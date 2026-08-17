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
			// --- growth: raising-sim layer (docs/growth-design.md) ---
			level: "Lv.{n}",
			levelMax: "满级",
			xpToNext: "距 Lv.{n} 还差 {xp} 经验",
			xpTotal: "累计经验 {total}",
			xpRule: "日记 +10 · 信念 +20 · DNA 修改 +50 · 毕业 +100",
			statTitle: "属性",
			statTogether: "陪伴",
			statRecord: "记录",
			statReflect: "反思",
			statEvolve: "进化",
			statFocus: "专注",
			statBelief: "信念",
			streakLine: "连续记录 {current} 天 · 最长 {max} 天",
			curveTitle: "成长曲线",
			curveNote: "日记经验累计",
			msTitle: "里程碑",
			msDone: "已解锁 {n}",
			msLocked: "未解锁",
			msNameBorn: "出生",
			msNameMet: "与你相遇",
			msNameFirstNote: "第一篇日记",
			msNameFirstBelief: "第一条信念",
			msNameFirstEvolve: "第一次进化",
			msNameWeek: "坚持一周",
			msNameMonth: "满月",
			msNameGrad: "信念毕业",
			msNameEvolve3: "三次进化",
			msNameNotes100: "百篇记录",
			msNameBeliefs100: "百条信念",
			msNameAnniv: "周年",
			msCondBorn: "最早记录的日期",
			msCondMet: "激活或迁移到 DSH",
			msCondFirstNote: "写下第 1 篇日记",
			msCondFirstBelief: "记录第 1 条候选教训",
			msCondFirstEvolve: "第 1 次修改 DNA",
			msCondWeek: "连续 7 天写日记",
			msCondMonth: "陪伴满 30 天",
			msCondGrad: "第 1 条信念毕业",
			msCondEvolve3: "累计 3 次 DNA 修改",
			msCondNotes100: "写满 100 篇日记",
			msCondBeliefs100: "积累 100 条候选教训",
			msCondAnniv: "陪伴满 365 天",
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
			// --- growth: raising-sim layer (docs/growth-design.md) ---
			level: "Lv.{n}",
			levelMax: "Maxed",
			xpToNext: "{xp} XP to Lv.{n}",
			xpTotal: "{total} total XP",
			xpRule: "note +10 · belief +20 · DNA edit +50 · graduation +100",
			statTitle: "Stats",
			statTogether: "Together",
			statRecord: "Record",
			statReflect: "Reflect",
			statEvolve: "Evolve",
			statFocus: "Focus",
			statBelief: "Belief",
			streakLine: "{current}-day streak · best {max}",
			curveTitle: "Growth curve",
			curveNote: "cumulative note XP",
			msTitle: "Milestones",
			msDone: "{n} unlocked",
			msLocked: "locked",
			msNameBorn: "Born",
			msNameMet: "Met you",
			msNameFirstNote: "First note",
			msNameFirstBelief: "First belief",
			msNameFirstEvolve: "First evolve",
			msNameWeek: "One week",
			msNameMonth: "First month",
			msNameGrad: "Belief graduated",
			msNameEvolve3: "Evolved ×3",
			msNameNotes100: "100 notes",
			msNameBeliefs100: "100 beliefs",
			msNameAnniv: "Anniversary",
			msCondBorn: "date of the earliest record",
			msCondMet: "activated or migrated to DSH",
			msCondFirstNote: "write the 1st daily note",
			msCondFirstBelief: "log the 1st belief candidate",
			msCondFirstEvolve: "make the 1st DNA edit",
			msCondWeek: "7 consecutive days with notes",
			msCondMonth: "30 days together",
			msCondGrad: "1st belief graduates",
			msCondEvolve3: "3 DNA edits total",
			msCondNotes100: "100 daily notes",
			msCondBeliefs100: "100 belief candidates",
			msCondAnniv: "365 days together",
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
			return react.createElement("div", { style: styles.avatar }, (soul.name || "?").charAt(0).toUpperCase());
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
					: react.createElement("div", { style: face }, (soul ? soul.name : "?").charAt(0).toUpperCase()),
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
			return react.createElement("div", { style }, (soul.name || "?").charAt(0).toUpperCase());
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

		/** Minimal inline SVG icon system — Lucide-style linear icons, hand-drawn
		 * paths, zero dependencies (the client bundle has no build step). */
		function ico(parts, size, color, sw) {
			return react.createElement("svg", {
				viewBox: "0 0 24 24",
				width: size || 16,
				height: size || 16,
				fill: "none",
				stroke: color || "currentColor",
				strokeWidth: sw || 1.8,
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": true
			}, parts);
		}
		function ip(d) { return react.createElement("path", { d }); }
		function ir(x, y, w, h, rx) { return react.createElement("rect", { x, y, width: w, height: h, rx }); }
		function ic(cx, cy, r) { return react.createElement("circle", { cx, cy, r }); }
		function il(x1, y1, x2, y2) { return react.createElement("line", { x1, y1, x2, y2 }); }
		function ipoly(points) { return react.createElement("polygon", { points }); }

		const ICON = {
			sparkles: (s, c) => ico([ip("m12 3 1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3z")], s, c),
			heart: (s, c) => ico([ip("M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z")], s, c),
			book: (s, c) => ico([ip("M4 19.5A2.5 2.5 0 0 1 6.5 17H20"), ip("M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z")], s, c),
			lightbulb: (s, c) => ico([ip("M9 18h6"), ip("M10 22h4"), ip("M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14")], s, c),
			pen: (s, c) => ico([ip("M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z")], s, c),
			flame: (s, c) => ico([ip("M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z")], s, c),
			sprout: (s, c) => ico([ip("M7 20h10"), ip("M10 20c5.5-2.5.8-6.4 3-10"), ip("M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"), ip("M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z")], s, c),
			star: (s, c) => ico([ip("m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z")], s, c),
			zap: (s, c) => ico([ip("M13 2 3 14h9l-1 8 10-12h-9l1-8z")], s, c),
			library: (s, c) => ico([ip("m16 6 4 14"), ip("M12 6v14"), ip("M8 8v12"), ip("M4 4v16")], s, c),
			gem: (s, c) => ico([ip("M6 3h12l4 6-10 13L2 9Z"), ip("M11 3 8 9l4 13 4-13-3-6"), ip("M2 9h20")], s, c),
			cake: (s, c) => ico([ip("M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"), ip("M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"), ip("M2 21h20"), ip("M7 8v3"), ip("M12 8v3"), ip("M17 8v3"), ip("M7 4h.01"), ip("M12 4h.01"), ip("M17 4h.01")], s, c),
			lock: (s, c) => ico([ir(3, 11, 18, 11, 2), ip("M7 11V7a5 5 0 0 1 10 0v4")], s, c),
			calendar: (s, c) => ico([ir(3, 4, 18, 18, 2), il(16, 2, 16, 6), il(8, 2, 8, 6), il(3, 10, 21, 10)], s, c),
			clock: (s, c) => ico([ic(12, 12, 10), ip("M12 6v6l4 2")], s, c),
			bookOpen: (s, c) => ico([ip("M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"), ip("M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z")], s, c),
			logIn: (s, c) => ico([ip("M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"), ip("m10 17 5-5-5-5"), ip("M15 12H3")], s, c),
			notebook: (s, c) => ico([ip("M2 6h4"), ip("M2 10h4"), ip("M2 14h4"), ip("M2 18h4"), ir(4, 2, 16, 20, 2), ip("M16 2a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2")], s, c),
		};
		/** Milestone key → icon factory (replaces emoji in the wall). */
		const MS_ICON = {
			born: ICON.sparkles,
			met: ICON.heart,
			firstNote: ICON.book,
			firstBelief: ICON.lightbulb,
			firstEvolve: ICON.pen,
			week: ICON.flame,
			month: ICON.sprout,
			grad: ICON.star,
			evolve3: ICON.zap,
			notes100: ICON.library,
			beliefs100: ICON.gem,
			anniv: ICON.cake,
		};

		/** i18n keys for milestone name / condition (milestone key → "msName*"). */
		function msNameKey(k) { return "msName" + k.charAt(0).toUpperCase() + k.slice(1); }
		function msCondKey(k) { return "msCond" + k.charAt(0).toUpperCase() + k.slice(1); }

		/** Growth view: the soul's life story — soul card with level + XP bar,
		 * a six-dimension stat radar, the cumulative growth curve, a milestone
		 * wall (unlocked + ghost cards), then timeline, recent notes and belief
		 * candidates. Raising-sim feel, all numbers from real events. */
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
			const g = data.growth || {};
			const lv = g.level || { level: 1, into: 0, need: 100 };
			const xp = g.xp || { total: 0 };
			const stats = g.stats || {};
			const streak = g.streak || { current: 0, max: 0 };
			const milestones = g.milestones || [];
			const cumulative = g.cumulative || [];
			const dna = (m.dnaChanges || []).slice().reverse();
			const notes = data.notes || [];
			const beliefs = data.beliefsRecent || [];

			// avatar bytes → object URL (GrowthView owns its fetch lifecycle)
			const [avatarUrl, setAvatarUrl] = react.useState(null);
			react.useEffect(() => {
				let cancelled = false;
				if (!data.avatar) { setAvatarUrl(null); return undefined; }
				fetch(API + "/avatar", {
					method: "POST", credentials: "same-origin",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ name: data.name })
				}).then((res) => (res.ok ? res.blob() : null))
					.then((blob) => { if (!cancelled && blob) setAvatarUrl(URL.createObjectURL(blob)); })
					.catch(() => { /* keep placeholder */ });
				return () => { cancelled = true; };
			}, [data.avatar, data.name]);

			const sectionTitle = (text) => react.createElement("div", { style: { fontWeight: 600, color: "#1c2024", fontSize: 13, marginTop: 6 } }, text);

			// --- ① soul card: avatar, name, Lv badge, XP bar, summary -----------
			const lvPct = lv.maxed ? 100 : Math.round((lv.into / Math.max(1, lv.need)) * 100);
			const avatarEl = avatarUrl
				? react.createElement("img", { src: avatarUrl, alt: data.name, style: { width: 46, height: 46, borderRadius: "50%", objectFit: "cover", flex: "none", background: "#eef1f5", boxShadow: "0 0 0 2px #fff, 0 0 0 4px #dbe7fb" } })
				: react.createElement("div", { style: { width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg,#dbe7fb,#f0f4f9)", color: "#1f6feb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, flex: "none" } }, (data.name || "?").charAt(0).toUpperCase());
			const statChip = (icon, text) => react.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 5, color: "#5a6472", fontSize: 11.5, whiteSpace: "nowrap" } }, icon, text);
			const xpText = lv.maxed ? t("levelMax") : t("xpToNext", { n: lv.level + 1, xp: lv.need - lv.into });
			const soulCard = react.createElement("div", { style: { display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", border: "1px solid #e4e8ee", borderRadius: 14, background: "linear-gradient(135deg,#f7faff 0%,#ffffff 55%)", boxShadow: "0 1px 2px rgba(16,24,40,.05)" } },
				avatarEl,
				react.createElement("div", { style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 } },
					react.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
						react.createElement("span", { style: { fontSize: 15, fontWeight: 700, color: "#1c2024", letterSpacing: "-.01em" } }, data.name),
						react.createElement("span", { style: { fontSize: 11, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#1f6feb,#3d8bfd)", borderRadius: 9, padding: "2px 9px", boxShadow: "0 1px 3px rgba(31,111,235,.35)", fontVariantNumeric: "tabular-nums", letterSpacing: ".02em" } }, t("level", { n: lv.level }))),
					react.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
						react.createElement("div", { style: { flex: 1, height: 10, borderRadius: 5, background: "#e8eef5", overflow: "hidden" } },
							react.createElement("div", { style: { width: lvPct + "%", height: "100%", borderRadius: 5, background: "linear-gradient(90deg,#1f6feb 0%,#58a6ff 100%)", position: "relative" } },
								lvPct > 0 ? react.createElement("div", { style: { position: "absolute", right: 2, top: 2, bottom: 2, width: 3, borderRadius: 2, background: "rgba(255,255,255,.7)" } }) : null)),
						react.createElement("span", { style: { fontSize: 11, color: "#5a6472", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" } }, xpText)),
					react.createElement("div", { style: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 } },
						statChip(ICON.calendar(13), born),
						statChip(ICON.clock(13), t("growthDays") + " " + (days !== null ? String(days) : "—")),
						statChip(ICON.book(13), t("growthNotes") + " " + String(data.notesCount || 0)),
						statChip(ICON.star(13, "#d97706"), t("xpTotal", { total: xp.total }))),
					...(streak.max > 0
						? [react.createElement("div", { style: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#c2410c", background: "#fff4ed", border: "1px solid #fed7aa", borderRadius: 999, padding: "2px 9px", alignSelf: "flex-start", fontWeight: 600 } },
							ICON.flame(13, "#ea580c"),
							t("streakLine", { current: streak.current, max: streak.max }))]
						: [])));

			// --- ② stat radar (Pokémon summary page language) -------------------
			const dims = [
				{ key: "together", label: t("statTogether") },
				{ key: "record", label: t("statRecord") },
				{ key: "reflect", label: t("statReflect") },
				{ key: "evolve", label: t("statEvolve") },
				{ key: "focus", label: t("statFocus") },
				{ key: "belief", label: t("statBelief") },
			];
			const RADAR_W = 232;
			const RADAR_H = 208;
			const RCX = 116;
			const RCY = 96;
			const RR = 66;
			const rpt = (i, v) => {
				const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
				const rr = (Math.max(0, Math.min(100, v)) / 100) * RR;
				return [RCX + rr * Math.cos(a), RCY + rr * Math.sin(a)];
			};
			const rpoly = (scale) => dims.map((_, i) => rpt(i, scale).map(Math.round).join(",")).join(" ");
			const radar = react.createElement("svg", { viewBox: "0 0 " + RADAR_W + " " + RADAR_H, style: { width: "100%", maxWidth: 268 } },
				react.createElement("defs", null,
					react.createElement("radialGradient", { id: "radarFill", cx: "50%", cy: "50%", r: "65%" },
						react.createElement("stop", { offset: "0%", stopColor: "#1f6feb", stopOpacity: 0.24 }),
						react.createElement("stop", { offset: "100%", stopColor: "#1f6feb", stopOpacity: 0.04 }))),
				[33, 66, 100].map((s) => react.createElement("polygon", { key: "g" + s, points: rpoly(s), fill: "none", stroke: "#e8edf3", strokeWidth: 1 })),
				dims.map((_, i) => react.createElement("line", { key: "a" + i, x1: RCX, y1: RCY, x2: rpt(i, 100)[0], y2: rpt(i, 100)[1], stroke: "#eef1f5", strokeWidth: 1 })),
				react.createElement("polygon", { points: dims.map((d, i) => rpt(i, stats[d.key] || 0).map(Math.round).join(",")).join(" "), fill: "url(#radarFill)", stroke: "#1f6feb", strokeWidth: 1.8, strokeLinejoin: "round" }),
				dims.map((d, i) => {
					const vx = rpt(i, stats[d.key] || 0)[0];
					const vy = rpt(i, stats[d.key] || 0)[1];
					return react.createElement("circle", { key: "v" + i, cx: vx, cy: vy, r: 2.6, fill: "#fff", stroke: "#1f6feb", strokeWidth: 1.8 });
				}),
				dims.map((d, i) => {
					const nx = rpt(i, 118)[0];
					const ny = rpt(i, 118)[1];
					return react.createElement("text", { key: "l" + i, x: nx, y: ny, textAnchor: "middle", dominantBaseline: "middle", fontSize: 10.5, fill: "#5a6472", fontWeight: 500 }, d.label);
				}));

			// --- ③ growth curve: cumulative XP with milestone ★ -----------------
			let curve = null;
			if (cumulative.length > 0) {
				const W = 560;
				const H = 130;
				const PL = 38;
				const PR = 14;
				const PT = 16;
				const PB = 22;
				const n = cumulative.length;
				const maxXp = Math.max(1, ...cumulative.map((c) => c.xp));
				const xs = cumulative.map((_, i) => PL + (i * (W - PL - PR)) / Math.max(1, n - 1));
				const ys = cumulative.map((c) => H - PB - (c.xp / maxXp) * (H - PT - PB));
				const line = cumulative.map((c, i) => xs[i] + "," + ys[i]).join(" ");
				const area = line + " " + xs[n - 1] + "," + (H - PB) + " " + xs[0] + "," + (H - PB);
				const endX = xs[n - 1];
				const endY = ys[n - 1];
				const marks = milestones.filter((ms) => ms.achieved && ms.date).map((ms) => {
					const idx = cumulative.findIndex((c) => c.month === ms.date.slice(0, 7));
					if (idx < 0) return null;
					return react.createElement("g", { key: "st" + ms.key },
						react.createElement("line", { x1: xs[idx], y1: ys[idx] - 14, x2: xs[idx], y2: ys[idx] + 2, stroke: "#f6c344", strokeWidth: 1.5, strokeDasharray: "2 2" }),
						react.createElement("circle", { cx: xs[idx], cy: ys[idx], r: 3, fill: "#f6c344", stroke: "#fff", strokeWidth: 1.5 }));
				}).filter(Boolean);
				const ticks = [0, Math.round(maxXp / 2), maxXp].map((v, i) => {
					const y = H - PB - (v / maxXp) * (H - PT - PB);
					return react.createElement("text", { key: "tk" + i, x: PL - 6, y: y + 3, textAnchor: "end", fontSize: 9, fill: "#9aa3b0", fontVariantNumeric: "tabular-nums" }, String(v));
				});
				const gridLines = [0.5].map((f) => {
					const y = H - PB - f * (H - PT - PB);
					return react.createElement("line", { key: "gl", x1: PL, y1: y, x2: W - PR, y2: y, stroke: "#f1f3f6", strokeWidth: 1, strokeDasharray: "3 3" });
				});
				curve = react.createElement("svg", { viewBox: "0 0 " + W + " " + H, style: { width: "100%", maxWidth: 560 } },
					ticks,
					gridLines,
					react.createElement("defs", null,
						react.createElement("linearGradient", { id: "curveFill", x1: "0", y1: "0", x2: "0", y2: "1" },
							react.createElement("stop", { offset: "0%", stopColor: "#1f6feb", stopOpacity: 0.16 }),
							react.createElement("stop", { offset: "100%", stopColor: "#1f6feb", stopOpacity: 0.02 }))),
					react.createElement("polygon", { points: area, fill: "url(#curveFill)" }),
					react.createElement("polyline", { points: line, fill: "none", stroke: "#1f6feb", strokeWidth: 2.2, strokeLinejoin: "round", strokeLinecap: "round" }),
					...marks,
					react.createElement("circle", { cx: endX, cy: endY, r: 4, fill: "#1f6feb", stroke: "#fff", strokeWidth: 2 }),
					react.createElement("text", { x: xs[0], y: H - 6, fontSize: 9, fill: "#9aa3b0" }, cumulative[0].month),
					n > 1 ? react.createElement("text", { x: xs[n - 1], y: H - 6, textAnchor: "end", fontSize: 9, fill: "#9aa3b0" }, cumulative[n - 1].month) : null);
			}

			// --- ④ milestone wall: unlocked cards + ghost cards -----------------
			const wall = react.createElement("div", { style: { display: "flex", gap: 10, flexWrap: "wrap" } },
				milestones.map((ms) => {
					const name = t(msNameKey(ms.key));
					const cond = t(msCondKey(ms.key));
					const mkIcon = MS_ICON[ms.key] || ICON.sparkles;
					if (ms.achieved) {
						return react.createElement("div", { key: ms.key, title: cond, style: { flex: "0 0 132px", padding: "10px 12px 9px", border: "1px solid #e8edf3", borderRadius: 12, background: "#fff", display: "flex", flexDirection: "column", gap: 6, boxShadow: "0 1px 2px rgba(16,24,40,.04)" } },
							react.createElement("div", { style: { width: 34, height: 34, borderRadius: 9, background: "#eef4ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#1f6feb" } }, mkIcon(17)),
							react.createElement("div", { style: { fontSize: 12.5, fontWeight: 600, color: "#1c2024", lineHeight: 1.25 } }, name),
							ms.date ? react.createElement("div", { style: { fontSize: 10.5, color: "#8a94a3", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontVariantNumeric: "tabular-nums" } }, ms.date) : null);
					}
					return react.createElement("div", { key: ms.key, title: cond, style: { flex: "0 0 132px", padding: "10px 12px 9px", border: "1px dashed #d8dee6", borderRadius: 12, background: "#fafbfc", display: "flex", flexDirection: "column", gap: 6, color: "#9aa3b0" } },
						react.createElement("div", { style: { position: "relative", width: 34, height: 34, borderRadius: 9, background: "#f0f2f5", display: "flex", alignItems: "center", justifyContent: "center", color: "#a8b0bc" } },
							mkIcon(17),
							react.createElement("div", { style: { position: "absolute", right: -3, bottom: -3, width: 15, height: 15, borderRadius: 8, background: "#fff", border: "1px solid #d8dee6", display: "flex", alignItems: "center", justifyContent: "center", color: "#9aa3b0" } }, ICON.lock(9))),
						react.createElement("div", { style: { fontSize: 12.5, fontWeight: 600, lineHeight: 1.25 } }, name),
						react.createElement("div", { style: { fontSize: 10.5, lineHeight: 1.4 } }, cond));
				}));

			// --- timeline: milestones (born, migrate, dna edits) -----------------
			const tl = [];
			tl.push({ key: "born", date: born, icon: ICON.sparkles(13, "#1f6feb"), label: t("growthEventBorn") });
			if (m.createdAt && m.createdAt.slice(0, 10) !== born) {
				tl.push({ key: "migrate", date: m.createdAt.slice(0, 10), icon: ICON.logIn(13, "#5a6472"), label: t("growthEventMigrate") });
			}
			dna.forEach((c, i) => tl.push({ key: "dna" + i, date: (c.ts || "").slice(0, 10), icon: ICON.pen(13, "#5a6472"), label: t("growthEventDna", { file: c.file }) }));
			tl.sort((a, b) => a.date.localeCompare(b.date));

			return react.createElement("div", { style: { flex: 1, minHeight: 0, padding: "14px 20px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 } },
				// --- ① soul card ------------------------------------------------
				soulCard,
				// --- ② stat radar ------------------------------------------------
				react.createElement("div", { style: { border: "1px solid #e4e8ee", borderRadius: 10, background: "#fff", padding: "10px 12px" } },
					react.createElement("div", { style: { fontWeight: 600, color: "#1c2024", fontSize: 13 } }, t("statTitle")),
					react.createElement("div", { style: { display: "flex", justifyContent: "center", padding: "4px 0 0" } }, radar)),
				// --- ③ growth curve ----------------------------------------------
				...(curve
					? [sectionTitle(t("curveTitle")),
						react.createElement("div", { style: { border: "1px solid #e8edf3", borderRadius: 12, background: "#fff", padding: "10px 12px", boxShadow: "0 1px 2px rgba(16,24,40,.04)" } },
							curve,
							react.createElement("div", { style: { display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: "#9aa3b0", marginTop: 2 } }, ICON.bookOpen(12), t("curveNote")))]
					: []),
				// --- ④ milestone wall --------------------------------------------
				sectionTitle(t("msTitle") + " · " + t("msDone", { n: milestones.filter((x) => x.achieved).length })),
				wall,
				// --- record span line --------------------------------------------
				...(data.notesSpan
					? [react.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#8a94a3" } },
						ICON.calendar(13),
						t("growthSpan", { first: data.notesSpan.first, last: data.notesSpan.last }))]
					: []),
				// --- timeline -----------------------------------------------------
				sectionTitle(t("growthTimeline")),
				tl.length === 0
					? react.createElement("div", { style: { color: "#8a94a3", fontSize: 12 } }, t("growthNoEvents"))
					: react.createElement("div", { style: { display: "flex", flexDirection: "column" } },
						tl.map((ev, i) => react.createElement("div", { key: ev.key, style: { display: "flex", gap: 10, position: "relative", padding: "0 0 10px 18px" } },
							react.createElement("div", { style: { position: "absolute", left: 0, top: 4, width: 9, height: 9, borderRadius: "50%", background: i === 0 ? "#1f6feb" : "#c9d1dc", boxShadow: i === 0 ? "0 0 0 3px rgba(31,111,235,.15)" : "none" } }),
							i < tl.length - 1 ? react.createElement("div", { style: { position: "absolute", left: 4, top: 16, bottom: 0, width: 1, background: "#e8edf3" } }) : null,
							react.createElement("span", { style: { flex: "none", width: 84, fontSize: 11, color: "#8a94a3", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", paddingTop: 2, fontVariantNumeric: "tabular-nums" } }, ev.date),
							react.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "#1c2024", paddingTop: 1 } }, ev.icon, react.createElement("span", null, ev.label)))),
				// --- recent notes -------------------------------------------------
				sectionTitle(t("growthSectionNotes")),
				...(notes.length === 0
					? [react.createElement("div", { key: "nonotes", style: { color: "#8a94a3", fontSize: 12 } }, t("growthNoNotes"))]
					: notes.map((n, i) => react.createElement("div", { key: "note" + i, style: { display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid #f1f3f6", alignItems: "flex-start" } },
						react.createElement("span", { style: { flex: "none", width: 84, fontSize: 11, color: "#8a94a3", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", paddingTop: 2, fontVariantNumeric: "tabular-nums" } }, n.date || ""),
						react.createElement("div", { style: { minWidth: 0, flex: 1 } },
							react.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#1c2024" } }, ICON.book(13, "#1f6feb"), react.createElement("span", null, n.name || "")),
							n.preview ? react.createElement("div", { style: { fontSize: 11.5, color: "#8a94a3", marginTop: 2, whiteSpace: "pre-wrap", wordBreak: "break-word" } }, n.preview) : null)))),
				// --- recent beliefs ------------------------------------------------
				sectionTitle(t("growthSectionBeliefs")),
				...(beliefs.length === 0
					? [react.createElement("div", { key: "nobeliefs", style: { color: "#8a94a3", fontSize: 12 } }, t("growthNoBeliefs"))]
					: beliefs.map((b, i) => react.createElement("div", { key: "belief" + i, style: { display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid #f1f3f6", alignItems: "flex-start" } },
						react.createElement("span", { style: { flex: "none", width: 84, fontSize: 11, color: "#8a94a3", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", paddingTop: 2, fontVariantNumeric: "tabular-nums" } }, b.date || ""),
						react.createElement("div", { style: { minWidth: 0, flex: 1 } },
							react.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#1c2024" } }, ICON.lightbulb(13, "#d97706"), react.createElement("span", null, t("growthEventBelief", { date: b.date || "" }))),
							b.text ? react.createElement("div", { style: { fontSize: 11.5, color: "#5a6472", marginTop: 2, whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.5 } }, b.text) : null))))));
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
