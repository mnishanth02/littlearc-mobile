// Global test setup. Jest matchers from @testing-library/react-native v14 are
// auto-extended on import, so no explicit extend-expect is needed here.
//
// Hand-rolled mock of react-native-unistyles' Jest-incompatible native (Nitro)
// module. Intentionally MINIMAL — it covers only the surface the component
// library uses today: StyleSheet.create (with variants/compoundVariants
// stripped and useVariants a no-op) and UnistylesRuntime.getTheme()/themeName/
// setTheme/setAdaptiveThemes. themeName is a static 'light'; tests that need
// theme switching supply their own local mock (see useAppTheme.test.tsx). If a
// future component reaches for more of the API (mq, useUnistyles, withUnistyles,
// UnistylesRuntime.insets, the /reanimated entry, …), either extend this mock
// or adopt the library's official mock at 'react-native-unistyles/mocks'.

jest.mock('react-native-unistyles', () => {
  const { lightTheme } = require('./src/theme/tokens/light')
  // Deep-freeze so a stray write in one test cannot leak into the shared theme
  // object (getTheme returns this reference) and corrupt later tests. Defined
  // INSIDE the factory to respect jest.mock hoisting (no out-of-scope refs).
  const deepFreeze = (o: any): any => {
    if (o && typeof o === 'object' && !Object.isFrozen(o)) {
      for (const v of Object.values(o)) deepFreeze(v)
      Object.freeze(o)
    }
    return o
  }
  const theme = deepFreeze(lightTheme)
  const rt = {
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    screen: { width: 375, height: 812 },
  }
  const strip = (o: any) => {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return o
    const { variants, compoundVariants, ...rest } = o
    return rest
  }
  const create = (s: any) => {
    const src = typeof s === 'function' ? s(theme, rt) : s
    const out: any = {}
    for (const k of Object.keys(src)) out[k] = strip(src[k])
    out.useVariants = () => {}
    return out
  }
  return {
    StyleSheet: { create, configure: () => {} },
    UnistylesRuntime: {
      themeName: 'light',
      getTheme: () => theme,
      setTheme: jest.fn(),
      setAdaptiveThemes: jest.fn(),
    },
  }
})
