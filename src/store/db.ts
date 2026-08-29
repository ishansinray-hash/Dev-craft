import Dexie, { type Table } from "dexie";
import { type Op, type OrderState, type OrderRecordView } from "../core/sync/types.js";
import { materialize } from "../core/sync/materialize.js";
import { Clock } from "../core/sync/hlc.js";

// Local persistence. This is the layer that wins Test B: everything below runs
// with the network off, and survives a force-kill and a device restart because
// IndexedDB is on disk, not in memory.
//
// Two tables and nothing else.
//
//   ops   append-only log. THE source of truth. Never updated in place except
//         to stamp server_seq when the relay acknowledges a push.
//   meta  device id, sync cursor, last issued clock value.

export type Meta = { key: string; value: string };

/**
 * A materialised order, cached so the query screens never re-fold the op log.
 * Rebuilt on every write. The indexed columns are duplicated out of `record`
 * because IndexedDB can only index top-level fields.
 */
export type Snapshot = {
  order_id: string;
  due_date: string | null;
  customer: string | null;
  status: string;
  balance: number;
  item_count: number;
  record: OrderRecordView;
  conflict_count: number;
};

export class OrderDB extends Dexie {
  ops!: Table<Op, string>;
  meta!: Table<Meta, string>;
  orders!: Table<Snapshot, string>;

  constructor(name = "devcraft") {
    super(name);
    // `id` is the primary key, so a push that times out and gets retried can
    // never insert the same op twice. Idempotency comes free from the schema.
    //
    // server_seq is 0 for unsent ops rather than null: IndexedDB skips records
    // whose indexed field is null, so `where("server_seq").equals(0)` would
    // silently return nothing. This is the single most common Dexie footgun.
    this.version(1).stores({
      ops: "id, order_id, server_seq, [order_id+server_seq]",
      meta: "key",
      orders: "order_id, due_date, customer, status, balance",
    });
  }
}

export class Store {
  private clock!: Clock;

  constructor(private db = new OrderDB()) {}

  // ---- lifecycle ---------------------------------------------------------

  /**
   * Call once at startup, before anything else. Restores the device identity
   * and the clock, so a restart never re-issues an HLC it already used.
   */
  async open(): Promise<Clock> {
    let deviceId = await this.get("device_id");
    if (!deviceId) {
      deviceId = crypto.randomUUID().slice(0, 8);
      await this.set("device_id", deviceId);
    }
    this.clock = new Clock(deviceId);
    const last = await this.get("last_hlc");
    if (last) this.clock.restore(last);
    return this.clock;
  }

  getClock(): Clock { return this.clock; }

  // ---- reads -------------------------------------------------------------

  async loadState(orderId: string): Promise<OrderState> {
    const ops = await this.db.ops.where("order_id").equals(orderId).toArray();
    return materialize(ops, orderId);
  }

  /** Read-only access for the query layer. */
  get snapshots(): Table<Snapshot, string> { return this.db.orders; }

  /**
   * Rebuild the cached view of one order. Called after every write, so the
   * query screens read a plain indexed table instead of folding the log.
   */
  async reindex(orderId: string): Promise<OrderState> {
    const state = await this.loadState(orderId);
    const r = state.record;
    await this.db.orders.put({
      order_id: orderId,
      due_date: r.due_date,
      customer: r.customer,
      status: r.status,
      balance: (r.amount ?? 0) - (r.paid ?? 0),
      item_count: r.items.reduce((n, i) => n + (i.quantity ?? 1), 0),
      record: r,
      conflict_count: Object.keys(state.conflicts).length,
    });
    return state;
  }

  async orderIds(): Promise<string[]> {
    const ids = new Set<string>();
    await this.db.ops.each((o) => { ids.add(o.order_id); });
    return [...ids];
  }

  /** Everything the relay has not acknowledged yet. */
  async unsent(): Promise<Op[]> {
    return this.db.ops.where("server_seq").equals(0).toArray();
  }

  async cursor(): Promise<number> {
    return Number(await this.get("cursor") ?? 0);
  }

  // ---- writes ------------------------------------------------------------

  /**
   * Persist locally-created ops. Written in one transaction with the clock
   * high-water mark so a crash mid-write can never leave the clock behind the
   * log — which would let the device re-issue an HLC it has already used.
   */
  async commit(ops: Op[]): Promise<void> {
    if (!ops.length) return;
    const highest = ops.reduce((a, b) => (a.hlc > b.hlc ? a : b)).hlc;
    await this.db.transaction("rw", this.db.ops, this.db.meta, async () => {
      await this.db.ops.bulkPut(ops);
      const prev = await this.get("last_hlc");
      if (!prev || highest > prev) await this.set("last_hlc", highest);
    });
    for (const id of new Set(ops.map((o) => o.order_id))) await this.reindex(id);
  }

  /**
   * Ops pulled from the relay. Each remote HLC is fed to observe() so this
   * device's clock learns about the other device — without this, causality
   * breaks and scenario 3 stops behaving.
   */
  async ingest(remote: Op[], newCursor: number): Promise<void> {
    if (!remote.length && newCursor === (await this.cursor())) return;
    for (const op of remote) this.clock.observe(op.hlc);
    await this.db.transaction("rw", this.db.ops, this.db.meta, async () => {
      // bulkPut, not bulkAdd: the relay may echo back ops we authored.
      await this.db.ops.bulkPut(remote);
      await this.set("cursor", String(newCursor));
      const last = await this.get("last_hlc");
      const highest = this.clock.tick();
      if (!last || highest > last) await this.set("last_hlc", highest);
    });
    for (const id of new Set(remote.map((o) => o.order_id))) await this.reindex(id);
  }

  /** Stamp pushed ops with the sequence the relay assigned them. */
  async markSent(assigned: { id: string; server_seq: number }[]): Promise<void> {
    await this.db.transaction("rw", this.db.ops, async () => {
      for (const { id, server_seq } of assigned) await this.db.ops.update(id, { server_seq });
    });
  }

  // ---- meta helpers ------------------------------------------------------

  private async get(key: string): Promise<string | undefined> {
    return (await this.db.meta.get(key))?.value;
  }

  private async set(key: string, value: string): Promise<void> {
    await this.db.meta.put({ key, value });
  }
}
