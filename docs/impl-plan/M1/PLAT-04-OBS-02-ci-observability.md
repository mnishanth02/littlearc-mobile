# PLAT-04 / OBS-02 — CI Baseline and Observability Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the GitHub Actions CI baseline — quality, real-Postgres integration, entitlement-independent security, and build-only container gates — and `packages/observability`'s empty-by-default, compile-time-and-runtime-enforced event allowlist plus a redaction utility, so every later change to this repository is automatically checked the same way this plan checks it.

**Architecture:** `.github/workflows/ci.yml` has four independent jobs: `quality` (frozen install, Biome, typecheck, build, unit tests for packages that do not need PostgreSQL, and the mobile bundle-leak check), `integration` (a real PostgreSQL 16 GitHub Actions service container, migration-from-zero, seed, and the real Fastify/tRPC/PostgreSQL test suites from `packages/db` and `apps/api`), `security` (the `gitleaks` binary run directly — not through the license-gated `gitleaks-action` — plus `pnpm audit`), and `container` (a build-only, unpushed production `apps/api` Docker image). `packages/observability` ships an empty `eventAllowlist` object; because `AllowedEventName` is derived as `keyof typeof eventAllowlist`, it resolves to `never` while the allowlist stays empty, so TypeScript rejects every statically named event at compile time, and a runtime guard rejects every dynamically named event too — both proven by tests in this plan.

**Tech Stack:** GitHub Actions (`actions/checkout@v7.0.0`, `actions/setup-node@v7.0.0`, `pnpm/action-setup@v6.0.9`, `docker/setup-buildx-action@v4.2.0`, `docker/build-push-action@v7.3.0`), PostgreSQL `16.14` (Actions service container), `gitleaks` `v8.30.1` (direct binary), Node.js `22.17.0`, TypeScript `6.0.3`, Vitest `4.1.10`.

---

## Before you start

This is cluster plan 5 of 6. `PLAT-01-02-MOB-01-workspace-mobile.md`, `PLAT-03-database-local-stack.md`, `PLAT-05-06-07-api-contracts-types.md`, and `PLAT-08-one-call-vertical-slice.md` must all be done first — this plan automates exactly the checks those plans already run by hand. Read `docs/impl-plan/M1/README.md` for the shared ports/env/package-name contract.

`gitleaks-action` (the third-party GitHub Action wrapper) has publicly documented, disputed licensing terms for private repositories tied specifically to the Action wrapper — not the underlying `gitleaks` CLI, which remains MIT-licensed. To keep this gate entitlement-independent regardless of how that dispute resolves, this plan downloads and runs the `gitleaks` binary directly instead of using the Action.

---

### Task 1: Dependabot configuration (separate from CI gates)

**Files:**
- Create: `.github/dependabot.yml`

Per the approved design (§7), Dependabot/dependency-graph enablement is a repository-settings concern, kept separate from the CI workflow's hard gates.

- [x] **Step 1: Write the Dependabot config**

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"

  - package-ecosystem: "docker"
    directory: "/apps/api"
    schedule:
      interval: "weekly"
```

The `npm` ecosystem entry covers the root `pnpm-lock.yaml` (Dependabot understands pnpm lockfiles under the `npm` ecosystem key). The `docker` entry tracks the base image pinned in `apps/api/Dockerfile` (Task 5).

- [ ] **Step 2: Commit**

```bash
git add .github/dependabot.yml
git commit -m "chore: add dependabot configuration"
```

---

### Task 2: CI quality job

**Files:**
- Create: `.github/workflows/ci.yml` (quality job only in this task; Tasks 3, 4, 6 append the remaining jobs to the same file)

- [x] **Step 1: Write the workflow file with the `quality` job**

```yaml
name: CI

on:
  push:
    branches: [main, development]
  pull_request:

jobs:
  quality:
    name: Quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7.0.0

      - uses: pnpm/action-setup@v6.0.9
        with:
          version: 11.13.0

      - uses: actions/setup-node@v7.0.0
        with:
          node-version-file: .node-version
          cache: pnpm

      - name: Install (frozen lockfile)
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

      - name: Build (includes Expo export for @littlearc/mobile)
        run: pnpm build

      - name: Unit tests (packages that do not require PostgreSQL)
        run: pnpm exec turbo run test --filter='!@littlearc/api' --filter='!@littlearc/db'

      - name: Mobile bundle leak check
        run: pnpm --filter @littlearc/mobile run test:bundle-leak
```

`@littlearc/api` and `@littlearc/db` are excluded from this job's test run with Turbo's `--filter='!pkg'` exclusion syntax — their test suites need a real, reachable PostgreSQL (Task 3's `integration` job), which this job does not provision. Everything else in this job (lint, typecheck, build, the bundle-leak check) genuinely needs no database.

The test step invokes `turbo` directly via `pnpm exec` rather than through the root `"test": "turbo run test"` package.json script with a `pnpm test -- --filter=...` passthrough. Verified empirically while drafting this plan: `pnpm test -- --filter='!pkg'` does **not** apply `--filter` to `turbo`'s package selection at all — pnpm's `--` passthrough forwards `--filter='!pkg'` as a literal, unparsed argument to *every* underlying package's own `test` script instead (confirmed against a throwaway three-package turbo monorepo: `pnpm test -- --filter='!pkg-a'` ran both `pkg-a` and `pkg-b`, each receiving `--filter=!pkg-a` as a meaningless extra argv entry). `pnpm exec turbo run test --filter='!pkg'`, run against the same throwaway monorepo, correctly scoped the run to only the non-excluded package. Every other place in this plan set that needs to exclude `@littlearc/api`/`@littlearc/db` from a `turbo run test` invocation uses this same verified form.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add quality job"
```

---

### Task 3: CI integration job (real PostgreSQL, migration-from-zero, real HTTP)

**Files:**
- Modify: `.github/workflows/ci.yml`

- [x] **Step 1: Append the `integration` job**

Add this job alongside `quality` in `.github/workflows/ci.yml` (same `jobs:` block):

```yaml
  integration:
    name: Integration (PostgreSQL)
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16.14
        env:
          POSTGRES_USER: littlearc
          POSTGRES_PASSWORD: littlearc
          POSTGRES_DB: littlearc
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U littlearc -d littlearc"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
    env:
      DATABASE_URL: postgres://littlearc:littlearc@localhost:5432/littlearc
      NODE_ENV: test
      API_HOST: 0.0.0.0
      API_PORT: 3000
      LOG_LEVEL: info
      CORS_ALLOWED_ORIGINS: http://localhost:8081
    steps:
      - uses: actions/checkout@v7.0.0

      - uses: pnpm/action-setup@v6.0.9
        with:
          version: 11.13.0

      - uses: actions/setup-node@v7.0.0
        with:
          node-version-file: .node-version
          cache: pnpm

      - name: Install (frozen lockfile)
        run: pnpm install --frozen-lockfile

      - name: Migrate from zero
        run: pnpm db:migrate

      - name: Seed
        run: pnpm db:seed

      - name: packages/db tests (real migration-from-zero + idempotent seed)
        run: pnpm --filter @littlearc/db run test

      - name: apps/api tests (real Fastify listener + real tRPC HTTP client + real PostgreSQL query)
        run: pnpm --filter @littlearc/api run test
```

The GitHub Actions Postgres service container starts from an empty volume on every run, so `pnpm db:migrate` here is a genuine migration-from-zero test — not a simulation of one. `apps/api`'s test suite already contains the real, non-mocked `platform.ping` HTTP integration test built in `PLAT-05-06-07-api-contracts-types.md` Task 9; running it here in CI is exactly the smoke test the approved design requires to catch a Fastify/tRPC version mismatch automatically, per its cited research finding on silent adapter incompatibilities.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add integration job with real postgresql service container"
```

---

### Task 4: CI security job (entitlement-independent gitleaks + pnpm audit)

**Files:**
- Modify: `.github/workflows/ci.yml`

- [x] **Step 1: Append the `security` job**

```yaml
  security:
    name: Security
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7.0.0
        with:
          fetch-depth: 0

      - name: Install gitleaks (checksum-verified)
        run: |
          curl -sSL -o gitleaks_8.30.1_linux_x64.tar.gz https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz
          echo "551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb  gitleaks_8.30.1_linux_x64.tar.gz" | sha256sum -c -
          tar -xzf gitleaks_8.30.1_linux_x64.tar.gz gitleaks
          sudo mv gitleaks /usr/local/bin/gitleaks
          rm gitleaks_8.30.1_linux_x64.tar.gz
          gitleaks version

      - name: Run gitleaks (exit-code enforced)
        run: gitleaks detect --source . --no-banner --exit-code 1

      - uses: pnpm/action-setup@v6.0.9
        with:
          version: 11.13.0

      - uses: actions/setup-node@v7.0.0
        with:
          node-version-file: .node-version
          cache: pnpm

      - name: Install (frozen lockfile)
        run: pnpm install --frozen-lockfile

      - name: pnpm audit (high severity and above)
        run: pnpm audit --audit-level=high
```

`fetch-depth: 0` gives `gitleaks detect` full git history to scan (the default checkout is shallow, which would silently under-scan). This installs the `gitleaks` CLI binary directly from its GitHub release rather than using `gitleaks/gitleaks-action`, so the gate does not depend on that Action's licensing terms for private repositories — only the MIT-licensed CLI is used. The downloaded archive's SHA-256 is verified with `sha256sum -c` against the exact digest published in `gitleaks`'s own `gitleaks_8.30.1_checksums.txt` release asset (`551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb` for `gitleaks_8.30.1_linux_x64.tar.gz`, confirmed by downloading and hashing the real asset while drafting this plan) before it is ever extracted or executed — GitHub Actions runs multi-line `run:` blocks with `bash -e` by default, so a checksum mismatch fails the step immediately rather than silently continuing to run an unverified binary. `--audit-level=high` is the agreed severity threshold for this milestone; CodeQL and GitHub's dependency-review action are intentionally not added here — per the approved design, they are not hard gates until the repository's GitHub Advanced Security entitlement is confirmed.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add entitlement-independent security job"
```

---

### Task 5: Production `apps/api` Dockerfile

**Files:**
- Create: `apps/api/Dockerfile`
- Create: `.dockerignore`

- [x] **Step 1: Write the root `.dockerignore`**

```
node_modules
**/node_modules
.git
.turbo
dist
**/dist
.expo
**/.expo
apps/mobile/android
apps/mobile/ios
*.log
.env
.env.*
!.env.example
!**/.env.example
```

- [x] **Step 2: Write the Dockerfile**

```dockerfile
# syntax=docker/dockerfile:1

FROM node:22.17.0-bookworm-slim AS build
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
# Typecheck as a build-time gate. This intentionally does not compile to a
# dist/ folder — see the note below for why apps/api has no "build" script.
RUN pnpm --filter @littlearc/api run typecheck
RUN pnpm --filter @littlearc/api --prod deploy --legacy /out

FROM node:22.17.0-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out .
EXPOSE 3000
CMD ["node", "node_modules/tsx/dist/cli.mjs", "src/server.ts"]
```

Two things about this Dockerfile were verified empirically while drafting this plan, not assumed:

1. **Why there is no `tsc`-compiled runtime.** `apps/api`'s `node.json` TypeScript config uses `moduleResolution: "bundler"` with extensionless relative imports (`./env`, not `./env.js`). Compiling that with plain `tsc` to `"module": "ESNext"` produces Node-native ESM output whose relative imports still have no file extension — Node's own ESM loader rejects that at runtime with `ERR_MODULE_NOT_FOUND`. Separately, and more subtly: a real attempt to run `tsc` (full emit, not `--noEmit`) from `apps/api` was tested against a throwaway three-package monorepo reproducing this exact structure (`apps/api` depending on source-only `packages/db`/`packages/contracts`, all extending a shared `packages/config` tsconfig). It emitted its output not into `apps/api/dist/`, but into `packages/config/typescript/dist/` — because a relative `outDir` inherited from a shared, extended base config resolves relative to *that base config file's own location*, not the leaf package that extends it. Both problems disappear by never compiling at all: the runtime stage executes `apps/api/src/server.ts` directly through `tsx`, the same mechanism `pnpm --filter @littlearc/api run start` already uses locally, and `apps/api`'s own `tsconfig.json`/`package.json` have no `"build"`/emit configuration for this to silently break again.
2. **Why `pnpm --prod deploy --legacy` is sufficient.** Run against that same throwaway monorepo, `pnpm --filter @scratch/api --prod deploy --legacy /out` (the real pnpm command, same flags) produced an `/out` directory containing `apps/api`'s own source, a `node_modules/@scratch/db` (analogue of `@littlearc/db`) resolving through pnpm's virtual store to a real, materialized copy of that package's `src/index.ts` — not a symlink back to the original monorepo location — and `tsx` installed as a real dependency. Running `node node_modules/tsx/dist/cli.mjs src/server.ts` from inside that deployed `/out` directory executed successfully end-to-end, importing both workspace packages by their `.ts` source. `--legacy` is required because this workspace's `pnpm-workspace.yaml` does not set `inject-workspace-packages: true`; without `--legacy`, `pnpm deploy` refuses to run at all on such a workspace.

The runtime `CMD` invokes tsx's actual CLI entry file directly through `node` (`node_modules/tsx/dist/cli.mjs`, confirmed as tsx `4.23.1`'s `"bin"` target) rather than executing `node_modules/.bin/tsx` as the container's `argv[0]`. The `.bin/tsx` file is a `#!/bin/sh` wrapper script; invoking it as Docker's exec-form entrypoint depends on the shebang being honored and the file's executable bit surviving the deploy/copy — both true in practice on Linux, but going through `node` directly removes that dependency entirely and is the more robust, verified form.

- [ ] **Step 3: Verify Docker Desktop/Engine is available, then build locally**

```bash
docker info
docker build -f apps/api/Dockerfile -t littlearc/api:local .
```

Expected: the build completes through both stages and exits `0`. If the `RUN pnpm --filter @littlearc/api run typecheck` step fails, fix the underlying TypeScript error before proceeding — do not remove the step to make the image build "succeed."

- [ ] **Step 4: Smoke-test the built image**

```bash
docker run --rm -d --name littlearc-api-smoke-test -p 3000:3000 \
  -e DATABASE_URL="postgres://littlearc:littlearc@host.docker.internal:5432/littlearc" \
  littlearc/api:local
```

Expected: prints a container ID, exits `0`.

```bash
sleep 2
curl -s http://localhost:3000/health/live
```

Expected: `{"status":"ok"}`.

```bash
docker stop littlearc-api-smoke-test
```

Expected: prints `littlearc-api-smoke-test`, exits `0`. Using a fixed `--name` (rather than filtering `docker ps` by image/ancestor afterward) keeps this step deterministic even if a stale container from a previous run is still around — `docker run --name` fails fast with a clear "name already in use" error instead of silently smoke-testing the wrong container. This step is for local confidence only — the CI `container` job (Task 6) never runs the image, only builds it.

- [ ] **Step 5: Commit**

```bash
git add apps/api/Dockerfile .dockerignore
git commit -m "feat: add production apps/api dockerfile"
```

---

### Task 6: CI container job (build-only, never pushed)

**Files:**
- Modify: `.github/workflows/ci.yml`

- [x] **Step 1: Append the `container` job**

```yaml
  container:
    name: Container (build only)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7.0.0

      - uses: docker/setup-buildx-action@v4.2.0

      - name: Build production API image (never pushed)
        uses: docker/build-push-action@v7.3.0
        with:
          context: .
          file: apps/api/Dockerfile
          push: false
          tags: littlearc/api:ci
```

`push: false` is explicit and permanent for M1 — there is no registry credential configured anywhere in this workflow, and none should be added until `PLAT-10` (deferred; see `docs/impl-plan/M1/README.md`).

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add build-only container job"
```

- [ ] **Step 3: Push the branch and confirm all four jobs run green in GitHub Actions**

```bash
git push
```

Then open the pushed branch's Actions run in GitHub. Expected: `Quality`, `Integration (PostgreSQL)`, `Security`, and `Container (build only)` all show a green check. This is the first point in M1 where CI evidence is real (a local dry run cannot fully replace it — GitHub-hosted `ubuntu-latest` runners, real service containers, and the real Dependabot/security tooling are all specific to running on GitHub's infrastructure).

---

### Task 7: Scaffold `packages/observability`

**Files:**
- Create: `packages/observability/package.json`
- Create: `packages/observability/tsconfig.json`
- Create: `packages/observability/vitest.config.ts`

- [x] **Step 1: Write the package manifest**

```json
{
  "name": "@littlearc/observability",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "devDependencies": {
    "@littlearc/config": "workspace:*",
    "typescript": "6.0.3",
    "vitest": "4.1.10"
  }
}
```

No telemetry SDK dependency is added — per the approved design, no PostHog or Sentry SDK is initialized in M1.

- [x] **Step 2: Write the tsconfig**

```json
{
  "extends": "@littlearc/config/typescript/node.json",
  "compilerOptions": {
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"]
}
```

- [x] **Step 3: Write the Vitest config**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

- [x] **Step 4: Install**

```bash
pnpm install
```

Expected: exits `0`.

- [ ] **Step 5: Commit**

```bash
git add packages/observability pnpm-lock.yaml
git commit -m "chore: scaffold packages/observability"
```

---

### Task 8: Empty allowlist — compile-time and runtime rejection

**Files:**
- Create: `packages/observability/src/allowlist.ts`
- Test: `packages/observability/src/__tests__/allowlist.test.ts`
- Create: `packages/observability/src/__tests__/allowlist.type-test.ts`

- [x] **Step 1: Write the failing runtime test**

```ts
import { describe, expect, it } from 'vitest'
import { assertAllowedEventName, isAllowedEventName } from '../allowlist'

describe('observability allowlist', () => {
  it('rejects any dynamic event name, since the allowlist is currently empty', () => {
    expect(isAllowedEventName('anything')).toBe(false)
    expect(isAllowedEventName('')).toBe(false)
    expect(isAllowedEventName('vault.document_uploaded')).toBe(false)
  })

  it('throws a clear, actionable error for a dynamic/untyped event name', () => {
    expect(() => assertAllowedEventName('some.dynamic.event')).toThrowError(
      /not in the observability allowlist/,
    )
  })
})
```

- [x] **Step 2: Run it to confirm it fails**

```bash
cd packages/observability && pnpm exec vitest run src/__tests__/allowlist.test.ts
```

Expected: `FAIL` — `Cannot find module '../allowlist'`.

- [x] **Step 3: Implement the allowlist**

```ts
/**
 * Empty by design for M1 (OBS-02). Because AllowedEventName is derived from
 * this object's keys, it currently resolves to `never` — so no event name,
 * static or dynamic, can pass either the compile-time or runtime check until
 * a future work package adds a real entry here. See allowlist.type-test.ts
 * for the compile-time half of this proof.
 */
export const eventAllowlist = {} as const

export type AllowedEventName = keyof typeof eventAllowlist

export function isAllowedEventName(name: string): name is AllowedEventName {
  return Object.hasOwn(eventAllowlist, name)
}

export function assertAllowedEventName(name: string): asserts name is AllowedEventName {
  if (!isAllowedEventName(name)) {
    throw new Error(
      `Event "${name}" is not in the observability allowlist. Add it to packages/observability/src/allowlist.ts before emitting.`,
    )
  }
}

/**
 * Enforces the allowlist now; sending to a real analytics provider is out of
 * scope until OBS-06 (M6) wires this into PostHog with real, reviewed event
 * names and properties.
 */
export function trackEvent<TName extends AllowedEventName>(
  name: TName,
  properties?: Record<string, unknown>,
): void {
  assertAllowedEventName(name)
  void properties
}
```

- [x] **Step 4: Run the test to confirm it passes**

```bash
cd packages/observability && pnpm exec vitest run src/__tests__/allowlist.test.ts
```

Expected: `PASS`, `2 passed`.

- [x] **Step 5: Write the compile-time rejection proof**

```ts
import { trackEvent } from '../allowlist'

// The allowlist is empty in M1 — no event name is valid yet, so this call
// must fail to compile. If this stops erroring (e.g. because a future
// change accidentally widens AllowedEventName), the unused
// @ts-expect-error directive below itself becomes a new compile error,
// which is exactly the signal we want.
// @ts-expect-error
trackEvent('anything')
```

Save as `packages/observability/src/__tests__/allowlist.type-test.ts`. Its filename deliberately does not match Vitest's `*.test.ts` glob suffix pattern (it is `*.type-test.ts`) so Vitest does not try to execute it as a test — `tsc` typechecking it is the whole point.

- [x] **Step 6: Run typecheck to confirm the compile-time rejection holds**

```bash
pnpm --filter @littlearc/observability run typecheck
```

Expected: exits `0`. If it instead reports `Unused '@ts-expect-error' directive`, the allowlist is accidentally accepting an event name it should not — stop and investigate before continuing.

- [ ] **Step 7: Commit**

```bash
git add packages/observability/src
git commit -m "feat: add empty-by-default observability allowlist with compile-time and runtime rejection"
```

---

### Task 9: Redaction utility

**Files:**
- Create: `packages/observability/src/redact.ts`
- Test: `packages/observability/src/__tests__/redact.test.ts`

This is a framework-agnostic redaction helper for future analytics event properties — distinct from and independent of `apps/api`'s Pino log-line redaction (`PLAT-05-06-07-api-contracts-types.md` Task 5), which stays specific to Fastify/Pino.

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { redactSensitiveKeys } from '../redact'

describe('redactSensitiveKeys', () => {
  it('redacts known-sensitive keys and leaves everything else untouched', () => {
    const result = redactSensitiveKeys({
      userEmail: 'a@b.com',
      category: 'vault',
      authToken: 'xyz',
      platform: 'ios',
    })

    expect(result.userEmail).toBe('[redacted]')
    expect(result.authToken).toBe('[redacted]')
    expect(result.category).toBe('vault')
    expect(result.platform).toBe('ios')
  })

  it('accepts a custom sensitive-key list', () => {
    const result = redactSensitiveKeys({ childName: 'Aarav', category: 'vault' }, ['childname'])

    expect(result.childName).toBe('[redacted]')
    expect(result.category).toBe('vault')
  })
})
```

- [x] **Step 2: Run it to confirm it fails**

```bash
cd packages/observability && pnpm exec vitest run src/__tests__/redact.test.ts
```

Expected: `FAIL` — `Cannot find module '../redact'`.

- [x] **Step 3: Implement the redaction utility**

```ts
const DEFAULT_SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'email',
  'phone',
  'authorization',
  'cookie',
] as const

export function redactSensitiveKeys(
  input: Record<string, unknown>,
  sensitiveKeys: readonly string[] = DEFAULT_SENSITIVE_KEYS,
): Record<string, unknown> {
  const redacted: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    const isSensitive = sensitiveKeys.some((sensitive) =>
      key.toLowerCase().includes(sensitive.toLowerCase()),
    )
    redacted[key] = isSensitive ? '[redacted]' : value
  }
  return redacted
}
```

- [x] **Step 4: Run the test to confirm it passes**

```bash
cd packages/observability && pnpm exec vitest run src/__tests__/redact.test.ts
```

Expected: `PASS`, `2 passed`.

- [x] **Step 5: Add the package barrel export**

```ts
export {
  assertAllowedEventName,
  eventAllowlist,
  isAllowedEventName,
  trackEvent,
  type AllowedEventName,
} from './allowlist'
export { redactSensitiveKeys } from './redact'
```

Save as `packages/observability/src/index.ts`.

- [x] **Step 6: Full package verification**

```bash
pnpm --filter @littlearc/observability run typecheck
pnpm --filter @littlearc/observability run test
```

Expected: both exit `0`; the test run reports `4 passed` across `allowlist.test.ts` (2) and `redact.test.ts` (2).

- [ ] **Step 7: Commit**

```bash
git add packages/observability/src/redact.ts packages/observability/src/__tests__/redact.test.ts packages/observability/src/index.ts
git commit -m "feat: add observability redaction utility"
```

---

### Task 10: Final full verification

**Files:** none — final verification for this plan.

- [x] **Step 1: Full workspace check from the root**

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm build
pnpm exec turbo run test --filter='!@littlearc/api' --filter='!@littlearc/db'
pnpm --filter @littlearc/mobile run test:bundle-leak
```

Expected: all exit `0` — this reproduces the `quality` CI job exactly, locally.

- [x] **Step 2: Integration check (requires the local Compose PostgreSQL from `PLAT-03-database-local-stack.md` to be up)**

```bash
docker compose ps postgres
pnpm --filter @littlearc/db run test
pnpm --filter @littlearc/api run test
```

Expected: `postgres` is `(healthy)`; both test runs exit `0` — this reproduces the `integration` CI job's test steps locally (CI itself uses a fresh Actions service container instead of this long-lived local one, per Task 3).

- [ ] **Step 3: Confirm the pushed branch's GitHub Actions run is green**

Open the Actions tab for the branch pushed in Task 6 Step 3. Expected: all four jobs (`Quality`, `Integration (PostgreSQL)`, `Security`, `Container (build only)`) show green checks. Record the run URL for the M1 exit evidence required by `PLAT-09-recovery-and-m1-exit.md`.

- [ ] **Step 4: Confirm git is clean**

```bash
git status --porcelain
```

Expected: empty.

---

## Evidence required before advancing to `PLAT-09-recovery-and-m1-exit.md`

- [ ] A real GitHub Actions run shows all four jobs green: `Quality`, `Integration (PostgreSQL)`, `Security`, `Container (build only)` (Task 6 Step 3, Task 10 Step 3) — link recorded.
- [ ] The `integration` job's Postgres service container starts empty on every run, and `pnpm db:migrate` against it is a genuine migration-from-zero proof, not a simulated one (Task 3).
- [ ] The `security` job runs the `gitleaks` CLI binary directly (not `gitleaks/gitleaks-action`) so the gate does not depend on that Action's private-repository licensing terms (Task 4).
- [ ] `apps/api/Dockerfile` builds successfully and is never pushed anywhere in this workflow (Task 5, Task 6).
- [x] `packages/observability`'s allowlist rejects every event name both at compile time (`allowlist.type-test.ts`, Task 8) and at runtime (`allowlist.test.ts`, Task 8) while it remains empty.
- [x] `.github/dependabot.yml` covers the `npm` (pnpm lockfile), `github-actions`, and `docker` ecosystems (Task 1).
