// Host-half integration test: shim src/index.js (like dsh-migrate-openclaw's
// suite), drive apply() with a mock ctx, and exercise the persona routes
// against a fake $HOME so ~/.dsh/personas and ~/.dsh/AGENTS.md are scratch.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

const src = readFileSync(new URL("./src/index.js", import.meta.url), "utf8");
const shim = src
  .replace('import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdirSync, rmSync, copyFileSync } from "node:fs";', 'const { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdirSync, rmSync, copyFileSync } = await import("node:fs");')
  .replace('import { join, dirname } from "node:path";', 'const { join, dirname } = await import("node:path");')
  .replace('import { homedir } from "node:os";', 'const { homedir } = await import("node:os");')
  .replace("export { name, inject, apply };", "export { name, inject, apply };");
const mod = await import("data:text/javascript;base64," + Buffer.from(shim).toString("base64"));
const { apply } = mod;

let failures = 0;
const check = (cond, label) => {
  if (cond) console.log(`  ok  ${label}`);
  else { failures += 1; console.log(`FAIL  ${label}`); }
};

const root = join(tmpdir(), "dsh-persona-e2e-" + randomBytes(4).toString("hex"));
const fakeHome = join(root, "home");
mkdirSync(fakeHome, { recursive: true });
const savedHome = process.env.HOME;
process.env.HOME = fakeHome;

const registered = [];
const ctx = {
  get(n) {
    if (n === "webServer") return { register: (route) => { registered.push(route); return () => {}; } };
    return void 0;
  },
  effect(fn) { return fn(); },
};
apply(ctx, {});

function fakeReq(body) {
  const chunks = [Buffer.from(JSON.stringify(body))];
  let sent = false;
  return {
    on(ev, cb) {
      if (ev === "data" && !sent) { sent = true; for (const c of chunks) cb(c); }
      if (ev === "end") cb();
      return this;
    },
    destroy() {},
  };
}
function fakeRes() {
  const out = { status: 0, body: null };
  return {
    writeHead(s, h) { out.status = s; out.headers = h; },
    end(p) { out.body = p; },
    out,
  };
}
const byPath = (p) => registered.find((r) => r.path === p);
const call = async (path, body) => {
  const res = fakeRes();
  await byPath(path).handler(fakeReq(body), res);
  return { status: res.out.status, body: JSON.parse(res.out.body) };
};
const agentsPath = join(fakeHome, ".dsh", "AGENTS.md");

// --- 1. empty list -----------------------------------------------------------
{
  const r = await call("/api/dsh-persona/list", {});
  check(r.status === 200 && r.body.ok && r.body.personas.length === 0, "list: empty to start");
  check(r.body.active === null, "list: no active persona");
}

// --- 2. create + list --------------------------------------------------------
{
  const r = await call("/api/dsh-persona/new", { name: "kagura" });
  check(r.status === 200 && r.body.ok && r.body.persona.files.length === 5, "new: skeleton with 5 files");
  const dup = await call("/api/dsh-persona/new", { name: "kagura" });
  check(dup.status === 400, "new: duplicate rejected");
  const bad = await call("/api/dsh-persona/new", { name: "../evil" });
  check(bad.status === 400, "new: traversal name rejected");
  const r2 = await call("/api/dsh-persona/list", {});
  check(r2.body.personas.length === 1 && r2.body.personas[0].name === "kagura" && !r2.body.personas[0].active, "list: one inactive persona");
}

// --- 3. activate -------------------------------------------------------------
{
  const r = await call("/api/dsh-persona/activate", { name: "kagura" });
  check(r.status === 200 && r.body.ok && r.body.active === "kagura", "activate: ok");
  check(existsSync(agentsPath), "activate: ~/.dsh/AGENTS.md written");
  const text = readFileSync(agentsPath, "utf8");
  check(text.includes("由 dsh-persona 生成") && text.includes("Active persona: kagura"), "activate: marker + persona name");
  check(text.includes("# SOUL.md") && text.includes("# MEMORY.md"), "activate: persona files aggregated");
  const r2 = await call("/api/dsh-persona/list", {});
  check(r2.body.active === "kagura" && r2.body.personas[0].active === true, "list: kagura active");
  // re-activate: target carries marker → overwrite without backup
  const r3 = await call("/api/dsh-persona/activate", { name: "kagura" });
  check(r3.status === 200 && r3.body.backedUp === false, "activate: re-run overwrites without backup");
}

// --- 4. save one file --------------------------------------------------------
{
  const r = await call("/api/dsh-persona/save", { name: "kagura", file: "SOUL.md", content: "# SOUL.md\n\nBe concise.\n" });
  check(r.status === 200 && r.body.ok, "save: ok");
  const bad = await call("/api/dsh-persona/save", { name: "kagura", file: "EVIL.md", content: "x" });
  check(bad.status === 400, "save: unknown file rejected");
  // activate again picks up the saved content
  await call("/api/dsh-persona/activate", { name: "kagura" });
  check(readFileSync(agentsPath, "utf8").includes("Be concise."), "activate reflects saved content");
}

// --- 5. delete rules ---------------------------------------------------------
{
  const r = await call("/api/dsh-persona/delete", { name: "kagura" });
  check(r.status === 400, "delete: active persona rejected");
  await call("/api/dsh-persona/new", { name: "other" });
  const r2 = await call("/api/dsh-persona/delete", { name: "other" });
  check(r2.status === 200 && r2.body.removed === "other", "delete: inactive persona removed");
  check(!existsSync(join(fakeHome, ".dsh", "personas", "other")), "delete: pack directory gone");
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.env.HOME = savedHome;
rmSync(root, { recursive: true, force: true });
process.exit(failures === 0 ? 0 : 1);
