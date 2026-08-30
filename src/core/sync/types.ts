
// The sync contract. Types only — no logic, no imports, no I/O.
//
// PATH GRAMMAR. A path addresses exactly one scalar. Anything coarser makes two
// people editing different things fight each other, which is scenario 1's
// failure mode one level down.
//
//   fields.customer
//   fields.due_date
//   fields.amount
//   fields.references_prior_order
//   items.<itemId>.description
//   items.<itemId>.quantity
//   items.<itemId>.attrs.<key>
//   items.<itemId>.__deleted
//
// <itemId> is a UUID minted when the item is created. Never an array index:
// indices shift when someone inserts, UUIDs do not.

/**
 * A hybrid logical clock, encoded as a fixed-width sortable string:
 *
 *   0001764412800123:00042:a3f9c1
 *   ^ 13-digit ms     ^ 5-digit  ^ device id
 *
 * Fixed widths are load-bearing. They make `a < b` a correct total order, so
 * comparison is plain string comparison and the value indexes directly in Dexie
 * and SQLite. Varying the padding silently breaks ordering at digit boundaries.
 *
 * 13 digits of milliseconds runs to the year 2286. 5 digits of counter allows
 * 99,999 edits inside a single millisecond.
 */
export type HLC = string;

export const HLC_MS_WIDTH = 13;
export const HLC_COUNTER_WIDTH = 5;

export type OpValue = string | number | boolean | null;

/**
 * The order lifecycle the operator drives. "open" through "ready" is work still
 * on the bench; "delivered" and "cancelled" are terminal. Every one of these is
 * written by the UI, so every one must survive the merge — a status the
 * materialiser does not know about is an edit silently thrown away.
 */
export const ORDER_STATUSES = ["open", "in_progress", "ready", "delivered", "cancelled"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Statuses that still represent committed work, for scheduling and capacity. */
export const ACTIVE_STATUSES = ["open", "in_progress", "ready"] as const;

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

export function isActiveStatus(value: unknown): boolean {
  return typeof value === "string" && (ACTIVE_STATUSES as readonly string[]).includes(value);
}

/** One mutation of one path. The unit of replication. */
export type Op = {
  /** UUID. Primary key, so a retried push can never duplicate. */
  id: string;
  order_id: string;
  path: string;
  value: OpValue;
  hlc: HLC;
  /**
   * The HLC of the value that occupied this path when the user made the edit,
   * or null if the path was empty. This is what separates "deliberately
   * replaced a value I could see" from "overwrote a value I never saw" — the
   * distinction between a normal edit and silent data loss.
   *
   * Recorded at write time. It cannot be reconstructed later.
   */
  basis: HLC | null;
  /** Assigned by the relay on push. Absent (0) means not yet synced. */
  server_seq?: number;
};

export type ItemRecord = {
  item_id: string;
  description: string | null;
  quantity: number | null;
  attributes: Record<string, OpValue>;
};

export type OrderRecordView = {
  order_id: string;
  customer: string | null;
  due_date: string | null;
  amount: number | null;
  paid: number;
  status: OrderStatus;
  references_prior_order: boolean;
  /** Original customer wording, retained locally as an audit note. */
  raw_message?: string;
  /** A customer may suggest a price; it is never the shopkeeper's quote. */
  customer_proposed_price?: number | null;
  /** Domain and parser metadata used by the local UI. */
  domain?: string;
  confidence?: number;
  items: ItemRecord[];
};

/** A losing edit that nobody had seen when they overwrote it. */
export type Conflict = {
  path: string;
  /** The value currently shown to the operator. */
  winner: Op;
  /** Edits that lost and were never superseded deliberately. Never discarded. */
  losers: Op[];
};

export type OrderState = {
  order_id: string;
  record: OrderRecordView;
  /** path -> HLC of the winning op. Read by ops.ts to fill in `basis`. */
  versions: Record<string, HLC>;
  /** path -> surfaced conflict. An absent path means nothing was lost there. */
  conflicts: Record<string, Conflict>;
};
