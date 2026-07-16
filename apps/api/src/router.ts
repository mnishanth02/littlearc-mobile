import { platformRouter } from './routers/platform'
import { router } from './trpc'

export const appRouter = router({
  platform: platformRouter,
})

export type AppRouter = typeof appRouter
