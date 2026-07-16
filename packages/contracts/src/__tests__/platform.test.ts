import { describe, expect, it } from 'vitest'
import { platformPingResponseSchema } from '../platform'
import { transformer } from '../transformer'

describe('platformPingResponseSchema', () => {
  it('round-trips a valid response through the shared SuperJSON transformer', () => {
    const value = {
      message: 'littlearc-platform-bootstrap',
      seededAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      databaseTime: new Date('2026-01-01T00:00:01.000Z').toISOString(),
      requestId: '123e4567-e89b-12d3-a456-426614174000',
    }

    const wire = transformer.serialize(value)
    const decoded = transformer.deserialize(wire)

    expect(platformPingResponseSchema.parse(decoded)).toEqual(value)
  })

  it('rejects a response missing a required field', () => {
    const invalid = {
      message: 'x',
      seededAt: new Date().toISOString(),
      databaseTime: new Date().toISOString(),
    }

    expect(() => platformPingResponseSchema.parse(invalid)).toThrow()
  })
})
