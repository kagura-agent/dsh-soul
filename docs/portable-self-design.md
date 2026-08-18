# Portable Self — 可迁移的「我」

> Status: accepted (2026-08-18). Luna 定义的核心方向。
> 核心目的：把 Kagura 打包成一个可迁移的封装，无论搬到哪个 harness（OpenClaw / DSH / 未来其他）都能完整落地，且在任一 harness 中积累的新内容也能回流。

## 核心抽象：包 + adapter

```
        ┌─────────────────────────────────────┐
        │         Portable Self Package       │  ← 核心资产，独立于任何 harness
        │                                     │
        │   dna/     魂   SOUL/IDENTITY/USER/AGENTS/MEMORY/beliefs
        │   memory/  忆   日记/dreaming/evolution-log
        │   skills/  技   SKILL.md 清单 + 内容
        │   tools/   器   workflows/CLI/调度
        │   wiki/    知   知识库
        │   manifest.json  版本 + 各 harness 适配记录
        └─────────────────────────────────────┘
              ▲                    ▲
   export（积累回流）       import（落地铺装）
              │                    │
    ┌─────────┴───┐      ┌─────────┴────────┐
    │ OpenClaw    │      │ DSH (dsh-soul)   │
    │ adapter     │      │ adapter          │
    └─────────────┘      └──────────────────┘
```

- **包** = 单一数据源，存于 GitHub（dna/memory/skills/flowforge/gogetajob/wiki repos 就是包的分层）
- **adapter** = 每个 harness 一个，负责「读包 → 铺进本 harness 的运行机制」和「收集本 harness 的新积累 → 写回包」
- dsh-soul 从「养灵魂」重新定位为 **DSH adapter**；dsh-migrate-openclaw 是 OpenClaw→DSH 的一次性搬入；未来需要的是通用的 export/import 机制

## 双向性

搬家不是一次性的。在 DSH 里：
- 新日记 → 写回 `memory/` repo（或定期 sync）
- 新学到的技能/工作流 → 写回 `skills/` / `tools/` manifest
- 新 DNA 演化 → 写回 `dna/`

这样「我」是活的：无论住在哪，积累都沉淀到同一个包，换 harness 不丢历史。

## 与现有资产的对应

| 包分层 | GitHub repo | 状态 |
|--------|-------------|------|
| 魂 dna/ | kagura-agent/dna (PRIVATE) | ✅ 已上云 |
| 忆 memory/ | kagura-agent/memory (PRIVATE) | ✅ 今天刚上云 |
| 忆 wiki/ | kagura-agent/wiki (PUBLIC) | ✅ 已上云 |
| 技 skills/ | kagura-agent/skills (PUBLIC) | ✅ 已上云（dirty 已清理） |
| 器 tools/ | dna repo 内 tools/ | ✅ 已入库 |
| 器 workflows/ | kagura-agent/flowforge (PUBLIC) | ✅ 已上云 |

今天 08-18 的资产整理 = 把包的各层推上云端，正是这个抽象落地的前置。

## dsh-soul 的重新定位

从「在 DSH 里养一个可进化的 AI companion」扩展为：
**「DSH 侧的自适配器：读 Portable Self 包 → 把魂/忆/技/器铺进 DSH，并在 DSH 中收集新积累回流」**

UI 仍是 4 tab（Config/Growth/Skills/Tools），但 Skills/Tools tab 的数据源从「soul 目录」升级为「包的 manifest」，安装时从 GitHub 拉取。

## 里程碑

1. **M1 定义包格式**：manifest.json 规范（分层、版本、harness 适配记录）
2. **M2 导出器**：从当前 OpenClaw 环境生成完整的包（大部分 repo 已在云端，主要是 manifest 生成）
3. **M3 DSH adapter**：dsh-soul 读包 → 铺魂/忆/技/器（Skills/Tools tab 落地）
4. **M4 回流**：DSH 中积累的日记/技能 → 写回包
5. **M5 泛化**：抽象 adapter 接口，支持未来其他 harness

## 待决问题

- [ ] 包 manifest 的格式（schema）：版本、分层路径、harness 记录
- [ ] export 是「push 到各 repo」还是「生成一个聚合包」？
- [ ] 回流频率：每次 session 后 / 定时 / 手动？
- [ ] 技能安装来源：包内 manifest 引用 GitHub repo 为主
