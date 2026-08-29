// Batch entry point. This is the interface judges drive in Test A.
//   npx tsx src/cli.ts --in messages_test_inputs.json --out results.json
import { readFileSync, writeFileSync } from "node:fs";
import { parse, InputRecord } from "./parse.js";

const args = process.argv.slice(2);
const arg = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const inPath = arg("--in"), outPath = arg("--out") ?? "results.json";
if (!inPath) { console.error("usage: --in <inputs.json> [--out <results.json>]"); process.exit(1); }

const raw = JSON.parse(readFileSync(inPath, "utf8"));
const rows: InputRecord[] = Array.isArray(raw) ? raw : raw.records ?? raw.messages ?? raw.data;

const t0 = Date.now();
const results = rows.map((r) => ({ id: r.id, ...parse(r) }));
writeFileSync(outPath, JSON.stringify(results, null, 1));
console.error(`parsed ${results.length} messages in ${Date.now() - t0}ms -> ${outPath}`);
