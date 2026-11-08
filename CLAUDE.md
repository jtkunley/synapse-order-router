# Project rules

Synapse Health multi-supplier order router. Prefer small, focused changes that match existing layout and style.

## Layout

| Path               | Responsibility                                     |
| ------------------ | -------------------------------------------------- |
| `src/main.ts`      | Process entrypoint; calls `start()` only           |
| `src/app.ts`       | Express app wiring (middleware order, controllers) |
| `src/config/`      | `getEnv()` — sole reader of `process.env`          |
| `src/controllers/` | One file per HTTP endpoint                         |
| `src/middleware/`  | Express request/response middleware                |
| `src/models/`      | Domain schemas/types (Zod + inferred types)        |
| `src/services/`    | Business logic (catalog load, order routing)       |
| `src/runtime/`     | Process boot/shutdown (`start`, fatal, signals)    |
| `data/`            | Assessment CSV/JSON inputs                         |

## Conventions

- App code must not read `process.env` directly; use `getEnv()`.
- Keep HTTP in controllers; keep routing/catalog logic in services.
- One concern per file when practical (endpoint, middleware, model).
- Use `@jtkunley/logger` for process logging in server/runtime paths.
- Register middleware before controllers; error handler last in `app.ts`.
- Prefer exact dependency versions; match existing TypeScript/ESM style (`.js` import specifiers).

## Business behavior

- Authoritative product rules: `BUSINESS_RULES.md`.
- `POST /api/route` returns routing decisions; `feasible` is the business outcome flag.
- Do not invent stock, pricing, capacity, or delivery-time rules.
- When changing routing behavior, update or reconcile `BUSINESS_RULES.md` open-policy decisions.
