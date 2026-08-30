import Fastify, { type FastifyInstance } from "fastify";
import Database from "better-sqlite3";
import fastifyStatic from "@fastify/static";
import fastifyCors from "@fastify/cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { interpret, type Ask } from "../src/store/queries.js";
import { interpretWithMistral } from "../src/online/mistral.js";
import { parse, type Domain, type InputRecord } from "../src/core/parsar/parse.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

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
  serveStatic?: boolean;
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
  const orderCount = db.prepare("SELECT COUNT(DISTINCT order_id) n FROM ops");
  const latestOps = db.prepare("SELECT * FROM ops ORDER BY seq DESC LIMIT 20");
  const onlineInterpreter = options.onlineInterpreter ?? interpretWithMistral;

  const app = Fastify({ logger: false });

  app.register(fastifyCors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.addHook("onClose", async () => { db.close(); });

  app.get("/health", async () => ({ ok: true, ops: count.get() }));

  // Relay stats API
  app.get("/api/relay/stats", async () => {
    const totalOps = (count.get() as { n: number }).n;
    const totalOrders = (orderCount.get() as { n: number }).n;
    const recent = (latestOps.all() as (SyncOp & { seq: number; value: string })[]).map((r) => ({
      ...r,
      value: JSON.parse(r.value || "null"),
    }));
    return {
      ok: true,
      total_ops: totalOps,
      total_orders: totalOrders,
      latest_ops: recent,
    };
  });

  // Server-side parse proxy endpoint
  app.post<{ Body: { message?: string; domain?: Domain; received_at?: string; id?: string } }>(
    "/api/parse",
    async (req: any, reply: any) => {
      const { message, domain = "tailor", received_at = new Date().toISOString(), id = "msg-1" } = req.body ?? {};
      if (typeof message !== "string" || !message.trim()) {
        return reply.code(400).send({ error: "message is required" });
      }
      const record: InputRecord = { id, domain, received_at, message };
      const parsed = parse(record);
      return { ok: true, input: record, parsed };
    },
  );

  // Sample customer messages provider for quick testing
  app.get("/api/samples", async () => {
    try {
      const filePath = path.join(projectRoot, "Given_materials", "messages_train.json");
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const allSamples = JSON.parse(raw);
        return { ok: true, samples: allSamples.slice(0, 30) };
      }
    } catch {
      // Fallback in case file is absent
    }
    return {
      ok: true,
      samples: [
        {
          id: "samp-01",
          domain: "tailor",
          message: "Sunil bhai, 2 linen shirts chest 42 waist 36 and 1 kurta pajama by Friday urgently, 500 advance diya",
          received_at: "2026-08-30T09:00:00+05:30",
        },
        {
          id: "samp-02",
          domain: "electrician",
          message: "bhaiya geyser nahi, 2 socket ka fuse ud gaya Havells wale aur 1 fan wiring check karni hai",
          received_at: "2026-08-30T10:00:00+05:30",
        },
        {
          id: "samp-03",
          domain: "bakery",
          message: "Meena aunty ke birthday ke liye 1 chocolate truffle cake 2kg with strawberry cream, 15 tareekh tak",
          received_at: "2026-09-01T14:30:00+05:30",
        },
      ],
    };
  });

  // Relay sync endpoint
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

  // Query interpretation endpoint
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

  // Shopkeeper Data Query Assistant Endpoint (uses Mistral if configured, or deterministic engine)
  app.post<{ Body: { question: string; orders?: any[]; today?: string } }>(
    "/api/query/assistant",
    async (req: any, reply: any) => {
      const { question, orders = [], today = new Date().toISOString().slice(0, 10) } = req.body ?? {};
      if (!question || typeof question !== "string") {
        return reply.code(400).send({ error: "question is required" });
      }

      const mistralKey = process.env.MISTRAL_API_KEY;
      if (mistralKey) {
        try {
          const prompt = `You are the specialized AI Assistant for OrderKaro tailoring and smart order management.
Shopkeeper's Question: "${question}"
Reference Date: ${today}
Order Data (${orders.length} orders):
${JSON.stringify(orders, null, 2)}

Provide a concise, accurate answer based strictly on the order data, citing customer measurements, amounts in ₹, or due dates.`;

          const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
            method: "POST",
            headers: {
              authorization: `Bearer ${mistralKey}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: process.env.MISTRAL_MODEL || "mistral-small-latest",
              temperature: 0.1,
              max_tokens: 500,
              messages: [
                { role: "system", content: "You are the OrderKaro shopkeeper data assistant. Answer accurately based solely on provided order records." },
                { role: "user", content: prompt },
              ],
            }),
          });

          if (response.ok) {
            const data = await response.json() as any;
            const content = data.choices?.[0]?.message?.content;
            if (content) {
              return { ok: true, answer: content, source: "Mistral AI" };
            }
          }
        } catch {
          // Fall through to deterministic response
        }
      }

      // Offline deterministic analytical response
      const intent = interpret(question);
      let answer = "";
      if (intent.kind === "outstanding") {
        const debtors = orders.filter((o: any) => (o.balance_due || 0) > 0);
        const total = debtors.reduce((acc: number, o: any) => acc + (o.balance_due || 0), 0);
        answer = `Found ${debtors.length} customer(s) with unpaid balances totaling ₹${total}.\n` +
          debtors.map((d: any) => `• ${d.customer || "Customer"} (${d.order_id}): ₹${d.balance_due} due`).join("\n");
      } else if (intent.kind === "due") {
        if (intent.bucket === "today") {
          const dueToday = orders.filter((o: any) => o.due_date === today);
          answer = `You have ${dueToday.length} order(s) scheduled for delivery today (${today}).\n` +
            dueToday.map((o: any) => `• ${o.order_id} - ${o.customer} (${o.items?.length || 0} items)`).join("\n");
        } else if (intent.bucket === "overdue") {
          const overdue = orders.filter((o: any) => o.due_date && o.due_date < today && o.status !== "delivered");
          answer = `You have ${overdue.length} overdue order(s).\n` +
            overdue.map((o: any) => `• ${o.order_id} - ${o.customer} (Due: ${o.due_date})`).join("\n");
        } else {
          answer = `Found ${orders.length} total active orders in the database.`;
        }
      } else if (intent.kind === "customer") {
        const custOrders = orders.filter((o: any) => (o.customer || "").toLowerCase().includes(intent.name.toLowerCase()));
        if (custOrders.length > 0) {
          answer = `Customer History for "${intent.name}" (${custOrders.length} orders):\n` +
            custOrders.map((o: any) => {
              const specs = (o.items || []).map((i: any) => `${i.quantity}x ${i.description} ${JSON.stringify(i.attributes || {})}`).join(", ");
              return `• Order ${o.order_id} (Status: ${o.status}): ${specs} | Total: ₹${o.total_amount ?? "Unquoted"}, Balance: ₹${o.balance_due ?? 0}`;
            }).join("\n");
        } else {
          answer = `No past orders found for customer "${intent.name}".`;
        }
      } else {
        answer = `Found ${orders.length} orders in the active OrderKaro database. Use the search bar or category filters below to inspect measurements, balances, and capacity.`;
      }

      return {
        ok: true,
        answer,
        source: "OrderKaro Deterministic Engine",
      };
    },
  );

  // Static files serving for compiled UI
  const distDir = path.join(projectRoot, "dist");
  if (fs.existsSync(distDir) && (options.serveStatic !== false)) {
    app.register(fastifyStatic, {
      root: distDir,
      prefix: "/",
    });

    app.setNotFoundHandler(async (request, reply) => {
      if (request.raw.url?.startsWith("/api/") || request.raw.url?.startsWith("/sync") || request.raw.url?.startsWith("/health")) {
        return reply.code(404).send({ error: "API endpoint not found" });
      }
      const indexPath = path.join(distDir, "index.html");
      if (fs.existsSync(indexPath)) {
        return reply.type("text/html").send(fs.readFileSync(indexPath, "utf-8"));
      }
      return reply.code(404).send({ error: "Not Found" });
    });
  } else {
    app.get("/", async () => ({
      ok: true,
      name: "OrderKaro Relay",
      endpoints: ["/health", "/sync", "/query/interpret", "/api/parse", "/api/samples", "/api/relay/stats"],
    }));
  }

  return app;
}