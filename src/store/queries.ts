import { Store, Snapshot } from "./db.js";
import { OrderRecordView } from "../core/sync/types.js";

// Objective 4. The four questions the operator must be able to answer without
// scrolling, all served from the indexed snapshot table so nothing re-folds the
// op log and nothing touches the network.
//
// `today` is always a parameter, never Date.now(). Same reason the parser takes
// received_at: a function that reads the wall clock cannot be tested, and a
// query layer you cannot test is one you debug live in front of a judge.

const ONE_DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const dayOf = (d: string) => Date.parse(`${d}T00:00:00Z`);

export type DueBuckets = {
  overdue: Snapshot[];
  today: Snapshot[];
  upcoming: Snapshot[];
  undated: Snapshot[];
};

/** "What is due today, and what is overdue?" */
export async function dueBuckets(store: Store, today: string): Promise<DueBuckets> {
  const open = await store.snapshots.where("status").equals("open").toArray();
  const t = dayOf(today);
  const out: DueBuckets = { overdue: [], today: [], upcoming: [], undated: [] };
  for (const o of open) {
    if (!o.due_date) { out.undated.push(o); continue; }
    const d = dayOf(o.due_date);
    if (d < t) out.overdue.push(o);
    else if (d === t) out.today.push(o);
    else out.upcoming.push(o);
  }
  const byDate = (a: Snapshot, b: Snapshot) => (a.due_date ?? "").localeCompare(b.due_date ?? "");
  out.overdue.sort(byDate); out.today.sort(byDate); out.upcoming.sort(byDate);
  return out;
}

export type Debtor = { customer: string; balance: number; orders: number; oldest: string | null };

/** "Which customers owe money, and how much in total?" */
export async function outstanding(store: Store): Promise<{ debtors: Debtor[]; total: number }> {
  const rows = await store.snapshots.toArray();
  const by = new Map<string, Debtor>();
  for (const o of rows) {
    if (o.status === "cancelled" || o.balance <= 0) continue;
    const key = o.customer ?? "(no name)";
    const d = by.get(key) ?? { customer: key, balance: 0, orders: 0, oldest: null };
    d.balance += o.balance;
    d.orders += 1;
    if (o.due_date && (!d.oldest || o.due_date < d.oldest)) d.oldest = o.due_date;
    by.set(key, d);
  }
  const debtors = [...by.values()].sort((a, b) => b.balance - a.balance);
  return { debtors, total: debtors.reduce((n, d) => n + d.balance, 0) };
}

/**
 * "What did this customer order last time, and at what specification?"
 * Returns the most recent orders newest-first, so the UI can show the last one
 * and offer "same as last time" — which is what references_prior_order means.
 */
export async function customerHistory(
  store: Store, customer: string, limit = 5,
): Promise<OrderRecordView[]> {
  const rows = await store.snapshots.where("customer").equals(customer).toArray();
  return rows
    .sort((a, b) => (b.due_date ?? "").localeCompare(a.due_date ?? ""))
    .slice(0, limit)
    .map((r) => r.record);
}

export type CapacityDay = { date: string; orders: number; items: number };

/** "What is my committed capacity this week?" Seven days from `today`. */
export async function capacity(
  store: Store, today: string, days = 7,
): Promise<{ perDay: CapacityDay[]; orders: number; items: number }> {
  const start = dayOf(today);
  const window = Array.from({ length: days }, (_, i) => iso(start + i * ONE_DAY));
  const perDay: CapacityDay[] = window.map((date) => ({ date, orders: 0, items: 0 }));
  const index = new Map(perDay.map((d) => [d.date, d]));

  const rows = await store.snapshots
    .where("due_date").between(window[0], window[days - 1], true, true).toArray();
  for (const o of rows) {
    if (o.status !== "open") continue;
    const bucket = index.get(o.due_date!);
    if (!bucket) continue;
    bucket.orders += 1;
    bucket.items += o.item_count;
  }
  return {
    perDay,
    orders: perDay.reduce((n, d) => n + d.orders, 0),
    items: perDay.reduce((n, d) => n + d.items, 0),
  };
}

/** Orders carrying an unresolved conflict badge. Drives the review queue. */
export async function needsReview(store: Store): Promise<Snapshot[]> {
  return (await store.snapshots.toArray()).filter((o) => o.conflict_count > 0);
}

// ---------------------------------------------------------------------------
// Offline "ask" box. Maps a typed phrase onto one of the queries above.
// Rules, not a model — the whole point of Objective 4 is that it works with the
// network off. Reuses the operator's own vocabulary from the parser corpus.

export type Ask =
  | { kind: "due"; bucket: keyof DueBuckets }
  | { kind: "outstanding" }
  | { kind: "capacity" }
  | { kind: "review" }
  | { kind: "customer"; name: string }
  | { kind: "unknown" };

export function interpret(question: string): Ask {
  const q = question.toLowerCase().trim();
  if (/\b(paisa|paise|udhaar|udhar|baki|bakaya|owe|owes|owing|due money|payment)\b/.test(q))
    return { kind: "outstanding" };
  if (/\b(late|overdue)\b|(?:^|\s)(der|miss)\w*(?:\s|$)/.test(q)) return { kind: "due", bucket: "overdue" };
  if (/\b(aaj|today|aaj ka)\b/.test(q)) return { kind: "due", bucket: "today" };
  if (/\b(hafte|week|capacity|load|kitna kaam)\b/.test(q)) return { kind: "capacity" };
  if (/\b(conflict|clash|review|check karna)\b/.test(q)) return { kind: "review" };
  const m = q.match(/(?:ka|ke|of|for)\s+([a-z]{3,})\s*(?:order|history)?$/);
  if (m) return { kind: "customer", name: m[1] };
  return { kind: "unknown" };
}