import { TRPCError } from '@trpc/server'
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import Fastify from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import type { Context } from '../context'
import { publicProcedure, router, SAFE_INTERNAL_MESSAGE } from '../trpc'

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
