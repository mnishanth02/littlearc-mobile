import { StyleSheet } from 'react-native-unistyles'
import { lightTheme } from './tokens/light'
import { darkTheme } from './tokens/dark'
import { breakpoints } from './breakpoints'

// Compile-time guarantee that light and dark expose identical token KEYS
// (values intentionally differ). Any key added to one theme but not the
// other — at the theme, colours, or module-accent level — fails tsc here.
type ExactKeys<A, B> = [keyof A] extends [keyof B]
  ? ([keyof B] extends [keyof A] ? true : never)
  : never

const _themeKeys: ExactKeys<typeof lightTheme, typeof darkTheme> = true
const _colorKeys: ExactKeys<typeof lightTheme['colors'], typeof darkTheme['colors']> = true
const _moduleKeys: ExactKeys<
  typeof lightTheme['colors']['modules'],
  typeof darkTheme['colors']['modules']
> = true
void _themeKeys
void _colorKeys
void _moduleKeys

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
