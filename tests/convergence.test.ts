import { describe, it, expect } from "vitest";
import { Clock, compare, encodeHLC } from "../src/core/sync/hlc.js";
import { materialize } from "../src/core/sync/materialize.js";
import { Op } from "../src/core/sync/types.js";

const shuffle = <T,>(xs: T[], seed: number): T[] => {
  const a = [...xs]; let s = seed;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

describe("HLC", () => {
  it("is strictly increasing across 1000 ticks", () => {
    const c = new Clock("dev-a");
    let prev = c.tick(1000);
    for (let i = 0; i < 1000; i++) { const n = c.tick(1000); expect(compare(n, prev)).toBe(1); prev = n; }
  });

  it("stays increasing when the wall clock jumps backwards", () => {
    const c = new Clock("dev-a");
    let prev = c.tick(5_000_000);
    for (const now of [4_000_000, 3_000_000, 4_500_000, 1]) {
      const n = c.tick(now); expect(compare(n, prev)).toBe(1); prev = n;
    }
  });

  it("sorts after a remote op once observed, despite a slow local clock", () => {
    const slow = new Clock("dev-a");
    const remote = encodeHLC(9_000_000, 0, "dev-b");
    slow.observe(remote, 1000);          // local clock is 9000s behind
    expect(compare(slow.tick(1000), remote)).toBe(1);
  });

  it("never ties across devices in the same millisecond", () => {
    const a = new Clock("dev-a").tick(1000), b = new Clock("dev-b").tick(1000);
    expect(compare(a, b)).not.toBe(0);
  });
});

describe("materialize", () => {
  const ops: Op[] = [];
  const clocks = ["dev-a", "dev-b", "dev-c"].map((n) => new Clock(n));
  const paths = ["fields.due_date", "fields.amount", "fields.customer",
                 "items.it-1.quantity", "items.it-1.attrs.chest", "items.it-2.description"];
  let seed = 7;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  for (let i = 0; i < 200; i++) {
    const c = clocks[Math.floor(rnd() * 3)];
    const p = paths[Math.floor(rnd() * paths.length)];
    ops.push({ id: `op-${i}`, order_id: "ORD-1", path: p, value: Math.floor(rnd() * 100),
               hlc: c.tick(1_700_000_000_000 + Math.floor(rnd() * 5000)), basis: null, server_seq: 0 });
  }

  it("is order-independent over 100 shuffles", () => {
    const baseline = JSON.stringify(materialize(ops));
    for (let i = 0; i < 100; i++) expect(JSON.stringify(materialize(shuffle(ops, i)))).toBe(baseline);
  });

  it("does not mutate its input", () => {
    const before = ops.map((o) => o.id).join(",");
    materialize(shuffle(ops, 42));
    expect(ops.map((o) => o.id).join(",")).toBe(before);
  });

  it("is idempotent under duplicate delivery", () => {
    expect(JSON.stringify(materialize([...ops, ...ops])))
      .toBe(JSON.stringify(materialize(ops)));
  });
});