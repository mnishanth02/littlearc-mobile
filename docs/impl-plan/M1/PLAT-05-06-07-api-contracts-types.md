# PLAT-05 / PLAT-06 / PLAT-07 — API, Contracts, and Type Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `packages/contracts` (mobile-safe runtime Zod schemas and the shared SuperJSON transformer), `apps/api` (a Fastify 5 + official tRPC 11 Fastify adapter server with fixed plugin order, fail-closed health routes, a named rate-limit policy registry, redacted logging, and a safe error contract), and `packages/api-types` (a type-only `AppRouter` export that fails closed at runtime) — proven end-to-end with a real HTTP client hitting the real Fastify adapter and reading the real, seeded `platform_probe` row from the Compose PostgreSQL.

**Architecture:** `packages/contracts` ships zero server dependencies (just `zod` and `superjson`) so mobile can depend on it directly. `apps/api` exposes a side-effect-free `buildServer(options)` factory in `src/app.ts`; `src/server.ts`, `src/worker.ts`, and `src/all.ts` are thin executable entrypoints around it. Plugins register in the fixed order the approved design requires: security headers/CORS, named rate-limiting, health routes, then the tRPC adapter. `packages/api-types` re-exports only `AppRouter` as a type, backed by an `apps/api` package-exports map that has no runtime condition for `./router` — so any accidental runtime import fails closed, not just at the type level.

**Tech Stack:** Fastify `5.10.0`, `@trpc/server` `11.18.0` (server) / `@trpc/client` `11.18.0` (test-only), `@fastify/cors` `11.3.0`, `@fastify/helmet` `13.1.0`, `@fastify/rate-limit` `11.1.0`, `zod` `4.4.3`, `superjson` `2.2.6`, `pino` `10.3.1`, `pg` `8.22.0`, `tsx` `4.23.1`, `vitest` `4.1.10`, TypeScript `6.0.3`.

---

## Before you start

This is cluster plan 3 of 6. `PLAT-01-02-MOB-01-workspace-mobile.md` and `PLAT-03-database-local-stack.md` must both be fully done first: the root workspace exists, `packages/config` and `packages/db` exist, `docker compose ps` shows PostgreSQL healthy, and the `platform_probe` row is seeded (`SELECT count(*) FROM platform_probe` returns `1`). This plan's real-HTTP integration test (Task 9) depends on that seeded row existing in the live Compose PostgreSQL. Read `docs/impl-plan/M1/README.md` for the shared ports/env/package-name contract before starting.

---

### Task 1: Scaffold `packages/contracts`

**Files:**
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tsconfig.json`
- Create: `packages/contracts/vitest.config.ts`

- [ ] **Step 1: Write the package manifest**

```json
{
  "name": "@littlearc/contracts",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "superjson": "2.2.6",
    "zod": "4.4.3"
  },
  "devDependencies": {
    "@littlearc/config": "workspace:*",
    "typescript": "6.0.3",
    "vitest": "4.1.10"
  }
}
```

`packages/contracts` has no dependency on Fastify, Drizzle, `pg`, or anything else server-only — this is what makes it safe for `apps/mobile` to depend on directly at runtime.

- [ ] **Step 2: Write the tsconfig**

```json
{
  "extends": "@littlearc/config/typescript/node.json",
  "compilerOptions": {
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Write the Vitest config**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 4: Install**

```bash
pnpm install
```

Expected: exits `0`.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts pnpm-lock.yaml
git commit -m "chore: scaffold packages/contracts"
```

---

### Task 2: Shared SuperJSON transformer and platform response schema

**Files:**
- Create: `packages/contracts/src/transformer.ts`
- Create: `packages/contracts/src/platform.ts`
- Create: `packages/contracts/src/index.ts`
- Test: `packages/contracts/src/__tests__/platform.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { platformPingResponseSchema } from '../platform'
import { transformer } from '../transformer'

describe('platformPingResponseSchema', () => {
  it('round-trips a valid response through the shared SuperJSON transformer', () => {
    const value = {
      message: 'littlearc-platform-bootstrap',
      seededAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      databaseTime: new Date('2026-01-01T00:00:01.000Z').toISOString(),
      requestId: '123e4567-e89b-12d3-a456-426614174000',
    }

    const wire = transformer.serialize(value)
    const decoded = transformer.deserialize(wire)

    expect(platformPingResponseSchema.parse(decoded)).toEqual(value)
  })

  it('rejects a response missing a required field', () => {
    const invalid = {
      message: 'x',
      seededAt: new Date().toISOString(),
      databaseTime: new Date().toISOString(),
    }
    expect(() => platformPingResponseSchema.parse(invalid)).toThrow()
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
cd packages/contracts && pnpm exec vitest run src/__tests__/platform.test.ts
```

Expected: `FAIL` — `Cannot find module '../platform'` and `'../transformer'` (neither file exists yet).

- [ ] **Step 3: Implement the transformer**

```ts
import superjson from 'superjson'

export const transformer = superjson
```

- [ ] **Step 4: Implement the platform response schema**

```ts
import { z } from 'zod'

export const platformPingResponseSchema = z.object({
  message: z.string(),
  seededAt: z.iso.datetime(),
  databaseTime: z.iso.datetime(),
  requestId: z.uuid(),
})

export type PlatformPingResponse = z.infer<typeof platformPingResponseSchema>
```

- [ ] **Step 5: Implement the package barrel export**

```ts
export { transformer } from './transformer'
export { platformPingResponseSchema, type PlatformPingResponse } from './platform'
```

- [ ] **Step 6: Run the test to confirm it passes**

```bash
cd packages/contracts && pnpm exec vitest run src/__tests__/platform.test.ts
```

Expected: `PASS`, `2 passed`.

- [ ] **Step 7: Typecheck the package**

```bash
pnpm --filter @littlearc/contracts run typecheck
```

Expected: exits `0`.

- [ ] **Step 8: Commit**

```bash
git add packages/contracts/src
git commit -m "feat: add shared superjson transformer and platform ping schema"
```

---

### Task 3: Scaffold `apps/api`

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/vitest.config.ts`
- Create: `apps/api/vitest.setup.ts`

- [ ] **Step 1: Write the package manifest**

```json
{
  "name": "@littlearc/api",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "exports": {
    "./router": {
      "types": "./src/router.ts"
    }
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "dev": "tsx watch --env-file-if-exists=../../.env src/server.ts",
    "start": "tsx --env-file-if-exists=../../.env src/server.ts",
    "start:worker": "tsx --env-file-if-exists=../../.env src/worker.ts",
    "start:all": "tsx --env-file-if-exists=../../.env src/all.ts"
  },
  "dependencies": {
    "@fastify/cors": "11.3.0",
    "@fastify/helmet": "13.1.0",
    "@fastify/rate-limit": "11.1.0",
    "@littlearc/contracts": "workspace:*",
    "@littlearc/db": "workspace:*",
    "@trpc/server": "11.18.0",
    "fastify": "5.10.0",
    "pino": "10.3.1",
    "tsx": "4.23.1",
    "zod": "4.4.3"
  },
  "devDependencies": {
    "@littlearc/config": "workspace:*",
    "@trpc/client": "11.18.0",
    "@types/node": "22.20.1",
    "typescript": "6.0.3",
    "vitest": "4.1.10"
  }
}
```

There is deliberately no `"build"` script: `apps/api` never compiles to a `dist/` folder (see Task 3 Step 2's tsconfig note and `PLAT-04-OBS-02-ci-observability.md`'s Dockerfile for why). Turborepo's `build` task simply has nothing to run for this package and skips it — `@littlearc/mobile`'s `expo export` remains the only package that meaningfully participates in `pnpm build`. The API's real build gate is the production Docker image build in `PLAT-04-OBS-02-ci-observability.md`, which typechecks and packages the actual runtime artifact.

`tsx` is a real (non-dev) dependency here, not just a local dev-loop convenience: `PLAT-04-OBS-02-ci-observability.md`'s production Dockerfile runs the deployed image via `tsx` too (see that plan for the verified rationale), so it must survive a `pnpm deploy --prod` production install. `--env-file-if-exists` lets local runs load the root `.env` without making that uncommitted file a runtime prerequisite; deployed/CI environments provide variables directly.

There is deliberately no `"."` package-root export: importing the package root must not execute `src/server.ts` and start a listener as a side effect. The `"./router"` export map entry has **only** a `"types"` condition — no `"import"`, `"require"`, or `"default"`. This lets TypeScript resolve `AppRouter` as a type from anywhere in the workspace, while Node's own module resolution refuses any actual runtime `import`/`require` of that subpath with `ERR_PACKAGE_PATH_NOT_EXPORTED`. Task 12 proves this fails closed.

- [ ] **Step 2: Write the tsconfig**

```json
{
  "extends": "@littlearc/config/typescript/node.json",
  "compilerOptions": {
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"]
}
```

No `outDir` override here: `apps/api` never runs `tsc` with emit enabled (only `tsc --noEmit`, via the `typecheck` script) — see `PLAT-04-OBS-02-ci-observability.md`'s Dockerfile task for the verified reason a real `tsc` emit from this package would land in the wrong directory entirely if it were ever attempted.

- [ ] **Step 3: Write a Vitest setup file that loads the root `.env` when present**

`vitest run` — whether invoked as `pnpm --filter @littlearc/api run test` or directly as `pnpm exec vitest run <file>` — does not auto-load `.env` files the way `tsx --env-file-if-exists=...` does for the `dev`/`start*` scripts above. Every integration test in this plan (Task 9, Task 10) calls `loadEnv()` with no arguments, which reads straight from `process.env` and requires `DATABASE_URL` to already be set. Locally, that value lives in the root `.env` created in `PLAT-03-database-local-stack.md`; in CI, `PLAT-04-OBS-02-ci-observability.md`'s `integration` job sets it directly as a job-level environment variable instead of via a committed `.env` file. This setup file bridges both cases without adding a new dependency:

```ts
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const rootEnvPath = fileURLToPath(new URL('../../.env', import.meta.url))

// Locally: loads DATABASE_URL and friends from the root .env (PLAT-03).
// In CI: no .env file is ever checked out, so this is a no-op and the
// integration job's own job-level `env:` values in process.env are used as-is.
if (existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath)
}
```

`process.loadEnvFile()` is a stable Node.js API since Node 22 — no `dotenv` dependency is needed.

- [ ] **Step 4: Write the Vitest config, wiring in the setup file**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 15000,
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

- [ ] **Step 5: Install**

```bash
pnpm install
```

Expected: exits `0`.

- [ ] **Step 6: Commit**

```bash
git add apps/api pnpm-lock.yaml
git commit -m "chore: scaffold apps/api package"
```

---

### Task 4: Environment configuration (parsed once, fails closed with actionable diagnostics)

**Files:**
- Create: `apps/api/src/env.ts`
- Test: `apps/api/src/__tests__/env.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { loadEnv } from '../env'

describe('loadEnv', () => {
  it('parses a complete, valid environment', () => {
    const env = loadEnv({
      DATABASE_URL: 'postgres://littlearc:littlearc@localhost:5432/littlearc',
    })

    expect(env.API_HOST).toBe('0.0.0.0')
    expect(env.API_PORT).toBe(3000)
    expect(env.LOG_LEVEL).toBe('info')
    expect(env.NODE_ENV).toBe('development')
    expect(env.CORS_ALLOWED_ORIGINS).toBe('http://localhost:8081')
  })

  it('reads explicit overrides', () => {
    const env = loadEnv({
      DATABASE_URL: 'postgres://littlearc:littlearc@localhost:5432/littlearc',
      API_PORT: '4000',
      LOG_LEVEL: 'debug',
    })

    expect(env.API_PORT).toBe(4000)
    expect(env.LOG_LEVEL).toBe('debug')
  })

  it('throws an actionable, non-secret error when DATABASE_URL is missing', () => {
    expect(() => loadEnv({})).toThrowError(/DATABASE_URL/)
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
cd apps/api && pnpm exec vitest run src/__tests__/env.test.ts
```

Expected: `FAIL` — `Cannot find module '../env'`.

- [ ] **Step 3: Implement the env schema**

```ts
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().min(1).default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:8081'),
})

export type Env = z.infer<typeof envSchema>

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ')
    throw new Error(`Invalid environment configuration: ${issues}`)
  }
  return result.data
}
```

Only variable names and validation messages appear in the thrown error — never a value, so no secret can leak through a startup failure log.

- [ ] **Step 4: Run the test to confirm it passes**

```bash
cd apps/api && pnpm exec vitest run src/__tests__/env.test.ts
```

Expected: `PASS`, `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/env.ts apps/api/src/__tests__/env.test.ts
git commit -m "feat: add fail-closed zod environment configuration"
```

---

### Task 5: Recursive redacted logger configuration

**Files:**
- Create: `apps/api/src/logging.ts`
- Test: `apps/api/src/__tests__/logging.test.ts`

Pino's native `redact.paths` option (e.g. `'*.password'`) only matches a fixed depth — `'*.password'` matches exactly "some key, then a direct `password` child," not `password` at arbitrary nesting. A sensitive field logged three levels deep would not be caught by that mechanism at all. This task instead implements a genuinely recursive redaction pass, applied to every log call via Pino's `hooks.logMethod`, and proves it catches a deeply nested case a fixed-depth `redact.paths` config could not — confirmed empirically against the real `pino` package while drafting this plan.

- [ ] **Step 1: Write the failing test**

```ts
import { Writable } from 'node:stream'
import pino from 'pino'
import { describe, expect, it } from 'vitest'
import { buildLoggerOptions } from '../logging'

function createCaptureStream() {
  const chunks: string[] = []
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk.toString())
      callback()
    },
  })
  return { stream, chunks }
}

describe('buildLoggerOptions', () => {
  it('redacts sensitive keys at the top level', () => {
    const { stream, chunks } = createCaptureStream()
    const logger = pino(buildLoggerOptions('info'), stream)

    logger.info({ password: 'hunter2', token: 'abc123', secret: 'xyz' }, 'test log line')

    const record = JSON.parse(chunks[0] ?? '{}')
    expect(record.password).toBe('[redacted]')
    expect(record.token).toBe('[redacted]')
    expect(record.secret).toBe('[redacted]')
    expect(record.msg).toBe('test log line')
  })

  it('redacts sensitive keys arbitrarily deep, not just one level down', () => {
    const { stream, chunks } = createCaptureStream()
    const logger = pino(buildLoggerOptions('info'), stream)

    logger.info(
      {
        req: { headers: { authorization: 'Bearer secret-token', cookie: 'session=abc' } },
        context: { nested: { deeply: { password: 'hunter2' } } },
      },
      'test log line',
    )

    const record = JSON.parse(chunks[0] ?? '{}')
    expect(record.req.headers.authorization).toBe('[redacted]')
    expect(record.req.headers.cookie).toBe('[redacted]')
    expect(record.context.nested.deeply.password).toBe('[redacted]')
  })

  it('retains only the Error type while redacting its message and stack', () => {
    const { stream, chunks } = createCaptureStream()
    const logger = pino(buildLoggerOptions('info'), stream)

    logger.error(
      {
        err: new Error('raw pg error: password=secret at 10.0.0.4:5432'),
        token: 'abc123',
      },
      'error occurred',
    )

    const record = JSON.parse(chunks[0] ?? '{}')
    expect(record.err.type).toBe('Error')
    expect(record.err.message).toBe('[redacted]')
    expect(record.err.stack).toBeUndefined()
    expect(JSON.stringify(record)).not.toContain('10.0.0.4')
    expect(JSON.stringify(record)).not.toContain('password=secret')
    expect(record.token).toBe('[redacted]')
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
cd apps/api && pnpm exec vitest run src/__tests__/logging.test.ts
```

Expected: `FAIL` — `Cannot find module '../logging'`.

- [ ] **Step 3: Implement the logger configuration**

```ts
import type { LoggerOptions } from 'pino'

const SENSITIVE_KEY_PATTERN = /^(password|token|secret|authorization|cookie)$/i

/**
 * Recursively walks a value, replacing any object key matching
 * password/token/secret/authorization/cookie (case-insensitive) with
 * '[redacted]' at any depth — not just one level down, unlike Pino's native
 * `redact.paths`. Error instances retain only their class name; message and
 * stack are removed because provider/SQL errors can embed credentials, host
 * addresses, document metadata, or other values that key-based redaction
 * cannot reliably identify.
 */
export function redactRecursive(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactRecursive(item, seen))
  }
  if (value instanceof Error) {
    return { type: value.name, message: '[redacted]' }
  }
  if (value && typeof value === 'object') {
    if (seen.has(value as object)) return '[circular]'
    seen.add(value as object)
    const out: Record<string, unknown> = {}
    for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY_PATTERN.test(key) ? '[redacted]' : redactRecursive(entryValue, seen)
    }
    return out
  }
  return value
}

export function buildLoggerOptions(level: string): LoggerOptions {
  return {
    level,
    hooks: {
      logMethod(inputArgs, method) {
        const transformed = inputArgs.map((arg) =>
          typeof arg === 'object' && arg !== null ? redactRecursive(arg) : arg,
        )
        return method.apply(this, transformed as Parameters<typeof method>)
      },
    },
  }
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
cd apps/api && pnpm exec vitest run src/__tests__/logging.test.ts
```

Expected: `PASS`, `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/logging.ts apps/api/src/__tests__/logging.test.ts
git commit -m "feat: add recursive pino redaction with emitted-output tests"
```

---

### Task 6: tRPC initialization with a safe error contract

**Files:**
- Create: `apps/api/src/context.ts`
- Create: `apps/api/src/trpc.ts`
- Test: `apps/api/src/__tests__/trpc.test.ts`

- [ ] **Step 1: Write the context type**

```ts
import type { Database } from '@littlearc/db'
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify'
import type { Pool } from 'pg'

export type Context = {
  db: Database
  pool: Pool
  requestId: string
}

export function createContextFactory(db: Database, pool: Pool) {
  return function createContext({ req }: CreateFastifyContextOptions): Context {
    return { db, pool, requestId: req.id }
  }
}
```

- [ ] **Step 2: Write the failing test**

This test registers a throwaway router directly against a real (in-process, no real socket needed) Fastify + tRPC adapter instance via `fastify.inject()`, so it exercises the actual HTTP error envelope a client receives — not a hand-built object standing in for it.

```ts
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import { TRPCError } from '@trpc/server'
import Fastify from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import type { Context } from '../context'
import { SAFE_INTERNAL_MESSAGE, publicProcedure, router } from '../trpc'

const testCtx: Context = {
  db: {} as Context['db'],
  pool: {} as Context['pool'],
  requestId: '123e4567-e89b-12d3-a456-426614174000',
}

describe('trpc error contract', () => {
  let fastify: ReturnType<typeof Fastify> | undefined

  afterEach(async () => {
    await fastify?.close()
    fastify = undefined
  })

  it('never leaks the raw message of an INTERNAL_SERVER_ERROR to the client', async () => {
    const testRouter = router({
      boom: publicProcedure.query(() => {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'raw pg error: connection refused at 10.0.0.4:5432',
        })
      }),
    })

    fastify = Fastify()
    await fastify.register(fastifyTRPCPlugin, {
      prefix: '/trpc',
      trpcOptions: { router: testRouter, createContext: () => testCtx },
    })

    const response = await fastify.inject({ method: 'GET', url: '/trpc/boom' })
    const body = response.json()

    expect(response.statusCode).toBe(500)
    expect(body.error.json.message).toBe(SAFE_INTERNAL_MESSAGE)
    expect(JSON.stringify(body)).not.toContain('10.0.0.4')
    expect(body.error.json.data.requestId).toBe(testCtx.requestId)
  })

  it('keeps a deliberately safe message for a non-internal error code', async () => {
    const testRouter = router({
      notFound: publicProcedure.query(() => {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Platform probe row is not seeded.' })
      }),
    })

    fastify = Fastify()
    await fastify.register(fastifyTRPCPlugin, {
      prefix: '/trpc',
      trpcOptions: { router: testRouter, createContext: () => testCtx },
    })

    const response = await fastify.inject({ method: 'GET', url: '/trpc/notFound' })
    const body = response.json()

    expect(response.statusCode).toBe(404)
    expect(body.error.json.message).toBe('Platform probe row is not seeded.')
    expect(body.error.json.data.requestId).toBe(testCtx.requestId)
  })
})
```

- [ ] **Step 3: Run it to confirm it fails**

```bash
cd apps/api && pnpm exec vitest run src/__tests__/trpc.test.ts
```

Expected: `FAIL` — `Cannot find module '../trpc'`.

- [ ] **Step 4: Implement `trpc.ts` with the safe error formatter**

```ts
import { transformer } from '@littlearc/contracts'
import { initTRPC } from '@trpc/server'
import type { Context } from './context'

export const SAFE_INTERNAL_MESSAGE = 'Something went wrong. Please try again.'

const t = initTRPC.context<Context>().create({
  transformer,
  isDev: false,
  errorFormatter({ shape, error, ctx }) {
    return {
      ...shape,
      message: error.code === 'INTERNAL_SERVER_ERROR' ? SAFE_INTERNAL_MESSAGE : shape.message,
      data: {
        code: shape.data.code,
        httpStatus: shape.data.httpStatus,
        requestId: (ctx as Context | undefined)?.requestId ?? null,
      },
    }
  },
})

export const router = t.router
export const publicProcedure = t.procedure
```

`isDev: false` is explicit rather than left to default from `NODE_ENV`, so a stack trace can never leak even if `NODE_ENV` is misconfigured in some environment. Every `INTERNAL_SERVER_ERROR`'s message is replaced with a fixed, safe string — procedures that want a more specific but still-safe message must use a non-500 code (`NOT_FOUND`, `BAD_REQUEST`, `CONFLICT`, etc.) instead of `INTERNAL_SERVER_ERROR`. Because `transformer` (SuperJSON) is configured, the real wire response wraps the error under `error.json` (confirmed by running this exact test against the real packages) — that is why the test above reads `body.error.json.message`, not `body.error.message`.

- [ ] **Step 5: Run the test to confirm it passes**

```bash
cd apps/api && pnpm exec vitest run src/__tests__/trpc.test.ts
```

Expected: `PASS`, `2 passed`.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/context.ts apps/api/src/trpc.ts apps/api/src/__tests__/trpc.test.ts
git commit -m "feat: add trpc init with safe internal-error message masking"
```

---

### Task 7: Named rate-limit policy registry

**Files:**
- Create: `apps/api/src/plugins/rate-limit.ts`
- Test: `apps/api/src/__tests__/rate-limit-policy.test.ts`

- [ ] **Step 1: Write the failing test for the pure policy resolver and health-route allow-list**

```ts
import { describe, expect, it } from 'vitest'
import {
  isHealthRoute,
  rateLimitPolicies,
  resolveRateLimitPolicyName,
} from '../plugins/rate-limit'

describe('resolveRateLimitPolicyName', () => {
  it('maps the rate-limit probe procedure to its own tighter policy', () => {
    expect(resolveRateLimitPolicyName('/trpc/platform.rateLimitProbe')).toBe(
      'platformRateLimitProbe',
    )
  })

  it('maps every other path to the default policy', () => {
    expect(resolveRateLimitPolicyName('/trpc/platform.ping')).toBe('default')
    expect(resolveRateLimitPolicyName('/health/live')).toBe('default')
  })

  it('the probe policy is tighter than the default policy', () => {
    expect(rateLimitPolicies.platformRateLimitProbe.max).toBeLessThan(
      rateLimitPolicies.default.max,
    )
  })
})

describe('isHealthRoute', () => {
  it('recognizes both health routes, with or without a query string', () => {
    expect(isHealthRoute('/health/live')).toBe(true)
    expect(isHealthRoute('/health/ready')).toBe(true)
    expect(isHealthRoute('/health/ready?foo=bar')).toBe(true)
  })

  it('does not recognize any other path, including a similar-looking one', () => {
    expect(isHealthRoute('/trpc/platform.ping')).toBe(false)
    expect(isHealthRoute('/health/liveness')).toBe(false)
    expect(isHealthRoute('/health')).toBe(false)
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
cd apps/api && pnpm exec vitest run src/__tests__/rate-limit-policy.test.ts
```

Expected: `FAIL` — `Cannot find module '../plugins/rate-limit'`.

- [ ] **Step 3: Implement the rate-limit plugin**

```ts
import rateLimit from '@fastify/rate-limit'
import type { FastifyInstance } from 'fastify'

// Both named policies share this fixed window — @fastify/rate-limit's
// `timeWindow` accepts a single static value applied to the whole plugin
// instance; there is exactly one instance here, so it does not need to vary
// per request the way `max` does.
export const RATE_LIMIT_TIME_WINDOW_MS = 60_000

export const rateLimitPolicies = {
  default: { max: 120 },
  platformRateLimitProbe: { max: 3 },
} as const

export type RateLimitPolicyName = keyof typeof rateLimitPolicies

const HEALTH_ROUTES = new Set(['/health/live', '/health/ready'])

export function resolveRateLimitPolicyName(url: string): RateLimitPolicyName {
  return url.startsWith('/trpc/platform.rateLimitProbe') ? 'platformRateLimitProbe' : 'default'
}

export function isHealthRoute(url: string): boolean {
  const path = url.split('?')[0] ?? url
  return HEALTH_ROUTES.has(path)
}

export async function registerRateLimit(fastify: FastifyInstance): Promise<void> {
  await fastify.register(rateLimit, {
    global: true,
    timeWindow: RATE_LIMIT_TIME_WINDOW_MS,
    // `max` as an async, per-request function is an officially documented
    // @fastify/rate-limit option (its signature is `async (request, key) =>
    // number`) — used here to look up the right named policy per request.
    max: async (request) => rateLimitPolicies[resolveRateLimitPolicyName(request.url)].max,
    keyGenerator: (request) => `${resolveRateLimitPolicyName(request.url)}:${request.ip}`,
    // Also an officially documented option: a function returning a truthy
    // value excludes the request from rate limiting entirely, rather than
    // merely giving it a high limit. Health routes must never be throttled.
    allowList: (request) => isHealthRoute(request.url),
  })
}
```

This is the registry future work packages extend: `AUTH-01`/`AUTH-05`, `CAP-02`, `VAULT-01`, `PRIV-01`/`PRIV-02` each add their own named entry to `rateLimitPolicies` and a matching branch in `resolveRateLimitPolicyName` when their routes exist — they do not invent a second rate-limiting mechanism.

**tRPC batching implication:** `httpBatchLink` (used by the real mobile client built in `PLAT-08-one-call-vertical-slice.md`) can coalesce several logically separate procedure calls fired in the same tick into a single HTTP request, which only counts once against this per-request rate limiter — confirmed empirically against the real `@fastify/rate-limit` + `@trpc/client` packages while drafting this plan. `platform.rateLimitProbe` is a diagnostic-only procedure never expected to run inside a real batch, and Task 10's 429 proof deliberately does not route through `httpBatchLink` (or any batching link) for exactly this reason — see Task 10 for the unbatched proof mechanism.

- [ ] **Step 4: Run the test to confirm it passes**

```bash
cd apps/api && pnpm exec vitest run src/__tests__/rate-limit-policy.test.ts
```

Expected: `PASS`, `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/plugins/rate-limit.ts apps/api/src/__tests__/rate-limit-policy.test.ts
git commit -m "feat: add named rate-limit policy registry with health-route allow-list"
```

---

### Task 8: Health routes (fail-closed readiness)

**Files:**
- Create: `apps/api/src/plugins/health.ts`
- Test: `apps/api/src/__tests__/health.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import Fastify from 'fastify'
import { Pool } from 'pg'
import { afterEach, describe, expect, it } from 'vitest'
import { registerHealthRoutes } from '../plugins/health'

describe('health routes', () => {
  let pools: Pool[] = []

  afterEach(async () => {
    await Promise.all(pools.map((pool) => pool.end()))
    pools = []
  })

  it('GET /health/live always returns 200', async () => {
    const fastify = Fastify()
    const pool = new Pool({
      connectionString: 'postgres://littlearc:littlearc@localhost:5432/littlearc',
    })
    pools.push(pool)
    await registerHealthRoutes(fastify, pool)

    const response = await fastify.inject({ method: 'GET', url: '/health/live' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
    await fastify.close()
  })

  it('GET /health/ready returns 200 when PostgreSQL is reachable', async () => {
    const fastify = Fastify()
    const pool = new Pool({
      connectionString: 'postgres://littlearc:littlearc@localhost:5432/littlearc',
    })
    pools.push(pool)
    await registerHealthRoutes(fastify, pool)

    const response = await fastify.inject({ method: 'GET', url: '/health/ready' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
    await fastify.close()
  })

  it('GET /health/ready returns 503 and no connection details when PostgreSQL is unreachable', async () => {
    const fastify = Fastify()
    const pool = new Pool({
      connectionString: 'postgres://littlearc:littlearc@127.0.0.1:1/littlearc',
      connectionTimeoutMillis: 500,
    })
    pools.push(pool)
    await registerHealthRoutes(fastify, pool)

    const response = await fastify.inject({ method: 'GET', url: '/health/ready' })

    expect(response.statusCode).toBe(503)
    const body = response.json()
    expect(body).toEqual({ status: 'unavailable' })
    expect(JSON.stringify(body)).not.toMatch(/ECONNREFUSED|127\.0\.0\.1|password/i)
    await fastify.close()
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
cd apps/api && pnpm exec vitest run src/__tests__/health.test.ts
```

Expected: `FAIL` — `Cannot find module '../plugins/health'`.

- [ ] **Step 3: Implement the health routes**

```ts
import type { FastifyInstance } from 'fastify'
import type { Pool } from 'pg'

export async function registerHealthRoutes(fastify: FastifyInstance, pool: Pool): Promise<void> {
  fastify.get('/health/live', async () => ({ status: 'ok' as const }))

  fastify.get('/health/ready', async (_request, reply) => {
    try {
      await pool.query('SELECT 1')
      return { status: 'ok' as const }
    } catch {
      reply.code(503)
      return { status: 'unavailable' as const }
    }
  })
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
cd apps/api && pnpm exec vitest run src/__tests__/health.test.ts
```

Expected: `PASS`, `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/plugins/health.ts apps/api/src/__tests__/health.test.ts
git commit -m "feat: add fail-closed health routes"
```

---

### Task 9: Platform router, tRPC adapter registration, and the real vertical-slice integration test

**Files:**
- Create: `apps/api/src/routers/platform.ts`
- Create: `apps/api/src/router.ts`
- Create: `apps/api/src/app.ts`
- Test: `apps/api/src/__tests__/platform-router.test.ts`
- Test: `apps/api/src/__tests__/on-error-logging.test.ts`

This test requires the Compose PostgreSQL from `PLAT-03-database-local-stack.md` to be running and seeded. Confirm first:

```bash
docker compose ps postgres
docker compose exec postgres psql -U littlearc -d littlearc -c 'SELECT count(*) FROM platform_probe'
```

Expected: `postgres` is `(healthy)` and the count is `1`.

- [ ] **Step 1: Write the failing real-HTTP integration test**

```ts
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { transformer } from '@littlearc/contracts'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildServer } from '../app'
import { loadEnv } from '../env'
import type { AppRouter } from '../router'

let server: Awaited<ReturnType<typeof buildServer>>
let baseUrl: string

beforeAll(async () => {
  const env = loadEnv()
  server = await buildServer({ env })
  baseUrl = await server.listen({ host: '127.0.0.1', port: 0 })
})

afterAll(async () => {
  await server.close()
})

describe('platform.ping (real HTTP + real Postgres)', () => {
  it('returns the seeded platform_probe row through a real tRPC HTTP call', async () => {
    const client = createTRPCClient<AppRouter>({
      links: [httpBatchLink({ url: `${baseUrl}/trpc`, transformer })],
    })

    const result = await client.platform.ping.query()

    expect(result.message).toBe('littlearc-platform-bootstrap')
    expect(new Date(result.seededAt).toString()).not.toBe('Invalid Date')
    expect(new Date(result.databaseTime).toString()).not.toBe('Invalid Date')
    expect(typeof result.requestId).toBe('string')
  })
})
```

Save this as `apps/api/src/__tests__/platform-router.test.ts`.

- [ ] **Step 2: Write the failing safe-logging test**

This test proves `buildServer`'s tRPC error hook never logs a raw internal message, a connection string, or a stack trace — only allowlisted metadata (`path`, tRPC `code`, `requestId`). It drives a *real* failure through the *real* HTTP/tRPC path (pointing `DATABASE_URL` at a port nothing listens on, so `platform.ping`'s own `ctx.pool.query(...)` genuinely throws `INTERNAL_SERVER_ERROR`) rather than hand-constructing a log call, so it actually exercises the `onError` hook this task is about to write.

```ts
import { Writable } from 'node:stream'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { transformer } from '@littlearc/contracts'
import { afterEach, describe, expect, it } from 'vitest'
import { buildServer } from '../app'
import { loadEnv } from '../env'
import type { AppRouter } from '../router'

function createCaptureStream() {
  const chunks: string[] = []
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk.toString())
      callback()
    },
  })
  return { stream, chunks }
}

describe('onError logging', () => {
  let server: Awaited<ReturnType<typeof buildServer>> | undefined

  afterEach(async () => {
    await server?.close()
    server = undefined
  })

  it('logs only path/code/requestId — never a raw message, connection detail, or stack', async () => {
    const { stream, chunks } = createCaptureStream()
    // Port 1 refuses connections immediately on macOS and Linux, so
    // ctx.pool.query(...) inside platform.ping fails fast with a real
    // node-postgres connection error, carrying a message like
    // "ECONNREFUSED 127.0.0.1:1" — exactly the kind of detail onError must
    // never emit.
    const unreachableDatabaseUrl = 'postgres://littlearc:littlearc@127.0.0.1:1/littlearc'
    const env = { ...loadEnv(), DATABASE_URL: unreachableDatabaseUrl }
    server = await buildServer({ env, logger: { level: 'info', stream } })
    const baseUrl = await server.listen({ host: '127.0.0.1', port: 0 })

    const client = createTRPCClient<AppRouter>({
      links: [httpBatchLink({ url: `${baseUrl}/trpc`, transformer })],
    })

    await expect(client.platform.ping.query()).rejects.toThrow()

    const emitted = chunks.join('\n')
    expect(emitted).toContain('trpc error')
    expect(emitted).toContain('platform.ping')
    expect(emitted).not.toMatch(/ECONNREFUSED|127\.0\.0\.1:1|password|connection/i)
  })
})
```

Save as `apps/api/src/__tests__/on-error-logging.test.ts`.

- [ ] **Step 3: Run both to confirm they fail**

```bash
cd apps/api && pnpm exec vitest run src/__tests__/platform-router.test.ts src/__tests__/on-error-logging.test.ts
```

Expected: `FAIL` for both — `Cannot find module '../app'`. This is a genuine red state: neither `app.ts` nor `router.ts` exists yet.

- [ ] **Step 4: Write the platform router**

```ts
import { platformPingResponseSchema } from '@littlearc/contracts'
import { platformProbe } from '@littlearc/db'
import { TRPCError } from '@trpc/server'
import { publicProcedure, router } from '../trpc'

export const platformRouter = router({
  ping: publicProcedure.output(platformPingResponseSchema).query(async ({ ctx }) => {
    const [probe] = await ctx.db.select().from(platformProbe).limit(1)
    if (!probe) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Platform probe row is not seeded. Run `pnpm db:seed`.',
      })
    }

    const { rows } = await ctx.pool.query<{ now: Date }>('select now() as now')
    const now = rows[0]?.now
    if (!now) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to read the database time.',
      })
    }

    return {
      message: probe.label,
      seededAt: probe.seededAt.toISOString(),
      databaseTime: now.toISOString(),
      requestId: ctx.requestId,
    }
  }),

  // Exists only to give the named rate-limit policy registry (Task 7) a
  // dedicated, harmless procedure to enforce a tighter limit against — see
  // Task 10. Health routes are never used as rate-limit test targets.
  rateLimitProbe: publicProcedure.query(() => ({ ok: true as const })),
})
```

- [ ] **Step 5: Write the router boundary file**

```ts
import { router } from './trpc'
import { platformRouter } from './routers/platform'

export const appRouter = router({
  platform: platformRouter,
})

export type AppRouter = typeof appRouter
```

- [ ] **Step 6: Write the `buildServer` factory**

```ts
import { randomUUID } from 'node:crypto'
import { closeDbClient, createDbClient } from '@littlearc/db'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { type FastifyTRPCPluginOptions, fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify'
import type { Context } from './context'
import { createContextFactory } from './context'
import { type Env, loadEnv } from './env'
import { buildLoggerOptions } from './logging'
import { registerHealthRoutes } from './plugins/health'
import { registerRateLimit } from './plugins/rate-limit'
import { type AppRouter, appRouter } from './router'

export type BuildServerOptions = {
  env?: Env
  logger?: FastifyServerOptions['logger']
}

export async function buildServer(options: BuildServerOptions = {}): Promise<FastifyInstance> {
  const env = options.env ?? loadEnv()
  const { db, pool } = createDbClient(env.DATABASE_URL)

  const fastify = Fastify({
    logger: options.logger ?? buildLoggerOptions(env.LOG_LEVEL),
    requestIdHeader: 'x-request-id',
    genReqId: () => randomUUID(),
  })

  fastify.addHook('onClose', async () => {
    await closeDbClient(pool)
  })

  // Fixed plugin order per docs/superpowers/specs/2026-07-14-m1-local-platform-bootstrap-design.md §3.3:
  // 1. Request ID + logging/redaction — set on the Fastify constructor above.
  // 2. Security headers and CORS.
  await fastify.register(helmet)
  await fastify.register(cors, {
    origin: env.CORS_ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()),
  })
  // 3. Named rate-limit policy registry (health routes are allow-listed — see Task 7).
  await registerRateLimit(fastify)
  // 4. Liveness and readiness routes.
  await registerHealthRoutes(fastify, pool)
  // 5. Official first-party tRPC Fastify adapter.
  const createContext = createContextFactory(db, pool)
  await fastify.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext,
      onError({ path, error, ctx }) {
        // Allowlisted metadata only — never the raw `error` object (its
        // `.message`/`.cause`/`.stack` can carry a driver message or a
        // connection string). Task 6's errorFormatter already guarantees the
        // *client* never sees that; this is the *server-side log* half of
        // the same guarantee. `ctx` is the tRPC Context (Context, from
        // ./context), which carries `requestId` — not `error.cause`, which
        // has no defined relationship to the request at all.
        fastify.log.error(
          { path, code: error.code, requestId: (ctx as Context | undefined)?.requestId },
          'trpc error',
        )
      },
    } satisfies FastifyTRPCPluginOptions<AppRouter>['trpcOptions'],
  })

  return fastify
}
```

No competing JSON content-type parser is added, and `fastifyTRPCPlugin` is not wrapped with `fastify-plugin` — both are deliberately avoided per the approved design (§3.3), since neither is needed here and both are documented sources of Fastify/tRPC adapter integration hazards.

- [ ] **Step 7: Run both tests to confirm they pass**

```bash
cd apps/api && pnpm exec vitest run src/__tests__/platform-router.test.ts src/__tests__/on-error-logging.test.ts
```

Expected: `PASS`, `1 passed` in each file (`2 passed` total). The first is the real, non-mocked proof required by the approved design: an actual `@trpc/client` over actual HTTP, through the actual Fastify adapter, reading the actual seeded PostgreSQL row. The second proves the safe-logging property from a real failure driven through the real `onError` hook, not a hand-built log call.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/routers apps/api/src/router.ts apps/api/src/app.ts apps/api/src/__tests__/platform-router.test.ts apps/api/src/__tests__/on-error-logging.test.ts
git commit -m "feat: add platform router, buildServer factory, real HTTP test, and safe onError logging test"
```

---

### Task 10: Rate-limit proof — health routes exempt, `platform.rateLimitProbe` returns 429

**Files:**
- Test: `apps/api/src/__tests__/rate-limit-enforcement.test.ts`

Both tests below are acceptance/invariant checks, not red-green TDD: the policy registry (Task 7) and the health-route allow-list (Task 7) and `platform.rateLimitProbe` (Task 9) all already exist by this point in the plan, so these tests are expected to pass immediately — they are proof the already-built pieces compose correctly together, not a driver for new implementation. This is stated plainly rather than presented as a false "red" step.

- [ ] **Step 1: Write the health-route exemption test**

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildServer } from '../app'
import { loadEnv } from '../env'
import { rateLimitPolicies } from '../plugins/rate-limit'

let server: Awaited<ReturnType<typeof buildServer>>

beforeAll(async () => {
  server = await buildServer({ env: loadEnv() })
})

afterAll(async () => {
  await server.close()
})

describe('rate limiting — health routes', () => {
  it('never throttles /health/live or /health/ready, even well past the default policy threshold', async () => {
    const attempts = rateLimitPolicies.default.max + 10

    for (let i = 0; i < attempts; i += 1) {
      const liveResponse = await server.inject({ method: 'GET', url: '/health/live' })
      expect(liveResponse.statusCode).toBe(200)
    }

    for (let i = 0; i < attempts; i += 1) {
      const readyResponse = await server.inject({ method: 'GET', url: '/health/ready' })
      expect(readyResponse.statusCode).toBe(200)
    }
  })
})
```

- [ ] **Step 2: Run it to confirm it passes**

```bash
cd apps/api && pnpm exec vitest run src/__tests__/rate-limit-enforcement.test.ts
```

Expected: `PASS`, `1 passed`. If either loop ever returns `429`, re-check Task 7 Step 3's `allowList` — it must return `true` for both `/health/live` and `/health/ready`.

- [ ] **Step 3: Add the 429 proof for `platform.rateLimitProbe`**

This proof deliberately calls the raw HTTP route via `fastify.inject()` rather than through a real `@trpc/client`, for two verified reasons: `httpBatchLink` (the mobile client's real link, from `PLAT-08-one-call-vertical-slice.md`) can coalesce multiple calls fired in the same tick into a single HTTP request, which would only count once against this limiter and make the "4th call" premise unreliable; and even the non-batching `httpLink` fails to cleanly surface the `429` status through `TRPCClientError` (`@fastify/rate-limit`'s response is plain Fastify JSON, not tRPC's envelope shape, so the client only reports `"Unable to transform response from server"` with no usable status code) — both confirmed empirically against the real packages while drafting this plan. Inspecting the raw HTTP response via `.inject()` is the reliable way to assert the exact status code.

Add this to the same file, alongside the health-route test from Step 1:

```ts
describe('rate limiting — platform.rateLimitProbe', () => {
  it('returns 429 on the 4th call within the 3-per-minute policy', async () => {
    const responses = []
    for (let i = 0; i < 4; i += 1) {
      responses.push(
        await server.inject({ method: 'GET', url: '/trpc/platform.rateLimitProbe' }),
      )
    }

    expect(responses[0]?.statusCode).toBe(200)
    expect(responses[1]?.statusCode).toBe(200)
    expect(responses[2]?.statusCode).toBe(200)
    expect(responses[3]?.statusCode).toBe(429)
  })
})
```

- [ ] **Step 4: Run both to confirm they pass**

```bash
cd apps/api && pnpm exec vitest run src/__tests__/rate-limit-enforcement.test.ts
```

Expected: `PASS`, `2 passed`. If the second test fails with all four calls returning `200`, re-check Task 9 Step 6's plugin registration order — `registerRateLimit(fastify)` must run before the tRPC adapter is registered.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/__tests__/rate-limit-enforcement.test.ts
git commit -m "test: prove health-route rate-limit exemption and 429 enforcement on platform.rateLimitProbe"
```

---

### Task 11: Clean shutdown and thin entrypoints

**Files:**
- Create: `apps/api/src/server.ts`
- Create: `apps/api/src/worker.ts`
- Create: `apps/api/src/all.ts`

- [ ] **Step 1: Write the HTTP API entrypoint**

```ts
import { buildServer } from './app'
import { loadEnv } from './env'

async function main(): Promise<void> {
  const env = loadEnv()
  const fastify = await buildServer({ env })

  const shutdown = (signal: string) => {
    fastify.log.info({ signal }, 'shutting down')
    fastify
      .close()
      .then(() => process.exit(0))
      .catch((error) => {
        fastify.log.error({ err: error }, 'error during shutdown')
        process.exit(1)
      })
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  await fastify.listen({ host: env.API_HOST, port: env.API_PORT })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

`fastify.close()` first stops accepting new HTTP work and waits for in-flight requests to finish, then runs the `onClose` hook registered in `app.ts` (Task 9 Step 3), which closes the PostgreSQL pool — matching the shutdown order required by the approved design (§5.2).

- [ ] **Step 2: Write the worker entrypoint**

```ts
import { loadEnv } from './env'

async function main(): Promise<void> {
  loadEnv()
  // No background job handler is registered yet — pg-boss integration is a
  // later milestone (M3 REM-01). This entrypoint exists now so the
  // server/worker/all process boundary is real, exercised infrastructure
  // rather than something retrofitted later.
  console.log('worker: no handlers registered yet')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

- [ ] **Step 3: Write the combined entrypoint**

```ts
import { buildServer } from './app'
import { loadEnv } from './env'

async function main(): Promise<void> {
  const env = loadEnv()
  const fastify = await buildServer({ env })

  const shutdown = (signal: string) => {
    fastify.log.info({ signal }, 'shutting down')
    fastify
      .close()
      .then(() => process.exit(0))
      .catch((error) => {
        fastify.log.error({ err: error }, 'error during shutdown')
        process.exit(1)
      })
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  await fastify.listen({ host: env.API_HOST, port: env.API_PORT })
  console.log('all: server started (worker has no handlers registered yet)')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

- [ ] **Step 4: Run the server by hand and confirm graceful shutdown**

```bash
pnpm --filter @littlearc/api run start
```

Expected: process stays running, logs a startup line. In a second terminal:

```bash
curl -s http://localhost:3000/health/live
curl -s http://localhost:3000/health/ready
```

Expected: both return `{"status":"ok"}`. Back in the first terminal, press `Ctrl+C`.

Expected: a `"shutting down"` log line appears, then the process exits `0` cleanly (no hanging connection warnings).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/server.ts apps/api/src/worker.ts apps/api/src/all.ts
git commit -m "feat: add server/worker/all thin entrypoints with graceful shutdown"
```

---

### Task 12: `packages/api-types` — type-only boundary that fails closed at runtime

**Files:**
- Create: `packages/api-types/package.json`
- Create: `packages/api-types/tsconfig.json`
- Create: `packages/api-types/src/index.ts`
- Test: `apps/api/src/__tests__/router-export-boundary.test.ts`

- [ ] **Step 1: Write the package manifest**

```json
{
  "name": "@littlearc/api-types",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@littlearc/api": "workspace:*",
    "@littlearc/config": "workspace:*",
    "typescript": "6.0.3"
  }
}
```

`@littlearc/api` is a **devDependency** here — `packages/api-types` never ships a runtime value that depends on it.

- [ ] **Step 2: Write the tsconfig**

```json
{
  "extends": "@littlearc/config/typescript/node.json",
  "compilerOptions": {
    "rootDir": "src",
    "noEmit": true
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Write the type-only export**

```ts
export type { AppRouter } from '@littlearc/api/router'
```

- [ ] **Step 4: Install and typecheck**

```bash
pnpm install
pnpm --filter @littlearc/api-types run typecheck
```

Expected: `pnpm install` exits `0`; the typecheck exits `0` with no errors, proving `AppRouter` resolves purely as a type through the `"types"`-only export condition in `apps/api/package.json`.

- [ ] **Step 5: Write the runtime-boundary acceptance test**

This is an acceptance/invariant check, not red-green TDD: `apps/api/package.json`'s `"./router"` export entry (Task 3 Step 1) already has only a `"types"` condition, so this test is expected to pass immediately. It lives in `apps/api` (not `packages/api-types`, which has no runtime code to execute) and proves that `apps/api`'s own package-exports map rejects a real runtime import of `./router`.

```ts
import { describe, expect, it } from 'vitest'

describe('router export boundary', () => {
  it('rejects a runtime import of ./router — only a type-level export exists', async () => {
    await expect(import('@littlearc/api/router')).rejects.toThrow()
  })
})
```

- [ ] **Step 6: Run it — expect it to already pass, since the export map already has no runtime condition**

```bash
cd apps/api && pnpm exec vitest run src/__tests__/router-export-boundary.test.ts
```

Expected: `PASS`, `1 passed`. If it unexpectedly fails (the import resolves instead of rejecting), re-check `apps/api/package.json`'s `"./router"` export entry from Task 3 Step 1 — it must have only a `"types"` condition, no `"import"`/`"default"`/`"require"`.

- [ ] **Step 7: Commit**

```bash
git add packages/api-types pnpm-lock.yaml apps/api/src/__tests__/router-export-boundary.test.ts
git commit -m "feat: add packages/api-types type-only AppRouter export with fail-closed runtime boundary"
```

---

### Task 13: Full package verification

**Files:** none — final verification for this plan.

- [ ] **Step 1: Typecheck every new package**

```bash
pnpm --filter @littlearc/contracts run typecheck
pnpm --filter @littlearc/api run typecheck
pnpm --filter @littlearc/api-types run typecheck
```

Expected: all three exit `0`.

- [ ] **Step 2: Run every new package's test suite**

```bash
pnpm --filter @littlearc/contracts run test
pnpm --filter @littlearc/api run test
```

Expected: `@littlearc/contracts` reports `2 passed`; `@littlearc/api` reports `21 passed` across 9 test files (`env.test.ts`: 3, `logging.test.ts`: 3, `trpc.test.ts`: 2, `rate-limit-policy.test.ts`: 5, `health.test.ts`: 3, `platform-router.test.ts`: 1, `on-error-logging.test.ts`: 1, `rate-limit-enforcement.test.ts`: 2, `router-export-boundary.test.ts`: 1). If your count differs, recount the `describe`/`it` blocks you added across this plan's tasks rather than treating a mismatch as acceptable drift.

- [ ] **Step 3: Full workspace check from the root**

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm lint
```

Expected: all four exit `0`.

- [ ] **Step 4: Confirm git is clean**

```bash
git status --porcelain
```

Expected: empty.

---

## Evidence required before advancing to `PLAT-08-one-call-vertical-slice.md`

- [ ] `pnpm --filter @littlearc/api run test` passes, including the real-HTTP `platform.ping` integration test against the live, seeded Compose PostgreSQL (Task 9).
- [ ] `pnpm --filter @littlearc/api run test` proves `/health/live` and `/health/ready` are never rate-limited even well past the default policy threshold, and that `platform.rateLimitProbe` returns 429 on its 4th call within a minute (Task 10).
- [ ] `GET /health/live` returns `200` unconditionally; `GET /health/ready` returns `200` with PostgreSQL reachable and `503` with no connection details when it is not (Task 8).
- [ ] The Pino redaction test proves emitted log output redacts `authorization`, `cookie`, `password`, `token`, and `secret` fields (Task 5).
- [ ] The `errorFormatter` test proves an `INTERNAL_SERVER_ERROR`'s raw message never reaches the client, while a deliberately safe non-500 message passes through unchanged (Task 6).
- [ ] The `onError` emitted-log test proves the server logs only `path`/tRPC `code`/`requestId` for a real internal failure — never the raw error, connection details, or a stack trace (Task 9).
- [ ] `apps/api`'s `"./router"` export has only a `"types"` condition, and a real runtime `import('@littlearc/api/router')` rejects (Task 12).
- [ ] `pnpm --filter @littlearc/api-types run typecheck` passes with zero errors (Task 12).
- [ ] Manual `Ctrl+C` against `pnpm --filter @littlearc/api run start` shows a clean, logged shutdown with no hanging-connection warnings (Task 11).
- [ ] The full Expo-bundle grep-based leak check (server-only modules absent from the mobile bundle) is **not** claimed as done by this plan — it is completed in `PLAT-08-one-call-vertical-slice.md`, once mobile actually imports `@littlearc/api-types` and `@littlearc/contracts`. This plan only proves the mechanism that makes that later check succeed: the fail-closed package-exports boundary (Task 12).
