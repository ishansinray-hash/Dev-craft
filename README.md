# DevCraft — Offline-First Order Backend

This backend turns Hinglish/Devanagari order messages into structured records, stores every edit locally, and synchronises an operation log through a small relay. The offline path is the product default: no API key or network is needed to parse messages, create/edit/cancel orders, run operational queries, or persist state across restarts.

## Architecture

| Concern | Implementation |
| --- | --- |
| Parsing | Deterministic TypeScript rules in `src/core/parsar`; the batch CLI meets Test A without a network call. |
| Local state | IndexedDB via Dexie. `ops` is the source of truth; `orders` is an indexed materialised view for fast queries. |
| Conflict resolution | Per-field operation log with Hybrid Logical Clocks and the author-visible `basis` version. The pure materialiser is order-independent, idempotent, and surfaces true concurrent edits. |
| Order deletion | A cancellation tombstone (`status: "cancelled"`) instead of physical erasure, so delete converges and remains auditable. |
| Relay | Fastify plus SQLite. It assigns a sequence number and returns unseen operations; it never performs merge decisions. |
| Online option | An opt-in Mistral intent interpreter. It only selects a read-only query intent; the browser executes that intent against its local IndexedDB data. |

## Run locally

```powershell
npm install
npm run typecheck
npm test
npm run start
```

The relay listens on `http://localhost:8080`. Check it with:

```powershell
Invoke-RestMethod http://localhost:8080/health
```

To run the Test A entry point:

```powershell
npm run cli -- --in Given_materials/messages_train.json --out results.json
npm run score -- --gold Given_materials/messages_train.json --pred results.json --out breakdown.json
```

## Mistral online query option

Copy `.env.example` to `.env` and set `MISTRAL_API_KEY` on the **server**. Do not expose the key in frontend code or commit it. The default model is `mistral-small-latest`; override it with `MISTRAL_MODEL` if needed.

The frontend may call:

```http
POST /query/interpret
Content-Type: application/json

{ "question": "who owes money?", "mode": "offline" }
```

`mode: "offline"` always uses local rules. With `mode: "online"`, the server calls Mistral and returns one validated intent such as `{ "kind": "outstanding" }` or `{ "kind": "customer", "name": "Meena aunty" }`. It never sends an order mutation to the model and the model cannot access the database. If the key, API, or network is unavailable, the response has `source: "offline-fallback"` and includes the local-rule intent instead.

The frontend should use the returned intent with `dueBuckets`, `outstanding`, `customerHistory`, `capacity`, or `needsReview` from `src/store/queries.ts`. That keeps all results and operational data local, even when online mode is selected.

## Sync API

- `GET /health` — relay status and operation count.
- `POST /sync` — accepts `{ cursor, ops }`, idempotently stores operations by `id`, then returns `{ assigned, ops, cursor }`.
- `POST /query/interpret` — turns a question into a safe, read-only local query intent. It does not return or mutate orders.

## Deploy

The relay can be run by a judge with Docker:

```powershell
docker compose up --build
```

It persists SQLite data in the `relay-data` Docker volume. For a venue-network demo, run the command on the host machine and configure the frontend to use `http://<host-lan-ip>:8080` as its relay URL.

## Verification and known limitations

`npm test` covers parser batch output, persistence across restart, offline operational queries, HLC convergence, all three supplied conflict scenarios, relay idempotency, and the online-mode fallback/validation boundary. The provided training set currently scores 0.988 on the supplied scorer; held-out performance can differ.

The Mistral option is intentionally not part of parsing, persistence, sync, or query execution. It is an online convenience for interpreting broader wording. It may be rate-limited or unavailable, so judges should use offline mode for the offline test. A complete deployed system still requires the separate frontend to render the local IndexedDB state and call these APIs.