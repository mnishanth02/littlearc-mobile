import { ViewStyle } from 'react-native'

// Warm-tinted shadows (light). On dark, use surface/border steps instead.
export const shadowLight: Record<'sm' | 'md' | 'lg', ViewStyle> = {
  sm: { shadowColor: '#5A3C28', shadowOpacity: 0.14, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  md: { shadowColor: '#5A3C28', shadowOpacity: 0.20, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  lg: { shadowColor: '#5A3C28', shadowOpacity: 0.28, shadowRadius: 30, shadowOffset: { width: 0, height: 18 }, elevation: 12 },
}
export const shadowNone: ViewStyle = { shadowOpacity: 0, elevation: 0 }
