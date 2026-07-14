import { UnistylesRuntime } from 'react-native-unistyles'

// Non-reactive snapshot of the active theme name. Safe in event handlers;
// does NOT trigger re-renders on theme change (use Unistyles' own hooks for that).
export function currentThemeName(): 'light' | 'dark' {
  return UnistylesRuntime.themeName ?? 'light'
}

// Manual override: turn off adaptive themes and flip to the opposite theme.
export function toggleTheme(): void {
  const next = UnistylesRuntime.themeName === 'dark' ? 'light' : 'dark'
  UnistylesRuntime.setAdaptiveThemes(false)
  UnistylesRuntime.setTheme(next)
}
