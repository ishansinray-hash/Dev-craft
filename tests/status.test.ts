// The order lifecycle the operator drives from the UI. The merge layer must
// carry every workflow status, not just the two the sync contract started with.
import "fake-indexeddb/auto";
import { describe, it, expect, beforeAll } from "vitest";
import { Clock } from "../src/core/sync/hlc.js";
import { Editor } from "../src/core/sync/ops.js";
import { materialize } from "../src/core/sync/materialize.js";
import { Store, OrderDB } from "../src/store/db.js";
import { dueBuckets, capacity, outstanding } from "../src/store/queries.js";

const WORKFLOW = ["open", "in_progress", "ready", "delivered", "cancelled"] as const;

describe("order workflow status", () => {
  it("materialises every status the UI can write", () => {
    const e = new Editor(new Clock("dev1"));
    const base = [e.setField(materialize([], "ORD-1"), "customer", "Meena")];

    for (const status of WORKFLOW) {
      const state = materialize(base, "ORD-1");
      const op = e.setField(state, "status", status);
      expect(materialize([...base, op], "ORD-1").record.status).toBe(status);
    }
  });

  it("ignores a status value that is not part of the lifecycle", () => {
    const e = new Editor(new Clock("dev1"));
    const base = [e.setField(materialize([], "ORD-1"), "customer", "Meena")];
    const op = e.setField(materialize(base, "ORD-1"), "status", "banana");
    expect(materialize([...base, op], "ORD-1").record.status).toBe("open");
  });
});

describe("queries across the lifecycle", () => {
  const TODAY = "2026-09-05";
  let store: Store;

  beforeAll(async () => {
    store = new Store(new OrderDB("status-db"));
    const clock = await store.open();
    const e = new Editor(clock);
    const seed = async (id: string, status: string, due: string, amount: number, paid: number) => {
      const st = await store.loadState(id);
      await store.commit([
        e.setField(st, "customer", `C-${id}`),
        e.setField(st, "due_date", due),
        e.setField(st, "amount", amount),
        e.setField(st, "paid", paid),
        e.setField(st, "status", status),
      ]);
      await store.commit(e.addItem(await store.loadState(id), "kurta", 2));
    };
    await seed("ORD-open", "open", TODAY, 100, 0);
    await seed("ORD-wip", "in_progress", TODAY, 100, 0);
    await seed("ORD-ready", "ready", TODAY, 100, 0);
    await seed("ORD-done", "delivered", TODAY, 100, 40);
    await seed("ORD-void", "cancelled", TODAY, 100, 0);
  });

  it("counts work still on the bench as due today, not finished or cancelled work", async () => {
    const buckets = await dueBuckets(store, TODAY);
    expect(buckets.today.map((o) => o.order_id).sort())
      .toEqual(["ORD-open", "ORD-ready", "ORD-wip"]);
  });

  it("counts committed capacity from work still on the bench", async () => {
    const week = await capacity(store, TODAY);
    expect(week.orders).toBe(3);
    expect(week.items).toBe(6);
  });

  it("still chases money owed on a delivered order", async () => {
    const { debtors } = await outstanding(store);
    expect(debtors.map((d) => d.customer)).toContain("C-ORD-done");
    expect(debtors.map((d) => d.customer)).not.toContain("C-ORD-void");
  });
});
