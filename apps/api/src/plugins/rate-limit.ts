import rateLimit from '@fastify/rate-limit'
import type { FastifyInstance } from 'fastify'

export const RATE_LIMIT_TIME_WINDOW_MS = 60_000

export const rateLimitPolicies = {
  default: { max: 120 },
  platformRateLimitProbe: { max: 3 },
} as const

export type RateLimitPolicyName = keyof typeof rateLimitPolicies

const HEALTH_ROUTES = new Set(['/health/live', '/health/ready'])

export function resolveRateLimitPolicyName(url: string): RateLimitPolicyName {
  return url.startsWith('/trpc/platform.rateLimitProbe') ? 'platformRateLimitProbe' : 'default'
}

export function isHealthRoute(url: string): boolean {
  const path = url.split('?')[0] ?? url
  return HEALTH_ROUTES.has(path)
}

export async function registerRateLimit(fastify: FastifyInstance): Promise<void> {
  await fastify.register(rateLimit, {
    global: true,
    timeWindow: RATE_LIMIT_TIME_WINDOW_MS,
    max: async (request) => rateLimitPolicies[resolveRateLimitPolicyName(request.url)].max,
    keyGenerator: (request) => `${resolveRateLimitPolicyName(request.url)}:${request.ip}`,
    allowList: (request) => isHealthRoute(request.url),
  })
}
