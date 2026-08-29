// Test B in code: does state survive a force-kill and a device restart?
// fake-indexeddb gives us a real IndexedDB; "restart" = drop the Store object
// and open a brand new one against the same database.
import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { Store, OrderDB } from "../src/store/db.js";
import { Editor } from "../src/core/sync/ops.js";
import { materialize } from "../src/core/sync/materialize.js";

// Each case gets its own database. "Restart" = a new Store over the SAME name,
// which is exactly what a force-kill looks like to IndexedDB.
const fresh = (name: string) => new Store(new OrderDB(name));

describe("offline persistence", () => {
  it("survives a restart with the same state", async () => {
    const s1 = fresh("db-restart");
    const c1 = await s1.open();
    const e = new Editor(c1);
    let st = await s1.loadState("ORD-1");
    await s1.commit([e.setField(st, "customer", "Meena aunty")]);
    st = await s1.loadState("ORD-1");
    await s1.commit(e.addItem(st, "kurta", 2, { chest: 40 }));

    // --- force-kill: everything in memory is gone ---
    const s2 = fresh("db-restart");
    await s2.open();
    const after = await s2.loadState("ORD-1");
    expect(after.record.customer).toBe("Meena aunty");
    expect(after.record.items[0].description).toBe("kurta");
    expect(after.record.items[0].attributes.chest).toBe(40);
  });

  it("keeps the same device id and never re-issues a clock value", async () => {
    const s1 = fresh("db-clock");
    const c1 = await s1.open();
    let st = await s1.loadState("ORD-2");
    const before = new Editor(c1).setField(st, "amount", 1200);
    await s1.commit([before]);

    const s2 = fresh("db-clock");
    const c2 = await s2.open();
    expect(c2.node).toBe(c1.node);                    // same device identity
    st = await s2.loadState("ORD-2");
    const after = new Editor(c2).setField(st, "amount", 1500);
    expect(after.hlc > before.hlc).toBe(true);        // clock did not rewind
  });

  it("records basis across a restart, so a sequential edit raises no conflict", async () => {
    const s1 = fresh("db-basis");
    const c1 = await s1.open();
    let st = await s1.loadState("ORD-3");
    await s1.commit([new Editor(c1).setField(st, "due_date", "2026-09-05")]);

    const s2 = fresh("db-basis");
    const c2 = await s2.open();
    st = await s2.loadState("ORD-3");
    await s2.commit([new Editor(c2).setField(st, "due_date", "2026-09-08")]);

    const final = await s2.loadState("ORD-3");
    expect(final.record.due_date).toBe("2026-09-08");
    expect(final.conflicts["fields.due_date"]).toBeUndefined();
  });

  it("tracks the outbox: unsent ops are exactly those with server_seq 0", async () => {
    const s = fresh("db-outbox");
    const c = await s.open();
    const st = await s.loadState("ORD-4");
    const ops = new Editor(c).addItem(st, "pajama", 1);
    await s.commit(ops);
    expect((await s.unsent()).length).toBe(ops.length);

    await s.markSent(ops.map((o, i) => ({ id: o.id, server_seq: i + 1 })));
    expect((await s.unsent()).length).toBe(0);
  });

  it("is idempotent when the relay echoes ops back to their author", async () => {
    const s = fresh("db-echo");
    const c = await s.open();
    const st = await s.loadState("ORD-5");
    const ops = new Editor(c).addItem(st, "blouse", 3);
    await s.commit(ops);
    const before = await s.loadState("ORD-5");
    await s.ingest(ops.map((o) => ({ ...o, server_seq: 9 })), 9);
    expect(await s.loadState("ORD-5")).toEqual(
      { ...before, versions: before.versions, conflicts: before.conflicts });
  });
});