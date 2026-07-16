import { Writable } from 'node:stream'
import pino from 'pino'
import { describe, expect, it } from 'vitest'
import { buildLoggerOptions } from '../logging'

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

describe('buildLoggerOptions', () => {
  it('redacts sensitive keys at the top level', () => {
    const { stream, chunks } = createCaptureStream()
    const logger = pino(buildLoggerOptions('info'), stream)

    logger.info({ password: 'hunter2', token: 'abc123', secret: 'xyz' }, 'test log line')

    const record = JSON.parse(chunks[0] ?? '{}')
    expect(record.password).toBe('[redacted]')
    expect(record.token).toBe('[redacted]')
    expect(record.secret).toBe('[redacted]')
    expect(record.msg).toBe('test log line')
  })

  it('redacts sensitive keys arbitrarily deep, not just one level down', () => {
    const { stream, chunks } = createCaptureStream()
    const logger = pino(buildLoggerOptions('info'), stream)

    logger.info(
      {
        req: { headers: { authorization: 'Bearer secret-token', cookie: 'session=abc' } },
        context: { nested: { deeply: { password: 'hunter2' } } },
      },
      'test log line',
    )

    const record = JSON.parse(chunks[0] ?? '{}')
    expect(record.req.headers.authorization).toBe('[redacted]')
    expect(record.req.headers.cookie).toBe('[redacted]')
    expect(record.context.nested.deeply.password).toBe('[redacted]')
  })

  it('retains only the Error type while redacting its message and stack', () => {
    const { stream, chunks } = createCaptureStream()
    const logger = pino(buildLoggerOptions('info'), stream)

    logger.error(
      {
        err: new Error('raw pg error: password=secret at 10.0.0.4:5432'),
        token: 'abc123',
      },
      'error occurred',
    )

    const record = JSON.parse(chunks[0] ?? '{}')
    expect(record.err.type).toBe('Error')
    expect(record.err.message).toBe('[redacted]')
    expect(record.err.stack).toBeUndefined()
    expect(JSON.stringify(record)).not.toContain('10.0.0.4')
    expect(JSON.stringify(record)).not.toContain('password=secret')
    expect(record.token).toBe('[redacted]')
  })
})
