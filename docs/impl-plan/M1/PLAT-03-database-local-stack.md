# PLAT-03 — Local Docker Compose Stack and `packages/db` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the full local Docker Compose stack (PostgreSQL, MinIO, Mailpit, ClamAV) with independent, verified health checks, and build the minimal `packages/db` foundation — Drizzle schema, an immutable migration, a pool/client factory with clean shutdown, and an idempotent seed — that proves migration-from-zero and gives `PLAT-05-06-07-api-contracts-types.md` and `PLAT-08-one-call-vertical-slice.md` a real, seeded `platform_probe` row to read.

**Architecture:** One root `docker-compose.yml` with four pinned, independently health-checked services and named volumes, driven by one root `.env` (shared with `packages/db` and, later, `apps/api`). `packages/db` owns environment-independent Drizzle schema, a `drizzle-kit`-generated immutable SQL migration, a `node-postgres` `Pool`-backed client factory, a runtime migrator, and an idempotent seed script that inserts one fixed-id, non-sensitive `platform_probe` row via `ON CONFLICT DO NOTHING`.

**Tech Stack:** Docker Compose (service definitions only — no custom images), PostgreSQL `16.14`, MinIO `quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z`, Mailpit `axllent/mailpit:v1.30.4`, ClamAV `clamav/clamav:1.5.3-debian`, `drizzle-orm` `0.45.2`, `drizzle-kit` `0.31.10`, `pg` `8.22.0`, `tsx` `4.23.1`, `vitest` `4.1.10`, TypeScript `6.0.3`.

---

## Before you start

This is cluster plan 2 of 6. `PLAT-01-02-MOB-01-workspace-mobile.md` must be fully done first (root workspace, `packages/config`, `pnpm-lock.yaml` all exist and `pnpm install --frozen-lockfile` passes) — this plan adds `packages/db` as a new workspace member on top of that baseline. Read `docs/impl-plan/M1/README.md` for the shared ports/env/package-name contract before starting.

Docker Desktop (or an equivalent Docker Engine) must be running before Task 2. Confirm with:

```bash
docker info
```

Expected: prints server info, no `Cannot connect to the Docker daemon` error.

`tooling/docker/` from the repository layout in the approved design (`docs/superpowers/specs/2026-07-14-m1-local-platform-bootstrap-design.md` §3.1) is intentionally **not** populated by this plan. None of the four M1 services need custom init scripts: Postgres's schema comes entirely from Drizzle migrations (Task 8), MinIO needs no pre-created bucket until upload work lands in M3, and Mailpit/ClamAV need no configuration beyond their environment variables and named volumes. Do not create placeholder files under `tooling/docker/` — add real init scripts there only when a future work package (e.g. `VAULT-01`) actually needs one.

---

### Task 1: Verify the pinned image tags exist before editing Compose

**Files:** none — this task only runs verification commands.

MinIO does not publish a reliable rolling-semver tag (its stable releases are timestamped, e.g. `RELEASE.2025-09-07T16-13-09Z`), so its exact tag must be confirmed to exist before it is written into `docker-compose.yml`. PostgreSQL, Mailpit, and ClamAV also get an explicit existence check for the same reason — an unpinned or already-removed tag must fail loudly here, not silently at `docker compose up`.

- [ ] **Step 1: Verify the PostgreSQL tag**

```bash
docker manifest inspect postgres:16.14 > /dev/null && echo "postgres:16.14 OK"
```

Expected: `postgres:16.14 OK`.

- [ ] **Step 2: Verify the MinIO tag**

```bash
docker manifest inspect quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z > /dev/null && echo "minio OK"
```

Expected: `minio OK`. If this fails because the tag has since been removed from `quay.io/minio/minio` (MinIO's release retention policy can prune very old tags), list current tags and pick the newest non-`hotfix`, non-`cpuv1` `RELEASE.*` tag:

```bash
curl -s "https://quay.io/api/v1/repository/minio/minio/tag/?limit=20&onlyActiveTags=true" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(j.tags.map(t=>t.name).filter(n=>/^RELEASE\.[0-9-]+T[0-9-]+Z$/.test(n)).slice(0,5))})"
```

Update the tag consistently everywhere it appears in this plan (Task 3, Task 4) if you must substitute a newer one, and record the substitution in your work log.

- [ ] **Step 3: Verify the Mailpit tag**

```bash
docker manifest inspect axllent/mailpit:v1.30.4 > /dev/null && echo "mailpit OK"
```

Expected: `mailpit OK`.

- [ ] **Step 4: Verify the ClamAV tag**

```bash
docker manifest inspect clamav/clamav:1.5.3-debian > /dev/null && echo "clamav OK"
```

Expected: `clamav OK`.

---

### Task 2: Create the root environment file

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Write the shared environment template**

This file documents every variable `docker-compose.yml` (Task 3) and `packages/db` (Task 5 onward) read. `apps/api` extends this same file in `PLAT-05-06-07-api-contracts-types.md`; `apps/mobile` gets its own separate `apps/mobile/.env.example` in `PLAT-08-one-call-vertical-slice.md` because Expo only auto-loads `.env` files from the app's own project directory, not the monorepo root.

```
# Docker Compose project naming — keeps container/volume names stable
# regardless of the checkout folder name.
COMPOSE_PROJECT_NAME=littlearc

# PostgreSQL (read by docker-compose.yml and packages/db)
POSTGRES_USER=littlearc
POSTGRES_PASSWORD=littlearc
POSTGRES_DB=littlearc
DATABASE_URL=postgres://littlearc:littlearc@localhost:5432/littlearc

# MinIO (read by docker-compose.yml; no application code uses it in M1)
MINIO_ROOT_USER=littlearc
MINIO_ROOT_PASSWORD=littlearc-local-dev

# apps/api — introduced in PLAT-05-06-07-api-contracts-types.md, documented
# here because DATABASE_URL above is the value it reads.
NODE_ENV=development
API_HOST=0.0.0.0
API_PORT=3000
LOG_LEVEL=info
CORS_ALLOWED_ORIGINS=http://localhost:8081

# tooling/scripts backup/restore — introduced in
# PLAT-09-recovery-and-m1-exit.md.
BACKUP_AGE_RECIPIENT=
BACKUP_AGE_IDENTITY_FILE=
```

- [ ] **Step 2: Create your local, untracked `.env`**

```bash
cp .env.example .env
```

Expected: `.env` now exists locally; it matches the root `.gitignore` rule `.env` / `.env.*` (with the `!.env.example` negation), so `git status` does not show it.

- [ ] **Step 3: Commit the template only**

```bash
git add .env.example
git commit -m "chore: add root .env.example for compose and packages/db"
```

---

### Task 3: Create `docker-compose.yml`

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Write the compose file**

```yaml
services:
  postgres:
    image: postgres:16.14
    container_name: littlearc-postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-littlearc}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-littlearc}
      POSTGRES_DB: ${POSTGRES_DB:-littlearc}
    ports:
      - "5432:5432"
    volumes:
      - littlearc_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 5s
      timeout: 5s
      retries: 10

  minio:
    image: quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z
    container_name: littlearc-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-littlearc}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-littlearc-local-dev}
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - littlearc_minio_data:/data
    healthcheck:
      test: ["CMD-SHELL", "mc alias set healthcheck http://localhost:9000 $$MINIO_ROOT_USER $$MINIO_ROOT_PASSWORD && mc ready healthcheck"]
      interval: 5s
      timeout: 5s
      retries: 10

  mailpit:
    image: axllent/mailpit:v1.30.4
    container_name: littlearc-mailpit
    ports:
      - "1025:1025"
      - "8025:8025"
    volumes:
      - littlearc_mailpit_data:/data
    environment:
      MP_DATA_FILE: /data/mailpit.db
    healthcheck:
      test: ["CMD", "/mailpit", "readyz"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s

  clamav:
    image: clamav/clamav:1.5.3-debian
    container_name: littlearc-clamav
    ports:
      - "3310:3310"
    volumes:
      - littlearc_clamav_data:/var/lib/clamav
    healthcheck:
      test: ["CMD", "clamdcheck.sh"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 6m

volumes:
  littlearc_postgres_data:
  littlearc_minio_data:
  littlearc_mailpit_data:
  littlearc_clamav_data:
```

Notes on choices that differ from a naive read of the design spec:

- Mailpit's healthcheck uses the image's own bundled `/mailpit readyz` subcommand (confirmed present in the upstream `Dockerfile`'s `HEALTHCHECK` instruction) instead of an HTTP call to `/api/v1/healthz` — the running image has no `curl`/`wget` installed, so an HTTP-based check would fail for a reason unrelated to Mailpit's actual health. `readyz` is Mailpit's own supported mechanism for exactly this purpose.
- MinIO's healthcheck uses `mc alias set ... && mc ready ...` — both `mc` and a static `curl` are confirmed present at `/usr/bin/mc` and `/usr/bin/curl` in the pinned release image (verified from the upstream `Dockerfile.release`).
- ClamAV's healthcheck calls `clamdcheck.sh`, a script baked into the image at `/usr/local/bin/clamdcheck.sh` with a matching `HEALTHCHECK --start-period=6m` already defined in the upstream image (verified from the upstream `Dockerfile`). The `start_period: 6m` here matches that upstream default because ClamAV's first-run virus definition download is slow and must not be flagged unhealthy while it downloads.
- `$$POSTGRES_USER` / `$$MINIO_ROOT_USER` (double `$`) inside `CMD-SHELL` healthchecks is intentional: Compose interpolates `${...}` from `.env` at file-parse time, so a literal `$$` is required to pass a real, single `$VARNAME` through to the container's own shell, where it resolves from that container's `environment:` block at runtime.

- [ ] **Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: add docker-compose.yml with postgres, minio, mailpit, clamav"
```

---

### Task 4: Bring up the stack and verify every health check independently

**Files:** none — this task only runs verification commands.

- [ ] **Step 1: Start the stack**

```bash
docker compose up -d
```

Expected: four containers created (`littlearc-postgres`, `littlearc-minio`, `littlearc-mailpit`, `littlearc-clamav`), exit `0`.

- [ ] **Step 2: Poll until PostgreSQL, MinIO, and Mailpit report healthy**

```bash
watch -n 2 docker compose ps
```

(Or run `docker compose ps` repeatedly without `watch` if it is unavailable.) Expected within ~30 seconds: `littlearc-postgres`, `littlearc-minio`, and `littlearc-mailpit` all show `Up (healthy)`. Stop watching once they do (`Ctrl+C`).

- [ ] **Step 3: Poll ClamAV separately — it takes longer**

```bash
docker compose ps clamav
```

Expected: `Up (health: starting)` for up to several minutes while ClamAV downloads virus definitions into the `littlearc_clamav_data` volume, then `Up (healthy)`. This does not block any other work in this plan — proceed to Task 5 while it finishes in the background, but do not check the final exit-gate box in `PLAT-09-recovery-and-m1-exit.md` until it reports healthy.

- [ ] **Step 4: Confirm all four are healthy before moving on to `PLAT-05-06-07-api-contracts-types.md`**

```bash
docker compose ps --format '{{.Name}}: {{.Status}}'
```

Expected: all four lines contain `(healthy)`.

- [ ] **Step 5: Record evidence**

```bash
docker compose ps > /dev/null && echo "Local stack evidence captured for docs/impl-plan/M1/README.md evidence matrix"
```

Keep the full `docker compose ps` output from Step 4 for the M1 exit evidence required by `PLAT-09-recovery-and-m1-exit.md`.

---

### Task 5: Create the `packages/db` package scaffold

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/vitest.config.ts`

- [ ] **Step 1: Write the package manifest**

```json
{
  "name": "@littlearc/db",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx --env-file-if-exists=../../.env src/migrate.ts",
    "db:seed": "tsx --env-file-if-exists=../../.env src/seed.ts"
  },
  "dependencies": {
    "drizzle-orm": "0.45.2",
    "pg": "8.22.0"
  },
  "devDependencies": {
    "@littlearc/config": "workspace:*",
    "@types/pg": "8.20.0",
    "drizzle-kit": "0.31.10",
    "tsx": "4.23.1",
    "typescript": "6.0.3",
    "vitest": "4.1.10"
  }
}
```

`--env-file-if-exists` is required rather than `--env-file`: local development loads the root `.env`, while CI deliberately supplies `DATABASE_URL` as a job-level environment variable and has no `.env` file. A required env-file flag would terminate `tsx` before either script starts in CI.

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
    testTimeout: 15000,
  },
})
```

The 15-second timeout accounts for the integration tests in Task 8 and Task 9, which create/drop a real scratch database and run real migrations against the Compose PostgreSQL from Task 4.

- [ ] **Step 4: Install**

```bash
pnpm install
```

Expected: exits `0`; `packages/db` now resolves as a workspace member with its dependencies installed.

- [ ] **Step 5: Commit**

```bash
git add packages/db pnpm-lock.yaml
git commit -m "chore: scaffold packages/db package"
```

---

### Task 6: Define the Drizzle schema

**Files:**
- Create: `packages/db/src/schema.ts`

- [ ] **Step 1: Write the schema**

```ts
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * platform_probe exists only to prove migration, seed, query, transport, and
 * rendering through the real Fastify/tRPC/PostgreSQL/Expo stack (M1 PLAT-08).
 * It contains no user or product data. A future work package may either keep
 * it as a permanent platform diagnostic or remove it through a normal
 * migration once a real product table supersedes it as the vertical-slice
 * proof.
 */
export const platformProbe = pgTable('platform_probe', {
  id: uuid('id').primaryKey(),
  label: text('label').notNull(),
  seededAt: timestamp('seeded_at', { withTimezone: true }).notNull().defaultNow(),
})
```

- [ ] **Step 2: Commit**

```bash
git add packages/db/src/schema.ts
git commit -m "feat: add platform_probe drizzle schema"
```

---

### Task 7: Generate the immutable migration

**Files:**
- Create: `packages/db/drizzle.config.ts`
- Create: `packages/db/drizzle/0000_init_platform_probe.sql` (generated)
- Create: `packages/db/drizzle/meta/0000_snapshot.json` (generated)
- Create: `packages/db/drizzle/meta/_journal.json` (generated)

- [ ] **Step 1: Write the Drizzle Kit config**

```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://littlearc:littlearc@localhost:5432/littlearc',
  },
})
```

- [ ] **Step 2: Generate the migration with an explicit, reviewable name**

```bash
cd packages/db && pnpm exec drizzle-kit generate --name init_platform_probe
```

Expected output:

```
1 tables
platform_probe 3 columns 0 indexes 0 fks

[✓] Your SQL migration file ➜ drizzle/0000_init_platform_probe.sql 🚀
```

- [ ] **Step 3: Confirm the generated SQL is exactly this**

```bash
cat packages/db/drizzle/0000_init_platform_probe.sql
```

Expected:

```sql
CREATE TABLE "platform_probe" (
	"id" uuid PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"seeded_at" timestamp with time zone DEFAULT now() NOT NULL
);
```

- [ ] **Step 4: Confirm the generated journal**

```bash
cat packages/db/drizzle/meta/_journal.json
```

Expected (the `"when"` timestamp will differ — everything else must match):

```json
{
  "version": "7",
  "dialect": "postgresql",
  "entries": [
    {
      "idx": 0,
      "version": "7",
      "when": 1784048438102,
      "tag": "0000_init_platform_probe",
      "breakpoints": true
    }
  ]
}
```

`packages/db/drizzle/meta/0000_snapshot.json` is also generated — it is large, machine-authored schema-diff metadata that `drizzle-kit` uses internally to compute future migrations; do not hand-edit it.

- [ ] **Step 5: Migration files are immutable from this point forward**

Once merged, never hand-edit any file under `packages/db/drizzle/`. Future schema changes always go through `pnpm --filter @littlearc/db run db:generate` producing a new `NNNN_*.sql` file (per `docs/core/architecture.md` §22).

- [ ] **Step 6: Commit**

```bash
git add packages/db/drizzle.config.ts packages/db/drizzle
git commit -m "feat: generate initial platform_probe migration"
```

---

### Task 8: Client factory with clean pool shutdown

**Files:**
- Create: `packages/db/src/client.ts`
- Test: `packages/db/src/__tests__/client.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { closeDbClient, createDbClient } from '../client'

describe('createDbClient', () => {
  it('creates a pool and closes it cleanly without connecting', async () => {
    const { pool } = createDbClient('postgres://littlearc:littlearc@localhost:5432/littlearc')
    await expect(closeDbClient(pool)).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
cd packages/db && pnpm exec vitest run src/__tests__/client.test.ts
```

Expected: `FAIL` — `Cannot find module '../client'` (the file does not exist yet).

- [ ] **Step 3: Implement the client factory**

```ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

export type Database = ReturnType<typeof drizzle<typeof schema>>

export function createDbClient(connectionString: string): { db: Database; pool: Pool } {
  const pool = new Pool({ connectionString })
  const db = drizzle({ client: pool, schema })
  return { db, pool }
}

export async function closeDbClient(pool: Pool): Promise<void> {
  await pool.end()
}
```

- [ ] **Step 4: Run it to confirm it passes**

```bash
cd packages/db && pnpm exec vitest run src/__tests__/client.test.ts
```

Expected: `PASS`, `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/client.ts packages/db/src/__tests__/client.test.ts
git commit -m "feat: add packages/db client factory with pool shutdown"
```

---

### Task 9: Runtime migrator and migration-from-zero integration test

**Files:**
- Create: `packages/db/src/migrate.ts`
- Test: `packages/db/src/__tests__/migrate.test.ts`

- [ ] **Step 1: Write the failing test**

This test proves migrations apply from an empty PostgreSQL database by creating a real, uniquely named scratch database against the Compose PostgreSQL from Task 4, calling the (not-yet-written) exported `migrateDatabase` function against it, and asserting the resulting columns — then dropping it. A second test proves `migrateDatabase` closes its connection pool even when migration fails, using a spy on the real `closeDbClient` so the assertion exercises actual cleanup code, not a fake.

```ts
import { Client, Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('../client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../client')>()
  return {
    ...actual,
    closeDbClient: vi.fn(actual.closeDbClient),
  }
})

import { closeDbClient } from '../client'
import { migrateDatabase } from '../migrate'

const ADMIN_URL =
  process.env.DATABASE_URL ?? 'postgres://littlearc:littlearc@localhost:5432/littlearc'
const TEST_DB_NAME = `littlearc_migrate_test_${Date.now()}`

function withDatabase(url: string, dbName: string): string {
  return url.replace(/\/[^/]+$/, `/${dbName}`)
}

beforeAll(async () => {
  const admin = new Client({ connectionString: ADMIN_URL })
  await admin.connect()
  await admin.query(`CREATE DATABASE ${TEST_DB_NAME}`)
  await admin.end()
})

afterAll(async () => {
  const admin = new Client({ connectionString: ADMIN_URL })
  await admin.connect()
  await admin.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${TEST_DB_NAME}'`,
  )
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`)
  await admin.end()
})

describe('migrateDatabase', () => {
  it('applies the immutable migration to an empty database', async () => {
    const scratchUrl = withDatabase(ADMIN_URL, TEST_DB_NAME)

    await migrateDatabase(scratchUrl)

    const verifyPool = new Pool({ connectionString: scratchUrl })
    const result = await verifyPool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'platform_probe' ORDER BY ordinal_position`,
    )
    expect(result.rows.map((r) => r.column_name)).toEqual(['id', 'label', 'seeded_at'])
    await verifyPool.end()
  })

  it('closes the connection pool even when migration fails', async () => {
    const nonexistentDbUrl = withDatabase(ADMIN_URL, 'littlearc_migrate_test_does_not_exist')
    vi.mocked(closeDbClient).mockClear()

    await expect(migrateDatabase(nonexistentDbUrl)).rejects.toThrow()

    expect(closeDbClient).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
cd packages/db && pnpm exec vitest run src/__tests__/migrate.test.ts
```

Expected: `FAIL` — `Cannot find module '../migrate'` (`packages/db/src/migrate.ts` does not exist yet; this is a real, module-resolution failure, not a false red state, because the test now genuinely imports `migrateDatabase` from it instead of duplicating the migration logic inline).

- [ ] **Step 3: Implement the runtime migrator, exporting a testable function and keeping a CLI-safe main guard**

```ts
import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { closeDbClient, createDbClient } from './client'

const MIGRATIONS_FOLDER = fileURLToPath(new URL('../drizzle', import.meta.url))

/**
 * Applies the immutable Drizzle migrations to the database at
 * `connectionString`. Always closes its own connection pool — including
 * when migration fails — so a caller (the CLI entrypoint below, or a test)
 * never has to manage the pool's lifecycle itself.
 */
export async function migrateDatabase(connectionString: string): Promise<void> {
  const { db, pool } = createDbClient(connectionString)
  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })
  } finally {
    await closeDbClient(pool)
  }
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('DATABASE_URL is not set')
    process.exit(1)
  }

  await migrateDatabase(connectionString)
  console.log('migrations applied')
}

// Import-safe guard: only run main() (and its process.exit calls) when this
// file is executed directly as a CLI entrypoint (e.g. `tsx src/migrate.ts`),
// not when migrateDatabase is imported by a test.
if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
cd packages/db && pnpm exec vitest run src/__tests__/migrate.test.ts
```

Expected: `PASS`, `2 passed`.

- [ ] **Step 5: Run the real migration against the dev database**

```bash
pnpm --filter @littlearc/db run db:migrate
```

Expected: `migrations applied`, exit `0`.

- [ ] **Step 6: Confirm the table exists in the real dev database**

```bash
docker compose exec postgres psql -U littlearc -d littlearc -c '\d platform_probe'
```

Expected: prints the `platform_probe` table definition with columns `id`, `label`, `seeded_at`.

- [ ] **Step 7: Commit**

```bash
git add packages/db/src/migrate.ts packages/db/src/__tests__/migrate.test.ts
git commit -m "feat: add runtime migrator and migration-from-zero integration test"
```

---

### Task 10: Idempotent seed

**Files:**
- Create: `packages/db/src/seed.ts`
- Test: `packages/db/src/__tests__/seed.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterAll, describe, expect, it } from 'vitest'
import { closeDbClient, createDbClient } from '../client'
import { platformProbe } from '../schema'
import { PLATFORM_PROBE_ID, PLATFORM_PROBE_LABEL, seedPlatformProbe } from '../seed'

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://littlearc:littlearc@localhost:5432/littlearc'
const { db, pool } = createDbClient(DATABASE_URL)

afterAll(async () => {
  await closeDbClient(pool)
})

describe('seedPlatformProbe', () => {
  it('is idempotent: seeding twice leaves exactly one row', async () => {
    await seedPlatformProbe(db)
    await seedPlatformProbe(db)

    const rows = await db.select().from(platformProbe)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.id).toBe(PLATFORM_PROBE_ID)
    expect(rows[0]?.label).toBe(PLATFORM_PROBE_LABEL)
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
cd packages/db && pnpm exec vitest run src/__tests__/seed.test.ts
```

Expected: `FAIL` — `Cannot find module '../seed'` (the file does not exist yet).

- [ ] **Step 3: Implement the seed**

```ts
import { createDbClient, closeDbClient, type Database } from './client'
import { platformProbe } from './schema'

export const PLATFORM_PROBE_ID = '00000000-0000-0000-0000-000000000001'
export const PLATFORM_PROBE_LABEL = 'littlearc-platform-bootstrap'

export async function seedPlatformProbe(db: Database): Promise<void> {
  await db
    .insert(platformProbe)
    .values({ id: PLATFORM_PROBE_ID, label: PLATFORM_PROBE_LABEL })
    .onConflictDoNothing({ target: platformProbe.id })
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('DATABASE_URL is not set')
    process.exit(1)
  }

  const { db, pool } = createDbClient(connectionString)
  await seedPlatformProbe(db)
  console.log('seed complete')
  await closeDbClient(pool)
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
cd packages/db && pnpm exec vitest run src/__tests__/seed.test.ts
```

Expected: `PASS`, `1 passed`.

- [ ] **Step 5: Run the real seed against the dev database, twice, to prove idempotency by hand**

```bash
pnpm --filter @littlearc/db run db:seed
pnpm --filter @littlearc/db run db:seed
docker compose exec postgres psql -U littlearc -d littlearc -c 'SELECT count(*) FROM platform_probe'
```

Expected: both `db:seed` runs print `seed complete` and exit `0`; the final `psql` count is exactly `1`.

- [ ] **Step 6: Commit**

```bash
git add packages/db/src/seed.ts packages/db/src/__tests__/seed.test.ts
git commit -m "feat: add idempotent platform_probe seed"
```

---

### Task 11: Public package export surface

**Files:**
- Create: `packages/db/src/index.ts`

- [ ] **Step 1: Write the barrel export**

```ts
export { closeDbClient, createDbClient, type Database } from './client'
export { platformProbe } from './schema'
export { PLATFORM_PROBE_ID, PLATFORM_PROBE_LABEL, seedPlatformProbe } from './seed'
```

`apps/api` (in `PLAT-05-06-07-api-contracts-types.md`) imports only from this file, never reaching into `packages/db/src/*` directly.

- [ ] **Step 2: Typecheck the whole package**

```bash
pnpm --filter @littlearc/db run typecheck
```

Expected: exits `0`, no errors.

- [ ] **Step 3: Run the full package test suite**

```bash
pnpm --filter @littlearc/db run test
```

Expected: `4 passed` (`client.test.ts`: 1, `migrate.test.ts`: 2, `seed.test.ts`: 1), exit `0`.

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/index.ts
git commit -m "feat: add packages/db public export surface"
```

---

### Task 12: Wire root convenience scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add root-level database scripts**

In the root `package.json` `"scripts"` block (created in `PLAT-01-02-MOB-01-workspace-mobile.md` Task 4), add two entries:

```json
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "db:migrate": "pnpm --filter @littlearc/db run db:migrate",
    "db:seed": "pnpm --filter @littlearc/db run db:seed"
  },
```

- [ ] **Step 2: Verify from the root**

```bash
pnpm db:migrate
pnpm db:seed
```

Expected: both print their respective success messages and exit `0` (the migration is already applied, so this is exercising idempotent re-runs — Drizzle's migrator itself is idempotent via its internal migrations-tracking table, and the seed is idempotent by design from Task 10).

- [ ] **Step 3: Run the full workspace typecheck/test/lint to confirm nothing else broke**

```bash
pnpm typecheck
pnpm test
pnpm lint
```

Expected: all three exit `0`.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore: add root db:migrate and db:seed convenience scripts"
```

---

## Evidence required before advancing to `PLAT-05-06-07-api-contracts-types.md`

- [ ] `docker compose ps` shows `littlearc-postgres`, `littlearc-minio`, and `littlearc-mailpit` as `(healthy)` (Task 4).
- [ ] `docker compose ps clamav` eventually shows `(healthy)` once its virus-definition download completes (Task 4 Step 3) — record the final status even if it finishes after other tasks in this plan.
- [ ] `pnpm --filter @littlearc/db run test` passes all three suites, including the real migration-from-zero integration test against a scratch database (Task 9) and the seed idempotency test (Task 10).
- [ ] `packages/db/drizzle/0000_init_platform_probe.sql` matches the exact generated SQL in Task 7 Step 3 and has not been hand-edited.
- [ ] `SELECT count(*) FROM platform_probe` in the real dev database returns exactly `1` (Task 10 Step 5).
- [ ] `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, `pnpm lint` all still exit `0` from the repo root.
