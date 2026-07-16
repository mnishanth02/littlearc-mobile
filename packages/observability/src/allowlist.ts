/**
 * Empty by design for M1. Deriving the event-name type from these keys makes
 * every event invalid until a later work package adds an explicitly reviewed entry.
 */
export const eventAllowlist = {} as const

export type AllowedEventName = keyof typeof eventAllowlist

export function isAllowedEventName(name: string): name is AllowedEventName {
  return Object.hasOwn(eventAllowlist, name)
}

export function assertAllowedEventName(name: string): asserts name is AllowedEventName {
  if (!isAllowedEventName(name)) {
    throw new Error(
      `Event "${name}" is not in the observability allowlist. Add it to packages/observability/src/allowlist.ts before emitting.`,
    )
  }
}

/**
 * Enforces the allowlist now; provider delivery remains out of scope until OBS-06.
 */
export function trackEvent<TName extends AllowedEventName>(
  name: TName,
  properties?: Record<string, unknown>,
): void {
  assertAllowedEventName(name)
  void properties
}
