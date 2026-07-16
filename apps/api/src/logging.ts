import type { LoggerOptions } from 'pino'

const SENSITIVE_KEY_PATTERN = /^(password|token|secret|authorization|cookie)$/i

export function redactRecursive(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactRecursive(item, seen))
  }
  if (value instanceof Error) {
    return { type: value.name, message: '[redacted]' }
  }
  if (value && typeof value === 'object') {
    if (seen.has(value)) return '[circular]'
    seen.add(value)

    const redacted: Record<string, unknown> = {}
    for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
      redacted[key] = SENSITIVE_KEY_PATTERN.test(key)
        ? '[redacted]'
        : redactRecursive(entryValue, seen)
    }
    return redacted
  }
  return value
}

export function buildLoggerOptions(level: string): LoggerOptions {
  return {
    level,
    serializers: {
      err: (value) => redactRecursive(value),
    },
    hooks: {
      logMethod(inputArgs, method) {
        const transformed = inputArgs.map((arg) =>
          typeof arg === 'object' && arg !== null ? redactRecursive(arg) : arg,
        )
        return method.apply(this, transformed as Parameters<typeof method>)
      },
    },
  }
}
