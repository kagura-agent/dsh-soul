# Contributing to dsh-soul

Thanks for considering a contribution! Small, focused plugin — the bar is:
**working code, honest tests, clean copy.**

## Project shape

- `src/index.js` — host half: the `/api/dsh-soul/*` routes (list, new,
  activate, save, delete, sync, avatar, avatar-upload) and the soul
  aggregation logic (`~/.dsh/souls/<name>/` → `~/.dsh/AGENTS.md`, lazy
  race-free re-aggregation by content comparison).
- `src/client.js` — browser half: the settings card and the sidebar footer
  soul switcher. All user-facing copy lives in the `zh` / `en` dictionaries
  registered through the host locale service; the card renders via
  `t("key", params)` with `{placeholder}` interpolation.
- `.selftest-e2e.mjs` — route-level integration tests against a mocked ctx on
  a real temp filesystem, with a fake `$HOME` so nothing touches a real
  `~/.dsh`.

## Development

```sh
node --check src/index.js && node --check src/client.js
node .selftest-client.mjs  # client static checks (i18n keys, helper references)
node .selftest-e2e.mjs    # 23 route-level integration cases
```

The suite must pass before a PR is ready.

## Conventions

- **Code and comments in English.** The only CJK that belongs in source is
  *data content*, not UI copy (e.g. the `~/.dsh/AGENTS.md` generated marker).
- **No hardcoded UI strings.** Any text the card shows goes into both the
  `zh` and `en` dictionaries in `src/client.js`, keyed by a stable key.
- **Host API messages are English.** The client owns presentation.
- **Tests travel with behavior changes.** Route or aggregation changes →
  extend `.selftest-e2e.mjs` (it already covers create/activate/lazy
  re-aggregation/save/avatar/delete, including path-traversal and
  active-soul deletion guards).
- **Commit messages** describe the *why* (see the git history for the style).

## Pull requests

1. Fork the repo, create a branch (`fix/…`, `feat/…`).
2. Make the change with tests, run the suite locally.
3. Open the PR against `main` with a short description and test results. CI
   runs syntax checks + the integration suite on Node 22.

## Reporting issues

Include: the DSH version (`dsh --version`), the profile (`web` / `headless`),
what you did (which route/card action), and the exact API response or card
error. Screenshots of the card/sidebar help for UI issues.

## License

[MIT](LICENSE) © 2026 kagura-agent
