# Project rules

Synapse Health multi-supplier order router. Prefer small, focused changes that match existing layout and style.

## Layout

| Path               | Responsibility                                                              |
| ------------------ | --------------------------------------------------------------------------- |
| `src/main.ts`      | Process entrypoint; loads config, builds the app, listens, wires runtime    |
| `src/app.ts`       | Loads the catalog; Express app wiring (routes, then error handler)          |
| `src/routes.ts`    | Registers every endpoint: path, per-route middleware, handler               |
| `src/config/`      | `getEnv()` — sole reader of `process.env`                                   |
| `src/controllers/` | One file per endpoint: path and handler(s); OpenAPI paths in `openapi.ts`   |
| `src/middleware/`  | Express request/response middleware                                         |
| `src/models/`      | Domain schemas/types (Zod + inferred types)                                 |
| `src/services/`    | Business logic (`catalog/`, `routing/`; each folder exports via `index.ts`) |
| `src/runtime/`     | Process fatal-error and shutdown handling (fatal, signals)                  |
| `data/`            | Assessment CSV/JSON inputs                                                  |

## Conventions

- App code must not read `process.env` directly; use `getEnv()`.
- Keep HTTP in controllers; keep routing/catalog logic in services.
- One concern per file when practical (endpoint, middleware, model).
- Use the built-in console for lightweight process logging in server/runtime paths.
- Register endpoints only in `routes.ts`; error handler last in `app.ts`.
- Prefer exact dependency versions; match existing TypeScript/ESM style (`.js` import specifiers).
- Do not edit `AI_PROMPTS.md`; it is maintained by hand.
- When committing, split outstanding changes into gradual commits by concern (e.g. one service split, then controller wiring, then tests/docs)—never one catch-all commit for unrelated work.

## Business behavior

- Authoritative product rules: `BUSINESS_RULES.md` (assessment rules `BR-xxx`; auxiliary rules `BRX-xxx`).
- Name domain code after the "Domain language" table in `BUSINESS_RULES.md`.
- Tests that assert a rule cite it in a comment (`// BR-001` or `// BR-001, BRX-002`).
- `POST /api/route` returns routing decisions; `feasible` is the business outcome flag.
- Do not invent stock, pricing, capacity, or delivery-time rules.
- When changing routing behavior, update or reconcile the `BUSINESS_RULES.md` auxiliary rules (`BRX-xxx`).
