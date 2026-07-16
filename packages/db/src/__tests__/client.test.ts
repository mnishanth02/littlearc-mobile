import { describe, expect, it } from 'vitest'
import { closeDbClient, createDbClient } from '../client'

describe('createDbClient', () => {
  it('creates a pool and closes it cleanly without connecting', async () => {
    const { pool } = createDbClient('postgresql://littlearc:littlearc@localhost:5432/littlearc')
    await expect(closeDbClient(pool)).resolves.toBeUndefined()
  })
})
