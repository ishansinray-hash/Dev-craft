import { Op, OpValue, OrderState } from "./types.js";
import { Clock } from "./hlc.js";

// Turns a user action into ops. The one thing that must happen HERE and cannot
// be reconstructed later is `basis` — the HLC of the value the user was looking
// at when they made the edit. materialize() can compute everything else, but it
// can never recover what was on screen at write time.

const uuid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export class Editor {
  constructor(private clock: Clock) {}

  /** One mutation. `state` is what the user is currently looking at. */
  private op(state: OrderState, path: string, value: OpValue, now?: number): Op {
    return {
      id: uuid(),
      order_id: state.order_id,
      path,
      value,
      hlc: this.clock.tick(now),
      basis: state.versions[path] ?? null,
      server_seq: 0,
    };
  }

  setField(state: OrderState, field: string, value: OpValue, now?: number): Op {
    return this.op(state, `fields.${field}`, value, now);
  }

  setItemField(state: OrderState, itemId: string, field: "description" | "quantity",
               value: OpValue, now?: number): Op {
    return this.op(state, `items.${itemId}.${field}`, value, now);
  }

  setItemAttr(state: OrderState, itemId: string, key: string,
              value: OpValue, now?: number): Op {
    return this.op(state, `items.${itemId}.attrs.${key}`, value, now);
  }

  /**
   * Tombstone. Modelled as an ordinary LWW path so delete competes with edits
   * under the same rule as everything else — no special case in the merge.
   */
  deleteItem(state: OrderState, itemId: string, now?: number): Op {
    return this.op(state, `items.${itemId}.__deleted`, true, now);
  }

  undeleteItem(state: OrderState, itemId: string, now?: number): Op {
    return this.op(state, `items.${itemId}.__deleted`, false, now);
  }

  /**
   * Orders are retained as a cancellation tombstone instead of being physically
   * erased. That makes delete converge across devices and keeps an audit trail.
   */
  deleteOrder(state: OrderState, now?: number): Op {
    return this.setField(state, "status", "cancelled", now);
  }

  restoreOrder(state: OrderState, now?: number): Op {
    return this.setField(state, "status", "open", now);
  }

  /** A new line item is just a description + quantity + attribute ops. */
  addItem(state: OrderState, description: string, quantity: number,
          attributes: Record<string, OpValue> = {}, now?: number): Op[] {
    const itemId = uuid();
    return [
      this.setItemField(state, itemId, "description", description, now),
      this.setItemField(state, itemId, "quantity", quantity, now),
      ...Object.entries(attributes).map(([k, v]) => this.setItemAttr(state, itemId, k, v, now)),
    ];
  }

  /** Accepts a surfaced conflict's losing value as the new truth. */
  resolveWith(state: OrderState, path: string, value: OpValue, now?: number): Op {
    return this.op(state, path, value, now);
  }
}