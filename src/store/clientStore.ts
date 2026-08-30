import { Store, Snapshot, OrderDB } from "./db.js";
import { Clock } from "../core/sync/hlc.js";
import { Editor } from "../core/sync/ops.js";
import { Op, OrderState } from "../core/sync/types.js";
import { parse, OrderRecord, Domain, InputRecord } from "../core/parsar/parse.js";
import { syncOnce, SyncResult } from "./sync.js";
import { dueBuckets, outstanding, capacity, needsReview, interpret, Ask } from "./queries.js";

export type NetworkStatus = "online" | "offline";

export interface StoreContextState {
  store: Store;
  clock: Clock;
  editor: Editor;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  unsentCount: number;
  relayOpsCount: number;
  serverEndpoint: string;
}

class ClientStoreManager {
  private store: Store;
  private clock!: Clock;
  private editor!: Editor;
  private isOnline = true;
  private isSyncing = false;
  private lastSyncTime: Date | null = null;
  private unsentCount = 0;
  private relayOpsCount = 0;
  private serverEndpoint = window.location.origin;
  private listeners = new Set<() => void>();
  private syncIntervalTimer: any = null;

  constructor() {
    this.store = new Store(new OrderDB("devcraft_client"));
  }

  async init() {
    this.clock = await this.store.open();
    this.editor = new Editor(this.clock);
    await this.refreshCounts();

    // Start background sync loop
    this.startBackgroundSync();
  }

  getStore() { return this.store; }
  getClock() { return this.clock; }
  getEditor() { return this.editor; }
  getIsOnline() { return this.isOnline; }
  getIsSyncing() { return this.isSyncing; }
  getLastSyncTime() { return this.lastSyncTime; }
  getUnsentCount() { return this.unsentCount; }
  getRelayOpsCount() { return this.relayOpsCount; }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notify() {
    for (const l of this.listeners) l();
  }

  async refreshCounts() {
    try {
      const unsent = await this.store.unsent();
      this.unsentCount = unsent.length;
      if (this.isOnline) {
        const res = await fetch(`${this.serverEndpoint}/health`).catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          this.relayOpsCount = data.ops?.n ?? 0;
        }
      }
    } catch {
      // offline
    }
    this.notify();
  }

  setNetworkMode(online: boolean) {
    this.isOnline = online;
    if (online) {
      this.triggerSync();
    }
    this.refreshCounts();
  }

  async triggerSync(): Promise<SyncResult | null> {
    if (!this.isOnline || this.isSyncing) return null;
    this.isSyncing = true;
    this.notify();

    try {
      const result = await syncOnce(this.store, this.serverEndpoint);
      this.lastSyncTime = new Date();
      await this.refreshCounts();
      return result;
    } catch (err) {
      console.warn("Sync failed (offline or network error):", err);
      return null;
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  private startBackgroundSync() {
    if (this.syncIntervalTimer) clearInterval(this.syncIntervalTimer);
    this.syncIntervalTimer = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.triggerSync().catch(() => {});
      }
    }, 4000);
  }

  /**
   * Process unstructured raw text message from customer locally, parse offline,
   * write HLC ops to IndexedDB, and trigger background sync if online.
   * Note: Price is not decided by the customer; shopkeeper sets it. Customer name defaults to Customer 1, 2... if not given.
   */
  async submitCustomerOrder(
    message: string,
    domain: Domain = "tailor",
    customId?: string,
    explicitCustomerName?: string,
  ): Promise<{ orderId: string; parsed: OrderRecord; state: OrderState }> {
    const orderId = customId ?? `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const receivedAt = new Date().toISOString();

    const inputRecord: InputRecord = {
      id: orderId,
      domain,
      received_at: receivedAt,
      message,
    };

    // Parse 100% offline in client browser using deterministic regex & date resolution
    const parsed = parse(inputRecord);

    // Determine customer name: explicit input > parsed from text > sequential fallback (Customer 1, Customer 2...)
    let finalCustomerName = explicitCustomerName?.trim() || parsed.customer;
    if (!finalCustomerName) {
      const existingCount = await this.store.snapshots.count();
      finalCustomerName = `Customer ${existingCount + 1}`;
    }

    const initialOps: Op[] = [];
    const blankState: OrderState = {
      order_id: orderId,
      record: {
        order_id: orderId,
        status: "open",
        customer: null,
        due_date: null,
        amount: null, // Price is NOT decided by customer; shopkeeper quotes/sets it
        paid: 0,
        references_prior_order: false,
        items: [],
      },
      versions: {},
      conflicts: {},
    };

    // Add customer name op
    initialOps.push(this.editor.setField(blankState, "customer", finalCustomerName));

    // Add due date op
    if (parsed.due_date) {
      initialOps.push(this.editor.setField(blankState, "due_date", parsed.due_date));
    }
    
    // Notice: Price is NOT decided by customer.
    // If customer mentioned a suggested amount in the message, save it in raw note for shopkeeper context
    if (parsed.amount !== null) {
      initialOps.push(this.editor.setField(blankState, "customer_proposed_price", parsed.amount));
    }

    if (parsed.references_prior_order) {
      initialOps.push(this.editor.setField(blankState, "references_prior_order", true));
    }
    // Add item ops
    if (parsed.items.length > 0) {
      for (const it of parsed.items) {
        const itemOps = this.editor.addItem(
          blankState,
          it.description,
          it.quantity || 1,
          it.attributes as Record<string, any>,
        );
        initialOps.push(...itemOps);
      }
    } else {
      // If no items detected, create generic line item from message excerpt
      const fallbackOps = this.editor.addItem(blankState, `${domain} custom stitching/garment`, 1, {
        raw: message.slice(0, 40),
      });
      initialOps.push(...fallbackOps);
    }

    // Save raw message attribute for reference
    initialOps.push(this.editor.setField(blankState, "raw_message", message));
    initialOps.push(this.editor.setField(blankState, "domain", domain));
    initialOps.push(this.editor.setField(blankState, "confidence", parsed.confidence));

    // Commit to local IndexedDB (append to ops log & reindex snapshot)
    await this.store.commit(initialOps);
    await this.refreshCounts();

    // Trigger sync if online
    if (this.isOnline) {
      this.triggerSync().catch(() => {});
    }

    const state = await this.store.loadState(orderId);
    return { orderId, parsed, state };
  }

  /**
   * Update an order field (e.g. status, amount, due date) and commit as CRDT op.
   */
  async updateOrderField(orderId: string, field: string, value: any): Promise<OrderState> {
    const currentState = await this.store.loadState(orderId);
    const op = this.editor.setField(currentState, field, value);
    await this.store.commit([op]);
    await this.refreshCounts();
    if (this.isOnline) this.triggerSync().catch(() => {});
    return this.store.loadState(orderId);
  }

  /**
   * Update shopkeeper pricing quote and advance payment
   */
  async updateOrderPricing(orderId: string, amount?: number | null, paid?: number | null): Promise<OrderState> {
    const currentState = await this.store.loadState(orderId);
    const ops = [];
    if (amount !== undefined) {
      ops.push(this.editor.setField(currentState, "amount", amount));
    }
    if (paid !== undefined) {
      ops.push(this.editor.setField(currentState, "paid", paid));
    }
    if (ops.length > 0) {
      await this.store.commit(ops);
      await this.refreshCounts();
      if (this.isOnline) this.triggerSync().catch(() => {});
    }
    return this.store.loadState(orderId);
  }

  /**
   * Resolve a conflicting field with a chosen value
   */
  async resolveConflict(orderId: string, path: string, chosenValue: any): Promise<OrderState> {
    const currentState = await this.store.loadState(orderId);
    const op = this.editor.resolveWith(currentState, path, chosenValue);
    await this.store.commit([op]);
    await this.refreshCounts();
    if (this.isOnline) this.triggerSync().catch(() => {});
    return this.store.loadState(orderId);
  }

  /**
   * The baseline order the conflict scenarios are written against. The scenario
   * buttons used to write straight to a hardcoded id, which minted a ghost order
   * with no customer and no items whenever that id did not exist yet.
   */
  async ensureScenarioOrder(orderId: string): Promise<OrderState> {
    const existing = await this.store.loadState(orderId);
    if (Object.keys(existing.versions).length > 0) return existing;

    await this.store.commit([
      this.editor.setField(existing, "customer", "Meena aunty"),
      this.editor.setField(existing, "due_date", "2026-09-05"),
      this.editor.setField(existing, "amount", 1200),
      this.editor.setField(existing, "status", "open"),
    ]);
    for (const [description, quantity, attributes] of [
      ["kurta", 2, { color: "navy blue", chest: 40 }],
      ["pajama", 1, { color: "cream", waist: 34 }],
    ] as const) {
      const state = await this.store.loadState(orderId);
      await this.store.commit(
        this.editor.addItem(state, description, quantity, { ...attributes }),
      );
    }
    await this.refreshCounts();
    return this.store.loadState(orderId);
  }

  /**
   * Causality across a reconnection: a remote edit arrives, this device's clock
   * observes it, and the local edit that follows sorts strictly after it even
   * though this device's wall clock is behind the remote one's.
   */
  async simulateCausalHandoff(orderId: string): Promise<{ remote: Op; local: Op }> {
    const state = await this.store.loadState(orderId);

    const remoteEditor = new Editor(new Clock("device-tablet-1"));
    const remote = remoteEditor.setField(state, "amount", 1750, Date.now() + 1500);
    this.clock.observe(remote.hlc);
    await this.store.commit([remote]);

    const local = this.editor.setField(await this.store.loadState(orderId), "amount", 1900);
    await this.store.commit([local]);

    await this.refreshCounts();
    if (this.isOnline) this.triggerSync().catch(() => {});
    return { remote, local };
  }

  /**
   * Simulate a multi-device concurrent conflict test (e.g. Device A sets due date to Sept 8
   * while Device B sets amount to 1500 and modifies due date to Sept 12)
   */
  async simulateConflict(orderId: string) {
    const state = await this.store.loadState(orderId);
    const clockA = new Clock("device-tablet-1");
    const clockB = new Clock("device-phone-2");
    const editorA = new Editor(clockA);
    const editorB = new Editor(clockB);

    // Device A edit
    const opA = editorA.setField(state, "due_date", "2026-09-08", Date.now() + 1000);
    // Device B edit on same field slightly later (or competing)
    const opB = editorB.setField(state, "due_date", "2026-09-12", Date.now() + 2000);
    const opB2 = editorB.setField(state, "amount", 1850, Date.now() + 2000);

    // These ops come from foreign clocks, so this device must observe them
    // before it issues another HLC. Skipping this leaves the local clock behind
    // the ops it just stored, and the operator's next edit to the same field
    // loses the merge and appears to do nothing.
    const simulated = [opA, opB, opB2];
    for (const op of simulated) this.clock.observe(op.hlc);

    await this.store.commit(simulated);
    await this.refreshCounts();
    if (this.isOnline) this.triggerSync().catch(() => {});
    return this.store.loadState(orderId);
  }

  /**
   * Reset local database cleanly without demo data
   */
  async resetDatabase() {
    await this.store.snapshots.clear();
    await (this.store as any).db.ops.clear();
    await (this.store as any).db.meta.clear();
    await this.init();
    this.notify();
  }
}

export const clientStore = new ClientStoreManager();
