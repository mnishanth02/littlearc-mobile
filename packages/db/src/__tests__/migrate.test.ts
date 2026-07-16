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
  process.env.DATABASE_URL ?? 'postgresql://littlearc:littlearc@localhost:5432/littlearc'
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
