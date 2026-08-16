# dsh-soul

**在 DSH 里养一个会自进化的 AI 伙伴。** 灵魂是一套活的档案：DNA 文件（`SOUL.md` / `IDENTITY.md` / `USER.md` / `AGENTS.md` / `MEMORY.md`）定义她是谁，进化管线（`beliefs/`）把教训沉淀进 DNA，日记层（`memory/`）记录日常，头像给她一张脸，`manifest.json` 记下她如何成长。

与 [dsh-migrate-openclaw](https://github.com/kagura-agent/dsh-migrate-openclaw) 配套：把 OpenClaw 的人格搬进来，然后在这里养她。

## 灵魂如何生活

```
~/.dsh/souls/<name>/
├── IDENTITY.md        ← 我是谁（名字、气质、emoji）
├── SOUL.md            ← 灵魂：使命、信念、边界、气质
├── USER.md            ← 人类模型
├── AGENTS.md          ← 操作纪律
├── MEMORY.md          ← 精选长期记忆
├── beliefs/
│   └── candidates.md  ← 进化管线：教训 → DNA
├── memory/            ← 日记（按需检索，不注入）
├── avatar.png|jpg|webp|gif  ← 脸
└── manifest.json      ← 成长记录：DNA 变更、激活历史
```

DSH 的指令层每会话只注入一个文件——`~/.dsh/AGENTS.md`。激活一个灵魂会**把它的 DNA 渲染进该文件**（带标记），并且**惰性自动重聚合**：只要 DNA 内容变了（卡片每次访问时做无竞态的内容比对，无需 watcher、无需手动操作），就会重新渲染。通过 API 或 agent 自己修改 DNA 文件，都会自动被接住。

**进化循环：** 日记（`memory/`）→ 教训记入 `beliefs/candidates.md` → 同一条教训重复约 3 次 → 毕业进 DNA（价值观 → `SOUL.md`，纪律 → `AGENTS.md`，持久事实 → `MEMORY.md`）→ 自动重聚合使其生效 → 下一个会话是更好的自己。`manifest.json` 保留完整审计轨迹。

## 安装

```sh
dsh plugin --profile web add /path/to/dsh-soul
```

然后在 `$DSH_HOME/profiles/web/cordis.patch.yml` 追加：

```yaml
- insert:
    - id: soul
      name: 'dsh-soul'
```

配置变更经 HMR 实时生效。

## 使用

1. 打开 dsh Web → 设置 → 插件配置 → **dsh-soul**。
2. **新灵魂** → 输入名字 → 生成骨架（DNA + beliefs + memory）。
3. **激活** → DNA 渲染进 `~/.dsh/AGENTS.md`；新会话自动注入。
4. 用 🖼️ 按钮上传**头像**。
5. 编辑 `~/.dsh/souls/<name>/` 下的 DNA/beliefs 文件（或走 `save` API）——下一次访问卡片时自动重新聚合。

侧边栏底部常驻当前灵魂的圆头像：点击弹出切换面板，一键切换灵魂、"新建灵魂…"跳转设置页。

## 路由（全部 POST）

| 路由 | 请求体 | 用途 |
|------|--------|------|
| `/api/dsh-soul/list` | `{}` | 灵魂列表 + 当前激活（触发惰性重聚合）|
| `/api/dsh-soul/new` | `{name}` | 创建骨架灵魂 |
| `/api/dsh-soul/activate` | `{name}` | 渲染 DNA → `~/.dsh/AGENTS.md` |
| `/api/dsh-soul/save` | `{name, file, content}` | 写 DNA/beliefs 文件（记录进 manifest）|
| `/api/dsh-soul/delete` | `{name}` | 删除非激活灵魂 |
| `/api/dsh-soul/sync` | `{}` | 惰性重聚合当前灵魂 |
| `/api/dsh-soul/avatar` | `{name}` | 取头像图片字节 |
| `/api/dsh-soul/avatar-upload` | 原始图片 + `?name=` | 保存头像 |

## 开发

```sh
node --check src/index.js && node --check src/client.js
node .selftest-client.mjs  # client 静态检查（i18n key、内部引用完整性）
node .selftest-e2e.mjs    # 23 项路由级集成测试（假 HOME）
```

## License

[MIT](LICENSE) © 2026 kagura-agent
