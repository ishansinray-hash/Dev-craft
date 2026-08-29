import { Op, OrderState, OrderRecordView, ItemRecord, Conflict, HLC } from "./types.js";
import { compare } from "./hlc.js";

// The replicated state IS the set of ops. Everything else is a view.
//
// materialize is a pure fold over that set: group by path, take the max-HLC op
// per path. Set union is commutative, associative and idempotent, and this
// function reads only the set, never the insertion order. So reconnection order
// is unobservable by construction — that is the whole convergence proof, and
// it is what Test C checks by reconnecting in both directions.

const FIELD_KEYS = ["customer", "due_date", "amount", "paid", "status", "references_prior_order"] as const;

function emptyRecord(orderId: string): OrderRecordView {
  return {
    order_id: orderId, customer: null, due_date: null,
    amount: null, paid: 0, status: "open", references_prior_order: false, items: [],
  };
}

/**
 * Pure. No Date.now(), no randomness, no mutation of the input array.
 * Given the same ops in any order it returns a deeply equal result.
 */
export function materialize(ops: Op[], orderId?: string): OrderState {
  const id = orderId ?? ops[0]?.order_id ?? "";
  // Dedupe by op id. The relay can deliver the same op twice (a retried push,
  // an overlapping cursor window), and set semantics demand idempotence.
  const seen = new Set<string>();
  const scoped: Op[] = [];
  for (const o of ops) {
    if (o.order_id !== id || seen.has(o.id)) continue;
    seen.add(o.id); scoped.push(o);
  }

  // ---- group by path (copy, never sort the caller's array in place) --------
  const groups = new Map<string, Op[]>();
  for (const op of scoped) {
    const g = groups.get(op.path);
    if (g) g.push(op); else groups.set(op.path, [op]);
  }

  const winners = new Map<string, Op>();
  const conflicts: Record<string, Conflict> = {};

  for (const [path, group] of groups) {
    const winner = group.reduce((a, b) => (compare(a.hlc, b.hlc) >= 0 ? a : b));
    winners.set(path, winner);

    // An op is "superseded" when some other op in the set declares it as its
    // basis — someone looked at it and replaced it on purpose. A loser that
    // nobody superseded was never seen by the winning author, so it is a
    // conflict to surface, not a value to drop.
    const superseded = new Set<HLC>();
    for (const o of group) if (o.basis) superseded.add(o.basis);

    const losers = group.filter((o) => o.id !== winner.id && !superseded.has(o.hlc));
    if (losers.length) {
      conflicts[path] = {
        path, winner,
        losers: [...losers].sort((a, b) => compare(b.hlc, a.hlc)),
      };
    }
  }

  // ---- assemble the readable record ---------------------------------------
  const record = emptyRecord(id);
  const items = new Map<string, ItemRecord>();
  const deleted = new Set<string>();

  for (const [path, winner] of winners) {
    const parts = path.split(".");

    if (parts[0] === "fields") {
      const key = parts[1] as (typeof FIELD_KEYS)[number];
      if (key === "references_prior_order") record.references_prior_order = !!winner.value;
      else if (key === "amount") record.amount = winner.value as number | null;
      else if (key === "paid") record.paid = typeof winner.value === "number" ? winner.value : 0;
      else if (key === "status" && (winner.value === "open" || winner.value === "cancelled"))
        record.status = winner.value;
      else if (key === "customer") record.customer = winner.value as string | null;
      else if (key === "due_date") record.due_date = winner.value as string | null;
      continue;
    }

    if (parts[0] !== "items") continue;
    const itemId = parts[1];
    if (!items.has(itemId))
      items.set(itemId, { item_id: itemId, description: null, quantity: null, attributes: {} });
    const item = items.get(itemId)!;

    if (parts[2] === "__deleted") { if (winner.value === true) deleted.add(itemId); }
    else if (parts[2] === "description") item.description = winner.value as string | null;
    else if (parts[2] === "quantity") item.quantity = winner.value as number | null;
    else if (parts[2] === "attrs" && parts[3]) item.attributes[parts[3]] = winner.value;
  }

  // ---- delete-versus-update ------------------------------------------------
  // Policy: the tombstone wins, the item stays deleted. But edits made by
  // someone who had not seen the delete are NOT silently discarded — they are
  // surfaced against the tombstone path so the operator can undo.
  // Both halves of conflict_scenarios.md scenario 3's pass condition.
  for (const itemId of deleted) {
    const tombPath = `items.${itemId}.__deleted`;
    const tomb = winners.get(tombPath)!;
    const orphaned: Op[] = [];
    for (const [path, winner] of winners) {
      if (!path.startsWith(`items.${itemId}.`) || path === tombPath) continue;
      // An edit whose basis is the tombstone was made knowing about the delete.
      if (winner.basis === tomb.hlc) continue;
      // An edit that predates the item's own creation clause is just history.
      if (compare(winner.hlc, tomb.hlc) < 0 && winner.basis === null) continue;
      orphaned.push(winner);
    }
    if (orphaned.length) {
      conflicts[tombPath] = {
        path: tombPath, winner: tomb,
        losers: orphaned.sort((a, b) => compare(b.hlc, a.hlc)),
      };
    }
  }

  record.items = [...items.values()]
    .filter((i) => !deleted.has(i.item_id))
    // Stable order: creation HLC, falling back to item id. Never array position.
    .sort((a, b) => compare(
      winners.get(`items.${a.item_id}.description`)?.hlc ?? `~${a.item_id}`,
      winners.get(`items.${b.item_id}.description`)?.hlc ?? `~${b.item_id}`));

  // Object key order is observable through JSON.stringify, and Map preserves
  // insertion order — which is the order ops arrived. Sort so the serialised
  // state is byte-identical regardless of reconnection order.
  const versions: Record<string, HLC> = {};
  for (const path of [...winners.keys()].sort()) versions[path] = winners.get(path)!.hlc;

  const sortedConflicts: Record<string, Conflict> = {};
  for (const path of Object.keys(conflicts).sort()) sortedConflicts[path] = conflicts[path];

  return { order_id: id, record, versions, conflicts: sortedConflicts };
}