# dsh-persona

**DSH plugin: manage agent personalities.** Store persona packs — `SOUL.md` / `IDENTITY.md` / `USER.md` / `AGENTS.md` / `MEMORY.md` — separately under `~/.dsh/personas/<name>/`, and activate one with a click: it aggregates the pack into `~/.dsh/AGENTS.md`, the DSH global instruction layer injected into every workspace's sessions.

Companion to [dsh-migrate-openclaw](https://github.com/kagura-agent/dsh-migrate-openclaw): migrate an OpenClaw persona in, then manage it (and others) here.

## Features

- **Multiple personas**: each pack is its own directory; switch personalities by activating.
- **One-click activation**: aggregates the active pack into `~/.dsh/AGENTS.md` (with a generated marker; a hand-edited target is backed up first). New sessions inject it automatically.
- **Skeleton creation**: `new` scaffolds all five files with starter copy.
- **Per-file editing** via the host API (`save`), ready for a full editor UI.
- **Safe by construction**: persona names are validated path segments (no traversal); the active persona cannot be deleted.

## Install

```sh
dsh plugin --profile web add /path/to/dsh-persona
```

Then append to `$DSH_HOME/profiles/web/cordis.patch.yml`:

```yaml
- insert:
    - id: persona
      name: 'dsh-persona'
```

Config changes apply live via HMR.

## Usage

1. Open dsh Web → Settings → plugin config → **dsh-persona**.
2. **New persona** → enter a name → skeleton created.
3. **Activate** → the pack is aggregated into `~/.dsh/AGENTS.md`; new sessions inject it.
4. Edit a persona's files at `~/.dsh/personas/<name>/` (or via the `save` API) and re-activate to apply.

## How it works

- Persona packs live at `~/.dsh/personas/<name>/`, one file per aspect (identity, soul, human model, operating instructions, long-term memory).
- Activating merges the files in a fixed order into `~/.dsh/AGENTS.md` with a `由 dsh-persona 生成` marker carrying the active persona name; `dsh-agent-instructions` picks the file up for every workspace session.
- `list` reports each pack's files and whether it is the active one.

## Routes (all POST, JSON)

| Route | Body | Purpose |
|-------|------|---------|
| `/api/dsh-persona/list` | `{}` | list packs + active persona |
| `/api/dsh-persona/new` | `{name}` | create a skeleton pack |
| `/api/dsh-persona/activate` | `{name}` | aggregate pack into `~/.dsh/AGENTS.md` |
| `/api/dsh-persona/save` | `{name, file, content}` | write one persona file |
| `/api/dsh-persona/delete` | `{name}` | remove a non-active pack |

## Development

```sh
node --check src/index.js && node --check src/client.js
node .selftest-e2e.mjs   # route-level integration tests (fake $HOME)
```

## License

[MIT](LICENSE) © 2026 kagura-agent
