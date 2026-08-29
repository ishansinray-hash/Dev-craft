import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type FastifyInstance } from "fastify";
import { buildApp } from "../server/app.js";
import { Store, OrderDB } from "../src/store/db.js";
import { Editor } from "../src/core/sync/ops.js";
import { syncOnce } from "../src/store/sync.js";

let app: FastifyInstance;
let endpoint: string;

beforeEach(async () => {
  app = buildApp({ databasePath: ":memory:" });
  endpoint = await app.listen({ host: "127.0.0.1", port: 0 });
});

afterEach(async () => { await app.close(); });

describe("store-to-relay sync", () => {
  it("sends an offline edit once and lets a second device materialise it", async () => {
    const first = new Store(new OrderDB(`sync-a-${crypto.randomUUID()}`));
    const firstClock = await first.open();
    const firstState = await first.loadState("ORD-11");
    await first.commit([new Editor(firstClock).setField(firstState, "customer", "Meena aunty")]);

    const pushed = await syncOnce(first, endpoint);
    expect(pushed).toMatchObject({ pushed: 1, pulled: 1, cursor: 1 });
    expect((await first.unsent())).toHaveLength(0);

    const second = new Store(new OrderDB(`sync-b-${crypto.randomUUID()}`));
    await second.open();
    const pulled = await syncOnce(second, endpoint);
    expect(pulled).toMatchObject({ pushed: 0, pulled: 1, cursor: 1 });
    expect((await second.loadState("ORD-11")).record.customer).toBe("Meena aunty");
  });
});