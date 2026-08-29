import { HLC, HLC_MS_WIDTH, HLC_COUNTER_WIDTH } from "./types.js";

// A hybrid logical clock. Wall-clock timestamps alone fail three ways here:
//
//   1. Skew      - the tablet's clock is 40s behind, so its later edit loses.
//   2. Ties      - two devices hit the same millisecond and never converge.
//   3. Causality - an edit made *after* seeing another must sort after it,
//                  even if the editing device's clock is behind.
//
// An HLC fixes all three while staying close to real time, so the timestamps
// are still human-readable in the UI.

export function encodeHLC(l: number, c: number, node: string): HLC {
  return `${String(l).padStart(HLC_MS_WIDTH, "0")}:` +
         `${String(c).padStart(HLC_COUNTER_WIDTH, "0")}:${node}`;
}

export function decodeHLC(h: HLC): { l: number; c: number; node: string } {
  const [l, c, node] = h.split(":");
  return { l: Number(l), c: Number(c), node };
}

/**
 * Total order over HLCs. Never returns 0 for two different devices, because
 * the device id is the final tiebreak — that is what makes scenario 2
 * (identical timestamps) deterministic rather than a coin flip.
 *
 * Fixed-width encoding means this is just string comparison.
 */
export function compare(a: HLC, b: HLC): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export const maxHLC = (a: HLC, b: HLC): HLC => (compare(a, b) >= 0 ? a : b);

export class Clock {
  private l = 0;
  private c = 0;

  constructor(readonly node: string) {}

  /** Call for every local mutation. Strictly increasing, always. */
  tick(now: number = Date.now()): HLC {
    if (now > this.l) { this.l = now; this.c = 0; }
    else { this.c += 1; }
    return encodeHLC(this.l, this.c, this.node);
  }

  /**
   * Call for every op received from the network, before generating any new op.
   * This is what carries causality across devices: after observing a remote
   * HLC, the next tick() is guaranteed to sort strictly after it, even if this
   * device's wall clock is behind the other one's.
   *
   * The four branches below are the whole algorithm. Getting three of them
   * right passes casual testing and fails scenario 3.
   */
  observe(remote: HLC, now: number = Date.now()): void {
    const r = decodeHLC(remote);
    const l = Math.max(this.l, r.l, now);
    if (l === this.l && l === r.l) this.c = Math.max(this.c, r.c) + 1;
    else if (l === this.l)         this.c = this.c + 1;
    else if (l === r.l)            this.c = r.c + 1;
    else                           this.c = 0;
    this.l = l;
  }

  /** Restored from storage so the clock never goes backwards across restarts. */
  restore(last: HLC): void {
    const { l, c } = decodeHLC(last);
    if (l > this.l || (l === this.l && c > this.c)) { this.l = l; this.c = c; }
  }
}