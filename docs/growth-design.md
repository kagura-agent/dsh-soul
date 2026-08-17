# Growth Design — raising a soul, not a dashboard

> Status: accepted (2026-08-17). Companion doc to the Growth tab implementation.

The Growth tab shows a soul's life story. This document fixes the *feel*: the
page should read as a raising sim (Pokémon / Tamagotchi), not an analytics
dashboard. Every number must come from real, auditable events — nothing is
fabricated, but real events are *scored* into a growth system.

## Principles

1. **"It is growing" is the first thing you see** — level + XP bar are the
   visual hero, not a caption.
2. **Every number has a provenance** — all metrics derive from real events
   (notes, beliefs, DNA edits) under transparent scoring rules. Hover reveals
   the rule.
3. **Unachieved goals are content too** — locked milestones create
   anticipation (Pokémon's "one more level until evolution").

## Page structure (top to bottom)

```
┌─────────────────────────────────────────┐
│ ① Soul card: avatar + name + Lv.N badge │
│    XP bar [██████████░░░░] next level    │
├─────────────────────────────────────────┤
│ ② Stat radar: six-dimension hexagon     │
├─────────────────────────────────────────┤
│ ③ Growth curve: cumulative XP × time    │
├─────────────────────────────────────────┤
│ ④ Milestone wall: unlocked + ghosts     │
├─────────────────────────────────────────┤
│ ⑤ Memory: timeline + recent notes/beliefs│
└─────────────────────────────────────────┘
```

### ① Soul card

- Large avatar, soul name, and a **level badge** (plain number — `Lv.12`, no
  titles).
- XP bar with remaining XP to next level. The bar is the anticipation engine:
  "close to leveling up" beats "already leveled up".
- One-line summary: days together · notes written.

### ② Stat radar (Pokémon summary-page language)

Six dimensions, all derived from real events:

| Dimension | Formula (normalized 0–100) | Meaning |
|-----------|----------------------------|---------|
| Together  | days-with-notes ÷ days-since-birth | time investment |
| Record    | notes count (normalized) | expression |
| Reflect   | belief candidates count (normalized) | introspection |
| Evolve    | DNA edits count (normalized) | transformation |
| Focus     | longest note streak (normalized) | persistence |
| Belief    | graduated beliefs count (normalized) | crystallization |

Normalization is published in the UI (e.g. `Record = min(100, notes × 0.5)`).
A young soul's radar is small — and visibly grows with use. That *is* the
raising.

### ③ Growth curve

Cumulative XP over time (oldest → newest), replacing the monthly-note bar
chart as the primary chart. Cumulative curves naturally read as S-shaped
growth. Milestones are marked ★ on the curve.

### ④ Milestone wall

- **Unlocked**: icon + name + achieved date.
- **Locked (ghost cards)**: dashed border, greyscale, lock icon, hover shows
  the unlock condition. No "days missing" pressure — condition only.

Initial set:

| Milestone | Condition |
|-----------|-----------|
| 🎂 Born | automatic (earliest record) |
| 🤝 Met | activated / migrated |
| 📖 First note | 1st daily note |
| 💡 First belief | 1st candidate |
| ✏️ First evolve | 1st DNA edit |
| 🔥 One week | 7 consecutive days with notes |
| 🌿 First month | 30 days together |
| 🎓 Belief graduated ×1 | 1 candidate → graduated |
| 🧠 Evolved ×3 | 3 DNA edits |
| 📚 100 notes | 100 daily notes |
| 🏛️ 100 beliefs | 100 candidates |
| 🎂 Anniversary | 365 days together |

### ⑤ Memory

Keep the existing timeline + recent notes + recent beliefs lists. They are
evidence, not decoration.

## Level & XP parameters

Scoring (hover on the XP bar shows the table):

| Event | XP |
|-------|-----|
| daily note | +10 |
| belief candidate | +20 |
| DNA edit | +50 |
| belief graduation | +100 |

Curve (fast early, slow late — Pokémon-style; total 22,500 XP to cap):

```
Lv 1–5   100 XP/level
Lv 6–10  200 XP/level
Lv 11–15 400 XP/level
Lv 16–20 800 XP/level
Lv 21–25 1200 XP/level
Lv 26–30 1800 XP/level (cap Lv 30)
```

Backfill note: a soul migrated with substantial history scores from the
start — the page opens as an old save, not a new game. This is intentional
("inheritance": history is part of the soul).

## Visual language

- Cards keep the existing rounded-white style; level badge / XP bar / radar
  use the brand blue gradient (#1f6feb family).
- Radar: inline SVG hexagon with translucent fill.
- Ghost cards: dashed border + greyscale + lock icon.
- XP bar: gradient with a subtle end-cap shimmer; a brief celebration on
  level-up.

## Out of scope (v1)

- Animations beyond the level-up shimmer.
- Importing external history (dna repo git history, stories) into scoring —
  possible later via a backfill route; design is backfill-ready (all scores
  derive from events, so a history import is just more events).
