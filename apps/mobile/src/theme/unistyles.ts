import { StyleSheet } from 'react-native-unistyles'
import { breakpoints } from './breakpoints'
import { darkTheme } from './tokens/dark'
import { lightTheme } from './tokens/light'

// Light/dark shape parity is enforced at the source: both themes are declared
// `as const satisfies Theme` in tokens/light.ts and tokens/dark.ts, so any key
// drift (including nested module accents) fails tsc there.
const themes = { light: lightTheme, dark: darkTheme }
type AppThemes = typeof themes
type AppBreakpoints = typeof breakpoints

declare module 'react-native-unistyles' {
  export interface UnistylesThemes extends AppThemes {}
  export interface UnistylesBreakpoints extends AppBreakpoints {}
}

StyleSheet.configure({
  settings: { adaptiveThemes: true },
  breakpoints,
  themes,
})
