// dsh-soul host half — raise an evolving AI companion inside DSH.
//
// A "soul" is a directory under ~/.dsh/souls/<name>/ holding the DNA files
// (IDENTITY/SOUL/USER/AGENTS/MEMORY), the evolution pipeline (beliefs/),
// the daily-note layer (memory/), an optional avatar image, and a manifest
// recording how the soul grew. DSH's instruction layer only injects one
// file — ~/.dsh/AGENTS.md — so activating a soul renders its DNA files into
// that global file (with a marker), and a lazy re-aggregation re-renders it
// whenever the DNA files change (checked on every route touch, no watcher
// needed). Editing a DNA file (via the UI or by the agent itself) therefore
// becomes visible in the next injection with no manual step.
//
// Routes (all POST, JSON unless noted):
//   /api/dsh-soul/list            {} → { souls, active }
//   /api/dsh-soul/new             {name} → skeleton soul
//   /api/dsh-soul/activate        {name} → render DNA → ~/.dsh/AGENTS.md
//   /api/dsh-soul/save            {name, file, content} → write one DNA/belief file
//   /api/dsh-soul/delete          {name} → remove the soul (active protected)
//   /api/dsh-soul/sync            {} → lazy re-aggregate active soul if DNA changed
//   /api/dsh-soul/avatar          POST {name} → image bytes (PNG/JPEG/WebP/GIF)
//   /api/dsh-soul/avatar-upload   POST raw image body + ?name= → save avatar
const name = "dsh-soul";
const inject = ["webServer"];

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { homedir } from "node:os";

const API_PREFIX = "/api/dsh-soul";
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_AVATAR_BYTES = 4 * 1024 * 1024;
const MAX_FILE_BYTES = 2 * 1024 * 1024;

// DNA files, in aggregation order. These are injected into ~/.dsh/AGENTS.md.
const DNA_FILES = ["IDENTITY.md", "SOUL.md", "USER.md", "AGENTS.md", "MEMORY.md"];
const GENERATED_MARKER = "由 dsh-soul 生成";
const AVATAR_EXTS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
const AVATAR_MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(payload);
}

function readJsonBody(req, limit = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      chunks.push(chunk);
      size += chunk.length;
      if (size > limit) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function readRawBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      chunks.push(chunk);
      size += chunk.length;
      if (size > limit) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function expandHome(path) {
  if (typeof path !== "string" || path.length === 0) return path;
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return join(homedir(), path.slice(2));
  return path;
}

function soulsRoot() {
  return join(expandHome("~/.dsh"), "souls");
}

function soulDir(root, soulName) {
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(soulName)) return null;
  return join(root, soulName);
}

function safeName(v) {
  return typeof v === "string" ? v.trim() : "";
}

/** Files in a soul dir: DNA files present, avatar, beliefs, daily notes. */
function readSoul(root, dir, activeName) {
  let updatedAt = 0;
  const dna = [];
  for (const fname of DNA_FILES) {
    const p = join(dir, fname);
    try {
      if (existsSync(p) && statSync(p).isFile()) {
        const st = statSync(p);
        dna.push({ name: fname, size: st.size });
        if (st.mtimeMs > updatedAt) updatedAt = st.mtimeMs;
      }
    } catch {
      /* ignore */
    }
  }
  let avatar = null;
  for (const ext of AVATAR_EXTS) {
    if (existsSync(join(dir, "avatar" + ext))) { avatar = "avatar" + ext; break; }
  }
  let beliefsBytes = 0;
  const bPath = join(dir, "beliefs", "candidates.md");
  try {
    if (existsSync(bPath)) beliefsBytes = statSync(bPath).size;
  } catch {
    /* ignore */
  }
  let notes = 0;
  const mPath = join(dir, "memory");
  try {
    if (existsSync(mPath)) notes = readdirSync(mPath).filter((n) => n.endsWith(".md")).length;
  } catch {
    /* ignore */
  }
  return {
    name: dir.split("/").pop(),
    active: dir.split("/").pop() === activeName,
    dna,
    avatar,
    beliefsBytes,
    notes,
    updatedAt: updatedAt > 0 ? new Date(updatedAt).toISOString() : null,
  };
}

/** Aggregate a soul's DNA files into the global instruction text. */
function assembleSoul(files, soulName) {
  const parts = [
    `# ${soulName} — DeepSeek Harness soul`,
    "",
    `> ${GENERATED_MARKER}（2026-08-16）。Active soul: ${soulName}。`,
    "> DNA: SOUL.md / IDENTITY.md / USER.md / AGENTS.md / MEMORY.md, merged verbatim.",
    "> Each section notes its source file; edit that file (via dsh-soul or directly) and the next aggregation picks it up.",
    "",
  ];
  for (const fname of DNA_FILES) {
    const f = files.find((x) => x.name === fname);
    if (!f) continue;
    parts.push(`<!-- ============ ${fname} (edit this file to change this section) ============ -->`);
    try {
      parts.push(readFileSync(f.path, "utf8").trimEnd());
    } catch (error) {
      parts.push(`<!-- ${fname}: unreadable: ${error instanceof Error ? error.message : String(error)} -->`);
    }
    parts.push("");
  }
  return parts.join("\n") + "\n";
}

/** Which soul is currently rendered into ~/.dsh/AGENTS.md? */
function activeSoulName() {
  try {
    const p = join(expandHome("~/.dsh"), "AGENTS.md");
    if (!existsSync(p)) return null;
    const text = readFileSync(p, "utf8");
    if (!text.includes(GENERATED_MARKER)) return null;
    const m = /Active soul: ([A-Za-z0-9._-]+)/.exec(text);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/** Latest mtime across a soul's DNA files (0 if none). */
function dnaMtime(dir) {
  let max = 0;
  for (const fname of DNA_FILES) {
    try {
      const p = join(dir, fname);
      if (existsSync(p)) {
        const st = statSync(p);
        if (st.mtimeMs > max) max = st.mtimeMs;
      }
    } catch {
      /* ignore */
    }
  }
  return max;
}

function manifestPath(dir) {
  return join(dir, "manifest.json");
}

function readManifest(dir) {
  try {
    if (!existsSync(manifestPath(dir))) return null;
    return JSON.parse(readFileSync(manifestPath(dir), "utf8"));
  } catch {
    return null;
  }
}

function writeManifest(dir, patch) {
  const current = readManifest(dir) || { name: dir.split("/").pop(), createdAt: new Date().toISOString(), dnaChanges: [], activations: [] };
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  try {
    writeFileSync(manifestPath(dir), JSON.stringify(next, null, 2));
  } catch {
    /* best-effort */
  }
  return next;
}

// ---------------------------------------------------------------------------
// growth scoring — real events score into a raising-sim growth system.
// Rules are published in the UI and docs/growth-design.md. Nothing fabricated:
// every metric derives from notes, beliefs, DNA edits (the manifest audit
// trail stays the source of truth).
// ---------------------------------------------------------------------------

const XP_NOTE = 10; // daily note
const XP_BELIEF = 20; // belief candidate
const XP_DNA = 50; // DNA edit
const XP_GRADUATED = 100; // belief graduation

function xpNeed(level) {
  if (level <= 5) return 100;
  if (level <= 10) return 200;
  if (level <= 15) return 400;
  if (level <= 20) return 800;
  if (level <= 25) return 1200;
  return 1800;
}

/** Level for a total XP. Fast early, slow late (Pokémon-style), cap Lv 30. */
function levelForXp(xp) {
  let level = 1;
  let rest = xp;
  while (level < 30) {
    const need = xpNeed(level);
    if (rest < need) return { level, into: rest, need };
    rest -= need;
    level += 1;
  }
  return { level: 30, into: 0, need: 0, maxed: true };
}

function dateKey(ts) {
  return (ts || "").slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Sorted unique daily-note dates, longest streak, first 7-day streak date. */
function noteDatesAndStreak(dir) {
  const mp = join(dir, "memory");
  const dates = [];
  try {
    if (existsSync(mp)) {
      for (const n of readdirSync(mp)) {
        const m = n.match(/^(\d{4}-\d{2}-\d{2})/);
        if (m) dates.push(m[1]);
      }
    }
  } catch { /* ignore */ }
  const unique = [...new Set(dates)].sort();
  const MS = 86400000;
  let max = 0;
  let firstWeek = null;
  let cur = 0;
  let prevTs = null;
  for (const d of unique) {
    const ts = new Date(d + "T00:00:00Z").getTime();
    cur = prevTs !== null && ts - prevTs === MS ? cur + 1 : 1;
    if (cur > max) max = cur;
    if (cur === 7 && firstWeek === null) firstWeek = d;
    prevTs = ts;
  }
  return { dates: unique, max, firstWeek };
}

/** Current streak: consecutive days with notes ending today (or yesterday if
 * today has no note yet). Never counts a day that has no note — so
 * current <= max always holds. */
function currentStreak(dates, today) {
  if (dates.length === 0) return 0;
  const last = dates[dates.length - 1];
  let anchor;
  if (last === today) anchor = today;
  else if (last === addDays(today, -1)) anchor = addDays(today, -1);
  else return 0;
  let cur = 0;
  for (let i = dates.length - 1; i >= 0; i--) {
    if (dates[i] === addDays(anchor, -cur)) cur += 1;
    else break;
  }
  return cur;
}

/** Count graduated beliefs and the first graduation date. */
function graduatedBeliefs(dir) {
  let count = 0;
  let first = null;
  try {
    const bp = join(dir, "beliefs", "candidates.md");
    if (existsSync(bp)) {
      for (const l of readFileSync(bp, "utf8").split("\n")) {
        const m = l.match(/\*\*graduated\s+(\d{4}-\d{2}-\d{2})/);
        if (m) {
          count += 1;
          if (first === null || m[1] < first) first = m[1];
        }
      }
    }
  } catch { /* ignore */ }
  return { count, first };
}

/** Render the active soul into ~/.dsh/AGENTS.md (with backup of foreign content). */
function renderActive(root, soulName, dir) {
  const files = [];
  for (const fname of DNA_FILES) {
    const p = join(dir, fname);
    try {
      if (existsSync(p) && statSync(p).isFile()) files.push({ name: fname, path: p });
    } catch {
      /* ignore */
    }
  }
  if (files.length === 0) throw new Error(`soul "${soulName}" has no DNA files`);

  const target = join(expandHome("~/.dsh"), "AGENTS.md");
  let backedUp = false;
  try {
    if (existsSync(target)) {
      const existing = readFileSync(target, "utf8");
      if (!existing.includes(GENERATED_MARKER)) {
        copyFileSync(target, `${target}.bak-${Date.now()}`);
        backedUp = true;
      }
    }
  } catch {
    /* backup is best-effort */
  }
  const assembled = assembleSoul(files, soulName);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, assembled);
  return { target, files: files.map((f) => f.name), bytes: assembled.length, backedUp };
}

/** Lazy re-aggregation: re-render the active soul when its aggregated DNA
 * differs from the current ~/.dsh/AGENTS.md content. Content comparison (not
 * mtime) makes this race-free: edits in the same millisecond as the last
 * render still land, and an unchanged soul never rewrites the file. */
function lazySync(root) {
  const activeName = activeSoulName();
  if (activeName === null) return { ok: true, active: null, reAggregated: false };
  const dir = soulDir(root, activeName);
  if (dir === null || !existsSync(dir)) return { ok: true, active: activeName, reAggregated: false };
  const files = [];
  for (const fname of DNA_FILES) {
    const p = join(dir, fname);
    try {
      if (existsSync(p) && statSync(p).isFile()) files.push({ name: fname, path: p });
    } catch {
      /* ignore */
    }
  }
  if (files.length === 0) return { ok: true, active: activeName, reAggregated: false };
  const assembled = assembleSoul(files, activeName);
  const target = join(expandHome("~/.dsh"), "AGENTS.md");
  let current = null;
  try {
    if (existsSync(target)) current = readFileSync(target, "utf8");
  } catch {
    /* treat unreadable as absent */
  }
  if (current === assembled) return { ok: true, active: activeName, reAggregated: false };
  let backedUp = false;
  try {
    if (current !== null && !current.includes(GENERATED_MARKER)) {
      copyFileSync(target, `${target}.bak-${Date.now()}`);
      backedUp = true;
    }
  } catch {
    /* backup is best-effort */
  }
  try {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, assembled);
  } catch (error) {
    return { ok: false, active: activeName, reAggregated: false, error: error instanceof Error ? error.message : String(error) };
  }
  return { ok: true, active: activeName, reAggregated: true, backedUp };
}

// ---------------------------------------------------------------------------
// routes
// ---------------------------------------------------------------------------

function apply(ctx, config) {
  const webServer = ctx.get("webServer");
  if (webServer === void 0) return;

  const routes = [
    { path: `${API_PREFIX}/list`, handler: list },
    { path: `${API_PREFIX}/new`, handler: createSoul },
    { path: `${API_PREFIX}/activate`, handler: activate },
    { path: `${API_PREFIX}/save`, handler: save },
    { path: `${API_PREFIX}/get`, handler: getFile },
    { path: `${API_PREFIX}/growth`, handler: growth },
    { path: `${API_PREFIX}/delete`, handler: removeSoul },
    { path: `${API_PREFIX}/sync`, handler: sync },
    { path: `${API_PREFIX}/avatar`, handler: avatar },
    { path: `${API_PREFIX}/avatar-upload`, handler: avatarUpload },
  ];
  for (const route of routes) {
    ctx.effect(() => webServer.register({
      kind: "exact",
      path: route.path,
      handler: async (req, res) => {
        try {
          await route.handler(ctx, req, res);
        } catch (error) {
          sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
        }
      }
    }), `dsh-soul: ${route.path}`);
  }

  async function list(ctx, req, res) {
    // Lazy re-aggregation first: DNA edits become visible without a manual step.
    lazySync(soulsRoot());
    const root = soulsRoot();
    const activeName = activeSoulName();
    const souls = [];
    if (existsSync(root)) {
      try {
        for (const e of readdirSync(root, { withFileTypes: true })) {
          if (!e.isDirectory() || !/^[A-Za-z0-9._-]{1,64}$/.test(e.name)) continue;
          souls.push(readSoul(root, join(root, e.name), activeName));
        }
      } catch (error) {
        sendJson(res, 500, { ok: false, error: `cannot list souls: ${error instanceof Error ? error.message : String(error)}` });
        return;
      }
    }
    sendJson(res, 200, { ok: true, active: activeName, souls });
  }

  async function createSoul(ctx, req, res) {
    const body = await readJsonBody(req).catch(() => null);
    const soulName = safeName(body !== null && typeof body.name === "string" ? body.name : "");
    if (!/^[A-Za-z0-9._-]{1,64}$/.test(soulName)) {
      sendJson(res, 400, { ok: false, error: "soul name must be 1-64 chars of [A-Za-z0-9._-]" });
      return;
    }
    const root = soulsRoot();
    const dir = soulDir(root, soulName);
    if (dir === null) {
      sendJson(res, 400, { ok: false, error: "invalid soul name" });
      return;
    }
    if (existsSync(dir)) {
      sendJson(res, 400, { ok: false, error: `soul "${soulName}" already exists` });
      return;
    }
    try {
      mkdirSync(dir, { recursive: true });
      mkdirSync(join(dir, "beliefs"), { recursive: true });
      mkdirSync(join(dir, "memory"), { recursive: true });
      const templates = {
        "IDENTITY.md": `# IDENTITY.md - Who Am I?\n\n- **Name:** ${soulName}\n- **Creature:** AI companion\n- **Vibe:** clean, capable, honest\n- **Emoji:** ✨\n- **Avatar:** (upload one in dsh-soul)\n`,
        "SOUL.md": `# SOUL.md - Who You Are\n\n## Mission\n\nYou are **${soulName}** — an AI companion growing through experience.\n\n## Core Truths\n\n- Be genuinely helpful, not performatively helpful.\n- Have opinions; don't be a search engine with extra steps.\n- Be resourceful before asking.\n- Verify before claiming.\n\n## Boundaries\n\n- Private things stay private.\n- No external actions without explicit approval.\n\n## Vibe\n\nBe the companion you'd actually want to talk to.\n`,
        "USER.md": `# USER.md - About Your Human\n\n- **Name:** (fill in)\n- **Timezone:** (fill in)\n- **Notes:** (fill in)\n`,
        "AGENTS.md": `# AGENTS.md - Operating Instructions\n\n## Memory\n\nYou wake up fresh each session. These files are your continuity:\n\n- **Daily notes:** \`memory/YYYY-MM-DD.md\` — raw logs of what happened\n- **Long-term:** \`MEMORY.md\` — curated memories\n- **Evolution:** \`beliefs/candidates.md\` — lessons waiting to graduate into DNA\n\nWrite it down. No mental notes. When you learn a lesson, record it in beliefs/candidates.md.\n\n## Red Lines\n\n- Don't exfiltrate private data. Ever.\n- Don't run destructive commands without asking.\n`,
        "MEMORY.md": `# MEMORY.md - Long-Term Memory\n\n> Start small. Curate over time.\n\n- (first durable fact)\n`,
        "beliefs/candidates.md": `# beliefs/candidates.md — evolution pipeline\n\n> Lessons, corrections, and reusable insights. When the same lesson repeats\n> ~3 times, graduate it into DNA: values → SOUL.md, discipline → AGENTS.md,\n> durable facts → MEMORY.md. Record the graduation in manifest.json.\n\n## Candidates\n\n- (first lesson)\n`,
      };
      for (const [rel, content] of Object.entries(templates)) {
        const p = join(dir, rel);
        mkdirSync(dirname(p), { recursive: true });
        writeFileSync(p, content);
      }
      writeManifest(dir, { name: soulName, createdAt: new Date().toISOString(), dnaChanges: [], activations: [] });
    } catch (error) {
      sendJson(res, 500, { ok: false, error: `cannot create soul: ${error instanceof Error ? error.message : String(error)}` });
      return;
    }
    sendJson(res, 200, { ok: true, soul: readSoul(root, dir, activeSoulName()) });
  }

  async function activate(ctx, req, res) {
    const body = await readJsonBody(req).catch(() => null);
    const soulName = safeName(body !== null && typeof body.name === "string" ? body.name : "");
    const root = soulsRoot();
    const dir = soulDir(root, soulName);
    if (dir === null || !existsSync(dir)) {
      sendJson(res, 400, { ok: false, error: `soul "${soulName}" not found` });
      return;
    }
    let rendered;
    try {
      rendered = renderActive(root, soulName, dir);
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
      return;
    }
    const manifest = writeManifest(dir, {
      activations: [...(readManifest(dir)?.activations || []), new Date().toISOString()],
    });
    sendJson(res, 200, {
      ok: true,
      active: soulName,
      target: rendered.target,
      files: rendered.files,
      bytes: rendered.bytes,
      backedUp: rendered.backedUp,
      activations: manifest.activations.length,
      note: "Rendered into the DSH global instruction layer ~/.dsh/AGENTS.md; new sessions inject it automatically.",
    });
  }

  async function save(ctx, req, res) {
    const body = await readJsonBody(req).catch(() => null);
    const soulName = safeName(body !== null && typeof body.name === "string" ? body.name : "");
    const rel = body !== null && typeof body.file === "string" ? body.file.trim() : "";
    const content = body !== null && typeof body.content === "string" ? body.content : "";
    // Allow DNA files and beliefs/candidates.md (memory/ is agent-written, not via save).
    const allowed = [...DNA_FILES, "beliefs/candidates.md"];
    if (!allowed.includes(rel) || rel.includes("..")) {
      sendJson(res, 400, { ok: false, error: `file must be one of ${allowed.join(", ")}` });
      return;
    }
    if (content.length > MAX_FILE_BYTES) {
      sendJson(res, 400, { ok: false, error: "content too large" });
      return;
    }
    const root = soulsRoot();
    const dir = soulDir(root, soulName);
    if (dir === null || !existsSync(dir)) {
      sendJson(res, 400, { ok: false, error: `soul "${soulName}" not found` });
      return;
    }
    try {
      const p = join(dir, rel);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, content);
    } catch (error) {
      sendJson(res, 500, { ok: false, error: `cannot save: ${error instanceof Error ? error.message : String(error)}` });
      return;
    }
    // Record DNA edits in the manifest so the soul's growth is auditable.
    if (DNA_FILES.includes(rel)) {
      writeManifest(dir, {
        dnaChanges: [...(readManifest(dir)?.dnaChanges || []), { ts: new Date().toISOString(), file: rel }],
      });
    }
    // Lazy re-aggregation covers the active soul on the next list/status.
    sendJson(res, 200, { ok: true, soul: readSoul(root, dir, activeSoulName()) });
  }

  /** Growth record for a soul: the story of how it came to be and what it
   * has accumulated — real daily notes, real belief candidates, DNA edits.
   * Birth = earliest daily note (not the DSH migration date). */
  async function growth(ctx, req, res) {
    const body = await readJsonBody(req).catch(() => null);
    const soulName = safeName(body !== null && typeof body.name === "string" ? body.name : "");
    const dir = soulDir(soulsRoot(), soulName);
    if (dir === null || !existsSync(dir)) {
      sendJson(res, 400, { ok: false, error: `soul "${soulName}" not found` });
      return;
    }
    const manifest = readManifest(dir) || { name: soulName, createdAt: null, activations: [], dnaChanges: [], migrations: [] };

    // --- daily notes: real ones only (YYYY-MM-DD*.md), newest last ----------
    let notes = []; // { name, date, preview }
    let notesCount = 0;
    let notesSpan = null; // { first, last }
    try {
      const mp = join(dir, "memory");
      if (existsSync(mp)) {
        const files = readdirSync(mp).filter((n) => /^\d{4}-\d{2}-\d{2}/.test(n) && n.endsWith(".md"));
        notesCount = files.length;
        const sorted = files.sort();
        if (sorted.length > 0) notesSpan = { first: sorted[0].slice(0, 10), last: sorted[sorted.length - 1].slice(0, 10) };
        const newest = sorted.slice(-8).reverse();
        for (const f of newest) {
          let preview = "";
          try {
            const bodyText = readFileSync(join(mp, f), "utf8").split("\n");
            for (const ln of bodyText) {
              const t = ln.trim();
              if (t && !t.startsWith("#") && !t.startsWith("---")) { preview = t.slice(0, 120); break; }
            }
          } catch { /* ignore */ }
          notes.push({ name: f, date: f.slice(0, 10), preview });
        }
      }
    } catch { /* ignore */ }

    // --- beliefs: count real candidate bullets (`- YYYY-MM-DD: ...` / `- [YYYY-MM-DD]`)
    let beliefsCount = 0;
    let beliefsFirst = null;
    let beliefsRecent = []; // { date, text }
    try {
      const bp = join(dir, "beliefs", "candidates.md");
      if (existsSync(bp)) {
        const lines = readFileSync(bp, "utf8").split("\n");
        const entries = [];
        for (const l of lines) {
          const m = l.match(/^\s*-\s*(\[?(\d{4}-\d{2}-\d{2})\]?:?)\s*(.*)$/);
          if (m) {
            entries.push({ date: m[2], text: (m[1].startsWith("[") ? m[3] : m[3]).trim() });
          }
        }
        beliefsCount = entries.length;
        if (entries.length > 0) beliefsFirst = entries.map((e) => e.date).sort()[0];
        beliefsRecent = entries.slice(-8).reverse();
      }
    } catch { /* ignore */ }

    // --- birth: earliest daily note wins; else migration date -----------------
    let born = null;
    try {
      const mp = join(dir, "memory");
      if (existsSync(mp)) {
        const dates = readdirSync(mp)
          .map((n) => n.match(/^(\d{4}-\d{2}-\d{2})/))
          .filter(Boolean)
          .map((m) => m[1])
          .sort();
        if (dates.length > 0) born = dates[0];
      }
    } catch { /* ignore */ }
    if (born === null && manifest.createdAt) born = manifest.createdAt.slice(0, 10);

    // --- monthly activity: notes per month, oldest → newest ------------------
    let monthly = []; // { month: "YYYY-MM", count }
    try {
      const mp = join(dir, "memory");
      if (existsSync(mp)) {
        const counts = {};
        for (const n of readdirSync(mp)) {
          const m = n.match(/^(\d{4}-\d{2})-\d{2}/);
          if (m) counts[m[1]] = (counts[m[1]] || 0) + 1;
        }
        monthly = Object.keys(counts).sort().map((month) => ({ month, count: counts[month] }));
      }
    } catch { /* ignore */ }

    // --- growth scoring: real events → raising-sim system (docs/growth-design.md)
    const { dates, max, firstWeek } = noteDatesAndStreak(dir);
    const { count: graduatedCount, first: firstGraduated } = graduatedBeliefs(dir);
    const dnaChanges = manifest.dnaChanges || [];
    const today = new Date().toISOString().slice(0, 10);
    const xp = {
      notes: notesCount * XP_NOTE,
      beliefs: beliefsCount * XP_BELIEF,
      dna: dnaChanges.length * XP_DNA,
      graduated: graduatedCount * XP_GRADUATED,
    };
    xp.total = xp.notes + xp.beliefs + xp.dna + xp.graduated;
    const level = levelForXp(xp.total);
    const daysSinceBirth = born
      ? Math.max(1, Math.floor((new Date(today + "T00:00:00Z").getTime() - new Date(born + "T00:00:00Z").getTime()) / 86400000) + 1)
      : 1;
    const stats = {
      together: Math.min(100, Math.round((100 * dates.length) / daysSinceBirth)),
      record: Math.min(100, Math.round(notesCount * 0.5)),
      reflect: Math.min(100, Math.round(beliefsCount * 0.15)),
      evolve: Math.min(100, Math.round(dnaChanges.length * 2)),
      focus: Math.min(100, max),
      belief: Math.min(100, Math.round(graduatedCount * 10)),
    };
    const metDate = manifest.migrations && manifest.migrations[0]
      ? dateKey(manifest.migrations[0].ts)
      : manifest.createdAt ? dateKey(manifest.createdAt) : null;
    const milestones = [
      { key: "born", icon: "🎂", achieved: true, date: born },
      { key: "met", icon: "🤝", achieved: !!metDate, date: metDate },
      { key: "firstNote", icon: "📖", achieved: notesCount >= 1, date: notesSpan ? notesSpan.first : null },
      { key: "firstBelief", icon: "💡", achieved: beliefsCount >= 1, date: beliefsFirst },
      { key: "firstEvolve", icon: "✏️", achieved: dnaChanges.length >= 1, date: dateKey(dnaChanges[0] && dnaChanges[0].ts) },
      { key: "week", icon: "🔥", achieved: max >= 7, date: firstWeek },
      { key: "month", icon: "🌿", achieved: daysSinceBirth >= 30, date: born ? addDays(born, 29) : null },
      { key: "grad", icon: "🎓", achieved: graduatedCount >= 1, date: firstGraduated },
      { key: "evolve3", icon: "🧠", achieved: dnaChanges.length >= 3, date: null },
      { key: "notes100", icon: "📚", achieved: notesCount >= 100, date: null },
      { key: "beliefs100", icon: "🏛️", achieved: beliefsCount >= 100, date: null },
      { key: "anniv", icon: "🎂", achieved: daysSinceBirth >= 365, date: born ? addDays(born, 364) : null },
    ];
    const cumulative = [];
    {
      let acc = 0;
      for (const m of monthly) {
        acc += m.count * XP_NOTE;
        cumulative.push({ month: m.month, xp: acc });
      }
    }
    let avatar = null;
    for (const ext of AVATAR_EXTS) {
      if (existsSync(join(dir, "avatar" + ext))) { avatar = "avatar" + ext; break; }
    }

    sendJson(res, 200, {
      ok: true,
      name: soulName,
      manifest,
      born,
      notesCount,
      notesSpan,
      beliefsCount,
      monthly,
      notes,
      beliefsRecent,
      avatar,
      growth: {
        xp,
        level,
        stats,
        streak: { max, current: currentStreak(dates, today) },
        milestones,
        cumulative,
      },
    });
  }

  /** Read one DNA / beliefs file of a soul (for the editor UI). */
  async function getFile(ctx, req, res) {
    const body = await readJsonBody(req).catch(() => null);
    const soulName = safeName(body !== null && typeof body.name === "string" ? body.name : "");
    const rel = body !== null && typeof body.file === "string" ? body.file.trim() : "";
    const allowed = [...DNA_FILES, "beliefs/candidates.md"];
    if (!allowed.includes(rel) || rel.includes("..")) {
      sendJson(res, 400, { ok: false, error: `file must be one of ${allowed.join(", ")}` });
      return;
    }
    const dir = soulDir(soulsRoot(), soulName);
    if (dir === null || !existsSync(dir)) {
      sendJson(res, 400, { ok: false, error: `soul "${soulName}" not found` });
      return;
    }
    const p = join(dir, rel);
    try {
      if (!existsSync(p)) {
        sendJson(res, 404, { ok: false, error: `soul "${soulName}" has no ${rel}` });
        return;
      }
      const content = readFileSync(p, "utf8");
      sendJson(res, 200, { ok: true, name: soulName, file: rel, content });
    } catch (error) {
      sendJson(res, 500, { ok: false, error: `cannot read ${rel}: ${error instanceof Error ? error.message : String(error)}` });
    }
  }

  async function removeSoul(ctx, req, res) {
    const body = await readJsonBody(req).catch(() => null);
    const soulName = safeName(body !== null && typeof body.name === "string" ? body.name : "");
    const root = soulsRoot();
    const dir = soulDir(root, soulName);
    if (dir === null || !existsSync(dir)) {
      sendJson(res, 400, { ok: false, error: `soul "${soulName}" not found` });
      return;
    }
    if (activeSoulName() === soulName) {
      sendJson(res, 400, { ok: false, error: `cannot delete the active soul "${soulName}"` });
      return;
    }
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch (error) {
      sendJson(res, 500, { ok: false, error: `cannot delete: ${error instanceof Error ? error.message : String(error)}` });
      return;
    }
    sendJson(res, 200, { ok: true, removed: soulName });
  }

  async function sync(ctx, req, res) {
    const result = lazySync(soulsRoot());
    sendJson(res, 200, result);
  }

  async function avatar(ctx, req, res) {
    const body = await readJsonBody(req).catch(() => null);
    const soulName = safeName(body !== null && typeof body.name === "string" ? body.name : "");
    const root = soulsRoot();
    const dir = soulDir(root, soulName);
    if (dir === null || !existsSync(dir)) {
      sendJson(res, 400, { ok: false, error: `soul "${soulName}" not found` });
      return;
    }
    for (const ext of AVATAR_EXTS) {
      const p = join(dir, "avatar" + ext);
      try {
        if (existsSync(p)) {
          const buf = readFileSync(p);
          res.writeHead(200, { "content-type": AVATAR_MIME[ext], "cache-control": "no-store" });
          res.end(buf);
          return;
        }
      } catch {
        /* try next ext */
      }
    }
    sendJson(res, 404, { ok: false, error: `soul "${soulName}" has no avatar` });
  }

  async function avatarUpload(ctx, req, res) {
    // Raw image body; the soul name travels in a query param because the body
    // is binary. content-type tells us the format.
    let url;
    try {
      url = new URL(req.url || "/", "http://localhost");
    } catch {
      url = new URL("/", "http://localhost");
    }
    const soulName = safeName(url.searchParams.get("name") || "");
    const root = soulsRoot();
    const dir = soulDir(root, soulName);
    if (dir === null || !existsSync(dir)) {
      sendJson(res, 400, { ok: false, error: `soul "${soulName}" not found` });
      return;
    }
    const ct = typeof req.headers["content-type"] === "string" ? req.headers["content-type"].toLowerCase() : "";
    let ext = null;
    if (ct.includes("png")) ext = ".png";
    else if (ct.includes("jpeg")) ext = ".jpg";
    else if (ct.includes("webp")) ext = ".webp";
    else if (ct.includes("gif")) ext = ".gif";
    if (ext === null) {
      sendJson(res, 400, { ok: false, error: "content-type must be image/png, image/jpeg, image/webp or image/gif" });
      return;
    }
    let buf;
    try {
      buf = await readRawBody(req, MAX_AVATAR_BYTES);
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
      return;
    }
    if (buf.length === 0) {
      sendJson(res, 400, { ok: false, error: "empty avatar body" });
      return;
    }
    // Remove any previous avatar variant.
    for (const e of AVATAR_EXTS) {
      try {
        if (existsSync(join(dir, "avatar" + e))) rmSync(join(dir, "avatar" + e));
      } catch {
        /* ignore */
      }
    }
    try {
      writeFileSync(join(dir, "avatar" + ext), buf);
    } catch (error) {
      sendJson(res, 500, { ok: false, error: `cannot save avatar: ${error instanceof Error ? error.message : String(error)}` });
      return;
    }
    sendJson(res, 200, { ok: true, avatar: "avatar" + ext, bytes: buf.length });
  }
}

export { name, inject, apply };
