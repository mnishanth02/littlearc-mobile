import { afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('../client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../client')>()
  return {
    ...actual,
    closeDbClient: vi.fn(actual.closeDbClient),
  }
})

import { closeDbClient, createDbClient } from '../client'
import { platformProbe } from '../schema'
import { PLATFORM_PROBE_ID, PLATFORM_PROBE_LABEL, seedDatabase, seedPlatformProbe } from '../seed'

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://littlearc:littlearc@localhost:5432/littlearc'
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

  it('closes the connection pool when seeding fails', async () => {
    const nonexistentDbUrl = DATABASE_URL.replace(/\/[^/]+$/, '/littlearc_seed_test_missing')
    vi.mocked(closeDbClient).mockClear()

    await expect(seedDatabase(nonexistentDbUrl)).rejects.toThrow()

    expect(closeDbClient).toHaveBeenCalledTimes(1)
  })
})
