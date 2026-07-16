# M1 Local Platform Bootstrap and One-Call Vertical Slice

**Status:** Design approved in conversation; awaiting written-spec review  
**Date:** 2026-07-14  
**Milestone:** M1  
**Operating model:** Solo, bootstrapped, local-first  
**Canonical inputs:** `docs/core/architecture.md`, `docs/core/implementation-roadmap.md`, `docs/core/implementation-status.md`, and `docs/superpowers/specs/2026-07-14-m0-decision-lock.md`

## 1. Problem and outcome

LittleArc currently has a working Expo SDK 57 mobile shell and design system under `apps/mobile`, but it does not yet have the workspace, API, database, shared contracts, local services, continuous integration, or recovery foundations required by the product architecture.

M1 will migrate the existing app into a root pnpm/Turborepo/Biome workspace without re-scaffolding it, add the local platform foundations, and prove one real vertical slice:

```text
Expo developer route
  -> tRPC client
  -> Fastify 5
  -> official tRPC 11 Fastify adapter
  -> Drizzle
  -> PostgreSQL
  -> seeded bootstrap row
  -> typed response rendered in Expo
```

The milestone is complete when this path works locally on iOS and Android, the same real HTTP/database path is automated in Linux CI, the workspace and container builds are green, the full local service stack is healthy, and backup/restore evidence is recorded.

## 2. Scope decision

### 2.1 Included

- `PLAT-01`: root pnpm workspace, Turborepo, and Biome scaffold.
- `PLAT-02`: shared TypeScript and Biome configuration.
- `PLAT-03`: local Docker Compose stack for PostgreSQL, MinIO, Mailpit, and ClamAV.
- `PLAT-04`: CI baseline.
- `PLAT-05`: Fastify/tRPC API skeleton, health routes, redaction, and named rate-limit framework.
- `PLAT-06`: client-safe contracts package.
- `PLAT-07`: type-only `AppRouter` boundary.
- `PLAT-08`: developer-only Expo-to-PostgreSQL vertical slice.
- `MOB-01`: preservation and re-verification of the existing Expo Router/New Architecture app.
- `OBS-02`: empty-by-default event allowlist and redaction foundations.
- `PLAT-09`: encrypted local backup and isolated restore drill.
- A minimal `packages/db` foundation required to make PLAT-08 and migration-from-zero testing real.

### 2.2 Explicitly deferred

`PLAT-10` is not part of this local-first M1 execution. Railway Singapore, staging PostgreSQL, Cloudflare R2 staging credentials, a public readiness endpoint, and a mobile call against staging are deferred until a second developer or tester requires remote access.

The implementation plan must update the roadmap and status tracker so M1 can be recorded as **local-complete** without falsely claiming the remote staging gate passed. PLAT-10 remains a named deferred work package with the remote-collaboration trigger.

### 2.3 Non-goals

- No Railway, R2, public deployment, DNS, or remote environment.
- No auth, households, RLS, product-domain schema, native modules, uploads, jobs, AI, push, or email integration.
- No pg-boss runtime setup beyond reserving the API entrypoint boundaries needed later.
- No WebSockets.
- No external analytics or error-monitoring provider.
- No native cloud builds, Maestro suite, image publishing, or remote Turborepo cache.
- No re-scaffolding or redesign of the existing mobile app.

## 3. Architectural design

### 3.1 Repository boundaries

```text
.
├── apps/
│   ├── mobile/                 # Existing Expo app, preserved in place
│   └── api/                    # Fastify/tRPC process and entrypoints
├── packages/
│   ├── config/                 # Shared TypeScript and Biome configuration
│   ├── contracts/              # Client-safe Zod DTOs and transport conventions
│   ├── db/                     # Drizzle schema, migrations, seed, pool/client
│   ├── api-types/              # Type-only AppRouter export; no runtime values
│   └── observability/          # Redaction helpers and typed event allowlist
├── tooling/
│   ├── docker/                 # Local-service initialization
│   └── scripts/                # Backup, restore drill, and seed entrypoints
├── .github/workflows/ci.yml
├── biome.json
├── docker-compose.yml
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── turbo.json
```

The mobile app may consume runtime-safe contracts and `AppRouter` as a TypeScript type. It must not import Fastify, PostgreSQL, Drizzle, environment parsing, or API implementation values.

### 3.2 Workspace migration

The existing mobile app is migrated before any new package is introduced:

1. Create the root workspace manifest and root package metadata.
2. Move root-scoped pnpm settings out of `apps/mobile/pnpm-workspace.yaml`.
3. Remove the nested workspace file and nested lockfile.
4. Regenerate exactly one root `pnpm-lock.yaml`.
5. Clear the pre-monorepo Metro cache once.
6. Prove the unchanged app still type-checks, tests, exports, and runs on iOS and Android.
7. Add Turbo and Biome task orchestration.
8. Add new workspace members only after the migration baseline is green.

Expo SDK 57 supplies monorepo-aware Metro defaults. The existing `getDefaultConfig(__dirname)` remains the baseline; custom watch folders, resolver aliases, or symlink workarounds are prohibited unless a reproduced SDK 57 failure proves they are necessary.

`apps/mobile/tsconfig.json` continues to extend `expo/tsconfig.base`. Shared strict options are layered through TypeScript's multiple-extends support instead of replacing Expo's base configuration.

### 3.3 API composition

`apps/api` exposes a side-effect-free `buildServer(options)` factory for tests and thin executable entrypoints:

- `server.ts`: HTTP API process.
- `worker.ts`: clean no-handler worker boundary for later pg-boss integration.
- `all.ts`: combined-process boundary retained for the future low-cost deployment model.

Fastify plugins are registered in a fixed order:

1. Request ID and Pino logging/redaction.
2. Security headers and local CORS policy.
3. Named rate-limit policy registry and enforcement helpers.
4. Liveness and readiness routes.
5. Official first-party tRPC Fastify adapter at `/trpc`.

The design does not add a competing JSON content-type parser and does not wrap the tRPC adapter with `fastify-plugin` unless a test demonstrates a required encapsulation behavior. This avoids the documented parser/prefix integration hazards in the adapter.

### 3.4 Database proof

`packages/db` owns:

- Environment-independent Drizzle schema definitions.
- PostgreSQL pool and Drizzle client factories.
- Immutable SQL migrations.
- A deterministic, non-sensitive `platform_probe` row.
- An idempotent local/CI seed entrypoint.
- Pool shutdown.

The bootstrap row exists only to prove migration, seed, query, transport, and rendering through the real stack. It contains no user or product data. Future work may retain it as a platform diagnostic or remove it through a normal migration after another real product table supersedes the proof.

### 3.5 Contract and type boundary

`packages/contracts` contains only mobile-safe runtime code:

- Zod 4 request/response schemas.
- Transport-safe enums and DTO conventions.
- SuperJSON transformer configuration shared by client and server.

SuperJSON is adopted in M1 so later Date and richer-value support does not require a wire-format change.

`packages/api-types` exposes only:

```ts
export type { AppRouter } from '@littlearc/api/router'
```

It has no runtime export and no dependency on secret-loading code. The final package graph and generated Expo bundle are tested to prove server-only modules cannot enter Metro.

### 3.6 Mobile integration

The existing root layout receives TanStack Query and tRPC providers without changing the design-system or navigation behavior. A tested API URL resolver follows these rules:

1. An explicit `EXPO_PUBLIC_API_URL` wins.
2. Development may derive the host from Expo's development host metadata and the configured local API port.
3. Non-development execution fails clearly when no API URL is configured.
4. No production-shaped success fallback points to localhost.

Every request includes app platform, version, build, and request ID headers. The server preserves or creates a request ID and returns it in the safe response/error context.

The proof UI lives at `apps/mobile/app/_dev/platform.tsx`. It:

- Is reachable only in development.
- Redirects outside `__DEV__`.
- Is absent from production navigation.
- Shows loading, success, explicit retry, database-unavailable, transport, and unexpected-error states.
- Renders the seeded value, database timestamp, and request ID.

## 4. Runtime flow

1. The developer opens `/_dev/platform`.
2. The mobile query calls `platform.ping` through `httpBatchLink`.
3. Fastify applies request ID, logging, CORS, and rate-limit foundations.
4. The official tRPC adapter creates request context with the Drizzle client.
5. The procedure reads the deterministic `platform_probe` row and database time.
6. The server returns a Zod-conforming, SuperJSON-encoded response.
7. TanStack Query updates the route.
8. The route renders the value and correlation ID.

A second named platform procedure or injected test policy proves that the centralized rate-limit mechanism returns 429 after the configured limit. Health routes are not used as rate-limit test targets.

## 5. Failure and security design

### 5.1 Configuration

API configuration is parsed once through Zod. Missing or invalid required values fail startup with actionable, non-secret diagnostics. Committed environment examples contain variable names and safe local values only.

### 5.2 Health and shutdown

- `/health/live` reports process liveness only.
- `/health/ready` queries PostgreSQL and returns 503 when the database is unavailable.
- Readiness failures do not leak SQL or connection details.
- Shutdown first stops accepting HTTP work through `fastify.close()`, then closes the PostgreSQL pool so in-flight requests can finish.

### 5.3 Error contract

M1 keeps standard tRPC error codes and adds only safe message/request-ID context. SQL errors, stack traces, provider details, internal file paths, and environment values are never sent to mobile.

The mobile route does not retry forever. Database and transport failures remain visible and recoverable through an explicit retry action.

### 5.4 Logging and telemetry

Pino redaction is configured centrally for authorization/cookie headers and recursive password/token/secret fields. Tests inspect emitted log records to prove values are redacted.

`packages/observability` begins with an empty event allowlist:

- TypeScript rejects statically named events outside the list.
- Runtime validation rejects dynamic/untyped names.
- No PostHog or Sentry SDK is initialized in M1.

## 6. Local infrastructure

Docker Compose includes version-pinned PostgreSQL, MinIO, Mailpit, and ClamAV services with named volumes and independent health checks:

- PostgreSQL uses `pg_isready`.
- MinIO uses a health endpoint or `mc ready`, verified against the pinned image.
- Mailpit uses `/api/v1/healthz`.
- ClamAV persists `/var/lib/clamav` definitions.

ClamAV's initial definition download may be slow and network-bound. It does not gate API/PostgreSQL startup during normal vertical-slice development. The complete M1 exit evidence still records all four services healthy.

Only PostgreSQL runs in M1 integration CI because no M1 test exercises storage, mail, or file scanning. MinIO enters CI with upload work; Mailpit with email work; ClamAV with quarantine/finalization work.

## 7. CI design

The baseline uses entitlement-independent gates:

1. **Quality:** frozen root install, Biome, TypeScript, unit tests, workspace builds, and Expo export.
2. **Integration:** PostgreSQL 16 service with an explicit Actions health command; migration from zero; deterministic seed; actual Fastify listener; actual tRPC HTTP client; actual PostgreSQL query.
3. **Security:** Gitleaks with exit-code enforcement and `pnpm audit` at the agreed severity; Dependabot/dependency graph enabled separately.
4. **Container:** production API image builds successfully but is not pushed.

CodeQL and dependency-review are not hard gates until the repository's GitHub Advanced Security entitlement is verified. SARIF upload is optional; scan failure must not depend on Security-tab entitlement.

The integration test intentionally covers real adapter/plugin composition so Fastify/tRPC parser, prefix, or version mismatches fail in CI rather than on a device.

## 8. Backup and restore

`backup.sh`:

- Validates required tools and variables.
- Streams `pg_dump --format=custom` directly into `age` encryption.
- Never writes an unencrypted dump.
- Produces a non-sensitive manifest needed for verification.

`restore-drill.sh`:

- Refuses to target the configured source database.
- Creates a uniquely named scratch database.
- Decrypts and restores the custom-format dump.
- Compares expected row counts, including the bootstrap row.
- Cleans up the scratch database on success or failure while preserving actionable logs.

The scripts support macOS and Linux and fail with installation guidance if `age` or PostgreSQL client tools are absent.

## 9. Verification strategy

### 9.1 Automated

- Workspace has one root lockfile and resolves all `workspace:*` dependencies.
- Existing mobile Jest/RNTL suite remains green.
- Node packages and API use Vitest.
- Drizzle migrations apply from an empty PostgreSQL database.
- Seed is idempotent.
- `/health/ready` returns 200 with PostgreSQL and 503 without it.
- The actual tRPC HTTP client reaches the actual Fastify adapter and reads the actual PostgreSQL row.
- Named rate limiting returns 429 after the configured threshold.
- Emitted logs redact sensitive values.
- Empty observability allowlist rejects invalid static and dynamic events.
- Expo export contains no Fastify, Drizzle, PostgreSQL driver, or secret-bearing module.
- API production container builds.
- Encrypted backup restores into a scratch database with matching row counts.

### 9.2 Manual evidence

- `docker compose ps` shows all four services healthy.
- Existing mobile app boots on iOS simulator and Android emulator after workspace migration.
- Developer platform route shows the seeded database value on both platforms.
- Database shutdown produces the designed error state and recovery after restart.
- Final screenshots or recordings are referenced from the implementation-status evidence.

Native builds remain local. Linux CI does not pretend to prove iOS or Android native execution.

## 10. Implementation-plan decomposition

The approved output is an index plus dependency-ordered cluster plans:

1. `docs/impl-plan/M1/README.md`
2. `docs/impl-plan/M1/PLAT-01-02-MOB-01-workspace-mobile.md`
3. `docs/impl-plan/M1/PLAT-03-database-local-stack.md`
4. `docs/impl-plan/M1/PLAT-05-06-07-api-contracts-types.md`
5. `docs/impl-plan/M1/PLAT-08-one-call-vertical-slice.md`
6. `docs/impl-plan/M1/PLAT-04-OBS-02-ci-observability.md`
7. `docs/impl-plan/M1/PLAT-09-recovery-and-m1-exit.md`

Each plan must contain exact paths, test-first steps, commands, expected failure/success output, focused commits for the implementer, and evidence required before advancing.

## 11. Confidence and residual uncertainty

Absolute 100% certainty cannot be established by a planning document alone. The design instead requires every material assumption to become an executable gate.

High-confidence conclusions:

- Expo SDK 57 supports pnpm monorepos without legacy Metro customization.
- tRPC 11's Fastify adapter is first-party and tested against Fastify 5.
- A real HTTP/PostgreSQL CI smoke test covers the most important compatibility risk.
- Local-only M1 does not need MinIO, Mailpit, or ClamAV in CI.
- Type-only imports plus bundle inspection can prove the mobile/server boundary.

Residual items that implementation must verify:

- Exact dependency versions selected on the implementation date.
- The pinned MinIO image's available health-check utility.
- Expo development-host derivation on both local simulators.
- GitHub repository entitlements for optional security actions.
- `age` and PostgreSQL client availability on the actual macOS/Linux machines.

The implementation plan will be independently reviewed by Claude Opus 4.8 with maximum reasoning. Valid findings will be incorporated before the plan is presented as final. Confidence will be reported honestly with remaining operational prerequisites rather than rounded up to a false 100%.

## 12. Research basis

Primary and maintained upstream sources used:

- Expo, **Work with monorepos**: https://docs.expo.dev/guides/monorepos/
- Expo, **New Architecture**: https://docs.expo.dev/guides/new-architecture/
- pnpm, **Workspaces**: https://pnpm.io/workspaces
- pnpm, **pnpm-workspace.yaml**: https://pnpm.io/pnpm-workspace_yaml
- Turborepo, **Configuration**: https://turborepo.dev/docs/reference/configuration
- Turborepo, **TypeScript**: https://turborepo.dev/docs/guides/tools/typescript
- Turborepo, **GitHub Actions**: https://turborepo.dev/docs/guides/ci-vendors/github-actions
- Biome, **Big projects and monorepos**: https://biomejs.dev/guides/big-projects/
- tRPC, **Fastify adapter**: https://trpc.io/docs/server/adapters/fastify
- tRPC maintained adapter/tests: https://github.com/trpc/trpc/tree/main/packages/server/src/adapters/fastify
- Fastify rate-limit: https://github.com/fastify/fastify-rate-limit
- Fastify CORS: https://github.com/fastify/fastify-cors
- Drizzle, **PostgreSQL**: https://orm.drizzle.team/docs/quick-postgresql
- Drizzle, **Migrations**: https://orm.drizzle.team/docs/migrations
- node-postgres, **Pool API**: https://node-postgres.com/apis/pool
- GitHub Actions, **Service containers**: https://docs.github.com/en/actions/using-containerized-services/about-service-containers
- PostgreSQL, **pg_isready**: https://www.postgresql.org/docs/current/app-pg-isready.html
- ClamAV, **Docker**: https://docs.clamav.net/manual/Installing/Docker.html
- MinIO, **Healthcheck probes**: https://min.io/docs/minio/container/operations/healthcheck-probes.html
- Mailpit maintained repository: https://github.com/axllent/mailpit
- Pino, **Redaction**: https://getpino.io/#/docs/redaction
- GitHub, **CodeQL private-repository entitlement change**: https://github.blog/changelog/2024-03-26-codeql-code-scanning-will-require-github-advanced-security-in-private-repos-from-january-2025/
- age maintained implementation: https://github.com/FiloSottile/age

