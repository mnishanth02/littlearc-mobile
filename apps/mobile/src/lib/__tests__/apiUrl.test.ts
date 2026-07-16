import { ApiUrlConfigurationError, resolveApiUrl } from '../apiUrl'

describe('resolveApiUrl', () => {
  it('returns an explicit EXPO_PUBLIC_API_URL when set, regardless of dev/prod', () => {
    expect(resolveApiUrl({ isDev: false, explicitUrl: 'https://api.example.com/' })).toBe(
      'https://api.example.com',
    )
  })

  it('derives the host from Expo dev-host metadata in development when no explicit URL is set', () => {
    expect(resolveApiUrl({ isDev: true, hostUri: '192.168.1.23:8081', port: '3000' })).toBe(
      'http://192.168.1.23:3000',
    )
  })

  it('uses the default port 3000 when no port is configured', () => {
    expect(resolveApiUrl({ isDev: true, hostUri: '192.168.1.23:8081' })).toBe(
      'http://192.168.1.23:3000',
    )
  })

  it('throws outside development when no explicit URL is configured', () => {
    expect(() => resolveApiUrl({ isDev: false })).toThrow(ApiUrlConfigurationError)
  })

  it('throws in development when no explicit URL and no dev host are available', () => {
    expect(() => resolveApiUrl({ isDev: true, hostUri: undefined })).toThrow(
      ApiUrlConfigurationError,
    )
  })
})
