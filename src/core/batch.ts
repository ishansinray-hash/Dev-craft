// Test A entry point, as a pure function. Both the CLI and the in-app judge
// screen call this, so the deployed app and the terminal produce byte-identical
// output. Zero I/O, so it runs in the browser with the network off.
import { parse, type InputRecord, type OrderRecord } from "./parsar/parse.js";

export type BatchRow = OrderRecord & { id: string };
export type BatchOutput = {
  results: BatchRow[];
  stats: { count: number; ms: number; flagged: number; dated: number; withItems: number };
};

/** Accepts a bare array or the wrapped shapes score.py tolerates. */
export function readInputs(blob: unknown): InputRecord[] {
  if (Array.isArray(blob)) return blob as InputRecord[];
  const o = blob as Record<string, unknown>;
  for (const k of ["records", "messages", "data", "results"])
    if (Array.isArray(o?.[k])) return o[k] as InputRecord[];
  throw new Error("expected a JSON array of input records");
}

export function runBatch(rows: InputRecord[]): BatchOutput {
  const t0 = Date.now();
  const results = rows.map((r) => ({ id: r.id, ...parse(r) }));
  return {
    results,
    stats: {
      count: results.length,
      ms: Date.now() - t0,
      flagged: results.filter((r) => r.needs_clarification).length,
      dated: results.filter((r) => r.due_date !== null).length,
      withItems: results.filter((r) => r.items.length > 0).length,
    },
  };
}

/** Exactly the shape score.py expects: a JSON list of id + the seven fields. */
export const toSubmission = (out: BatchOutput) => JSON.stringify(out.results, null, 1);