# Synapse Order Router

HTTP service that routes multi-item durable-medical-equipment orders to eligible
suppliers. Built for the Synapse Health take-home assessment.

Authoritative behavior: [BUSINESS_RULES.md](./BUSINESS_RULES.md). Project conventions:
[CLAUDE.md](./CLAUDE.md). Prompt trail: [AI_PROMPTS.md](./AI_PROMPTS.md).

## Quick start

```sh
nvm use
npm ci
npm run dev          # http://localhost:3000
# or
npm run docker:run   # build image and run the container on port 3000
```

| URL                 | Purpose                                                |
| ------------------- | ------------------------------------------------------ |
| `POST /api/route`   | Route an order; always HTTP 200, outcome in `feasible` |
| `GET /openapi.json` | OpenAPI 3.1 document (Zod-sourced)                     |
| `GET /docs`         | Interactive OpenAPI viewer (Swagger UI)                |

Example:

```sh
curl -s http://localhost:3000/api/route \
  -H 'content-type: application/json' \
  -d '{
    "order_id": "ORD-1",
    "customer_zip": "10001",
    "mail_order": false,
    "items": [{"product_code": "WC-STD-001", "quantity": 1}]
  }'
```

Assessment catalog inputs live in `data/` (`products.csv`, `suppliers.csv`,
`sample_orders.json`). Override with `DATA_DIR`. Port defaults to `3000` (`PORT`).

## Stack

- Node.js 26 / Express 5 / TypeScript (ESM)
- Zod + zod-openapi — one schema for validation, types, and OpenAPI
- swagger-ui-dist — self-contained interactive API documentation
- csv-parse — product and supplier catalog loading
- Vitest + Supertest — unit and HTTP component tests
- Docker — multi-stage production image

## Commands

| Command                                | Purpose                                                |
| -------------------------------------- | ------------------------------------------------------ |
| `npm run dev`                          | Watch-mode server (`src/main.ts`)                      |
| `npm run build` / `npm start`          | Compile to `dist/` and run locally                     |
| `npm run docker:run`                   | Build image and start the container (`scripts/run.sh`) |
| `npm test`                             | Unit + component tests                                 |
| `npm run test:unit` / `test:component` | Layer-scoped suites                                    |
| `npm run test:coverage`                | V8 coverage                                            |
| `npm run check`                        | Typecheck, lint, format check                          |

## Layout

```text
src/main.ts            Process entry; loads config and starts the server
src/app.ts             Catalog load + Express wiring (routes, error handler)
src/routes.ts          Endpoint registration (path, middleware, handler)
src/config/            getEnv() — sole process.env reader
src/controllers/       Endpoint handlers, one file per endpoint
src/middleware/        Request/response middleware
src/models/            Zod schemas and inferred types
src/services/catalog/  CSV catalog load (index exports loadCatalog, getCatalog)
src/services/routing/  Order routing (index exports routeOrder)
src/runtime/           Fatal errors, graceful shutdown
data/                  Assessment CSV/JSON inputs
tests/unit|component/  Mirrored *.test.ts layout
```

## Routing summary

Routing priorities (see `BR-015`…`020`): feasibility → fewer shipments →
higher customer satisfaction → local fulfillment when satisfaction scores are similar.
Decisions for gaps in the assessment are recorded as auxiliary rules (`BRX-xxx`) in
[BUSINESS_RULES.md](./BUSINESS_RULES.md).

## Docker

```sh
npm run docker:run
# host port: PORT=8080 npm run docker:run
```

Multi-stage image: compile in build stage, runtime deps only in final image, runs
as non-root `node` user.
