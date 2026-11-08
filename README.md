# Synapse Order Router

Repository setup for the Synapse Health multi-supplier order routing assessment.
No application code, API schemas, routing logic, or tests have been added yet.

See [Business Rules](BUSINESS_RULES.md) for the business behavior, required rules,
and open policy decisions left by the assessment. Rule→test coverage is in
[Business Rules Coverage](BUSINESS_RULES_COVERAGE.md).

## Requirements

- Node.js 26 (see `.nvmrc`)
- npm 11
- Docker, when running the eventual containerized service

```sh
nvm use
npm ci
```

## Stack

- Express: HTTP service
- Zod: runtime validation and inferred TypeScript types
- zod-openapi: OpenAPI generation from the same schemas
- csv-parse: supplier and product CSV parsing
- Vitest: unit and component test runner
- Supertest: HTTP component tests
- TypeScript, tsx, ESLint, and Prettier: development tooling

Dependencies are pinned and `package-lock.json` is committed for repeatable installs.
TypeScript is pinned to a version supported by the lint tooling.

## Commands

| Command                  | Purpose                                             |
| ------------------------ | --------------------------------------------------- |
| `npm run check`          | Type checking, linting, and formatting checks       |
| `npm run format`         | Apply formatting                                    |
| `npm run lint:fix`       | Apply automatic lint fixes                          |
| `npm test`               | Run all tests                                       |
| `npm run test:unit`      | Run unit tests                                      |
| `npm run test:component` | Run HTTP component tests                            |
| `npm run test:watch`     | Watch tests during development                      |
| `npm run test:coverage`  | Generate V8 coverage reports                        |
| `npm run dev`            | Watch `src/main.ts` during development              |
| `npm run build`          | Compile application source into `dist/`             |
| `npm start`              | Run the compiled `dist/main.js` entrypoint locally  |
| `npm run docker:run`     | Build the Docker image and start the app in a container |

The test commands intentionally fail when no tests exist. To verify discovery during
this setup-only stage, run `npm test -- --passWithNoTests`. CI temporarily uses that
flag; remove it when the first tests are added.

The development, build, start, and Docker commands require application source, which
is intentionally absent. They are prepared for `src/server.ts` and should be verified
when implementation begins.

## Layout

```text
src/                  Future application code
data/                Assessment CSV/JSON inputs (not copied yet)
tests/unit/           Future isolated routing and normalization tests
tests/component/      Future HTTP tests using the real loader and router
tests/fixtures/       Small controlled CSV/JSON test inputs
```

Component tests will exercise the Express application through Supertest without
starting a persistent listening server. No test implementations are included yet.

## Docker

```sh
npm run docker:run
# or: ./scripts/run.sh
```

Builds the multi-stage image and runs the container on port 3000 (`PORT` overrides
the host port). The image compiles the app, installs runtime dependencies only, and
runs as a non-root user.

## Assessment records

`AI_PROMPTS.md` records significant prompts used during planning and setup.
Continue that chronological record during implementation.

## Dependency audit at setup

The installed lint tooling currently reports a moderate `minimatch` denial-of-service
advisory (GHSA-g3hv-75wg-m249), propagated through development dependencies. npm offers
no compatible automatic fix; its forced fix changes the selected lint versions.
No forced downgrade or major-version dependency override has been applied.
Recheck with `npm audit` when dependencies are updated.
