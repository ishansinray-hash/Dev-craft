import Fastify, { type FastifyInstance } from "fastify";
import Database from "better-sqlite3";
import { interpret, type Ask } from "../src/store/queries.js";
import { interpretWithMistral } from "../src/online/mistral.js";

type SyncOp = {
  id: string;
  order_id: string;
  path: string;
  value: unknown;
  hlc: string;
  basis: string | null;
};

type SyncRequest = { cursor?: number; ops?: SyncOp[] };
type QueryRequest = { question?: string; mode?: "offline" | "online" };

export type OnlineInterpreter = (question: string) => Promise<Ask>;
export type AppOptions = {
  databasePath?: string;
  onlineInterpreter?: OnlineInterpreter;
};

/** Builds the relay without opening a port, which keeps it integration-testable. */
export function buildApp(options: AppOptions = {}): FastifyInstance {
  const db = new Database(options.databasePath ?? process.env.DB_PATH ?? "relay.db");
  db.pragma("journal_mode = WAL");
  db.exec(`CREATE TABLE IF NOT EXISTS ops (
    seq      INTEGER PRIMARY KEY AUTOINCREMENT,
    id       TEXT UNIQUE NOT NULL,
    order_id TEXT NOT NULL,
    path     TEXT NOT NULL,
    value    TEXT,
    hlc      TEXT NOT NULL,
    basis    TEXT
  );
  CREATE INDEX IF NOT EXISTS ops_seq ON ops(seq);`);

  const insert = db.prepare(
    `INSERT OR IGNORE INTO ops (id, order_id, path, value, hlc, basis)
     VALUES (@id, @order_id, @path, @value, @hlc, @basis)`,
  );
  const seqOf = db.prepare("SELECT seq FROM ops WHERE id = ?");
  const since = db.prepare("SELECT * FROM ops WHERE seq > ? ORDER BY seq LIMIT 1000");
  const count = db.prepare("SELECT COUNT(*) n FROM ops");
  const onlineInterpreter = options.onlineInterpreter ?? interpretWithMistral;

  const app = Fastify({ logger: false });
  app.addHook("onSend", async (_request: any, reply: any) => {
    reply.header("access-control-allow-origin", "*");
    reply.header("access-control-allow-headers", "content-type");
  });
  app.addHook("onClose", async () => { db.close(); });
  app.options("/*", async (_request: any, reply: any) => reply.code(204).send());
  app.get("/health", async () => ({ ok: true, ops: count.get() }));

  app.post<{ Body: SyncRequest }>("/sync", async (req: any, reply: any) => {
    const { cursor = 0, ops = [] } = req.body ?? {};
    if (!Number.isInteger(cursor) || cursor < 0 || !Array.isArray(ops))
      return reply.code(400).send({ error: "cursor must be a non-negative integer and ops an array" });

    const valid = ops.every((op) =>
      op && typeof op.id === "string" && typeof op.order_id === "string" &&
      typeof op.path === "string" && typeof op.hlc === "string",
    );
    if (!valid) return reply.code(400).send({ error: "malformed operation" });

    const assigned = db.transaction((batch: SyncOp[]) => batch.map((op) => {
      insert.run({ ...op, value: JSON.stringify(op.value ?? null) });
      return { id: op.id, server_seq: (seqOf.get(op.id) as { seq: number }).seq };
    }))(ops);

    const rows = since.all(cursor) as (SyncOp & { seq: number; value: string })[];
    return {
      assigned,
      ops: rows.map((row) => ({
        id: row.id, order_id: row.order_id, path: row.path,
        value: JSON.parse(row.value), hlc: row.hlc, basis: row.basis, server_seq: row.seq,
      })),
      cursor: rows.length ? rows[rows.length - 1].seq : cursor,
    };
  });

  app.post<{ Body: QueryRequest }>("/query/interpret", async (req: any, reply: any) => {
    const { question, mode = "offline" } = req.body ?? {};
    if (typeof question !== "string" || !question.trim())
      return reply.code(400).send({ error: "question is required" });
    if (mode !== "offline" && mode !== "online")
      return reply.code(400).send({ error: "mode must be offline or online" });

    if (mode === "offline") return { intent: interpret(question), source: "offline" as const };
    try {
      return { intent: await onlineInterpreter(question), source: "online" as const };
    } catch {
      return {
        intent: interpret(question),
        source: "offline-fallback" as const,
        warning: "Online interpretation is unavailable; used offline rules.",
      };
    }
  });

  return app;
}