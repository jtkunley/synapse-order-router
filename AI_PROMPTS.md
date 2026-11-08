# AI Prompts

High-signal prompts only, chronological.

- Compare Python, Go, and C# for the assessment’s four-hour limit; choose TypeScript as the strongest language, with a minimal implementation plus unit and component tests.
- Prefer Zod over Joi/OpenAPI YAML so validation, types, and API docs share one definition.
- Set up the repository with pinned dependencies and tooling before application code.
- Document business rules from the assessment, separating hard requirements from open policy decisions.
- Structure the service by concern: controllers (one file per endpoint), models, middleware, services for routing/catalog logic, config via `getEnv()`, and runtime for process boot/shutdown; use `@jtkunley/logger` for process logging.
- Verify the implementation against `BUSINESS_RULES.md`; keep `POST /api/route` on HTTP 200 and communicate outcomes with `feasible`.
- Capture lasting project conventions in `CLAUDE.md`.
- Add tests that mirror `src/` (`*.test.ts`), covering application code except pure type definitions, and prefer behavior coverage over coverage-only helpers.
