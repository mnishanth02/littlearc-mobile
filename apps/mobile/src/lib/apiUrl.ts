import Constants from 'expo-constants'

export class ApiUrlConfigurationError extends Error {}

type ResolveApiUrlOptions = {
  isDev?: boolean
  explicitUrl?: string
  hostUri?: string
  port?: string
}

export function resolveApiUrl(options: ResolveApiUrlOptions = {}): string {
  const isDev = options.isDev ?? __DEV__
  const explicitUrl = options.explicitUrl ?? process.env.EXPO_PUBLIC_API_URL

  if (explicitUrl) {
    return explicitUrl.replace(/\/+$/, '')
  }

  if (!isDev) {
    throw new ApiUrlConfigurationError(
      'EXPO_PUBLIC_API_URL is not set. Non-development builds must configure an explicit API URL.',
    )
  }

  const hostUri = options.hostUri ?? Constants.expoConfig?.hostUri
  if (!hostUri) {
    throw new ApiUrlConfigurationError(
      'EXPO_PUBLIC_API_URL is not set and no development host could be derived from Expo. Set EXPO_PUBLIC_API_URL in apps/mobile/.env.',
    )
  }

  const host = hostUri.split(':')[0]
  const port = options.port ?? process.env.EXPO_PUBLIC_API_PORT ?? '3000'
  return `http://${host}:${port}`
}
