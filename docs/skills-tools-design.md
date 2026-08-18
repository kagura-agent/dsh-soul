# From Soul to Full Self — 从「养灵魂」到「搬整个我」

> Status: draft (2026-08-18). Companion to growth-design.md.
> 触发点：Luna「把你带去 DSH 没办法完整地用起来」——dsh-soul 只承载了魂层，技/器层缺失。

## 问题

一个完整的 AI companion 有四层：

```
魂 DNA    → 我是谁          → dsh-soul ✅ 已实现（Config tab + 全局注入）
忆 memory → 我知道什么      → dsh-migrate-openclaw ✅ 已实现（日记/会话导入）
技 skills → 我会什么        → ❌ 缺失（16 个 skill 无法带入 DSH）
器 tools  → 我怎么做事的    → ❌ 缺失（flowforge 10 workflows、gogetajob CLI、cron 调度）
```

迁移到 DSH 后只有人格和记忆，没有手艺和工作方式——「65% 的我」。

## 可移植性光谱（skill/tool 分类）

扫描 16 个 skill 的 OpenClaw API 绑定程度，分三档：

| 档位 | 特征 | 示例 | 迁移策略 |
|------|------|------|----------|
| 🟢 纯 CLI | 只依赖 gh/git/npm/HTTP API | gogetajob、flowforge、team-lead、teams-*、tushare-finance、moltbook | 指令层适配 + CLI 重装，零成本 |
| 🟡 半绑定 | 少量 OpenClaw 引用，主体是流程 | kagura-storyteller、self-portrait、pulse-todo | 剥离 OpenClaw 部分，保留通用流程 |
| 🔴 深度绑定 | 大量 message(action)/channel API | discord-ops、agent-memes、kagura-canvas、memos-memory-guide | 等待 DSH 对应 API，或降级为知识 |

**洞察**：skill 的可移植性不取决于 skill 本身，取决于它依赖的是 OpenClaw API 还是通用 CLI。

## UI 设计：从 2 tab 到 4 tab

沿用 raising-sim 隐喻（growth-design.md 的「raising a soul, not a dashboard」）：

```
魂 DNA     → 角色基础     → Config tab ✅
忆 memory  → 经验成长     → Growth tab ✅
技 skills  → 技能树（新） → Skills tab
器 tools   → 装备栏（新） → Tools tab
```

### ③ Skills tab（技能树）

- 列出 soul 拥有的技能（manifest 里的 SKILL.md 清单）
- 状态徽标：🟢 可用 / 🟡 需适配 / 🔴 未接入
- 点击技能 → 内联查看 SKILL.md 内容（复用现有 EditorSection 模式）
- 「安装技能」入口：从 GitHub skill repo 拉取 → 落盘到 soul 目录

### ④ Tools tab（装备栏）

- 展示工具/工作流：flowforge workflows、CLI 工具、dsh 系列插件
- 每项显示接入状态：已装 / 未装 / 依赖缺失
- 与 Skills 的区分：Skill = 指令知识，Tool = 可执行程序

## 数据模型

soul 目录从：

```
~/.dsh/souls/<name>/
├── IDENTITY.md SOUL.md USER.md AGENTS.md MEMORY.md   ← DNA
├── beliefs/candidates.md                              ← 进化管线
├── memory/                                            ← 日记
└── avatar.png                                         ← 脸
```

扩展为：

```
~/.dsh/souls/<name>/
├── skills/                    ← 技能层（新增）
│   ├── manifest.json          ← 技能清单：id / repo / 版本 / 档位
│   └── <skill-id>/SKILL.md    ← 落盘的技能（引用自 kagura-agent/skills）
├── tools/                     ← 器层（新增）
│   ├── manifest.json          ← 工具清单：id / 类型 / 安装方式
│   └── ...
```

**关键决策：复制 vs 引用**

| 方案 | 优点 | 缺点 |
|------|------|------|
| 复制进 soul 目录 | 自包含、离线可用 | 技能更新要逐 soul 同步 |
| manifest 引用 + 按需拉取 | soul 轻、技能可更新、跨机器可恢复 | 需要网络、安装步骤 |

**倾向：manifest 引用为主**——技能本体在 `kagura-agent/skills` repo 有单一数据源，soul 只记录「拥有哪些」，安装时拉取落盘。

## 里程碑

1. **M1 PoC**：gogetajob（光谱最绿）走通「manifest → 拉取 → 落盘 → 显示为可用技能」全链路
2. **M2 黄区**：剥离 kagura-storyteller / self-portrait / pulse-todo 的 OpenClaw 部分，验证半绑定 skill 的适配模式
3. **M3 红区**：等 DSH API 成熟，或把 discord-ops 等降级为「知识卡片」

## 待决问题

- [ ] Skills tab 的技能状态检测：如何判断「可用」？（CLI 存在性探测：`which gogetajob`）
- [ ] 技能安装来源：只支持 GitHub repo，还是也支持本地目录？
- [ ] Tools tab 是否包含 cron 调度概念？（DSH 无 cron 对应物，可能要标「外部依赖」）
- [ ] manifest 版本冲突：技能更新后 soul 怎么升级？
