// Host-half integration test for dsh-soul: drive apply() with a mock ctx and
// exercise the routes against a fake $HOME (~/.dsh/souls, ~/.dsh/AGENTS.md).
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

const src = readFileSync(new URL("./src/index.js", import.meta.url), "utf8");
const shim = src
  .replace('import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdirSync, rmSync, copyFileSync, utimesSync } from "node:fs";', 'const { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdirSync, rmSync, copyFileSync, utimesSync } = await import("node:fs");')
  .replace('import { join, dirname, extname } from "node:path";', 'const { join, dirname, extname } = await import("node:path");')
  .replace('import { homedir } from "node:os";', 'const { homedir } = await import("node:os");')
  .replace("export { name, inject, apply };", "export { name, inject, apply };");
const mod = await import("data:text/javascript;base64," + Buffer.from(shim).toString("base64"));
const { apply } = mod;

let failures = 0;
const check = (cond, label) => {
  if (cond) console.log(`  ok  ${label}`);
  else { failures += 1; console.log(`FAIL  ${label}`); }
};

const root = join(tmpdir(), "dsh-soul-e2e-" + randomBytes(4).toString("hex"));
const fakeHome = join(root, "home");
mkdirSync(fakeHome, { recursive: true });
const savedHome = process.env.HOME;
process.env.HOME = fakeHome;

const registered = [];
const ctx = {
  get(n) { if (n === "webServer") return { register: (r) => { registered.push(r); return () => {}; } }; return void 0; },
  effect(fn) { return fn(); },
};
apply(ctx, {});

function fakeReq(body) {
  const chunks = [Buffer.from(JSON.stringify(body))];
  let sent = false;
  return {
    on(ev, cb) { if (ev === "data" && !sent) { sent = true; for (const c of chunks) cb(c); } if (ev === "end") cb(); return this; },
    destroy() {},
  };
}
function fakeRes() {
  const out = { status: 0, body: null, buffer: null };
  return {
    writeHead(s, h) { out.status = s; out.headers = h; },
    end(p) { if (typeof p === "string") out.body = p; else out.buffer = p; },
    out,
  };
}
const byPath = (p) => registered.find((r) => r.path === p);
const call = async (path, body) => {
  const res = fakeRes();
  await byPath(path).handler(fakeReq(body), res);
  return { status: res.out.status, body: res.out.body !== null ? JSON.parse(res.out.body) : null, buffer: res.out.buffer };
};
const agentsPath = join(fakeHome, ".dsh", "AGENTS.md");

// --- 1. empty list -----------------------------------------------------------
{
  const r = await call("/api/dsh-soul/list", {});
  check(r.status === 200 && r.body.souls.length === 0 && r.body.active === null, "list: empty to start");
}

// --- 2. create ---------------------------------------------------------------
{
  const r = await call("/api/dsh-soul/new", { name: "kagura" });
  check(r.status === 200 && r.body.soul.dna.length === 5, "new: skeleton with 5 DNA files");
  check(r.body.soul.notes === 0 && r.body.soul.beliefsBytes > 0, "new: beliefs + memory dirs seeded");
  check((await call("/api/dsh-soul/new", { name: "kagura" })).status === 400, "new: duplicate rejected");
  check((await call("/api/dsh-soul/new", { name: "../evil" })).status === 400, "new: traversal rejected");
}

// --- 3. activate -------------------------------------------------------------
{
  const r = await call("/api/dsh-soul/activate", { name: "kagura" });
  check(r.status === 200 && r.body.active === "kagura" && r.body.activations === 1, "activate: ok, activation #1");
  const text = readFileSync(agentsPath, "utf8");
  check(text.includes("由 dsh-soul 生成") && text.includes("Active soul: kagura"), "activate: marker + soul name");
  check(text.includes("# SOUL.md") && text.includes("# MEMORY.md"), "activate: DNA aggregated");
  const r2 = await call("/api/dsh-soul/list", {});
  check(r2.body.active === "kagura" && r2.body.souls[0].active === true, "list: kagura active");
  const r3 = await call("/api/dsh-soul/activate", { name: "kagura" });
  check(r3.body.activations === 2 && r3.body.backedUp === false, "activate: re-run overwrites without backup");
}

// --- 4. lazy re-aggregation ---------------------------------------------------
{
  // Edit SOUL.md directly on disk (as the agent would), then list → re-render.
  writeFileSync(join(fakeHome, ".dsh", "souls", "kagura", "SOUL.md"), "# SOUL.md\n\nBe concise.\n");
  const r = await call("/api/dsh-soul/list", {});
  check(r.status === 200 && r.body.ok, "list after direct edit: ok");
  check(readFileSync(agentsPath, "utf8").includes("Be concise."), "lazy sync: DNA edit re-aggregated into AGENTS.md");
}

// --- 5. save (DNA + beliefs) + manifest --------------------------------------
{
  const r = await call("/api/dsh-soul/save", { name: "kagura", file: "MEMORY.md", content: "# MEMORY.md\n\n- fact\n" });
  check(r.status === 200 && r.body.ok, "save DNA: ok");
  const r2 = await call("/api/dsh-soul/save", { name: "kagura", file: "beliefs/candidates.md", content: "# beliefs\n\n- lesson\n" });
  check(r2.status === 200 && r2.body.ok, "save beliefs: ok");
  check((await call("/api/dsh-soul/save", { name: "kagura", file: "../evil.md", content: "x" })).status === 400, "save: traversal rejected");
  const manifest = JSON.parse(readFileSync(join(fakeHome, ".dsh", "souls", "kagura", "manifest.json"), "utf8"));
  check(manifest.dnaChanges.length >= 1 && manifest.activations.length === 2, "manifest: dnaChanges + activations recorded");
}

// --- 6. avatar upload + fetch --------------------------------------------------
{
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01, 0x02, 0x03]);
  const req = {
    url: "/api/dsh-soul/avatar-upload?name=kagura",
    headers: { "content-type": "image/png" },
    on(ev, cb) { if (ev === "data") cb(png); if (ev === "end") cb(); return this; },
    destroy() {},
  };
  const res = fakeRes();
  await byPath("/api/dsh-soul/avatar-upload").handler(req, res);
  check(res.out.status === 200 && JSON.parse(res.out.body).avatar === "avatar.png", "avatar-upload: saved avatar.png");
  const r2 = await call("/api/dsh-soul/avatar", { name: "kagura" });
  check(r2.status === 200 && r2.buffer !== null && r2.buffer.length === png.length, "avatar: fetch returns image bytes");
  const r3 = await call("/api/dsh-soul/list", {});
  check(r3.body.souls[0].avatar === "avatar.png", "list: avatar reported");
}

// --- 6b. get file (editor support) ---------------------------------------------
{
  const r = await call("/api/dsh-soul/get", { name: "kagura", file: "SOUL.md" });
  check(r.status === 200 && r.body.ok && r.body.content.includes("# SOUL.md"), "get: reads SOUL.md content");
  const r2 = await call("/api/dsh-soul/get", { name: "kagura", file: "beliefs/candidates.md" });
  check(r2.status === 200 && r2.body.ok && r2.body.content.length > 0, "get: reads beliefs content");
  const r3 = await call("/api/dsh-soul/get", { name: "kagura", file: "../evil.md" });
  check(r3.status === 400, "get: traversal rejected");
  const r4 = await call("/api/dsh-soul/get", { name: "nope", file: "SOUL.md" });
  check(r4.status === 400, "get: unknown soul rejected");
  // edit round-trip: save then read back
  await call("/api/dsh-soul/save", { name: "kagura", file: "SOUL.md", content: "# SOUL.md\n\nEdited.\n" });
  const r5 = await call("/api/dsh-soul/get", { name: "kagura", file: "SOUL.md" });
  check(r5.body.content.includes("Edited."), "get: reflects saved edit");
}

// --- 6c. growth record --------------------------------------------------------
{
  const r = await call("/api/dsh-soul/growth", { name: "kagura" });
  check(r.status === 200 && r.body.ok, "growth: 200");
  check(Array.isArray(r.body.manifest.activations), "growth: activations array present");
  check(Array.isArray(r.body.manifest.dnaChanges), "growth: dnaChanges array present");
  check(typeof r.body.beliefsCount === "number", "growth: beliefsCount is a number");
  check(typeof r.body.notesCount === "number", "growth: notesCount is a number");
  check(Array.isArray(r.body.notes) && r.body.notes.every((n) => typeof n.name === "string" && typeof n.date === "string"), "growth: notes carry name+date");
  check(Array.isArray(r.body.beliefsRecent) && r.body.beliefsRecent.every((b) => typeof b.date === "string" && typeof b.text === "string"), "growth: beliefsRecent carry date+text");
  check(typeof r.body.born === "string", "growth: born is a date string");
  check(Array.isArray(r.body.monthly) && r.body.monthly.every((x) => typeof x.month === "string" && typeof x.count === "number"), "growth: monthly activity array present");
  // --- raising-sim layer: level/XP/stats/milestones/streak -------------------
  const g = r.body.growth;
  check(g && typeof g.level.level === "number" && g.level.level >= 1 && g.level.level <= 30, "growth: level within 1..30");
  check(g && typeof g.xp.total === "number" && g.xp.total >= 0, "growth: total XP is a non-negative number");
  check(g && g.stats && ["together", "record", "reflect", "evolve", "focus", "belief"].every((k) => typeof g.stats[k] === "number"), "growth: six stat dimensions present");
  check(g && Array.isArray(g.milestones) && g.milestones.length === 12, "growth: milestone wall has 12 entries");
  check(g && Array.isArray(g.cumulative) && g.cumulative.every((c) => typeof c.month === "string" && typeof c.xp === "number"), "growth: cumulative curve present");
  check(g && g.streak && typeof g.streak.max === "number" && typeof g.streak.current === "number", "growth: streak numbers present");
  check(g && g.milestones.every((m) => m.achieved === (m.achieved === true)), "growth: milestones carry achieved flag");
  // writing a daily note scores +10 note XP and unlocks first-note milestone
  const memDir = join(fakeHome, ".dsh", "souls", "kagura", "memory");
  mkdirSync(memDir, { recursive: true });
  const noteDay = new Date().toISOString().slice(0, 10);
  writeFileSync(join(memDir, noteDay + ".md"), "# note\n\nhello growth\n");
  const r2 = await call("/api/dsh-soul/growth", { name: "kagura" });
  check(r2.body.growth.xp.notes === r2.body.notesCount * 10, "growth: note XP scores +10 per note");
  check(r2.body.growth.milestones.find((m) => m.key === "firstNote").achieved === true, "growth: first-note milestone unlocks with a note");
  check((await call("/api/dsh-soul/growth", { name: "nope" })).status === 400, "growth: unknown soul rejected");
}

// --- 7. delete rules ----------------------------------------------------------
{
  check((await call("/api/dsh-soul/delete", { name: "kagura" })).status === 400, "delete: active soul rejected");
  await call("/api/dsh-soul/new", { name: "other" });
  const r = await call("/api/dsh-soul/delete", { name: "other" });
  check(r.status === 200 && r.body.removed === "other", "delete: inactive soul removed");
  check(!existsSync(join(fakeHome, ".dsh", "souls", "other")), "delete: soul dir gone");
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.env.HOME = savedHome;
rmSync(root, { recursive: true, force: true });
process.exit(failures === 0 ? 0 : 1);
