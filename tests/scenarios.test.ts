// The three sequences from conflict_scenarios.md, run in BOTH reconnection
// orders. Pass = identical final state, and no edit lost without being surfaced.
import { describe, it, expect } from "vitest";
import { Clock } from "../src/core/sync/hlc.js";
import { Editor } from "../src/core/sync/ops.js";
import { materialize } from "../src/core/sync/materialize.js";
import { Op } from "../src/core/sync/types.js";

const at = (h: number, m: number) => Date.UTC(2026, 8, 1, h, m, 0);

/** The shared initial state both devices start from, already synced. */
function initial(): Op[] {
  const c = new Clock("seed"), e = new Editor(c);
  let ops: Op[] = [];
  const st = () => materialize(ops, "ORD-1042");
  const push = (o: Op | Op[]) => { ops = [...ops, ...(Array.isArray(o) ? o : [o])]; };
  push(e.setField(st(), "customer", "Meena aunty", at(9, 0)));
  push(e.setField(st(), "due_date", "2026-09-05", at(9, 0)));
  push(e.setField(st(), "amount", 1200, at(9, 0)));
  for (const [id, desc, qty, attrs] of [
    ["it-1", "kurta", 2, { color: "navy blue", chest: 40 }],
    ["it-2", "pajama", 1, { color: "cream", waist: 34 }],
  ] as const) {
    push(e.setItemField(st(), id, "description", desc, at(9, 0)));
    push(e.setItemField(st(), id, "quantity", qty, at(9, 0)));
    for (const [k, v] of Object.entries(attrs)) push(e.setItemAttr(st(), id, k, v, at(9, 0)));
  }
  return ops;
}

/** Both devices load the shared state, go offline, and diverge. */
function split(
  a: (e: Editor, s: () => ReturnType<typeof materialize>) => Op[],
  b: (e: Editor, s: () => ReturnType<typeof materialize>) => Op[],
) {
  const base = initial();
  const frozen = materialize(base, "ORD-1042");           // what BOTH devices see
  const opsA = a(new Editor(new Clock("dev-a")), () => frozen);
  const opsB = b(new Editor(new Clock("dev-b")), () => frozen);
  return {
    base,
    aFirst: materialize([...base, ...opsA, ...opsB], "ORD-1042"),
    bFirst: materialize([...base, ...opsB, ...opsA], "ORD-1042"),
  };
}

describe("scenario 1 - disjoint field edits", () => {
  const r = split(
    (e, s) => [e.setField(s(), "due_date", "2026-09-08", at(10, 12))],
    (e, s) => [e.setField(s(), "amount", 1500, at(10, 15))],
  );
  it("converges under both reconnection orders", () => {
    expect(r.aFirst).toEqual(r.bFirst);
  });
  it("keeps BOTH edits - no whole-record last-writer-wins", () => {
    expect(r.aFirst.record.due_date).toBe("2026-09-08");
    expect(r.aFirst.record.amount).toBe(1500);
  });
  it("raises no conflict, because nothing was overwritten", () => {
    expect(Object.keys(r.aFirst.conflicts)).toHaveLength(0);
  });
});

describe("scenario 2 - concurrent edit to the same field, identical timestamps", () => {
  const r = split(
    (e, s) => [e.setItemField(s(), "it-1", "quantity", 3, at(11, 3))],
    (e, s) => [e.setItemField(s(), "it-1", "quantity", 5, at(11, 3))],
  );
  const path = "items.it-1.quantity";
  it("converges under both reconnection orders", () => {
    expect(r.aFirst).toEqual(r.bFirst);
  });
  it("picks the same winner both times - device id breaks the tie", () => {
    const q = r.aFirst.record.items.find((i: any) => i.item_id === "it-1")!.quantity;
    expect(q).toBe(r.bFirst.record.items.find((i: any) => i.item_id === "it-1")!.quantity);
    expect([3, 5]).toContain(q);
  });
  it("surfaces the losing edit instead of dropping it", () => {
    expect(r.aFirst.conflicts[path]).toBeDefined();
    expect(r.aFirst.conflicts[path].losers).toHaveLength(1);
    const shown = [r.aFirst.conflicts[path].winner.value, r.aFirst.conflicts[path].losers[0].value];
    expect(shown.sort()).toEqual([3, 5]);
  });
});

describe("scenario 3 - delete versus update", () => {
  // POLICY (stated before the test, per conflict_scenarios.md):
  // the tombstone wins and the item stays deleted; B's two edits are surfaced
  // against the tombstone so the operator can undo. We know this is the wrong
  // default if the delete was a mistake rather than a cancellation.
  const r = split(
    (e, s) => [e.deleteItem(s(), "it-2", at(14, 20))],
    (e, s) => [
      e.setItemAttr(s(), "it-2", "color", "black", at(14, 22)),
      e.setItemField(s(), "it-2", "quantity", 4, at(14, 23)),
    ],
  );
  const tomb = "items.it-2.__deleted";
  it("converges under both reconnection orders", () => {
    expect(r.aFirst).toEqual(r.bFirst);
  });
  it("keeps the item deleted", () => {
    expect(r.aFirst.record.items.map((i: any) => i.item_id)).toEqual(["it-1"]);
  });
  it("surfaces BOTH discarded edits against the tombstone", () => {
    expect(r.aFirst.conflicts[tomb]).toBeDefined();
    const lost = r.aFirst.conflicts[tomb].losers.map((o: any) => o.value).sort();
    expect(lost).toEqual([4, "black"]);
  });
});

describe("sequential edits are not conflicts", () => {
  it("stays silent when the second author could see the first value", () => {
    const base = initial();
    const e = new Editor(new Clock("dev-a"));
    let ops = base;
    ops = [...ops, e.setField(materialize(ops, "ORD-1042"), "due_date", "2026-09-08", at(10, 12))];
    ops = [...ops, e.setField(materialize(ops, "ORD-1042"), "due_date", "2026-09-14", at(10, 30))];
    const st = materialize(ops, "ORD-1042");
    expect(st.record.due_date).toBe("2026-09-14");
    expect(st.conflicts["fields.due_date"]).toBeUndefined();
  });
});