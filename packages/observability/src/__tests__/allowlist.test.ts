import { describe, expect, it } from 'vitest'
import { assertAllowedEventName, isAllowedEventName } from '../allowlist'

describe('observability allowlist', () => {
  it('rejects any dynamic event name, since the allowlist is currently empty', () => {
    expect(isAllowedEventName('anything')).toBe(false)
    expect(isAllowedEventName('')).toBe(false)
    expect(isAllowedEventName('vault.document_uploaded')).toBe(false)
  })

  it('throws a clear, actionable error for a dynamic/untyped event name', () => {
    expect(() => assertAllowedEventName('some.dynamic.event')).toThrowError(
      /not in the observability allowlist/,
    )
  })
})
