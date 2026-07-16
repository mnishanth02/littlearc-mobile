import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

export type Database = ReturnType<typeof drizzle<typeof schema>>

export function createDbClient(connectionString: string): { db: Database; pool: Pool } {
  const pool = new Pool({ connectionString })
  const db = drizzle({ client: pool, schema })
  return { db, pool }
}

export async function closeDbClient(pool: Pool): Promise<void> {
  await pool.end()
}
