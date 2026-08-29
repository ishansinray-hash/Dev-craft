import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type FastifyInstance } from "fastify";
import { buildApp } from "../server/app.js";

let app: FastifyInstance;

beforeEach(() => {
  app = buildApp({
    databasePath: ":memory:",
    onlineInterpreter: async () => ({ kind: "capacity" }),
  });
});

afterEach(async () => { await app.close(); });

describe("relay HTTP API", () => {
  it("assigns an operation once and returns the same log to another device", async () => {
    const op = {
      id: "op-1", order_id: "ORD-1", path: "fields.amount", value: 1200,
      hlc: "0001764412800000:00000:dev-a", basis: null,
    };
    const first = await app.inject({ method: "POST", url: "/sync", payload: { cursor: 0, ops: [op] } });
    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({
      assigned: [{ id: "op-1", server_seq: 1 }],
      ops: [{ ...op, server_seq: 1 }],
      cursor: 1,
    });

    const retry = await app.inject({ method: "POST", url: "/sync", payload: { cursor: 1, ops: [op] } });
    expect(retry.json()).toMatchObject({ assigned: [{ id: "op-1", server_seq: 1 }], ops: [], cursor: 1 });

    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.json()).toEqual({ ok: true, ops: { n: 1 } });
  });

  it("uses rules offline and Mistral only when the caller selects online mode", async () => {
    const offline = await app.inject({
      method: "POST", url: "/query/interpret", payload: { question: "kisne paisa dena hai", mode: "offline" },
    });
    expect(offline.json()).toEqual({ intent: { kind: "outstanding" }, source: "offline" });

    const online = await app.inject({
      method: "POST", url: "/query/interpret", payload: { question: "what is my workload?", mode: "online" },
    });
    expect(online.json()).toEqual({ intent: { kind: "capacity" }, source: "online" });
  });

  it("falls back to the offline parser when online interpretation is unavailable", async () => {
    await app.close();
    app = buildApp({ databasePath: ":memory:", onlineInterpreter: async () => { throw new Error("offline"); } });
    const res = await app.inject({
      method: "POST", url: "/query/interpret", payload: { question: "aaj kya hai", mode: "online" },
    });
    expect(res.json()).toMatchObject({
      intent: { kind: "due", bucket: "today" },
      source: "offline-fallback",
    });
  });
});