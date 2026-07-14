import type { ViewStyle } from 'react-native'

export type ModuleKey = 'today' | 'timeline' | 'vault' | 'activities' | 'family'
export type ModuleAccent = { solid: string; text: string; tint: string }

export type ThemeColors = {
  bg: string; surface: string; surfaceAlt: string; border: string
  textPrimary: string; textSecondary: string; textMuted: string
  primary: string; primaryPressed: string; onPrimary: string
  accent: string; primaryTint: string
  success: string; successText: string; successTint: string
  warning: string; warningText: string; warningTint: string
  danger: string; dangerText: string; dangerTint: string; onDanger: string
  info: string; infoText: string; infoTint: string
  modules: Record<ModuleKey, ModuleAccent>
}

export type Theme = {
  name: string
  colors: ThemeColors
  space: Record<string, number>
  radius: Record<string, number>
  shadow: Record<'sm' | 'md' | 'lg', ViewStyle>
}
