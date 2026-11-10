# AI Prompts

Chronological high-signal prompts for an external reviewer. This is a concise decision trail, not a transcript.

## Stack and setup

- Compare Python, Go, and C# for the assessment’s four-hour limit.
- Choose TypeScript (strongest language); keep the implementation minimal, with unit and component tests.
- Prefer Zod over Joi/OpenAPI YAML so validation, types, and API docs share one definition.
- Set up the repository with pinned dependencies and tooling before application code.
- Document business rules from the assessment, separating hard requirements from open policy decisions.

## Application shape

- Controllers: one file per HTTP endpoint. Models hold business schemas/types. Express middleware lives in `middleware/`; registration order is owned by `app.ts`.
- Outcomes stay HTTP 200 with `feasible` (aligned to `BUSINESS_RULES.md`, not status-code mapping).
- Keep process logging lightweight and use dedicated graceful-shutdown / fatal-error handling under `runtime/` (not nested with middleware).
- All `process.env` access goes through `getEnv()`.
- Domain order-routing belongs in `services/`, separate from Express wiring.
- `main.ts` boots the process directly and owns boot errors (no separate `start()` wrapper); keep `app.ts` at `src/` root.

## Rules and conventions

- Diff the implementation against `BUSINESS_RULES.md` and fix hard conflicts.
- Capture lasting project conventions in `CLAUDE.md`.

## Tests

- Unit tests first, then mirrored `*.test.ts` layout matching `src/` (skip pure type-only models).
- Prefer real behavior coverage over test-only helpers extracted for line counts.
- Cover `BUSINESS_RULES.md` in tests, especially component tests for `POST /api/route`.

## Service and HTTP modules

- Split catalog and routing into one function per file under `services/`; each folder exports its public API via `index.ts` (no separate `business-logic/` tree).
- Controllers own path, middleware, and handler; `app.ts` only mounts those route modules.
- Expose OpenAPI as JSON and an interactive `/docs` viewer for schema review.
- Bundle Swagger UI locally so `/docs` remains available without an external CDN.
