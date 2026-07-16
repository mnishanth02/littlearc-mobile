import type { ViewStyle } from 'react-native'

// Warm-brown shadow tint (light only); elevation-specific, not a content colour.
const shadowWarm = '#5A3C28'

// Warm-tinted shadows (light). On dark, use surface/border steps instead.
export const shadowLight: Record<'sm' | 'md' | 'lg', ViewStyle> = {
  sm: {
    shadowColor: shadowWarm,
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: shadowWarm,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  lg: {
    shadowColor: shadowWarm,
    shadowOpacity: 0.28,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
}

export const shadowNone: ViewStyle = { shadowOpacity: 0, elevation: 0 }

// Dark relies on borders, not shadows. A shared set keeps dark's shadow map
// structurally identical to light's.
export const shadowNoneSet: Record<'sm' | 'md' | 'lg', ViewStyle> = {
  sm: shadowNone,
  md: shadowNone,
  lg: shadowNone,
}
