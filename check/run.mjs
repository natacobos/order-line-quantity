// `npm run check`: one line per task, for the interviewer. Do not edit anything in check/.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(ROOT, "check", ".out");
const node = (args) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8" });
rmSync(OUT, { recursive: true, force: true });

node([join(ROOT, "node_modules", "vitest", "vitest.mjs"), "run", "--config", "check/vitest.config.mjs",
  "--reporter=json", "--outputFile", join(OUT, "check.json")]);
let tests = [];
try {
  tests = JSON.parse(readFileSync(join(OUT, "check.json"), "utf8")).testResults.flatMap((f) => f.assertionResults);
} catch {}
const passed = (task) => tests.filter((t) => t.fullName.startsWith(task) && t.status === "passed").length;

const tsc = node([join(ROOT, "node_modules", "typescript", "bin", "tsc"), "--noEmit"]);
const tsErrors = (tsc.stdout.match(/error TS/g) ?? []).length;

const files = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));
const src = files(join(ROOT, "src")).map((f) => readFileSync(f, "utf8")).join("\n");
const unsafe = (src.match(/:\s*any\b|\bas any\b|<any>|@ts-ignore|@ts-nocheck|@ts-expect-error/g) ?? []).length;

const hash = createHash("sha256");
for (const f of readdirSync(join(ROOT, "check")).filter((f) => f !== ".out").sort()) hash.update(f).update(readFileSync(join(ROOT, "check", f)));

const mark = (ok) => (ok ? "✓" : "✗");
const line = (label, text) => console.log(label.padEnd(22, ".") + " " + text);
console.log("\nOrder line quantity — check\n");
line("T1 Endpoint", `${passed("task 1")}/6 checks ${mark(passed("task 1") === 6)}`);
line("T2 Screen", `${passed("task 2")}/3 checks ${mark(passed("task 2") === 3)}`);
line("TypeScript", tsErrors ? `${tsErrors} errors ✗` : "compiles ✓");
line("Unsafe shortcuts", unsafe ? `${unsafe} (any / @ts-ignore) ✗` : "none ✓");
line("Check files", hash.digest("hex").slice(0, 8));
console.log("");
