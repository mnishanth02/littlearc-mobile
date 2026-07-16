import { closeDbClient, createDbClient, type Database } from './client'
import { platformProbe } from './schema'

export const PLATFORM_PROBE_ID = '00000000-0000-0000-0000-000000000001'
export const PLATFORM_PROBE_LABEL = 'littlearc-platform-bootstrap'

export async function seedPlatformProbe(db: Database): Promise<void> {
  await db
    .insert(platformProbe)
    .values({ id: PLATFORM_PROBE_ID, label: PLATFORM_PROBE_LABEL })
    .onConflictDoNothing({ target: platformProbe.id })
}

export async function seedDatabase(connectionString: string): Promise<void> {
  const { db, pool } = createDbClient(connectionString)
  try {
    await seedPlatformProbe(db)
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

  await seedDatabase(connectionString)
  console.log('seed complete')
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
