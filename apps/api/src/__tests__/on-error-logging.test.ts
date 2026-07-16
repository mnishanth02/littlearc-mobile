import { Writable } from 'node:stream'
import { transformer } from '@littlearc/contracts'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { afterEach, describe, expect, it } from 'vitest'
import { buildServer } from '../app'
import { loadEnv } from '../env'
import type { AppRouter } from '../router'

function createCaptureStream() {
  const chunks: string[] = []
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk.toString())
      callback()
    },
  })
  return { stream, chunks }
}

describe('onError logging', () => {
  let server: Awaited<ReturnType<typeof buildServer>> | undefined

  afterEach(async () => {
    await server?.close()
    server = undefined
  })

  it('logs only path/code/requestId and no raw connection details', async () => {
    const { stream, chunks } = createCaptureStream()
    const env = {
      ...loadEnv(),
      DATABASE_URL: 'postgres://littlearc:littlearc@127.0.0.1:1/littlearc',
    }
    server = await buildServer({ env, logger: { level: 'info', stream } })
    const baseUrl = await server.listen({ host: '127.0.0.1', port: 0 })

    const client = createTRPCClient<AppRouter>({
      links: [httpBatchLink({ url: `${baseUrl}/trpc`, transformer })],
    })

    await expect(client.platform.ping.query()).rejects.toThrow()

    const emitted = chunks.join('\n')
    expect(emitted).toContain('trpc error')
    expect(emitted).toContain('platform.ping')
    expect(emitted).not.toMatch(/ECONNREFUSED|127\.0\.0\.1:1|password|connection/i)
  })
})
