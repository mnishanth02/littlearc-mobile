import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { closeDbClient, createDbClient } from './client'

const MIGRATIONS_FOLDER = fileURLToPath(new URL('../drizzle', import.meta.url))

/**
 * Applies the immutable Drizzle migrations to the database at
 * `connectionString`. Always closes its own connection pool — including
 * when migration fails — so a caller (the CLI entrypoint below, or a test)
 * never has to manage the pool's lifecycle itself.
 */
export async function migrateDatabase(connectionString: string): Promise<void> {
  const { db, pool } = createDbClient(connectionString)
  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })
  } finally {
    await closeDbClient(pool)
  }
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('DATABASE_URL is not set')
    process.exit(1)
  }

  await migrateDatabase(connectionString)
  console.log('migrations applied')
}

// Import-safe guard: only run main() (and its process.exit calls) when this
// file is executed directly as a CLI entrypoint (e.g. `tsx src/migrate.ts`),
// not when migrateDatabase is imported by a test.
if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
