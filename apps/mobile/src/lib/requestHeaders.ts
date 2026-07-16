import Constants from 'expo-constants'
import * as Crypto from 'expo-crypto'
import { Platform } from 'react-native'

export function buildRequestHeaders(): Record<string, string> {
  return {
    'x-app-platform': Platform.OS,
    'x-app-version': Constants.expoConfig?.version ?? 'unknown',
    'x-app-build': String(
      Constants.nativeBuildVersion ?? Constants.expoConfig?.version ?? 'unknown',
    ),
    'x-request-id': Crypto.randomUUID(),
  }
}
