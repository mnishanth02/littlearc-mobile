// Global test setup. Jest matchers from @testing-library/react-native v14 are
// auto-extended on import, so no explicit extend-expect is needed here.

jest.mock('react-native-unistyles', () => {
  const { lightTheme } = require('./src/theme/tokens/light')
  const rt = { insets: { top: 0, bottom: 0, left: 0, right: 0 }, screen: { width: 375, height: 812 } }
  const strip = (o: any) => {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return o
    const { variants, compoundVariants, ...rest } = o
    return rest
  }
  const create = (s: any) => {
    const src = typeof s === 'function' ? s(lightTheme, rt) : s
    const out: any = {}
    for (const k of Object.keys(src)) out[k] = strip(src[k])
    out.useVariants = () => {}
    return out
  }
  return {
    StyleSheet: { create, configure: () => {} },
    UnistylesRuntime: { themeName: 'light', getTheme: () => lightTheme, setTheme: jest.fn(), setAdaptiveThemes: jest.fn() },
  }
})
