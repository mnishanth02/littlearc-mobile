import { TRPCClientError } from '@trpc/client'
import { classifyPlatformPingError } from '../platformPingError'

describe('classifyPlatformPingError', () => {
  it('classifies a server INTERNAL_SERVER_ERROR as database-unavailable', () => {
    const error = TRPCClientError.from({
      error: {
        message: 'Something went wrong. Please try again.',
        code: -32603,
        data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500, requestId: 'abc' },
      },
    })

    expect(classifyPlatformPingError(error)).toBe('database-unavailable')
  })

  it('classifies a server NOT_FOUND (unseeded probe row) as database-unavailable', () => {
    const error = TRPCClientError.from({
      error: {
        message: 'Platform probe row is not seeded.',
        code: -32004,
        data: { code: 'NOT_FOUND', httpStatus: 404, requestId: 'abc' },
      },
    })

    expect(classifyPlatformPingError(error)).toBe('database-unavailable')
  })

  it('classifies a network/fetch failure (no server response) as transport', () => {
    const error = TRPCClientError.from(new Error('Network request failed'))

    expect(classifyPlatformPingError(error)).toBe('transport')
  })

  it('classifies a non-TRPCClientError as unexpected', () => {
    expect(classifyPlatformPingError(new Error('some other error'))).toBe('unexpected')
  })

  it('classifies an unrecognized tRPC error code as unexpected', () => {
    const error = TRPCClientError.from({
      error: {
        message: 'Rate limit exceeded, retry in 1 minute',
        code: -32029,
        data: { code: 'TOO_MANY_REQUESTS', httpStatus: 429, requestId: 'abc' },
      },
    })

    expect(classifyPlatformPingError(error)).toBe('unexpected')
  })
})
