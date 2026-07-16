import { platformPingResponseSchema } from '@littlearc/contracts'
import { platformProbe } from '@littlearc/db'
import { TRPCError } from '@trpc/server'
import { publicProcedure, router } from '../trpc'

export const platformRouter = router({
  ping: publicProcedure.output(platformPingResponseSchema).query(async ({ ctx }) => {
    const [probe] = await ctx.db.select().from(platformProbe).limit(1)
    if (!probe) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Platform probe row is not seeded. Run `pnpm db:seed`.',
      })
    }

    const { rows } = await ctx.pool.query<{ now: Date }>('select now() as now')
    const now = rows[0]?.now
    if (!now) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to read the database time.',
      })
    }

    return {
      message: probe.label,
      seededAt: probe.seededAt.toISOString(),
      databaseTime: now.toISOString(),
      requestId: ctx.requestId,
    }
  }),

  rateLimitProbe: publicProcedure.query(() => ({ ok: true as const })),
})
