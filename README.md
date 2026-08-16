# dsh-soul

**Raise an evolving AI companion inside DSH.** A soul is a living persona: DNA files (`SOUL.md` / `IDENTITY.md` / `USER.md` / `AGENTS.md` / `MEMORY.md`) that define who she is, an evolution pipeline (`beliefs/`) where lessons graduate into DNA, a daily-note layer (`memory/`), an avatar — and a manifest recording how she grew.

Companion to [dsh-migrate-openclaw](https://github.com/kagura-agent/dsh-migrate-openclaw): migrate an OpenClaw persona in, then raise her here.

## How a soul lives

```
~/.dsh/souls/<name>/
├── IDENTITY.md        ← who am I (name, vibe, emoji)
├── SOUL.md            ← the soul: mission, truths, boundaries, vibe
├── USER.md            ← the human model
├── AGENTS.md          ← operating discipline
├── MEMORY.md          ← curated long-term memory
├── beliefs/
│   └── candidates.md  ← evolution pipeline: lessons → DNA
├── memory/            ← daily notes (retrieved on demand, not injected)
├── avatar.png|jpg|webp|gif  ← the face
└── manifest.json      ← growth record: DNA changes, activations
```

DSH's instruction layer injects one file per session — `~/.dsh/AGENTS.md`. Activating a soul **renders its DNA into that file** (with a marker), and a **lazy re-aggregation** re-renders it whenever the DNA content changes (checked on every card visit, race-free content comparison — no watcher, no manual step). Editing a DNA file — through the API or by the agent itself — is picked up automatically.

**The evolution loop:** daily notes (`memory/`) → lessons recorded in `beliefs/candidates.md` → when a lesson repeats ~3 times, graduate it into DNA (values → `SOUL.md`, discipline → `AGENTS.md`, durable facts → `MEMORY.md`) → re-aggregation makes it live → the next session is a slightly better self. `manifest.json` keeps the audit trail.

## Install

```sh
dsh plugin --profile web add /path/to/dsh-soul
```

Then append to `$DSH_HOME/profiles/web/cordis.patch.yml`:

```yaml
- insert:
    - id: soul
      name: 'dsh-soul'
```

Config changes apply live via HMR.

## Usage

1. Open dsh Web → Settings → plugin config → **dsh-soul**.
2. **New soul** → enter a name → skeleton created (DNA + beliefs + memory).
3. **Activate** → DNA rendered into `~/.dsh/AGENTS.md`; new sessions inject it.
4. Upload an **avatar** with the 🖼️ button.
5. Edit DNA/beliefs files at `~/.dsh/souls/<name>/` (or via the `save` API) — the next card visit re-aggregates automatically.

## Routes (all POST)

| Route | Body | Purpose |
|-------|------|---------|
| `/api/dsh-soul/list` | `{}` | list souls + active (triggers lazy re-aggregation) |
| `/api/dsh-soul/new` | `{name}` | create a skeleton soul |
| `/api/dsh-soul/activate` | `{name}` | render DNA → `~/.dsh/AGENTS.md` |
| `/api/dsh-soul/save` | `{name, file, content}` | write a DNA/beliefs file (records in manifest) |
| `/api/dsh-soul/delete` | `{name}` | remove a non-active soul |
| `/api/dsh-soul/sync` | `{}` | lazy re-aggregate the active soul |
| `/api/dsh-soul/avatar` | `{name}` | fetch avatar image bytes |
| `/api/dsh-soul/avatar-upload` | raw image + `?name=` | save avatar |

## Development

```sh
node --check src/index.js && node --check src/client.js
node .selftest-e2e.mjs   # 23 route-level integration cases (fake $HOME)
```

## License

[MIT](LICENSE) © 2026 kagura-agent
