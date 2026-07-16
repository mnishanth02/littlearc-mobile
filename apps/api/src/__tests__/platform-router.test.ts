import { transformer } from '@littlearc/contracts'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
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
