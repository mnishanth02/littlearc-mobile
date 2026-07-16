jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.2.3' }, nativeBuildVersion: '42' },
}))

jest.mock('expo-crypto', () => ({
  randomUUID: () => 'fixed-request-id',
}))

import { buildRequestHeaders } from '../requestHeaders'

describe('buildRequestHeaders', () => {
  it('includes platform, version, build, and a request id', () => {
    const headers = buildRequestHeaders()

    expect(headers['x-app-platform']).toBe('ios')
    expect(headers['x-app-version']).toBe('1.2.3')
    expect(headers['x-app-build']).toBe('42')
    expect(headers['x-request-id']).toBe('fixed-request-id')
  })
})
