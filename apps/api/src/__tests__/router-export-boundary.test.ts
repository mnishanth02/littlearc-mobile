import { describe, expect, it } from 'vitest'

describe('router export boundary', () => {
  it('rejects a runtime import of the type-only router export', async () => {
    const importRouter = new Function(
      'return import("@littlearc/api/router")',
    ) as () => Promise<unknown>

    await expect(importRouter()).rejects.toThrow()
  })
})
