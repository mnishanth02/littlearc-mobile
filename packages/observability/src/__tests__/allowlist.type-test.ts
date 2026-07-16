import { trackEvent } from '../allowlist'

// The M1 allowlist is empty, so every statically named event must fail to compile.
// @ts-expect-error -- adding or widening an allowed name must update this proof.
trackEvent('anything')
