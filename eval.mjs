// Held-out evaluation. Splits the labelled set so you stop scoring yourself on
// data you tuned against. Usage: node eval.mjs [holdout_fraction]
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
const SRC = "/mnt/user-data/uploads/messages_train.json";
const frac = Number(process.argv[2] ?? 0.2);
const all = JSON.parse(readFileSync(SRC, "utf8"));
// Deterministic split: every 1/frac-th record, so re-runs are comparable.
const step = Math.round(1 / frac);
const held = all.filter((_, i) => i % step === 0);
writeFileSync("/tmp/holdout.json", JSON.stringify(held));
execSync(`npx tsx src/cli.ts --in /tmp/holdout.json --out /tmp/holdout_pred.json`, { stdio: "inherit" });
execSync(`python3 /mnt/user-data/uploads/score.py --gold /tmp/holdout.json --pred /tmp/holdout_pred.json`, { stdio: "inherit" });
