import { Store } from "./db.js";
import { Op } from "../core/sync/types.js";

// The sync loop. Deliberately dumb: collect what we haven't sent, post it,
// stamp it, absorb what came back. All merge intelligence lives in
// core/sync/materialize.ts and runs identically on every device.
//
// Never called on the render path. The app is interactive first; this runs
// afterwards, on an interval and on the browser's `online` event.

export type SyncResult = { pushed: number; pulled: number; cursor: number };

export async function syncOnce(store: Store, endpoint: string): Promise<SyncResult> {
  const [outbox, cursor] = await Promise.all([store.unsent(), store.cursor()]);

  const res = await fetch(`${endpoint}/sync`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cursor, ops: outbox }),
  });
  if (!res.ok) throw new Error(`sync failed: ${res.status}`);
  const body = await res.json() as { assigned: { id: string; server_seq: number }[]; ops: Op[]; cursor: number };

  // Order matters. Stamp our own ops first: if ingest throws, the outbox is
  // already clean and a retry won't re-push. The relay dedupes on op id
  // anyway, so a double push is harmless — but a double pull is not, since
  // the cursor would advance past ops we never stored.
  await store.markSent(body.assigned);
  await store.ingest(body.ops.filter((o) => !outbox.some((m) => m.id === o.id)), body.cursor);

  return { pushed: outbox.length, pulled: body.ops.length, cursor: body.cursor };
}

/** Background loop. Fails silently — offline is the normal state, not an error. */
export function startSync(store: Store, endpoint: string, everyMs = 5000): () => void {
  let stopped = false;
  const tick = async () => {
    if (stopped || !navigator.onLine) return;
    try { await syncOnce(store, endpoint); } catch { /* offline; try again later */ }
  };
  const timer = setInterval(tick, everyMs);
  addEventListener("online", tick);
  void tick();
  return () => { stopped = true; clearInterval(timer); removeEventListener("online", tick); };
}