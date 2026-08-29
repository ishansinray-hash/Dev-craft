// Batch entry point. This is the interface judges drive in Test A.
//   npx tsx src/cli.ts --in messages_test_inputs.json --out results.json
import { readFileSync, writeFileSync } from "node:fs";
import { readInputs, runBatch, toSubmission } from "./core/batch.js";

const args = process.argv.slice(2);
const arg = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const inPath = arg("--in"), outPath = arg("--out") ?? "results.json";
if (!inPath) { console.error("usage: --in <inputs.json> [--out <results.json>]"); process.exit(1); }

const out = runBatch(readInputs(JSON.parse(readFileSync(inPath, "utf8"))));
writeFileSync(outPath, toSubmission(out));
console.error(`parsed ${out.stats.count} messages in ${out.stats.ms}ms -> ${outPath}`);
