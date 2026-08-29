// Held-out evaluation. Splits the labelled set so you stop scoring yourself on
// data you tuned against. Usage: node eval.mjs [input.json] [holdout_fraction]
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const source = resolve(process.argv[2] ?? "Given_materials/messages_train.json");
const frac = Number(process.argv[3] ?? 0.2);
if (!Number.isFinite(frac) || frac <= 0 || frac >= 1) throw new Error("holdout_fraction must be between 0 and 1");
const suffix = `${process.pid}-${Date.now()}`;
const holdoutPath = join(tmpdir(), `devcraft-holdout-${suffix}.json`);
const predictionPath = join(tmpdir(), `devcraft-prediction-${suffix}.json`);
const scorePath = join(tmpdir(), `devcraft-score-${suffix}.json`);

const python = process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3");
const all = JSON.parse(readFileSync(source, "utf8"));
// Deterministic split: every 1/frac-th record, so re-runs are comparable.
const step = Math.round(1 / frac);
const held = all.filter((_, i) => i % step === 0);
writeFileSync(holdoutPath, JSON.stringify(held));
execFileSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "src/cli.ts", "--in", holdoutPath, "--out", predictionPath], { stdio: "inherit" });
execFileSync(python, ["Given_materials/score.py", "--gold", holdoutPath, "--pred", predictionPath, "--out", scorePath], { stdio: "inherit" });
console.error(`holdout score written to ${scorePath}`);