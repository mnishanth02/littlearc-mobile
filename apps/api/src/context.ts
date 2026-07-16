import type { Database } from '@littlearc/db'
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify'
import type { Pool } from 'pg'

export type Context = {
  db: Database
  pool: Pool
  requestId: string
}

export function createContextFactory(db: Database, pool: Pool) {
  return function createContext({ req }: CreateFastifyContextOptions): Context {
    return { db, pool, requestId: req.id }
  }
}
