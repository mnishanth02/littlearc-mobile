import type { AppRouter } from '@littlearc/api-types'
import { TRPCClientError } from '@trpc/client'

export type PlatformPingErrorKind = 'database-unavailable' | 'transport' | 'unexpected'

export function classifyPlatformPingError(error: unknown): PlatformPingErrorKind {
  if (!(error instanceof TRPCClientError)) {
    return 'unexpected'
  }

  const typed = error as TRPCClientError<AppRouter>
  if (!typed.data) {
    return 'transport'
  }

  if (typed.data.code === 'NOT_FOUND' || typed.data.code === 'INTERNAL_SERVER_ERROR') {
    return 'database-unavailable'
  }

  return 'unexpected'
}
