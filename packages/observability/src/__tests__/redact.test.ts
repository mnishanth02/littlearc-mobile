import { describe, expect, it } from 'vitest'
import { redactSensitiveKeys } from '../redact'

describe('redactSensitiveKeys', () => {
  it('redacts known-sensitive keys and leaves everything else untouched', () => {
    const result = redactSensitiveKeys({
      userEmail: 'a@b.com',
      category: 'vault',
      authToken: 'xyz',
      platform: 'ios',
    })

    expect(result.userEmail).toBe('[redacted]')
    expect(result.authToken).toBe('[redacted]')
    expect(result.category).toBe('vault')
    expect(result.platform).toBe('ios')
  })

  it('accepts a custom sensitive-key list', () => {
    const result = redactSensitiveKeys({ childName: 'Aarav', category: 'vault' }, ['childname'])

    expect(result.childName).toBe('[redacted]')
    expect(result.category).toBe('vault')
  })
})
