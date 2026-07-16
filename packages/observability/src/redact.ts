const DEFAULT_SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'email',
  'phone',
  'authorization',
  'cookie',
] as const

export function redactSensitiveKeys(
  input: Record<string, unknown>,
  sensitiveKeys: readonly string[] = DEFAULT_SENSITIVE_KEYS,
): Record<string, unknown> {
  const redacted: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(input)) {
    const isSensitive = sensitiveKeys.some((sensitive) =>
      key.toLowerCase().includes(sensitive.toLowerCase()),
    )
    redacted[key] = isSensitive ? '[redacted]' : value
  }

  return redacted
}
