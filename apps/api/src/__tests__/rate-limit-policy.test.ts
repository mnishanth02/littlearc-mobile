import { describe, expect, it } from 'vitest'
import { isHealthRoute, rateLimitPolicies, resolveRateLimitPolicyName } from '../plugins/rate-limit'

describe('resolveRateLimitPolicyName', () => {
  it('maps the rate-limit probe procedure to its own tighter policy', () => {
    expect(resolveRateLimitPolicyName('/trpc/platform.rateLimitProbe')).toBe(
      'platformRateLimitProbe',
    )
  })

  it('maps every other path to the default policy', () => {
    expect(resolveRateLimitPolicyName('/trpc/platform.ping')).toBe('default')
    expect(resolveRateLimitPolicyName('/health/live')).toBe('default')
  })

  it('the probe policy is tighter than the default policy', () => {
    expect(rateLimitPolicies.platformRateLimitProbe.max).toBeLessThan(rateLimitPolicies.default.max)
  })
})

describe('isHealthRoute', () => {
  it('recognizes both health routes, with or without a query string', () => {
    expect(isHealthRoute('/health/live')).toBe(true)
    expect(isHealthRoute('/health/ready')).toBe(true)
    expect(isHealthRoute('/health/ready?foo=bar')).toBe(true)
  })

  it('does not recognize any other path, including a similar-looking one', () => {
    expect(isHealthRoute('/trpc/platform.ping')).toBe(false)
    expect(isHealthRoute('/health/liveness')).toBe(false)
    expect(isHealthRoute('/health')).toBe(false)
  })
})
