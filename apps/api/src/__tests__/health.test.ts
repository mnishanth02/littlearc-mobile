import Fastify from 'fastify'
import { Pool } from 'pg'
import { afterEach, describe, expect, it } from 'vitest'
import { registerHealthRoutes } from '../plugins/health'

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://littlearc:littlearc@localhost:5432/littlearc'

describe('health routes', () => {
  let pools: Pool[] = []

  afterEach(async () => {
    await Promise.all(pools.map((pool) => pool.end()))
    pools = []
  })

  it('GET /health/live always returns 200', async () => {
    const fastify = Fastify()
    const pool = new Pool({ connectionString: DATABASE_URL })
    pools.push(pool)
    await registerHealthRoutes(fastify, pool)

    const response = await fastify.inject({ method: 'GET', url: '/health/live' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
    await fastify.close()
  })

  it('GET /health/ready returns 200 when PostgreSQL is reachable', async () => {
    const fastify = Fastify()
    const pool = new Pool({ connectionString: DATABASE_URL })
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
