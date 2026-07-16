# M1 — Local Platform Bootstrap and One-Call Vertical Slice: Implementation Plan Index

**Source of truth for this milestone's design:** `docs/superpowers/specs/2026-07-14-m1-local-platform-bootstrap-design.md`
**Canonical roadmap/status:** `docs/core/implementation-roadmap.md` (§8 M1 subsection), `docs/core/implementation-status.md` (M1 section)
**Workflow:** `docs/impl-plan/README.md`

This index does not duplicate the approved design — it defines the **shared contract** every plan below must use identically (package names, ports, environment variables, procedure names, response fields), the **order** plans must be executed in, the **coverage matrix** proving every M1 work package has a plan, and the **stop/go gates** between plans.

---

## 1. Scope

### 1.1 Included (work packages this milestone's plans implement)

`PLAT-01`, `PLAT-02`, `PLAT-03`, `PLAT-04`, `PLAT-05`, `PLAT-06`, `PLAT-07`, `PLAT-08`, `PLAT-09`, `MOB-01`, `OBS-02`, plus a minimal `packages/db` foundation required to make `PLAT-08` and migration-from-zero testing real (not a separately numbered work package — it is the shared foundation `PLAT-03`, `PLAT-05`, and `PLAT-08` all depend on).

### 1.2 Explicitly deferred

`PLAT-10` (Railway Singapore staging, staging PostgreSQL, a separate R2 staging bucket/token, a public staging `/health/ready`, and a mobile call against staging) is **not** part of this local-first M1 execution. See §7 for its exact deferral trigger.

### 1.3 Non-goals (unchanged from the approved design)

No Railway, R2, public deployment, DNS, or remote environment. No auth, households, RLS, product-domain schema, native modules, uploads, jobs, AI, push, or email integration. No pg-boss runtime setup beyond reserving the API entrypoint boundaries needed later. No WebSockets. No external analytics or error-monitoring provider. No native cloud builds, Maestro suite, image publishing, or remote Turborepo cache. No re-scaffolding or redesign of the existing mobile app.

---

## 2. Plan files and execution order

| Order | File | Work packages | Depends on |
|---|---|---|---|
| 1 | `PLAT-01-02-MOB-01-workspace-mobile.md` | `PLAT-01`, `PLAT-02`, `MOB-01` | Nothing (first) |
| 2 | `PLAT-03-database-local-stack.md` | `PLAT-03` | File 1 (root workspace must exist) |
| 3 | `PLAT-05-06-07-api-contracts-types.md` | `PLAT-05`, `PLAT-06`, `PLAT-07` | File 2 (`packages/db` and the seeded, healthy PostgreSQL) |
| 4 | `PLAT-08-one-call-vertical-slice.md` | `PLAT-08` | File 3 (`apps/api`, `packages/contracts`, `packages/api-types` all running and tested) |
| 5 | `PLAT-04-OBS-02-ci-observability.md` | `PLAT-04`, `OBS-02` | Files 1–4 (CI automates what those plans already do by hand; `OBS-02` has no code dependency on the others but is bundled here as the approved design's low-risk parallel filler) |
| 6 | `PLAT-09-recovery-and-m1-exit.md` | `PLAT-09` | Files 1–5 (backup/restore needs the real seeded database; the local-complete status/roadmap update needs every other plan actually done) |

### Dependency graph

```text
PLAT-01/02/MOB-01 (root workspace, packages/config, mobile migration)
        │
        ▼
PLAT-03 (docker-compose.yml, packages/db: schema/migration/seed)
        │
        ▼
PLAT-05/06/07 (apps/api, packages/contracts, packages/api-types)
        │
        ▼
PLAT-08 (apps/mobile: trpc client, /_dev/platform, bundle-leak check)
        │
        ▼
PLAT-04/OBS-02 (.github/workflows/ci.yml, packages/observability)
        │
        ▼
PLAT-09 (tooling/scripts backup/restore, status/roadmap local-complete update)

PLAT-10 — deferred, no plan file, trigger recorded in §7 below.
```

### Stop/go gates between plans

Each plan file ends with an **"Evidence required before advancing"** section. Do not start the next plan in the order above until every box in the current plan's section is checked. In summary:

| After file | Gate before starting the next file |
|---|---|
| 1 | Single root `pnpm-lock.yaml`; `pnpm install --frozen-lockfile`/`lint`/`typecheck`/`test`/`build` all green; mobile Jest suite and `expo-doctor` match their recorded pre-migration baselines exactly (zero regression, not zero pre-existing findings). |
| 2 | `docker compose ps` shows PostgreSQL, MinIO, Mailpit healthy (ClamAV healthy once its definitions download finishes); `platform_probe` seeded with exactly one row; migration-from-zero and seed-idempotency integration tests pass. |
| 3 | The real, non-mocked `platform.ping` HTTP integration test passes against the live seeded PostgreSQL; 429 enforcement proven on `platform.rateLimitProbe`; Pino redaction and safe-error-message tests pass; `@littlearc/api`'s `./router` export rejects a real runtime import. |
| 4 | `pnpm --filter @littlearc/mobile run test:bundle-leak` passes; `/_dev/platform` shows the seeded value on a real iOS simulator and Android emulator, and shows the designed database-unavailable/recovery behavior. |
| 5 | A real GitHub Actions run shows all four jobs (`Quality`, `Integration (PostgreSQL)`, `Security`, `Container (build only)`) green; `packages/observability`'s allowlist rejects every event name at compile time and runtime while empty. |
| 6 | Encrypted backup/restore drill passes locally with matching row counts; `docs/core/implementation-status.md` and `docs/core/implementation-roadmap.md` both record M1 as local-complete with `PLAT-10` named and deferred. |

---

## 3. Work-package coverage matrix

| WP ID | Deliverable | Plan file | Status after this milestone |
|---|---|---|---|
| `PLAT-01` | pnpm workspace + Turborepo + Biome scaffold | `PLAT-01-02-MOB-01-workspace-mobile.md` | Done |
| `PLAT-02` | Shared TypeScript/Biome config (`packages/config`) | `PLAT-01-02-MOB-01-workspace-mobile.md` | Done |
| `MOB-01` | Existing Expo Router app preserved and re-verified in the new workspace | `PLAT-01-02-MOB-01-workspace-mobile.md` | Done |
| `PLAT-03` | Docker Compose local stack + `packages/db` foundation | `PLAT-03-database-local-stack.md` | Done |
| `PLAT-05` | `apps/api` Fastify/tRPC skeleton, health routes, rate-limit framework | `PLAT-05-06-07-api-contracts-types.md` | Done |
| `PLAT-06` | `packages/contracts` (Zod schemas, SuperJSON transformer) | `PLAT-05-06-07-api-contracts-types.md` | Done |
| `PLAT-07` | `packages/api-types` type-only `AppRouter` export | `PLAT-05-06-07-api-contracts-types.md` | Done |
| `PLAT-08` | One-call vertical slice (Expo → tRPC → Fastify → PostgreSQL) | `PLAT-08-one-call-vertical-slice.md` | Done |
| `PLAT-04` | CI pipeline baseline | `PLAT-04-OBS-02-ci-observability.md` | Done |
| `OBS-02` | `packages/observability` empty allowlist + redaction utility | `PLAT-04-OBS-02-ci-observability.md` | Done |
| `PLAT-09` | Encrypted backup/restore drill; M1 local-complete status update | `PLAT-09-recovery-and-m1-exit.md` | Done |
| `PLAT-10` | Railway staging deploy, staging PostgreSQL, R2 staging bucket | *(none — deferred)* | Deferred, trigger in §7 |

---

## 4. Shared contract

Every plan file uses these exact names, ports, variables, and shapes. If a plan file appears to disagree with this table, the table wins — treat the disagreement as a bug in that plan file.

### 4.1 Package names

| Path | Package name |
|---|---|
| (repo root) | `littlearc` |
| `apps/mobile` | `@littlearc/mobile` |
| `apps/api` | `@littlearc/api` |
| `packages/config` | `@littlearc/config` |
| `packages/contracts` | `@littlearc/contracts` |
| `packages/db` | `@littlearc/db` |
| `packages/api-types` | `@littlearc/api-types` |
| `packages/observability` | `@littlearc/observability` |

### 4.2 Ports

| Service | Port(s) |
|---|---|
| Fastify API | `3000` |
| PostgreSQL | `5432` |
| MinIO API / Console | `9000` / `9001` |
| Mailpit SMTP / HTTP | `1025` / `8025` |
| ClamAV `clamd` | `3310` |

### 4.3 Pinned Docker images

| Service | Image |
|---|---|
| PostgreSQL | `postgres:16.14` |
| MinIO | `quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z` |
| Mailpit | `axllent/mailpit:v1.30.4` |
| ClamAV | `clamav/clamav:1.5.3-debian` |
| `apps/api` production image base | `node:22.17.0-bookworm-slim` |

### 4.4 Environment variables

Root `.env.example` (created in `PLAT-03-database-local-stack.md`; read by `docker-compose.yml`, `packages/db`, and `apps/api`):

```
COMPOSE_PROJECT_NAME, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, DATABASE_URL,
MINIO_ROOT_USER, MINIO_ROOT_PASSWORD,
NODE_ENV, API_HOST, API_PORT, LOG_LEVEL, CORS_ALLOWED_ORIGINS,
BACKUP_AGE_RECIPIENT, BACKUP_AGE_IDENTITY_FILE
```

`apps/mobile/.env.example` (created in `PLAT-08-one-call-vertical-slice.md` — separate from the root file because Expo only auto-loads a project-local `.env`):

```
EXPO_PUBLIC_API_URL, EXPO_PUBLIC_API_PORT
```

### 4.5 HTTP surface

| Route | Purpose |
|---|---|
| `GET /health/live` | Process liveness only; always `200` |
| `GET /health/ready` | `200` with PostgreSQL reachable, `503` (no connection details) otherwise |
| `ALL /trpc/*` | tRPC adapter (official `@trpc/server/adapters/fastify`) |

### 4.6 tRPC surface

```text
appRouter
└── platform
    ├── ping             — query, no input
    └── rateLimitProbe   — query, no input (dedicated target for the 429 proof)
```

`platform.ping` response shape (`packages/contracts`'s `platformPingResponseSchema`):

```ts
{
  message: string       // the seeded platform_probe.label, e.g. "littlearc-platform-bootstrap"
  seededAt: string       // ISO 8601, platform_probe.seededAt
  databaseTime: string   // ISO 8601, live `SELECT now()`
  requestId: string      // UUID, echoed request ID
}
```

### 4.7 Request headers

Every mobile request carries: `x-app-platform`, `x-app-version`, `x-app-build`, `x-request-id`. The server reads `x-request-id` via Fastify's `requestIdHeader` option (preserves it if present, generates a UUID via `genReqId` otherwise) and returns it in every safe response/error `data.requestId` field.

### 4.8 `platform_probe` table (`packages/db`)

```sql
CREATE TABLE "platform_probe" (
	"id" uuid PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"seeded_at" timestamp with time zone DEFAULT now() NOT NULL
);
```

Seeded deterministically: `id = '00000000-0000-0000-0000-000000000001'`, `label = 'littlearc-platform-bootstrap'`.

### 4.9 Named rate-limit policies (`apps/api/src/plugins/rate-limit.ts`)

Both policies share one fixed 60-second (`RATE_LIMIT_TIME_WINDOW_MS = 60_000`) window; only `max` varies per request via an officially documented async `@fastify/rate-limit` option.

| Policy name | Applies to | Limit (per 60s window) |
|---|---|---|
| `default` | Everything else | 120 requests |
| `platformRateLimitProbe` | `/trpc/platform.rateLimitProbe` | 3 requests |

`/health/live` and `/health/ready` are excluded from rate limiting entirely via `@fastify/rate-limit`'s `allowList` option (`isHealthRoute`) — not merely given a high limit. `httpBatchLink` (the mobile client's real link) can coalesce multiple procedure calls into one HTTP request, which only counts once against this limiter; the 429 proof in `PLAT-05-06-07-api-contracts-types.md` Task 10 deliberately bypasses any batching link for that reason — see that task for the verified detail.

### 4.10 Pinned dependency versions referenced across these plans

Node.js `22.17.0` · pnpm `11.13.0` · TypeScript `6.0.3` · Turborepo `2.10.5` · Biome `2.5.3` · Fastify `5.10.0` · `@fastify/cors` `11.3.0` · `@fastify/helmet` `13.1.0` · `@fastify/rate-limit` `11.1.0` · `@trpc/server`/`@trpc/client`/`@trpc/tanstack-react-query` `11.18.0` · `@tanstack/react-query` `5.101.2` · `zod` `4.4.3` · `superjson` `2.2.6` · `pino` `10.3.1` · `drizzle-orm` `0.45.2` · `drizzle-kit` `0.31.10` · `pg` `8.22.0` · `@types/pg` `8.20.0` · `@types/node` `22.20.1` · `tsx` `4.23.1` · `vitest` `4.1.10` · `expo-crypto` `~57.0.0` (installed via `npx expo install`, exact patch may differ) · `gitleaks` CLI `v8.30.1` · `age` `1.3.1`.

All were the current, verified-to-exist versions as of the date this plan set was written. Re-verify before use if executed significantly later — see §9.

---

## 5. Automated vs. manual evidence matrix

| Evidence | Automated | Manual | Where |
|---|---|---|---|
| Single root lockfile; install/lint/typecheck/build and non-DB/API tests green | ✅ CI `quality` job | — | File 5 |
| Mobile Jest suite + `expo-doctor` parity with pre-migration baseline | ✅ (Jest); `expo-doctor` run by hand once | — | File 1 |
| `docker compose ps` — all four services healthy | — | ✅ | Files 2, 6 |
| Migration-from-zero, seed idempotency | ✅ Vitest integration tests, real CI Postgres service container | — | Files 2, 5 |
| Real tRPC HTTP client → real Fastify → real PostgreSQL | ✅ Vitest integration test, run in CI too | — | Files 3, 5 |
| 429 rate-limit enforcement | ✅ Vitest | — | File 3 |
| Pino redaction / safe error messages | ✅ Vitest | — | File 3 |
| `AppRouter` type-only boundary fails closed at runtime | ✅ Vitest (dynamic `import()` rejection) | — | File 3 |
| Mobile bundle contains no server-only code | ✅ Node script (`expo export --no-bytecode --no-minify` + grep), run in CI too | — | Files 4, 5 |
| `/_dev/platform` shows seeded value | — | ✅ iOS simulator + Android emulator | File 4 |
| `/_dev/platform` database-unavailable + recovery | — | ✅ iOS simulator + Android emulator | File 4 |
| Observability allowlist rejects events | ✅ Vitest (runtime) + `tsc` (`@ts-expect-error`, compile time) | — | File 5 |
| GitHub Actions all four jobs green | ✅ (workflow itself); confirming the run is manual | ✅ (open the Actions tab) | File 5 |
| Production API image builds | ✅ CI `container` job (build only, never pushed) | — | File 5 |
| Encrypted backup / restore drill | — | ✅ run by hand locally | File 6 |
| Status/roadmap updated to local-complete | — | ✅ documentation edit | File 6 |

Native iOS/Android runtime behavior is inherently manual — Linux CI proves the real Fastify/tRPC/PostgreSQL path and the mobile/server bundle boundary, but it cannot and does not claim to prove native iOS or Android execution.

---

## 6. Roadmap-file cross-references (read, do not edit, until File 6)

- `docs/core/architecture.md` §5 (repository layout), §8 (backend architecture), §19 (local development), §21 (testing strategy), §22 (database migrations) — the shape every plan file below matches.
- `docs/core/implementation-roadmap.md` §8 M1 subsection — the WP table and per-WP test/validation expectations this plan set satisfies.
- `docs/core/implementation-status.md` M1 section — updated to local-complete only in `PLAT-09-recovery-and-m1-exit.md`, and only after every other plan is actually done.

No plan file in this set edits `docs/core/architecture.md`, `docs/core/implementation-roadmap.md`, or `docs/core/implementation-status.md` except `PLAT-09-recovery-and-m1-exit.md`'s explicit, final, exact-text edits to the latter two.

---

## 7. `PLAT-10` deferral trigger

`PLAT-10` (Railway Singapore staging PostgreSQL + API deploy, a separate R2 staging bucket/token, a public staging `/health/ready`, and a mobile call against staging) is deferred, not cancelled. Its trigger, exactly as decided in `docs/superpowers/specs/2026-07-14-m1-local-platform-bootstrap-design.md` §2.2:

> Railway Singapore, staging PostgreSQL, Cloudflare R2 staging credentials, a public readiness endpoint, and a mobile call against staging are deferred until **a second developer or tester requires remote access**.

`PLAT-09-recovery-and-m1-exit.md` records this trigger verbatim in both `docs/core/implementation-status.md` and `docs/core/implementation-roadmap.md`. `PLAT-10` remains a formally-scoped M1 work package throughout this deferral — only its *execution* is deferred, not its milestone ownership. When the trigger fires, `PLAT-10` gets its own implementation plan at `docs/impl-plan/M1/PLAT-10-<slug>.md`, added to this same M1 plan set (not a later milestone folder) regardless of how much later it is actually picked up, and this README's WP coverage matrix (§4) is updated to point at it.

---

## 8. Final local-complete definition

M1 is **local-complete** — distinct from the full milestone exit gate in `docs/core/implementation-roadmap.md`, which still includes `PLAT-10` — when every item in `PLAT-09-recovery-and-m1-exit.md`'s "M1 local-complete definition (final)" section holds. That list is reproduced in full there; in summary, it is every row of §5 above being true simultaneously, with `docs/core/implementation-status.md` and `docs/core/implementation-roadmap.md` both recording it and naming `PLAT-10`'s trigger — without either file claiming staging evidence that was never produced.

---

## 9. Residual uncertainty carried into implementation

Per the approved design's own §11, no planning document can establish absolute certainty. The following are the specific, named items an implementer should re-verify at execution time rather than trust blindly from this plan set:

- **Exact dependency versions** (§4.10) were the current, registry-verified latest versions on the date this plan set was written. If implementation happens materially later, re-run the same `npm view <pkg> version` / Docker registry tag checks each plan file's "verify the tag exists" steps already model, and update versions consistently across all seven files if anything has moved.
- **The pinned MinIO image tag** (`quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z`) has no stable rolling alias — `PLAT-03-database-local-stack.md` Task 1 includes the exact command to re-resolve a current tag if this one has been pruned from the registry by the time you read this.
- **Expo development-host derivation** (`Constants.expoConfig?.hostUri`) is exercised by unit tests with injected values in `PLAT-08-one-call-vertical-slice.md`, but its real-world behavior on your specific iOS simulator and Android emulator network configuration is confirmed only by that plan's manual Task 9 — a corporate network, VPN, or unusual emulator network mode can require setting `EXPO_PUBLIC_API_URL` explicitly instead of relying on derivation.
- **GitHub repository entitlements** for CodeQL/dependency-review remain unverified by this plan set; `PLAT-04-OBS-02-ci-observability.md` deliberately does not add them as hard gates for exactly this reason.
- **`age` and PostgreSQL client tool availability** on the actual implementation machine (macOS or Linux) is checked at the start of `PLAT-09-recovery-and-m1-exit.md`, not assumed.
- **The `gitleaks-action` vs. raw `gitleaks` CLI licensing question** was resolved in favor of the raw CLI specifically to keep the security gate entitlement-independent; if the underlying dispute is later resolved in a way that makes the Action clearly free for this repository's visibility, adopting it is a reasonable future simplification, not a requirement.
