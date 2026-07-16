import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * platform_probe exists only to prove migration, seed, query, transport, and
 * rendering through the real Fastify/tRPC/PostgreSQL/Expo stack (M1 PLAT-08).
 * It contains no user or product data. A future work package may either keep
 * it as a permanent platform diagnostic or remove it through a normal
 * migration once a real product table supersedes it as the vertical-slice
 * proof.
 */
export const platformProbe = pgTable('platform_probe', {
  id: uuid('id').primaryKey(),
  label: text('label').notNull(),
  seededAt: timestamp('seeded_at', { withTimezone: true }).notNull().defaultNow(),
})
