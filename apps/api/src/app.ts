import { randomUUID } from 'node:crypto'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { closeDbClient, createDbClient } from '@littlearc/db'
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

  await fastify.register(helmet)
  await fastify.register(cors, {
    origin: env.CORS_ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()),
  })
  await registerRateLimit(fastify)
  await registerHealthRoutes(fastify, pool)

  const createContext = createContextFactory(db, pool)
  await fastify.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext,
      onError({ path, error, ctx }) {
        fastify.log.error(
          { path, code: error.code, requestId: (ctx as Context | undefined)?.requestId },
          'trpc error',
        )
      },
    } satisfies FastifyTRPCPluginOptions<AppRouter>['trpcOptions'],
  })

  return fastify
}
