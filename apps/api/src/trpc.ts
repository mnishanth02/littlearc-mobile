import { transformer } from '@littlearc/contracts'
import { initTRPC } from '@trpc/server'
import type { Context } from './context'

export const SAFE_INTERNAL_MESSAGE = 'Something went wrong. Please try again.'

const t = initTRPC.context<Context>().create({
  transformer,
  isDev: false,
  errorFormatter({ shape, error, ctx }) {
    return {
      ...shape,
      message: error.code === 'INTERNAL_SERVER_ERROR' ? SAFE_INTERNAL_MESSAGE : shape.message,
      data: {
        code: shape.data.code,
        httpStatus: shape.data.httpStatus,
        requestId: ctx?.requestId ?? null,
      },
    }
  },
})

export const router = t.router
export const publicProcedure = t.procedure
