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
