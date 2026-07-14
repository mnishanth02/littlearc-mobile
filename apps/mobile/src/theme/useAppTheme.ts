import { UnistylesRuntime } from 'react-native-unistyles'

export function currentThemeName(): 'light' | 'dark' {
  return UnistylesRuntime.themeName as 'light' | 'dark'
}

// Manual override: turn off adaptive themes and flip to the opposite theme.
export function toggleTheme(): void {
  const next = UnistylesRuntime.themeName === 'dark' ? 'light' : 'dark'
  UnistylesRuntime.setAdaptiveThemes(false)
  UnistylesRuntime.setTheme(next)
}
