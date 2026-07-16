import { describe, expect, it } from 'vitest'
import { loadEnv } from '../env'

describe('loadEnv', () => {
  it('parses a complete, valid environment', () => {
    const env = loadEnv({
      DATABASE_URL: 'postgres://littlearc:littlearc@localhost:5432/littlearc',
    })

    expect(env.API_HOST).toBe('0.0.0.0')
    expect(env.API_PORT).toBe(3000)
    expect(env.LOG_LEVEL).toBe('info')
    expect(env.NODE_ENV).toBe('development')
    expect(env.CORS_ALLOWED_ORIGINS).toBe('http://localhost:8081')
  })

  it('reads explicit overrides', () => {
    const env = loadEnv({
      DATABASE_URL: 'postgres://littlearc:littlearc@localhost:5432/littlearc',
      API_PORT: '4000',
      LOG_LEVEL: 'debug',
    })

    expect(env.API_PORT).toBe(4000)
    expect(env.LOG_LEVEL).toBe('debug')
  })

  it('throws an actionable, non-secret error when DATABASE_URL is missing', () => {
    expect(() => loadEnv({})).toThrowError(/DATABASE_URL/)
  })
})
