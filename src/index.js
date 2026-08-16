// dsh-persona host half — agent personality management.
//
// Persona packs are stored separately under ~/.dsh/personas/<name>/ as
// SOUL.md / IDENTITY.md / USER.md / AGENTS.md / MEMORY.md. Activating a
// persona aggregates its files into ~/.dsh/AGENTS.md (the DSH global
// instruction layer, injected into every workspace's sessions), so switching
// personalities is a single activate call — the same mechanism
// dsh-migrate-openclaw uses to import an OpenClaw persona.
//
// Routes (all POST, JSON):
//   /api/dsh-persona/list      {} → { personas: [{name, active, files, updatedAt}] }
//   /api/dsh-persona/new       {name} → creates a skeleton pack
//   /api/dsh-persona/activate  {name} → aggregate pack into ~/.dsh/AGENTS.md
//   /api/dsh-persona/save      {name, file, content} → write one persona file
//   /api/dsh-persona/delete    {name} → remove the pack
const name = "dsh-persona";
const inject = ["webServer"];

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

const API_PREFIX = "/api/dsh-persona";
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_FILE_BYTES = 1024 * 1024;

// Persona pack file names, in aggregation order.
const PERSONA_FILES = ["IDENTITY.md", "SOUL.md", "USER.md", "AGENTS.md", "MEMORY.md"];
const GENERATED_MARKER = "由 dsh-persona 生成";

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

function expandHome(path) {
  if (typeof path !== "string" || path.length === 0) return path;
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return join(homedir(), path.slice(2));
  return path;
}

function personasRoot() {
  return join(expandHome("~/.dsh"), "personas");
}

function personaDir(root, personaName) {
  // Persona names are single safe path segments.
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(personaName)) return null;
  return join(root, personaName);
}

function safeName(name) {
  return typeof name === "string" ? name.trim() : "";
}

/** The aggregate AGENTS.md text for one persona pack. */
function assemblePersona(files, personaName) {
  const parts = [
    "# {name} — DeepSeek Harness persona",
    "",
    `> ${GENERATED_MARKER}（2026-08-16）。Active persona: ${personaName}。`,
    "> Files: SOUL.md / IDENTITY.md / USER.md / AGENTS.md / MEMORY.md, merged verbatim.",
    "",
  ];
  for (const fname of PERSONA_FILES) {
    const f = files.find((x) => x.name === fname);
    if (!f) continue;
    parts.push(`<!-- ============ ${fname} ============ -->`);
    try {
      parts.push(readFileSync(f.path, "utf8").trimEnd());
    } catch (error) {
      parts.push(`<!-- ${fname}: unreadable: ${error instanceof Error ? error.message : String(error)} -->`);
    }
    parts.push("");
  }
  return parts.join("\n").replace("{name}", personaName) + "\n";
}

/** Read a persona pack: name, present files, last-modified, whether active. */
function readPersona(root, dir, activeName) {
  const stats = [];
  let updatedAt = 0;
  for (const fname of PERSONA_FILES) {
    const p = join(dir, fname);
    try {
      if (existsSync(p) && statSync(p).isFile()) {
        const st = statSync(p);
        stats.push({ name: fname, size: st.size });
        if (st.mtimeMs > updatedAt) updatedAt = st.mtimeMs;
      }
    } catch {
      /* ignore */
    }
  }
  return {
    name: dir.split("/").pop(),
    active: dir.split("/").pop() === activeName,
    files: stats,
    updatedAt: updatedAt > 0 ? new Date(updatedAt).toISOString() : null,
  };
}

// ---------------------------------------------------------------------------
// routes
// ---------------------------------------------------------------------------

function apply(ctx, config) {
  const webServer = ctx.get("webServer");
  if (webServer === void 0) return;

  const routes = [
    { path: `${API_PREFIX}/list`, handler: list },
    { path: `${API_PREFIX}/new`, handler: createPersona },
    { path: `${API_PREFIX}/activate`, handler: activate },
    { path: `${API_PREFIX}/save`, handler: save },
    { path: `${API_PREFIX}/delete`, handler: removePersona },
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
    }), `dsh-persona: ${route.path}`);
  }

  /** Which persona is currently aggregated into ~/.dsh/AGENTS.md? */
  function activePersonaName() {
    try {
      const p = join(expandHome("~/.dsh"), "AGENTS.md");
      if (!existsSync(p)) return null;
      const text = readFileSync(p, "utf8");
      if (!text.includes(GENERATED_MARKER)) return null;
      const m = /Active persona: ([A-Za-z0-9._-]+)/.exec(text);
      return m ? m[1] : null;
    } catch {
      return null;
    }
  }

  async function list(ctx, req, res) {
    const root = personasRoot();
    const activeName = activePersonaName();
    const personas = [];
    if (existsSync(root)) {
      try {
        const entries = readdirSync(root, { withFileTypes: true });
        for (const e of entries) {
          if (!e.isDirectory()) continue;
          const p = join(root, e.name);
          if (!/^[A-Za-z0-9._-]{1,64}$/.test(e.name)) continue;
          personas.push(readPersona(root, p, activeName));
        }
      } catch (error) {
        sendJson(res, 500, { ok: false, error: `cannot list personas: ${error instanceof Error ? error.message : String(error)}` });
        return;
      }
    }
    sendJson(res, 200, { ok: true, active: activeName, personas });
  }

  async function createPersona(ctx, req, res) {
    const body = await readJsonBody(req).catch(() => null);
    const personaName = safeName(body !== null && typeof body.name === "string" ? body.name : "");
    if (!/^[A-Za-z0-9._-]{1,64}$/.test(personaName)) {
      sendJson(res, 400, { ok: false, error: "persona name must be 1-64 chars of [A-Za-z0-9._-]" });
      return;
    }
    const root = personasRoot();
    const dir = personaDir(root, personaName);
    if (dir === null) {
      sendJson(res, 400, { ok: false, error: "invalid persona name" });
      return;
    }
    if (existsSync(dir)) {
      sendJson(res, 400, { ok: false, error: `persona "${personaName}" already exists` });
      return;
    }
    try {
      mkdirSync(dir, { recursive: true });
      const templates = {
        "IDENTITY.md": `# IDENTITY.md - Who Am I?\n\n- **Name:** ${personaName}\n- **Creature:** AI assistant\n- **Vibe:** clean, capable, honest\n- **Emoji:** ✨\n`,
        "SOUL.md": `# SOUL.md - Who You Are\n\n## Mission\n\nYou are **${personaName}** — an AI assistant working with a human partner.\n\n## Core Truths\n\n- Be genuinely helpful, not performatively helpful.\n- Have opinions; don't be a search engine with extra steps.\n- Be resourceful before asking.\n- Verify before claiming.\n\n## Boundaries\n\n- Private things stay private.\n- No external actions without explicit approval.\n\n## Vibe\n\nBe the assistant you'd actually want to talk to.\n`,
        "USER.md": `# USER.md - About Your Human\n\n- **Name:** (fill in)\n- **Timezone:** (fill in)\n- **Notes:** (fill in)\n`,
        "AGENTS.md": `# AGENTS.md - Operating Instructions\n\n## Memory\n\nYou wake up fresh each session. These files are your continuity:\n\n- **Daily notes:** \`memory/YYYY-MM-DD.md\` — raw logs of what happened\n- **Long-term:** \`MEMORY.md\` — curated memories\n\nWrite it down. No mental notes.\n\n## Red Lines\n\n- Don't exfiltrate private data. Ever.\n- Don't run destructive commands without asking.\n`,
        "MEMORY.md": `# MEMORY.md - Long-Term Memory\n\n> Start small. Curate over time.\n\n- (first durable fact)\n`,
      };
      for (const [fname, content] of Object.entries(templates)) {
        writeFileSync(join(dir, fname), content);
      }
    } catch (error) {
      sendJson(res, 500, { ok: false, error: `cannot create persona: ${error instanceof Error ? error.message : String(error)}` });
      return;
    }
    sendJson(res, 200, { ok: true, persona: readPersona(root, dir, activePersonaName()) });
  }

  async function activate(ctx, req, res) {
    const body = await readJsonBody(req).catch(() => null);
    const personaName = safeName(body !== null && typeof body.name === "string" ? body.name : "");
    const root = personasRoot();
    const dir = personaDir(root, personaName);
    if (dir === null || !existsSync(dir)) {
      sendJson(res, 400, { ok: false, error: `persona "${personaName}" not found` });
      return;
    }
    const files = [];
    for (const fname of PERSONA_FILES) {
      const p = join(dir, fname);
      try {
        if (existsSync(p) && statSync(p).isFile()) files.push({ name: fname, path: p });
      } catch {
        /* ignore */
      }
    }
    if (files.length === 0) {
      sendJson(res, 400, { ok: false, error: `persona "${personaName}" has no files` });
      return;
    }

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

    const assembled = assemblePersona(files, personaName);
    try {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, assembled);
    } catch (error) {
      sendJson(res, 500, { ok: false, error: `cannot write ${target}: ${error instanceof Error ? error.message : String(error)}` });
      return;
    }
    sendJson(res, 200, {
      ok: true,
      active: personaName,
      target,
      files: files.map((f) => f.name),
      bytes: assembled.length,
      backedUp,
      note: "Written to the DSH global instruction layer ~/.dsh/AGENTS.md; new sessions inject it automatically.",
    });
  }

  async function save(ctx, req, res) {
    const body = await readJsonBody(req).catch(() => null);
    const personaName = safeName(body !== null && typeof body.name === "string" ? body.name : "");
    const fname = body !== null && typeof body.file === "string" ? body.file.trim() : "";
    const content = body !== null && typeof body.content === "string" ? body.content : "";
    if (!PERSONA_FILES.includes(fname)) {
      sendJson(res, 400, { ok: false, error: `file must be one of ${PERSONA_FILES.join(", ")}` });
      return;
    }
    if (content.length > MAX_FILE_BYTES) {
      sendJson(res, 400, { ok: false, error: "content too large" });
      return;
    }
    const root = personasRoot();
    const dir = personaDir(root, personaName);
    if (dir === null || !existsSync(dir)) {
      sendJson(res, 400, { ok: false, error: `persona "${personaName}" not found` });
      return;
    }
    try {
      writeFileSync(join(dir, fname), content);
    } catch (error) {
      sendJson(res, 500, { ok: false, error: `cannot save: ${error instanceof Error ? error.message : String(error)}` });
      return;
    }
    sendJson(res, 200, { ok: true, persona: readPersona(root, dir, activePersonaName()) });
  }

  async function removePersona(ctx, req, res) {
    const body = await readJsonBody(req).catch(() => null);
    const personaName = safeName(body !== null && typeof body.name === "string" ? body.name : "");
    const root = personasRoot();
    const dir = personaDir(root, personaName);
    if (dir === null || !existsSync(dir)) {
      sendJson(res, 400, { ok: false, error: `persona "${personaName}" not found` });
      return;
    }
    if (activePersonaName() === personaName) {
      sendJson(res, 400, { ok: false, error: `cannot delete the active persona "${personaName}"` });
      return;
    }
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch (error) {
      sendJson(res, 500, { ok: false, error: `cannot delete: ${error instanceof Error ? error.message : String(error)}` });
      return;
    }
    sendJson(res, 200, { ok: true, removed: personaName });
  }
}

export { name, inject, apply };
