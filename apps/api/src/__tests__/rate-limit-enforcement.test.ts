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

describe('rate limiting - health routes', () => {
  it('never throttles health routes past the default policy threshold', async () => {
    const attempts = rateLimitPolicies.default.max + 10

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const response = await server.inject({ method: 'GET', url: '/health/live' })
      expect(response.statusCode).toBe(200)
    }

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const response = await server.inject({ method: 'GET', url: '/health/ready' })
      expect(response.statusCode).toBe(200)
    }
  })
})

describe('rate limiting - platform.rateLimitProbe', () => {
  it('returns 429 on the 4th call within the 3-per-minute policy', async () => {
    const responses = []
    for (let attempt = 0; attempt < 4; attempt += 1) {
      responses.push(await server.inject({ method: 'GET', url: '/trpc/platform.rateLimitProbe' }))
    }

    expect(responses[0]?.statusCode).toBe(200)
    expect(responses[1]?.statusCode).toBe(200)
    expect(responses[2]?.statusCode).toBe(200)
    expect(responses[3]?.statusCode).toBe(429)
  })
})
