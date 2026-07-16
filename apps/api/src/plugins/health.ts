import type { FastifyInstance } from 'fastify'
import type { Pool } from 'pg'

export async function registerHealthRoutes(fastify: FastifyInstance, pool: Pool): Promise<void> {
  fastify.get('/health/live', async () => ({ status: 'ok' as const }))

  fastify.get('/health/ready', async (_request, reply) => {
    try {
      await pool.query('SELECT 1')
      return { status: 'ok' as const }
    } catch {
      reply.code(503)
      return { status: 'unavailable' as const }
    }
  })
}
