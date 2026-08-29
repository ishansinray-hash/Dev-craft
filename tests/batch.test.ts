import { describe, expect, it } from "vitest";
import { readInputs, runBatch, toSubmission } from "../src/core/batch.js";

describe("judge batch entry point", () => {
  it("accepts wrapped input and emits only id plus the seven required fields", () => {
    const out = runBatch(readInputs({ records: [{
      id: "test-1", domain: "tailor", received_at: "2026-09-01T10:00:00+05:30",
      message: "2 kurta navy blue chest 40 parso tak",
    }] }));
    expect(out.stats).toMatchObject({ count: 1, withItems: 1, dated: 1 });
    expect(JSON.parse(toSubmission(out))).toEqual([expect.objectContaining({
      id: "test-1", customer: null, items: [expect.objectContaining({ description: "kurta", quantity: 2 })],
      due_date: "2026-09-03", amount: null, references_prior_order: false,
      confidence: expect.any(Number), needs_clarification: false,
    })]);
  });
});
