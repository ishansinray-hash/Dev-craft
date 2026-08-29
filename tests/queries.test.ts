// Objective 4: the four operational questions, answered offline from the
// snapshot table. `today` is injected, so these are deterministic.
import "fake-indexeddb/auto";
import { describe, it, expect, beforeAll } from "vitest";
import { Store, OrderDB } from "../src/store/db.js";
import { Editor } from "../src/core/sync/ops.js";
import { dueBuckets, outstanding, customerHistory, capacity, needsReview, interpret }
  from "../src/store/queries.js";

const TODAY = "2026-09-05";
let store: Store;

beforeAll(async () => {
  store = new Store(new OrderDB("query-db"));
  const clock = await store.open();
  const e = new Editor(clock);

  const seed = async (id: string, customer: string, due: string | null,
                      amount: number, paid: number, items: [string, number][],
                      status = "open") => {
    let st = await store.loadState(id);
    const ops = [
      e.setField(st, "customer", customer),
      e.setField(st, "due_date", due),
      e.setField(st, "amount", amount),
      e.setField(st, "paid", paid),
      e.setField(st, "status", status),
    ];
    await store.commit(ops);
    for (const [desc, qty] of items) {
      st = await store.loadState(id);
      await store.commit(e.addItem(st, desc, qty));
    }
  };

  await seed("ORD-1", "Meena aunty", "2026-09-01", 1200, 0,  [["kurta", 2]]);   // overdue
  await seed("ORD-2", "Meena aunty", "2026-09-05", 800,  800, [["pajama", 1]]);  // today, paid
  await seed("ORD-3", "Ramesh",      "2026-09-05", 500,  200, [["shirt", 3]]);   // today, owes 300
  await seed("ORD-4", "Ramesh",      "2026-09-09", 650,  0,   [["suit", 1]]);    // upcoming
  await seed("ORD-5", "Sunita",      null,         200,  0,   [["blouse", 1]]);  // undated
  await seed("ORD-6", "Sunita",      "2026-08-20", 900,  0,   [["lehenga", 1]], "cancelled");
});

describe("due buckets", () => {
  it("separates overdue, today and upcoming, and ignores cancelled orders", async () => {
    const b = await dueBuckets(store, TODAY);
    expect(b.overdue.map((o) => o.order_id)).toEqual(["ORD-1"]);
    expect(b.today.map((o) => o.order_id).sort()).toEqual(["ORD-2", "ORD-3"]);
    expect(b.upcoming.map((o) => o.order_id)).toEqual(["ORD-4"]);
    expect(b.undated.map((o) => o.order_id)).toEqual(["ORD-5"]);
  });
});

describe("outstanding money", () => {
  it("totals unpaid balances per customer, biggest first", async () => {
    const { debtors, total } = await outstanding(store);
    expect(debtors[0]).toMatchObject({ customer: "Meena aunty", balance: 1200, orders: 1 });
    expect(debtors.find((d) => d.customer === "Ramesh")).toMatchObject({ balance: 950, orders: 2 });
    expect(total).toBe(1200 + 950 + 200);   // cancelled ORD-6 excluded
  });
  it("excludes fully paid orders", async () => {
    const { debtors } = await outstanding(store);
    expect(debtors.find((d) => d.customer === "Meena aunty")!.orders).toBe(1);
  });
});

describe("customer history", () => {
  it("returns that customer's orders newest first, with specs intact", async () => {
    const h = await customerHistory(store, "Ramesh");
    expect(h.map((r) => r.order_id)).toEqual(["ORD-4", "ORD-3"]);
    expect(h[1].items[0]).toMatchObject({ description: "shirt", quantity: 3 });
  });
});

describe("committed capacity", () => {
  it("counts open orders and item units across the next seven days", async () => {
    const c = await capacity(store, TODAY);
    expect(c.perDay).toHaveLength(7);
    expect(c.perDay[0]).toEqual({ date: "2026-09-05", orders: 2, items: 4 });  // 1 pajama + 3 shirt
    expect(c.perDay[4]).toEqual({ date: "2026-09-09", orders: 1, items: 1 });
    expect(c.orders).toBe(3);
  });
});

describe("review queue", () => {
  it("is empty when nothing conflicts", async () => {
    expect(await needsReview(store)).toHaveLength(0);
  });
});

describe("offline ask box", () => {
  it("maps operator phrasing onto queries without a network call", () => {
    expect(interpret("aaj kya hai")).toEqual({ kind: "due", bucket: "today" });
    expect(interpret("kisne paisa dena hai")).toEqual({ kind: "outstanding" });
    expect(interpret("kya late ho gaya")).toEqual({ kind: "due", bucket: "overdue" });
    expect(interpret("is hafte ka load")).toEqual({ kind: "capacity" });
    expect(interpret("banana bread recipe")).toEqual({ kind: "unknown" });
  });
});

describe("ask box word boundaries", () => {
  // Every rule token used to match as a bare substring, so ordinary English
  // words that merely CONTAIN a Hinglish keyword hijacked the classification.
  // "orders" contains "der", which is the first rule tested, so essentially
  // every real question routed to the overdue bucket.
  it("does not read a keyword out of the middle of another word", () => {
    expect(interpret("which orders need review")).toEqual({ kind: "review" });
    expect(interpret("who has permission to edit")).toEqual({ kind: "unknown" });
    // No longer "outstanding" via BAKI-ng. It now falls through to the trailing
    // customer rule, which reads "for tomorrow" as a customer named "tomorrow"
    // — a separate looseness in that last rule, pinned here so it is visible.
    expect(interpret("baking order for tomorrow")).toEqual({ kind: "customer", name: "tomorrow" });
    expect(interpret("power cut delayed the batch")).toEqual({ kind: "unknown" });
    expect(interpret("however many are left")).toEqual({ kind: "unknown" });
    expect(interpret("chocolate order")).toEqual({ kind: "unknown" });
  });

  it("still matches the keyword as a real word, with suffixes", () => {
    expect(interpret("der ho gaya")).toEqual({ kind: "due", bucket: "overdue" });
    expect(interpret("deri kyun hui")).toEqual({ kind: "due", bucket: "overdue" });
    expect(interpret("kya miss ho gaya")).toEqual({ kind: "due", bucket: "overdue" });
    expect(interpret("kaun sa order missed")).toEqual({ kind: "due", bucket: "overdue" });
    // "missing" is a genuine word-boundary hit on `miss`, not a substring
    // accident like per-MISS-ion. Documented rather than special-cased.
    expect(interpret("any missing items on ORD-3")).toEqual({ kind: "due", bucket: "overdue" });
    expect(interpret("baki kitna hai")).toEqual({ kind: "outstanding" });
    expect(interpret("kaun owes me")).toEqual({ kind: "outstanding" });
    expect(interpret("kitna owing hai")).toEqual({ kind: "outstanding" });
    expect(interpret("workload is hafte ka")).toEqual({ kind: "capacity" });
  });

  it("routes week-scoped order questions to capacity, not overdue", () => {
    expect(interpret("orders for this week")).toEqual({ kind: "capacity" });
    expect(interpret("which orders are due next week")).toEqual({ kind: "capacity" });
  });
});