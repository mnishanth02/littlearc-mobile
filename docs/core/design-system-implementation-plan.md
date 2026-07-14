# LittleArc Design System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the LittleArc mobile app shell with a complete, themed (light + dark) design-system foundation: theme tokens, a custom component library, the five-tab navigation shell, the offline emergency card, and a component preview gallery.

**Architecture:** A greenfield Expo (New Architecture) app scaffolded at `apps/mobile`. Styling is powered by **Unistyles v3** — themes are plain TypeScript token maps registered via `StyleSheet.configure`, consumed through `StyleSheet.create(theme => …)` with a Babel plugin providing zero-re-render reactivity. Components are hand-built primitives + composites that consume only semantic tokens (never raw hex). Navigation is Expo Router with a five-tab bar and a persistent header.

**Tech Stack:** Expo SDK 55+ (verify at bootstrap), React Native 0.83+, React 19, TypeScript, `react-native-unistyles` v3, `react-native-reanimated` v4, `react-native-gesture-handler`, `expo-haptics`, `@expo-google-fonts/*` (Hanken Grotesk, Baloo 2, Noto Sans Devanagari), Phosphor icons via `react-native-svg`, `expo-image`, `@shopify/flash-list` v2, `@gorhom/bottom-sheet`, `lottie-react-native`, Jest + `@testing-library/react-native`.

**Source of truth:** [`docs/core/design-system.md`](./design-system.md). Token values, the type scale, module accents, and component contracts referenced below all come from that document; keep the two in sync.

---

## Scope

**In scope (this plan):**
- Bootstrapping the `apps/mobile` Expo app with the New Architecture and the full tooling chain.
- The theme layer: primitive palette, light/dark semantic themes, typography/spacing/radius/elevation/motion tokens, Unistyles configuration + TypeScript augmentation, adaptive + manual theme switching.
- The custom component library: core primitives and the signature composites.
- The navigation shell: five-tab bar + persistent header + theme provider.
- A **component preview gallery** (developer-only screens) to visually verify every component in both themes.

**Out of scope (separate future plans):**
- Feature screen content (real timeline feed, vault contents, activity engine, family module, auth, capture pipeline, tRPC/data layer).
- Monorepo workspace wiring and the `apps/api` backend.
- Native modules (`document-capture`, `share-intake`).

Each **phase** below ends at a runnable, testable state.

---

## File Structure

```text
apps/mobile/
├── app/                                  # Expo Router routes
│   ├── _layout.tsx                       # Root: font loading, theme provider, gesture root
│   ├── (tabs)/
│   │   ├── _layout.tsx                   # Tab navigator (custom TabBar + AppHeader)
│   │   ├── today.tsx
│   │   ├── timeline.tsx
│   │   ├── vault.tsx
│   │   ├── activities.tsx
│   │   └── family.tsx
│   ├── emergency.tsx                     # Emergency quick-view route
│   └── _dev/
│       └── gallery.tsx                   # Component preview gallery (dev only)
├── src/
│   ├── theme/
│   │   ├── tokens/
│   │   │   ├── palette.ts                # primitive ramps (raw hex) — never used by components
│   │   │   ├── light.ts                  # light semantic theme
│   │   │   ├── dark.ts                   # dark semantic theme
│   │   │   ├── typography.ts             # families, weights, type scale
│   │   │   ├── spacing.ts                # 4-pt scale + radii
│   │   │   ├── elevation.ts              # shadow tokens (light) + border strategy (dark)
│   │   │   └── motion.ts                 # durations, easings, springs
│   │   ├── breakpoints.ts
│   │   ├── unistyles.ts                  # StyleSheet.configure + module augmentation
│   │   └── useAppTheme.ts                # thin helpers (theme name, toggle)
│   ├── components/
│   │   └── ui/
│   │       ├── Text.tsx                  # typography component
│   │       ├── Button.tsx
│   │       ├── IconButton.tsx
│   │       ├── FAB.tsx
│   │       ├── TextField.tsx
│   │       ├── SearchField.tsx
│   │       ├── Chip.tsx
│   │       ├── Tag.tsx
│   │       ├── StatusChip.tsx
│   │       ├── status.ts                 # status → colour/icon/label map (pure)
│   │       ├── Card.tsx
│   │       ├── ListRow.tsx
│   │       ├── InfoCard.tsx
│   │       ├── Avatar.tsx
│   │       ├── Icon.tsx                   # Phosphor wrapper
│   │       └── index.ts                   # barrel export
│   ├── components/
│   │   └── shell/
│   │       ├── AppHeader.tsx
│   │       ├── TabBar.tsx
│   │       ├── EmergencyCard.tsx
│   │       ├── MemoryCard.tsx
│   │       └── CelebrationOverlay.tsx
│   └── lib/
│       └── a11y.ts                        # reduce-motion hook, font-scale clamp helper
├── assets/
├── app.config.ts
├── babel.config.js
├── metro.config.js
├── tsconfig.json
├── jest.config.js
├── jest.setup.ts
└── package.json
```

---

## Phase 0 — Bootstrap

**Outcome:** a running, type-checked, testable Expo app on the New Architecture with the full styling/animation/icon/font toolchain installed and a green example test.

### Task 0.1: Scaffold the Expo app

**Files:**
- Create: `apps/mobile/` (generated)

- [ ] **Step 1: Scaffold**

Run from repo root:

```bash
pnpm dlx create-expo-app@latest apps/mobile --template blank-typescript
```

(`npm`/`yarn`/`bun` are equivalent; the rest of the plan uses `pnpm`.)

- [ ] **Step 2: Verify it boots**

```bash
cd apps/mobile && pnpm expo start --no-dev --max-workers 1
```

Expected: Metro bundles with no errors. Stop with `q`.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile
git commit -m "chore(mobile): scaffold Expo app (blank-typescript)"
```

### Task 0.2: Add Expo Router + New Architecture config

**Files:**
- Modify: `apps/mobile/package.json`
- Create: `apps/mobile/app.config.ts`
- Delete: `apps/mobile/App.tsx` (replaced by Expo Router entry)
- Create: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/index.tsx`

- [ ] **Step 1: Install router + deps**

```bash
cd apps/mobile
pnpm expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```

- [ ] **Step 2: Set the entry + New Arch in `app.config.ts`**

```ts
import { ExpoConfig } from 'expo/config'

const config: ExpoConfig = {
  name: 'LittleArc',
  slug: 'littlearc',
  scheme: 'littlearc',
  newArchEnabled: true,
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: { supportsTablet: false, bundleIdentifier: 'com.littlearc.app' },
  android: { package: 'com.littlearc.app' },
  plugins: ['expo-router'],
  experiments: { typedRoutes: true },
}

export default config
```

- [ ] **Step 3: Set router entry in `package.json`**

Set `"main": "expo-router/entry"` and remove the old `App.tsx` main if present. Delete `App.tsx`.

- [ ] **Step 4: Minimal root layout + index**

`app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router'

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

`app/index.tsx`:

```tsx
import { Text, View } from 'react-native'

export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>LittleArc</Text>
    </View>
  )
}
```

- [ ] **Step 5: Verify boot on a simulator**

```bash
pnpm expo run:ios
```

Expected: app launches showing "LittleArc". (New Arch is on; if a native module later fails on Android, verify per Task 0.6.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(mobile): expo-router entry + New Architecture config"
```

### Task 0.3: Install Unistyles v3 + Reanimated + gestures + Babel plugin

**Files:**
- Modify: `apps/mobile/package.json`
- Create: `apps/mobile/babel.config.js`
- Create: `apps/mobile/metro.config.js`

- [ ] **Step 1: Install**

```bash
cd apps/mobile
pnpm expo install react-native-unistyles react-native-nitro-modules react-native-edge-to-edge
pnpm expo install react-native-reanimated react-native-worklets react-native-gesture-handler expo-haptics
```

> Note: `react-native-unistyles` v3 depends on `react-native-nitro-modules`. Pin exact versions after install and record them in the design doc's risk table.

- [ ] **Step 2: `babel.config.js`**

```js
/** @type {import('react-native-unistyles/plugin').UnistylesPluginOptions} */
const unistylesPluginOptions = { root: 'src', autoProcessRoot: 'app' }

module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['react-native-unistyles/plugin', unistylesPluginOptions],
      'react-native-worklets/plugin', // must be last
    ],
  }
}
```

> The Unistyles Babel plugin processes any component under `root`/`autoProcessRoot`; the worklets/reanimated plugin MUST be listed last.

- [ ] **Step 3: `metro.config.js`**

```js
const { getDefaultConfig } = require('expo/metro-config')
module.exports = getDefaultConfig(__dirname)
```

- [ ] **Step 4: Verify**

```bash
pnpm exec tsc --noEmit
pnpm expo start -c
```

Expected: cache clears, bundles with no Babel errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(mobile): install unistyles v3, reanimated, gesture-handler, haptics"
```

### Task 0.4: Install fonts, icons, media, list, sheet, lottie

**Files:**
- Modify: `apps/mobile/package.json`

- [ ] **Step 1: Install**

```bash
cd apps/mobile
pnpm expo install expo-font @expo-google-fonts/hanken-grotesk @expo-google-fonts/baloo-2 @expo-google-fonts/noto-sans-devanagari
pnpm expo install react-native-svg phosphor-react-native
pnpm expo install expo-image @shopify/flash-list @gorhom/bottom-sheet lottie-react-native
```

- [ ] **Step 2: Verify typecheck + boot**

```bash
pnpm exec tsc --noEmit && pnpm expo start -c
```

Expected: no resolution errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore(mobile): install fonts, phosphor icons, image, flash-list, sheet, lottie"
```

### Task 0.5: Testing toolchain (Jest + Testing Library)

**Files:**
- Modify: `apps/mobile/package.json`
- Create: `apps/mobile/jest.config.js`
- Create: `apps/mobile/jest.setup.ts`
- Create: `apps/mobile/src/lib/__tests__/smoke.test.ts`

- [ ] **Step 1: Install dev deps**

```bash
cd apps/mobile
pnpm add -D jest jest-expo @testing-library/react-native @testing-library/jest-native @types/jest
```

- [ ] **Step 2: `jest.config.js`**

```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-native-svg|react-native-unistyles|react-native-reanimated|@gorhom/.*|phosphor-react-native|lottie-react-native|@shopify/flash-list)/)',
  ],
}
```

- [ ] **Step 3: `jest.setup.ts`**

```ts
import '@testing-library/jest-native/extend-expect'

// Reanimated + Unistyles need runtime shims in the test env.
require('react-native-reanimated').setUpTests?.()
```

- [ ] **Step 4: Add scripts to `package.json`**

```json
{
  "scripts": {
    "test": "jest",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 5: Write a smoke test**

`src/lib/__tests__/smoke.test.ts`:

```ts
describe('toolchain', () => {
  it('runs jest', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 6: Run it**

```bash
pnpm test
```

Expected: 1 passing test.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "test(mobile): jest + testing-library toolchain with green smoke test"
```

### Task 0.6: On-device Unistyles + New Arch verification (risk gate)

**Files:** none (verification only)

- [ ] **Step 1: Verify on a physical/emulated Android device**

Build and launch on Android specifically (the known Unistyles `StyleSheet.configure` Android edge case in the design doc risk table):

```bash
pnpm expo run:android
```

Expected: app launches and renders without a native crash. If it crashes on `StyleSheet.configure`, consult the pinned Unistyles version's issues and the NativeWind v5 fallback in `design-system.md` §3.1 / §13 before continuing.

- [ ] **Step 2: Record the verified versions**

Update `design-system.md` §3 environment note with the exact pinned versions of Expo SDK, RN, and `react-native-unistyles`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: record verified Expo/RN/Unistyles versions"
```

---

## Phase 1 — Theme Foundation

**Outcome:** the full token system is defined and registered; the app follows the OS colour scheme and can toggle light/dark at runtime; fonts are loaded. Everything downstream consumes these tokens.

### Task 1.1: Primitive palette

**Files:**
- Create: `apps/mobile/src/theme/tokens/palette.ts`

- [ ] **Step 1: Define primitives (raw hex — never consumed directly by components)**

```ts
// Primitive ramps. Components must NOT import these directly — use semantic
// tokens from light.ts / dark.ts. Values sourced from design-system.md §5.
export const palette = {
  violet: { 100: '#E7DFFB', 500: '#7C5CF0', 600: '#6A47DB', 700: '#5533B0', 300: '#B09BFF' },
  coral:  { 500: '#FF7355', 700: '#C4472C', 300: '#FF9A82' },
  mint:   { 500: '#16BE99', 700: '#0E7A63' },
  sun:    { 500: '#F5A623', 700: '#B9740A' },
  blue:   { 500: '#2E93DE', 700: '#1C6BB0', 300: '#7FBEF0' },
  danger: { 500: '#E5484D', 700: '#C0323A', 300: '#FF6B6E' },

  // Light neutrals
  paper: '#FBF8F3', white: '#FFFFFF', sand: '#F4EFE7', border: '#EAE3D7',
  ink: '#241F31', ink2: '#5B5568', ink3: '#8E8799',

  // Dark neutrals
  night: '#131019', nightSurface: '#1C1826', nightSurface2: '#241F30', nightBorder: '#322B42',
  moon: '#F4F1FA', moon2: '#C2BBD4', moon3: '#8B8399',
} as const
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/theme/tokens/palette.ts
git commit -m "feat(theme): primitive colour palette"
```

### Task 1.2: Typography, spacing, elevation, motion tokens

**Files:**
- Create: `apps/mobile/src/theme/tokens/typography.ts`
- Create: `apps/mobile/src/theme/tokens/spacing.ts`
- Create: `apps/mobile/src/theme/tokens/elevation.ts`
- Create: `apps/mobile/src/theme/tokens/motion.ts`

- [ ] **Step 1: `typography.ts` (families = exact @expo-google-fonts identifiers; scale from design-system.md §6.1)**

```ts
export const fonts = {
  // Hanken Grotesk — UI/body
  ui400: 'HankenGrotesk_400Regular',
  ui500: 'HankenGrotesk_500Medium',
  ui600: 'HankenGrotesk_600SemiBold',
  ui700: 'HankenGrotesk_700Bold',
  ui800: 'HankenGrotesk_800ExtraBold',
  // Baloo 2 — display/emotional (also Devanagari)
  display600: 'Baloo2_600SemiBold',
  display700: 'Baloo2_700Bold',
  // Noto Sans Devanagari — Hindi body
  hi400: 'NotoSansDevanagari_400Regular',
  hi600: 'NotoSansDevanagari_600SemiBold',
} as const

type Variant = { family: string; size: number; lineHeight: number; letterSpacing?: number }

export const typeScale = {
  display:      { family: fonts.display700, size: 34, lineHeight: 40 },
  h1:           { family: fonts.ui800, size: 24, lineHeight: 30 },
  h2:           { family: fonts.ui700, size: 20, lineHeight: 26 },
  h3:           { family: fonts.ui600, size: 17, lineHeight: 24 },
  body:         { family: fonts.ui400, size: 16, lineHeight: 24 },
  bodyEmphasis: { family: fonts.ui600, size: 16, lineHeight: 24 },
  caption:      { family: fonts.ui500, size: 13, lineHeight: 18 },
  label:        { family: fonts.ui800, size: 12, lineHeight: 16, letterSpacing: 1.4 },
} satisfies Record<string, Variant>

export type TypeVariant = keyof typeof typeScale
```

- [ ] **Step 2: `spacing.ts` (4-pt scale + radii from design-system.md §7)**

```ts
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 32, '4xl': 40, '5xl': 48 } as const
export const radius = { sm: 8, md: 14, lg: 20, xl: 28, pill: 999 } as const
```

- [ ] **Step 3: `elevation.ts` (warm shadows for light; dark relies on borders)**

```ts
import { ViewStyle } from 'react-native'

// Warm-tinted shadows (light). On dark, use surface/border steps instead.
export const shadowLight: Record<'sm' | 'md' | 'lg', ViewStyle> = {
  sm: { shadowColor: '#5A3C28', shadowOpacity: 0.14, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  md: { shadowColor: '#5A3C28', shadowOpacity: 0.20, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  lg: { shadowColor: '#5A3C28', shadowOpacity: 0.28, shadowRadius: 30, shadowOffset: { width: 0, height: 18 }, elevation: 12 },
}
export const shadowNone: ViewStyle = { shadowOpacity: 0, elevation: 0 }
```

- [ ] **Step 4: `motion.ts` (durations/easings from design-system.md §9)**

```ts
export const duration = { micro: 120, standard: 220, screen: 300, celebrate: 1000 } as const
export const spring = { gentle: { damping: 18, stiffness: 180, mass: 1 }, snappy: { damping: 22, stiffness: 260, mass: 1 } } as const
```

- [ ] **Step 5: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/theme/tokens
git commit -m "feat(theme): typography, spacing, elevation, motion tokens"
```

### Task 1.3: Light & dark semantic themes

**Files:**
- Create: `apps/mobile/src/theme/tokens/light.ts`
- Create: `apps/mobile/src/theme/tokens/dark.ts`

- [ ] **Step 1: `light.ts` (semantic map from design-system.md §5.4 + module accents §5.2)**

```ts
import { palette as p } from './palette'
import { space, radius } from './spacing'
import { shadowLight } from './elevation'

export const lightTheme = {
  name: 'light',
  colors: {
    bg: p.paper, surface: p.white, surfaceAlt: p.sand, border: p.border,
    textPrimary: p.ink, textSecondary: p.ink2, textMuted: p.ink3,

    primary: p.violet[500], primaryPressed: p.violet[600], onPrimary: p.white,
    accent: p.violet[700], primaryTint: 'rgba(124,92,240,0.12)',

    success: p.mint[500], successText: p.mint[700], successTint: 'rgba(22,190,153,0.16)',
    warning: p.sun[500], warningText: p.sun[700], warningTint: 'rgba(245,166,35,0.18)',
    danger: p.danger[500], dangerText: p.danger[700], dangerTint: 'rgba(229,72,77,0.12)', onDanger: p.white,
    info: p.blue[500], infoText: p.blue[700], infoTint: 'rgba(46,147,222,0.15)',

    modules: {
      today:      { solid: p.violet[500], text: p.violet[700], tint: 'rgba(124,92,240,0.12)' },
      timeline:   { solid: p.coral[500],  text: p.coral[700],  tint: 'rgba(255,115,85,0.16)' },
      vault:      { solid: p.blue[500],   text: p.blue[700],   tint: 'rgba(46,147,222,0.15)' },
      activities: { solid: p.mint[500],   text: p.mint[700],   tint: 'rgba(22,190,153,0.16)' },
      family:     { solid: p.sun[500],    text: p.sun[700],    tint: 'rgba(245,166,35,0.18)' },
    },
  },
  space, radius, shadow: shadowLight,
} as const
```

- [ ] **Step 2: `dark.ts` (same shape; values from design-system.md §5.5; brighter accents, no shadows)**

```ts
import { palette as p } from './palette'
import { space, radius } from './spacing'
import { shadowNone } from './elevation'

export const darkTheme = {
  name: 'dark',
  colors: {
    bg: p.night, surface: p.nightSurface, surfaceAlt: p.nightSurface2, border: p.nightBorder,
    textPrimary: p.moon, textSecondary: p.moon2, textMuted: p.moon3,

    primary: p.violet[500], primaryPressed: p.violet[600], onPrimary: p.white,
    accent: p.violet[300], primaryTint: 'rgba(176,155,255,0.16)',

    success: p.mint[500], successText: p.mint[500], successTint: 'rgba(22,190,153,0.20)',
    warning: p.sun[500], warningText: p.sun[500], warningTint: 'rgba(245,166,35,0.22)',
    danger: p.danger[300], dangerText: p.danger[300], dangerTint: 'rgba(229,72,77,0.20)', onDanger: p.white,
    info: p.blue[500], infoText: p.blue[300], infoTint: 'rgba(46,147,222,0.20)',

    modules: {
      today:      { solid: p.violet[500], text: p.violet[300], tint: 'rgba(176,155,255,0.16)' },
      timeline:   { solid: p.coral[500],  text: p.coral[300],  tint: 'rgba(255,115,85,0.20)' },
      vault:      { solid: p.blue[500],   text: p.blue[300],   tint: 'rgba(46,147,222,0.20)' },
      activities: { solid: p.mint[500],   text: p.mint[500],   tint: 'rgba(22,190,153,0.20)' },
      family:     { solid: p.sun[500],    text: p.sun[500],    tint: 'rgba(245,166,35,0.22)' },
    },
  },
  space, radius, shadow: { sm: shadowNone, md: shadowNone, lg: shadowNone },
} as const
```

- [ ] **Step 3: Typecheck — the two themes MUST have identical shape**

```bash
pnpm exec tsc --noEmit
```

Expected: PASS. (Task 1.4 adds a compile-time check that the shapes match.)

- [ ] **Step 4: Commit**

```bash
git add src/theme/tokens/light.ts src/theme/tokens/dark.ts
git commit -m "feat(theme): light and dark semantic themes"
```

### Task 1.4: Configure Unistyles + TypeScript augmentation

**Files:**
- Create: `apps/mobile/src/theme/breakpoints.ts`
- Create: `apps/mobile/src/theme/unistyles.ts`

- [ ] **Step 1: `breakpoints.ts`**

```ts
export const breakpoints = { xs: 0, sm: 360, md: 480, lg: 768, xl: 1024 } as const
```

- [ ] **Step 2: `unistyles.ts` — configure + module augmentation (API per Unistyles v3 docs)**

```ts
import { StyleSheet } from 'react-native-unistyles'
import { lightTheme } from './tokens/light'
import { darkTheme } from './tokens/dark'
import { breakpoints } from './breakpoints'

// Compile-time guarantee that dark matches light's shape (catches drift).
const _sameShape: typeof lightTheme = darkTheme

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
```

> `adaptiveThemes: true` makes the app follow the OS colour scheme automatically.

- [ ] **Step 3: Typecheck (the `_sameShape` line fails if the themes diverge)**

```bash
pnpm exec tsc --noEmit
```

Expected: PASS. If it fails, a token is missing/mismatched between `light.ts` and `dark.ts` — fix the shape.

- [ ] **Step 4: Commit**

```bash
git add src/theme/breakpoints.ts src/theme/unistyles.ts
git commit -m "feat(theme): configure Unistyles v3 + typed themes/breakpoints"
```

### Task 1.5: Load fonts + register theme at the root

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Load fonts, keep splash until ready, import unistyles config**

```tsx
import '../src/theme/unistyles' // registers themes before first render
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useFonts, HankenGrotesk_400Regular, HankenGrotesk_500Medium, HankenGrotesk_600SemiBold, HankenGrotesk_700Bold, HankenGrotesk_800ExtraBold } from '@expo-google-fonts/hanken-grotesk'
import { Baloo2_600SemiBold, Baloo2_700Bold } from '@expo-google-fonts/baloo-2'
import { NotoSansDevanagari_400Regular, NotoSansDevanagari_600SemiBold } from '@expo-google-fonts/noto-sans-devanagari'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [loaded] = useFonts({
    HankenGrotesk_400Regular, HankenGrotesk_500Medium, HankenGrotesk_600SemiBold, HankenGrotesk_700Bold, HankenGrotesk_800ExtraBold,
    Baloo2_600SemiBold, Baloo2_700Bold,
    NotoSansDevanagari_400Regular, NotoSansDevanagari_600SemiBold,
  })

  useEffect(() => { if (loaded) SplashScreen.hideAsync() }, [loaded])
  if (!loaded) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  )
}
```

- [ ] **Step 2: Verify fonts load on device**

```bash
pnpm expo run:ios
```

Expected: app launches past splash with no missing-font warning. (Confirm the exact `@expo-google-fonts` export names resolve; adjust if a package renamed a weight.)

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat(mobile): load fonts + register theme at root"
```

### Task 1.6: Theme controls (name + toggle) and reduce-motion/font-scale helpers

**Files:**
- Create: `apps/mobile/src/theme/useAppTheme.ts`
- Create: `apps/mobile/src/lib/a11y.ts`
- Create: `apps/mobile/src/theme/__tests__/useAppTheme.test.tsx`

- [ ] **Step 1: Write the failing test for the toggle helper**

`src/theme/__tests__/useAppTheme.test.tsx`:

```tsx
import { UnistylesRuntime } from 'react-native-unistyles'
import { toggleTheme } from '../useAppTheme'

jest.mock('react-native-unistyles', () => ({
  UnistylesRuntime: { themeName: 'light', setAdaptiveThemes: jest.fn(), setTheme: jest.fn() },
}))

describe('toggleTheme', () => {
  it('disables adaptive themes and switches to the opposite theme', () => {
    toggleTheme()
    expect(UnistylesRuntime.setAdaptiveThemes).toHaveBeenCalledWith(false)
    expect(UnistylesRuntime.setTheme).toHaveBeenCalledWith('dark')
  })
})
```

- [ ] **Step 2: Run it — verify it fails**

```bash
pnpm test src/theme/__tests__/useAppTheme.test.tsx
```

Expected: FAIL ("Cannot find module '../useAppTheme'").

- [ ] **Step 3: Implement `useAppTheme.ts`**

```ts
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
```

- [ ] **Step 4: Run it — verify it passes**

```bash
pnpm test src/theme/__tests__/useAppTheme.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Add a11y helpers `src/lib/a11y.ts`**

```ts
import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

// Clamp font scaling on decorative/display text (design-system.md §6.2).
export const DISPLAY_MAX_FONT_SCALE = 1.3

export function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    let mounted = true
    AccessibilityInfo.isReduceMotionEnabled().then(v => mounted && setReduced(v))
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced)
    return () => { mounted = false; sub.remove() }
  }, [])
  return reduced
}
```

- [ ] **Step 6: Commit**

```bash
git add src/theme/useAppTheme.ts src/lib/a11y.ts src/theme/__tests__/useAppTheme.test.tsx
git commit -m "feat(theme): theme toggle + reduce-motion/font-scale a11y helpers"
```

---

## Phase 2 — Core Component Library

**Outcome:** a set of themed, accessible primitives that consume only semantic tokens, each with a passing test. Component visual contracts come from `design-system.md` §10.

### Task 2.0: Jest mock for Unistyles

Unistyles v3 uses a native (Nitro) module that is unavailable in Jest. Mock it so components render with real token values (variant keys stripped; `useVariants` becomes a no-op). This keeps render tests deterministic.

**Files:**
- Modify: `apps/mobile/jest.setup.ts`

- [ ] **Step 1: Append the mock to `jest.setup.ts`**

```ts
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
```

- [ ] **Step 2: Verify existing tests still pass**

```bash
pnpm test
```

Expected: the Phase 0/1 tests still pass (the `useAppTheme` test already mocks the module locally; this global mock covers component tests).

- [ ] **Step 3: Commit**

```bash
git add jest.setup.ts
git commit -m "test(mobile): jest mock for react-native-unistyles"
```

### Task 2.1: Icon wrapper (Phosphor)

**Files:**
- Create: `apps/mobile/src/components/ui/Icon.tsx`

- [ ] **Step 1: Create the module (shared icon type + single import site)**

```tsx
import type { ComponentType } from 'react'

export type IconWeight = 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'
export type PhIcon = ComponentType<{ size?: number; color?: string; weight?: IconWeight }>

// Single import site for Phosphor icons across the app.
export * from 'phosphor-react-native'
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Icon.tsx
git commit -m "feat(ui): Phosphor icon wrapper + PhIcon type"
```

### Task 2.2: Text (typography)

**Files:**
- Create: `apps/mobile/src/components/ui/Text.tsx`
- Test: `apps/mobile/src/components/ui/__tests__/Text.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render } from '@testing-library/react-native'
import { Text } from '../Text'

describe('Text', () => {
  it('renders children with the display font for the display variant', () => {
    const { getByText } = render(<Text variant="display">First steps</Text>)
    expect(getByText('First steps')).toHaveStyle({ fontFamily: 'Baloo2_700Bold' })
  })

  it('caps font scaling on display text', () => {
    const { getByText } = render(<Text variant="display">Big</Text>)
    expect(getByText('Big').props.maxFontSizeMultiplier).toBe(1.3)
  })
})
```

- [ ] **Step 2: Run — verify it fails**

```bash
pnpm test src/components/ui/__tests__/Text.test.tsx
```

Expected: FAIL ("Cannot find module '../Text'").

- [ ] **Step 3: Implement `Text.tsx`**

```tsx
import { Text as RNText, TextProps } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { typeScale, TypeVariant } from '../../theme/tokens/typography'
import { DISPLAY_MAX_FONT_SCALE } from '../../lib/a11y'

type Tone = 'primary' | 'secondary' | 'muted' | 'accent' | 'onPrimary' | 'danger' | 'success'
type Props = TextProps & { variant?: TypeVariant; tone?: Tone }

const styles = StyleSheet.create(theme => ({
  text: {
    variants: {
      tone: {
        primary: { color: theme.colors.textPrimary },
        secondary: { color: theme.colors.textSecondary },
        muted: { color: theme.colors.textMuted },
        accent: { color: theme.colors.accent },
        onPrimary: { color: theme.colors.onPrimary },
        danger: { color: theme.colors.dangerText },
        success: { color: theme.colors.successText },
      },
    },
  },
}))

export function Text({ variant = 'body', tone = 'primary', style, maxFontSizeMultiplier, ...rest }: Props) {
  styles.useVariants({ tone })
  const t = typeScale[variant]
  const clamp = variant === 'display' || variant === 'h1' ? DISPLAY_MAX_FONT_SCALE : undefined
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? clamp}
      style={[styles.text, { fontFamily: t.family, fontSize: t.size, lineHeight: t.lineHeight, letterSpacing: t.letterSpacing }, style]}
      {...rest}
    />
  )
}
```

- [ ] **Step 4: Run — verify it passes**

```bash
pnpm test src/components/ui/__tests__/Text.test.tsx
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Text.tsx src/components/ui/__tests__/Text.test.tsx
git commit -m "feat(ui): Text typography component"
```

### Task 2.3: Status map + StatusChip (colour + icon + label)

The design system's core accessibility rule: status is never colour alone. The pure `STATUS` map encodes tone + icon + label together so it cannot be violated.

**Files:**
- Create: `apps/mobile/src/components/ui/status.ts`
- Create: `apps/mobile/src/components/ui/StatusChip.tsx`
- Test: `apps/mobile/src/components/ui/__tests__/status.test.ts`
- Test: `apps/mobile/src/components/ui/__tests__/StatusChip.test.tsx`

- [ ] **Step 1: Write the failing test for the map**

```ts
import { STATUS } from '../status'

describe('STATUS map', () => {
  it('maps overdue to the danger tone', () => {
    expect(STATUS.overdue.toneKey).toBe('danger')
  })

  it('gives every status an icon AND a label (never colour alone)', () => {
    for (const kind of Object.keys(STATUS) as (keyof typeof STATUS)[]) {
      expect(STATUS[kind].icon).toBeTruthy()
      expect(STATUS[kind].defaultLabel.length).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 2: Run — verify it fails**

```bash
pnpm test src/components/ui/__tests__/status.test.ts
```

Expected: FAIL ("Cannot find module '../status'").

- [ ] **Step 3: Implement `status.ts`**

```ts
import type { PhIcon } from './Icon'
import { CheckCircle, Clock, WarningCircle, Info } from 'phosphor-react-native'

export type StatusKind = 'success' | 'dueSoon' | 'overdue' | 'info'
export type StatusToneKey = 'success' | 'warning' | 'danger' | 'info'
export interface StatusSpec { toneKey: StatusToneKey; icon: PhIcon; defaultLabel: string }

export const STATUS: Record<StatusKind, StatusSpec> = {
  success: { toneKey: 'success', icon: CheckCircle, defaultLabel: 'Up to date' },
  dueSoon: { toneKey: 'warning', icon: Clock, defaultLabel: 'Due soon' },
  overdue: { toneKey: 'danger', icon: WarningCircle, defaultLabel: 'Overdue' },
  info: { toneKey: 'info', icon: Info, defaultLabel: 'Info' },
}
```

- [ ] **Step 4: Run — verify it passes**

```bash
pnpm test src/components/ui/__tests__/status.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write the failing test for StatusChip**

```tsx
import { render } from '@testing-library/react-native'
import { StatusChip } from '../StatusChip'

describe('StatusChip', () => {
  it('shows a text label alongside its icon', () => {
    const { getByText } = render(<StatusChip kind="overdue" />)
    expect(getByText('Overdue')).toBeTruthy()
  })

  it('supports a custom label', () => {
    const { getByText } = render(<StatusChip kind="dueSoon" label="Due in 6 days" />)
    expect(getByText('Due in 6 days')).toBeTruthy()
  })
})
```

- [ ] **Step 6: Run — verify it fails**

```bash
pnpm test src/components/ui/__tests__/StatusChip.test.tsx
```

Expected: FAIL ("Cannot find module '../StatusChip'").

- [ ] **Step 7: Implement `StatusChip.tsx`**

```tsx
import { View } from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'
import { Text } from './Text'
import { STATUS, StatusKind } from './status'

type Props = { kind: StatusKind; label?: string }

const styles = StyleSheet.create(theme => ({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 5, paddingHorizontal: 11, borderRadius: theme.radius.pill,
    alignSelf: 'flex-start',
    variants: {
      tone: {
        success: { backgroundColor: theme.colors.successTint },
        warning: { backgroundColor: theme.colors.warningTint },
        danger: { backgroundColor: theme.colors.dangerTint },
        info: { backgroundColor: theme.colors.infoTint },
      },
    },
  },
}))

export function StatusChip({ kind, label }: Props) {
  const spec = STATUS[kind]
  styles.useVariants({ tone: spec.toneKey })
  const c = UnistylesRuntime.getTheme().colors
  const textColor = { success: c.successText, warning: c.warningText, danger: c.dangerText, info: c.infoText }[spec.toneKey]
  const Icon = spec.icon
  const text = label ?? spec.defaultLabel
  return (
    <View style={styles.chip} accessibilityRole="text" accessibilityLabel={text}>
      <Icon size={14} color={textColor} weight="fill" />
      <Text variant="caption" style={{ color: textColor, fontFamily: 'HankenGrotesk_700Bold' }}>{text}</Text>
    </View>
  )
}
```

- [ ] **Step 8: Run — verify it passes**

```bash
pnpm test src/components/ui/__tests__/StatusChip.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/components/ui/status.ts src/components/ui/StatusChip.tsx src/components/ui/__tests__/status.test.ts src/components/ui/__tests__/StatusChip.test.tsx
git commit -m "feat(ui): status map + StatusChip (colour + icon + label)"
```

### Task 2.4: Button

**Files:**
- Create: `apps/mobile/src/components/ui/Button.tsx`
- Test: `apps/mobile/src/components/ui/__tests__/Button.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, fireEvent } from '@testing-library/react-native'
import { Button } from '../Button'

describe('Button', () => {
  it('renders its label and fires onPress', () => {
    const onPress = jest.fn()
    const { getByRole } = render(<Button label="Add memory" onPress={onPress} />)
    fireEvent.press(getByRole('button'))
    expect(onPress).toHaveBeenCalled()
  })

  it('is disabled and does not fire when disabled', () => {
    const onPress = jest.fn()
    const { getByRole } = render(<Button label="Add" disabled onPress={onPress} />)
    const btn = getByRole('button')
    expect(btn.props.accessibilityState.disabled).toBe(true)
    fireEvent.press(btn)
    expect(onPress).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run — verify it fails**

```bash
pnpm test src/components/ui/__tests__/Button.test.tsx
```

Expected: FAIL ("Cannot find module '../Button'").

- [ ] **Step 3: Implement `Button.tsx`**

```tsx
import { Pressable, PressableProps, ActivityIndicator } from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'
import { Text } from './Text'
import type { PhIcon } from './Icon'

type Intent = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'lg'
type Props = Omit<PressableProps, 'children'> & {
  label: string
  intent?: Intent
  size?: Size
  leftIcon?: PhIcon
  loading?: boolean
}

const TEXT_TONE: Record<Intent, 'onPrimary' | 'accent' | 'danger'> = {
  primary: 'onPrimary', secondary: 'accent', ghost: 'accent', danger: 'danger',
}

const styles = StyleSheet.create(theme => ({
  base: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.space.sm,
    borderRadius: theme.radius.pill, minHeight: 44,
    variants: {
      intent: {
        primary: { backgroundColor: theme.colors.primary, ...theme.shadow.sm },
        secondary: { backgroundColor: theme.colors.primaryTint },
        ghost: { backgroundColor: 'transparent' },
        danger: { backgroundColor: theme.colors.dangerTint },
      },
      size: {
        md: { paddingVertical: 12, paddingHorizontal: 20 },
        lg: { paddingVertical: 16, paddingHorizontal: 24 },
      },
      disabled: { true: { opacity: 0.5 }, false: {} },
    },
  },
}))

export function Button({ label, intent = 'primary', size = 'md', leftIcon: Icon, loading = false, disabled = false, ...rest }: Props) {
  const isDisabled = disabled || loading
  styles.useVariants({ intent, size, disabled: isDisabled })
  const c = UnistylesRuntime.getTheme().colors
  const iconColor = intent === 'primary' ? c.onPrimary : intent === 'danger' ? c.dangerText : c.accent
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      style={({ pressed }) => [styles.base, pressed && !isDisabled ? { opacity: 0.85 } : null]}
      {...rest}
    >
      {loading ? <ActivityIndicator color={iconColor} /> : Icon ? <Icon size={18} color={iconColor} weight="fill" /> : null}
      <Text variant="bodyEmphasis" tone={TEXT_TONE[intent]}>{label}</Text>
    </Pressable>
  )
}
```

- [ ] **Step 4: Run — verify it passes**

```bash
pnpm test src/components/ui/__tests__/Button.test.tsx
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Button.tsx src/components/ui/__tests__/Button.test.tsx
git commit -m "feat(ui): Button with intent/size variants + a11y state"
```

### Task 2.5: Card

**Files:**
- Create: `apps/mobile/src/components/ui/Card.tsx`
- Test: `apps/mobile/src/components/ui/__tests__/Card.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render } from '@testing-library/react-native'
import { Text as RNText } from 'react-native'
import { Card } from '../Card'

describe('Card', () => {
  it('renders its children', () => {
    const { getByText } = render(<Card><RNText>Inside</RNText></Card>)
    expect(getByText('Inside')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run — verify it fails**

```bash
pnpm test src/components/ui/__tests__/Card.test.tsx
```

Expected: FAIL ("Cannot find module '../Card'").

- [ ] **Step 3: Implement `Card.tsx`**

```tsx
import { View, ViewProps } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'

type Props = ViewProps & { elevated?: boolean; padded?: boolean }

const styles = StyleSheet.create(theme => ({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    variants: {
      elevated: { true: theme.shadow.md, false: {} },
      padded: { true: { padding: theme.space.xl }, false: {} },
    },
  },
}))

export function Card({ elevated = true, padded = true, style, ...rest }: Props) {
  styles.useVariants({ elevated, padded })
  return <View style={[styles.card, style]} {...rest} />
}
```

- [ ] **Step 4: Run — verify it passes**

```bash
pnpm test src/components/ui/__tests__/Card.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Card.tsx src/components/ui/__tests__/Card.test.tsx
git commit -m "feat(ui): Card (elevated/padded variants; border-based on dark)"
```

---

### Task 2.6: TextField

**Files:**
- Create: `apps/mobile/src/components/ui/TextField.tsx`
- Test: `apps/mobile/src/components/ui/__tests__/TextField.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, fireEvent } from '@testing-library/react-native'
import { TextField } from '../TextField'

describe('TextField', () => {
  it('renders a label and forwards typing', () => {
    const onChangeText = jest.fn()
    const { getByText, getByPlaceholderText } = render(
      <TextField label="Child’s name" placeholder="Aarav" onChangeText={onChangeText} />,
    )
    expect(getByText('Child’s name')).toBeTruthy()
    fireEvent.changeText(getByPlaceholderText('Aarav'), 'Aa')
    expect(onChangeText).toHaveBeenCalledWith('Aa')
  })

  it('shows an error message instead of the helper', () => {
    const { getByText, queryByText } = render(
      <TextField helper="Optional" error="Required" placeholder="x" />,
    )
    expect(getByText('Required')).toBeTruthy()
    expect(queryByText('Optional')).toBeNull()
  })
})
```

- [ ] **Step 2: Run — verify it fails**

```bash
pnpm test src/components/ui/__tests__/TextField.test.tsx
```

Expected: FAIL ("Cannot find module '../TextField'").

- [ ] **Step 3: Implement `TextField.tsx`**

```tsx
import { useState } from 'react'
import { View, TextInput, TextInputProps } from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'
import { Text } from './Text'

type Props = TextInputProps & { label?: string; helper?: string; error?: string }

const styles = StyleSheet.create(theme => ({
  field: {
    flexDirection: 'row', alignItems: 'center', gap: theme.space.sm,
    backgroundColor: theme.colors.surface, borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: theme.radius.md, paddingHorizontal: 14, minHeight: 48,
    variants: {
      state: {
        rest: { borderColor: theme.colors.border },
        focus: { borderColor: theme.colors.primary },
        error: { borderColor: theme.colors.danger },
      },
    },
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, fontFamily: 'HankenGrotesk_400Regular', color: theme.colors.textPrimary },
}))

export function TextField({ label, helper, error, onFocus, onBlur, style, ...rest }: Props) {
  const [focused, setFocused] = useState(false)
  const state = error ? 'error' : focused ? 'focus' : 'rest'
  styles.useVariants({ state })
  const c = UnistylesRuntime.getTheme().colors
  return (
    <View>
      {label ? (
        <Text variant="caption" tone="secondary" style={{ marginBottom: 6, fontFamily: 'HankenGrotesk_700Bold' }}>{label}</Text>
      ) : null}
      <View style={styles.field}>
        <TextInput
          placeholderTextColor={c.textMuted}
          style={[styles.input, style]}
          onFocus={e => { setFocused(true); onFocus?.(e) }}
          onBlur={e => { setFocused(false); onBlur?.(e) }}
          {...rest}
        />
      </View>
      {error ? (
        <Text variant="caption" tone="danger" style={{ marginTop: 6 }}>{error}</Text>
      ) : helper ? (
        <Text variant="caption" tone="muted" style={{ marginTop: 6 }}>{helper}</Text>
      ) : null}
    </View>
  )
}
```

- [ ] **Step 4: Run — verify it passes**

```bash
pnpm test src/components/ui/__tests__/TextField.test.tsx
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/TextField.tsx src/components/ui/__tests__/TextField.test.tsx
git commit -m "feat(ui): TextField with focus/error states"
```

### Task 2.7: ListRow

**Files:**
- Create: `apps/mobile/src/components/ui/ListRow.tsx`
- Test: `apps/mobile/src/components/ui/__tests__/ListRow.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, fireEvent } from '@testing-library/react-native'
import { House } from 'phosphor-react-native'
import { ListRow } from '../ListRow'

describe('ListRow', () => {
  it('renders title + subtitle and fires onPress', () => {
    const onPress = jest.fn()
    const { getByText, getByRole } = render(
      <ListRow icon={House} title="Birth certificate" subtitle="PDF · Jun 2" onPress={onPress} />,
    )
    expect(getByText('Birth certificate')).toBeTruthy()
    expect(getByText('PDF · Jun 2')).toBeTruthy()
    fireEvent.press(getByRole('button'))
    expect(onPress).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run — verify it fails**

```bash
pnpm test src/components/ui/__tests__/ListRow.test.tsx
```

Expected: FAIL ("Cannot find module '../ListRow'").

- [ ] **Step 3: Implement `ListRow.tsx`**

```tsx
import { ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'
import { CaretRight } from 'phosphor-react-native'
import { Text } from './Text'
import type { PhIcon } from './Icon'

type ModuleKey = 'today' | 'timeline' | 'vault' | 'activities' | 'family'
type Props = {
  icon: PhIcon
  module?: ModuleKey
  title: string
  subtitle?: string
  onPress?: () => void
  right?: ReactNode
}

const styles = StyleSheet.create(theme => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space.lg, paddingVertical: 14, paddingHorizontal: 16, minHeight: 44 },
  iconWrap: {
    width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    variants: {
      module: {
        today: { backgroundColor: theme.colors.modules.today.tint },
        timeline: { backgroundColor: theme.colors.modules.timeline.tint },
        vault: { backgroundColor: theme.colors.modules.vault.tint },
        activities: { backgroundColor: theme.colors.modules.activities.tint },
        family: { backgroundColor: theme.colors.modules.family.tint },
      },
    },
  },
  mid: { flex: 1 },
}))

export function ListRow({ icon: Icon, module = 'vault', title, subtitle, onPress, right }: Props) {
  styles.useVariants({ module })
  const c = UnistylesRuntime.getTheme().colors
  const iconColor = c.modules[module].text
  const body = (
    <View style={styles.row}>
      <View style={styles.iconWrap}><Icon size={21} color={iconColor} weight="fill" /></View>
      <View style={styles.mid}>
        <Text variant="bodyEmphasis">{title}</Text>
        {subtitle ? <Text variant="caption" tone="muted">{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <CaretRight size={18} color={c.textMuted} /> : null)}
    </View>
  )
  if (onPress) return <Pressable accessibilityRole="button" onPress={onPress}>{body}</Pressable>
  return body
}
```

- [ ] **Step 4: Run — verify it passes**

```bash
pnpm test src/components/ui/__tests__/ListRow.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/ListRow.tsx src/components/ui/__tests__/ListRow.test.tsx
git commit -m "feat(ui): ListRow with per-module icon tint"
```

### Task 2.8: Remaining primitives (IconButton, FAB, SearchField, Chip, Tag, InfoCard, Avatar) + barrel

**Files:**
- Create: `apps/mobile/src/components/ui/IconButton.tsx`
- Create: `apps/mobile/src/components/ui/FAB.tsx`
- Create: `apps/mobile/src/components/ui/SearchField.tsx`
- Create: `apps/mobile/src/components/ui/Chip.tsx`
- Create: `apps/mobile/src/components/ui/Tag.tsx`
- Create: `apps/mobile/src/components/ui/InfoCard.tsx`
- Create: `apps/mobile/src/components/ui/Avatar.tsx`
- Create: `apps/mobile/src/components/ui/index.ts`
- Test: `apps/mobile/src/components/ui/__tests__/primitives.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, fireEvent } from '@testing-library/react-native'
import { Chip } from '../Chip'
import { Avatar } from '../Avatar'

describe('small primitives', () => {
  it('Chip reflects selected state and fires onPress', () => {
    const onPress = jest.fn()
    const { getByRole } = render(<Chip label="All" selected onPress={onPress} />)
    const chip = getByRole('button')
    expect(chip.props.accessibilityState.selected).toBe(true)
    fireEvent.press(chip)
    expect(onPress).toHaveBeenCalled()
  })

  it('Avatar shows the first initial when no image', () => {
    const { getByText } = render(<Avatar name="Aarav" />)
    expect(getByText('A')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run — verify it fails**

```bash
pnpm test src/components/ui/__tests__/primitives.test.tsx
```

Expected: FAIL ("Cannot find module '../Chip'").

- [ ] **Step 3: Implement `IconButton.tsx`**

```tsx
import { Pressable, PressableProps } from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'
import type { PhIcon } from './Icon'

type Variant = 'default' | 'tinted' | 'danger'
type Props = Omit<PressableProps, 'children'> & { icon: PhIcon; variant?: Variant; accessibilityLabel: string }

const styles = StyleSheet.create(theme => ({
  btn: {
    width: 44, height: 44, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center',
    variants: {
      variant: {
        default: { backgroundColor: theme.colors.surfaceAlt },
        tinted: { backgroundColor: theme.colors.primaryTint },
        danger: { backgroundColor: theme.colors.dangerTint },
      },
    },
  },
}))

export function IconButton({ icon: Icon, variant = 'default', accessibilityLabel, ...rest }: Props) {
  styles.useVariants({ variant })
  const c = UnistylesRuntime.getTheme().colors
  const color = variant === 'danger' ? c.dangerText : variant === 'tinted' ? c.accent : c.textSecondary
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={styles.btn} {...rest}>
      <Icon size={20} color={color} weight="regular" />
    </Pressable>
  )
}
```

- [ ] **Step 4: Implement `FAB.tsx`**

```tsx
import { Pressable, PressableProps } from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'
import { Plus } from 'phosphor-react-native'

type Props = Omit<PressableProps, 'children'> & { accessibilityLabel?: string }

const styles = StyleSheet.create(theme => ({
  fab: {
    width: 58, height: 58, borderRadius: theme.radius.xl, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.primary, ...theme.shadow.md,
  },
}))

export function FAB({ accessibilityLabel = 'Add', ...rest }: Props) {
  const c = UnistylesRuntime.getTheme().colors
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={styles.fab} {...rest}>
      <Plus size={28} color={c.onPrimary} weight="bold" />
    </Pressable>
  )
}
```

- [ ] **Step 5: Implement `SearchField.tsx`**

```tsx
import { View, TextInput, TextInputProps } from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'
import { MagnifyingGlass } from 'phosphor-react-native'

const styles = StyleSheet.create(theme => ({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: theme.space.sm,
    backgroundColor: theme.colors.surface, borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: theme.radius.md, paddingHorizontal: 14, minHeight: 48,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, fontFamily: 'HankenGrotesk_400Regular', color: theme.colors.textPrimary },
}))

export function SearchField({ style, ...rest }: TextInputProps) {
  const c = UnistylesRuntime.getTheme().colors
  return (
    <View style={styles.wrap}>
      <MagnifyingGlass size={18} color={c.textMuted} />
      <TextInput placeholderTextColor={c.textMuted} style={[styles.input, style]} {...rest} />
    </View>
  )
}
```

- [ ] **Step 6: Implement `Chip.tsx`**

```tsx
import { Pressable } from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'
import { CheckCircle } from 'phosphor-react-native'
import { Text } from './Text'

type Props = { label: string; selected?: boolean; onPress?: () => void }

const styles = StyleSheet.create(theme => ({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: theme.radius.pill, borderWidth: 1.5,
    variants: {
      selected: {
        true: { backgroundColor: theme.colors.primaryTint, borderColor: theme.colors.primary },
        false: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      },
    },
  },
}))

export function Chip({ label, selected = false, onPress }: Props) {
  styles.useVariants({ selected })
  const c = UnistylesRuntime.getTheme().colors
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={styles.chip}>
      {selected ? <CheckCircle size={15} color={c.accent} weight="fill" /> : null}
      <Text variant="caption" style={{ color: selected ? c.accent : c.textSecondary, fontFamily: 'HankenGrotesk_700Bold' }}>{label}</Text>
    </Pressable>
  )
}
```

- [ ] **Step 7: Implement `Tag.tsx`**

```tsx
import { View } from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'
import { Text } from './Text'
import type { PhIcon } from './Icon'

type ModuleKey = 'today' | 'timeline' | 'vault' | 'activities' | 'family'
type Props = { label: string; module: ModuleKey; icon?: PhIcon }

const styles = StyleSheet.create(theme => ({
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 5, paddingHorizontal: 11, borderRadius: theme.radius.pill, alignSelf: 'flex-start',
    variants: {
      module: {
        today: { backgroundColor: theme.colors.modules.today.tint },
        timeline: { backgroundColor: theme.colors.modules.timeline.tint },
        vault: { backgroundColor: theme.colors.modules.vault.tint },
        activities: { backgroundColor: theme.colors.modules.activities.tint },
        family: { backgroundColor: theme.colors.modules.family.tint },
      },
    },
  },
}))

export function Tag({ label, module, icon: Icon }: Props) {
  styles.useVariants({ module })
  const color = UnistylesRuntime.getTheme().colors.modules[module].text
  return (
    <View style={styles.tag}>
      {Icon ? <Icon size={13} color={color} weight="fill" /> : null}
      <Text variant="label" style={{ color, fontSize: 11, letterSpacing: 0.6 }}>{label.toUpperCase()}</Text>
    </View>
  )
}
```

- [ ] **Step 8: Implement `InfoCard.tsx`**

```tsx
import { View } from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'
import { Text } from './Text'
import type { PhIcon } from './Icon'

type Props = { icon: PhIcon; title: string; subtitle?: string }

const styles = StyleSheet.create(theme => ({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: theme.space.lg,
    backgroundColor: theme.colors.primaryTint, borderColor: theme.colors.primary, borderWidth: 1,
    borderRadius: theme.radius.lg, padding: theme.space.lg,
  },
  iconWrap: { width: 44, height: 44, borderRadius: theme.radius.md, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  mid: { flex: 1 },
}))

export function InfoCard({ icon: Icon, title, subtitle }: Props) {
  const c = UnistylesRuntime.getTheme().colors
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}><Icon size={22} color={c.onPrimary} weight="fill" /></View>
      <View style={styles.mid}>
        <Text variant="bodyEmphasis">{title}</Text>
        {subtitle ? <Text variant="caption" tone="secondary">{subtitle}</Text> : null}
      </View>
    </View>
  )
}
```

- [ ] **Step 9: Implement `Avatar.tsx`**

```tsx
import { View, Image } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { Text } from './Text'

type Props = { name: string; uri?: string; size?: number }

const styles = StyleSheet.create(theme => ({
  base: { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, overflow: 'hidden' },
}))

export function Avatar({ name, uri, size = 40 }: Props) {
  const initial = name.trim().charAt(0).toUpperCase()
  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: size / 2 }]} accessibilityLabel={name}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} />
      ) : (
        <Text variant="bodyEmphasis" tone="onPrimary" style={{ fontFamily: 'HankenGrotesk_800ExtraBold' }}>{initial}</Text>
      )}
    </View>
  )
}
```

- [ ] **Step 10: Create the barrel `index.ts`**

```ts
export { Text } from './Text'
export { Button } from './Button'
export { IconButton } from './IconButton'
export { FAB } from './FAB'
export { TextField } from './TextField'
export { SearchField } from './SearchField'
export { Chip } from './Chip'
export { Tag } from './Tag'
export { StatusChip } from './StatusChip'
export { Card } from './Card'
export { ListRow } from './ListRow'
export { InfoCard } from './InfoCard'
export { Avatar } from './Avatar'
export type { PhIcon } from './Icon'
export { STATUS, type StatusKind } from './status'
```

- [ ] **Step 11: Run the test + typecheck**

```bash
pnpm test src/components/ui/__tests__/primitives.test.tsx && pnpm exec tsc --noEmit
```

Expected: tests PASS; typecheck PASS.

- [ ] **Step 12: Commit**

```bash
git add src/components/ui
git commit -m "feat(ui): IconButton, FAB, SearchField, Chip, Tag, InfoCard, Avatar + barrel"
```

---

## Phase 3 — Signature Composites

Higher-order components in `src/components/shell/` that compose the primitives into LittleArc's recognisable surfaces. These consume the `ui` barrel and the theme. Tests are render/behaviour smoke tests (the Unistyles Jest mock from Task 2.0 supplies real light-theme tokens); colour is verified visually in Phase 4.

### Task 3.1: AppHeader (child switcher + emergency + settings)

**Files:**
- Create: `apps/mobile/src/components/shell/AppHeader.tsx`
- Test: `apps/mobile/src/components/shell/__tests__/AppHeader.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

import { render, fireEvent } from '@testing-library/react-native'
import { AppHeader } from '../AppHeader'

describe('AppHeader', () => {
  it('shows the child name and fires the emergency action', () => {
    const onPressEmergency = jest.fn()
    const { getByText, getByLabelText } = render(
      <AppHeader childName="Aarav" onPressEmergency={onPressEmergency} />,
    )
    expect(getByText('Aarav')).toBeTruthy()
    fireEvent.press(getByLabelText('Emergency information'))
    expect(onPressEmergency).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run — verify it fails**

```bash
pnpm test src/components/shell/__tests__/AppHeader.test.tsx
```

Expected: FAIL ("Cannot find module '../AppHeader'").

- [ ] **Step 3: Implement `AppHeader.tsx`**

```tsx
import { View, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'
import { CaretDown, FirstAid, GearSix } from 'phosphor-react-native'
import { Text } from '../ui/Text'
import { Avatar } from '../ui/Avatar'
import { IconButton } from '../ui/IconButton'

type Props = {
  childName: string
  childAvatarUri?: string
  onPressChild?: () => void
  onPressEmergency?: () => void
  onPressSettings?: () => void
}

const styles = StyleSheet.create(theme => ({
  wrap: { backgroundColor: theme.colors.bg, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md, paddingHorizontal: 16, paddingBottom: 12, minHeight: 56 },
  switcher: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm, flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
}))

export function AppHeader({ childName, childAvatarUri, onPressChild, onPressEmergency, onPressSettings }: Props) {
  const insets = useSafeAreaInsets()
  const c = UnistylesRuntime.getTheme().colors
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 6 }]}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Switch child, current ${childName}`}
          onPress={onPressChild}
          style={styles.switcher}
        >
          <Avatar name={childName} uri={childAvatarUri} size={36} />
          <Text variant="h3" numberOfLines={1}>{childName}</Text>
          <CaretDown size={16} color={c.textMuted} weight="bold" />
        </Pressable>
        <View style={styles.actions}>
          <IconButton icon={FirstAid} variant="danger" accessibilityLabel="Emergency information" onPress={onPressEmergency} />
          <IconButton icon={GearSix} accessibilityLabel="Settings" onPress={onPressSettings} />
        </View>
      </View>
    </View>
  )
}
```

- [ ] **Step 4: Run — verify it passes**

```bash
pnpm test src/components/shell/__tests__/AppHeader.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/shell/AppHeader.tsx src/components/shell/__tests__/AppHeader.test.tsx
git commit -m "feat(shell): AppHeader with child switcher + emergency/settings"
```

### Task 3.2: TabBar (five tabs, active = module accent + fill icon)

Custom bottom tab bar wired to Expo Router's `Tabs` via the `tabBar` prop. Route name → module accent + Phosphor icon.

**Files:**
- Create: `apps/mobile/src/components/shell/TabBar.tsx`
- Test: `apps/mobile/src/components/shell/__tests__/TabBar.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

import { render, fireEvent } from '@testing-library/react-native'
import { TabBar } from '../TabBar'

function makeProps(index: number, navigation: any) {
  return {
    state: {
      index,
      routes: [
        { key: 'today-1', name: 'today' },
        { key: 'vault-1', name: 'vault' },
      ],
    },
    descriptors: {},
    navigation,
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  } as any
}

describe('TabBar', () => {
  it('navigates to a tab on press when not focused', () => {
    const navigation = { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() }
    const { getByLabelText } = render(<TabBar {...makeProps(0, navigation)} />)
    fireEvent.press(getByLabelText('Vault'))
    expect(navigation.navigate).toHaveBeenCalledWith('vault')
  })

  it('marks the focused tab as selected', () => {
    const navigation = { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() }
    const { getByLabelText } = render(<TabBar {...makeProps(0, navigation)} />)
    expect(getByLabelText('Today').props.accessibilityState.selected).toBe(true)
  })
})
```

- [ ] **Step 2: Run — verify it fails**

```bash
pnpm test src/components/shell/__tests__/TabBar.test.tsx
```

Expected: FAIL ("Cannot find module '../TabBar'").

- [ ] **Step 3: Implement `TabBar.tsx`**

```tsx
import { View, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'
import { House, ClockCounterClockwise, Vault, Sparkle, Users } from 'phosphor-react-native'
import { Text } from '../ui/Text'
import type { PhIcon } from '../ui/Icon'

type ModuleKey = 'today' | 'timeline' | 'vault' | 'activities' | 'family'

const TABS: Record<string, { module: ModuleKey; icon: PhIcon; label: string }> = {
  today:      { module: 'today',      icon: House,                 label: 'Today' },
  timeline:   { module: 'timeline',   icon: ClockCounterClockwise, label: 'Timeline' },
  vault:      { module: 'vault',      icon: Vault,                 label: 'Vault' },
  activities: { module: 'activities', icon: Sparkle,               label: 'Activities' },
  family:     { module: 'family',     icon: Users,                 label: 'Family' },
}

const styles = StyleSheet.create(theme => ({
  bar: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 10 },
}))

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const c = UnistylesRuntime.getTheme().colors
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const cfg = TABS[route.name]
        if (!cfg) return null
        const focused = state.index === index
        const color = focused ? c.modules[cfg.module].text : c.textMuted
        const Icon = cfg.icon
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name)
        }
        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={cfg.label}
            onPress={onPress}
            style={styles.tab}
          >
            <Icon size={26} color={color} weight={focused ? 'fill' : 'regular'} />
            <Text variant="label" style={{ color, fontSize: 11, letterSpacing: 0.3 }}>{cfg.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}
```

> Note: `@react-navigation/bottom-tabs` is a transitive dependency of `expo-router`; the `import type` is erased at build/test time. If `tsc` cannot resolve the type, add it explicitly: `pnpm add @react-navigation/bottom-tabs`.

- [ ] **Step 4: Run — verify it passes**

```bash
pnpm test src/components/shell/__tests__/TabBar.test.tsx
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/shell/TabBar.tsx src/components/shell/__tests__/TabBar.test.tsx
git commit -m "feat(shell): custom TabBar with per-module accent + fill icon"
```

### Task 3.3: EmergencyCard (red-topped, offline, narratable)

**Files:**
- Create: `apps/mobile/src/components/shell/EmergencyCard.tsx`
- Test: `apps/mobile/src/components/shell/__tests__/EmergencyCard.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, fireEvent } from '@testing-library/react-native'
import { EmergencyCard } from '../EmergencyCard'

const ped = { name: 'Dr. Rao', role: 'Paediatrician', phone: '+91 90000 00000' }

describe('EmergencyCard', () => {
  it('renders blood group + allergies and calls a contact', () => {
    const onCall = jest.fn()
    const { getByText, getAllByText } = render(
      <EmergencyCard bloodGroup="O+" allergies={['Peanuts']} paediatrician={ped} contacts={[]} onCall={onCall} />,
    )
    expect(getByText('O+')).toBeTruthy()
    expect(getByText('Peanuts')).toBeTruthy()
    fireEvent.press(getAllByText('Call')[0])
    expect(onCall).toHaveBeenCalledWith('+91 90000 00000')
  })

  it('shows a fallback when there are no allergies', () => {
    const { getByText } = render(
      <EmergencyCard bloodGroup="A+" allergies={[]} paediatrician={ped} contacts={[]} />,
    )
    expect(getByText('None recorded')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run — verify it fails**

```bash
pnpm test src/components/shell/__tests__/EmergencyCard.test.tsx
```

Expected: FAIL ("Cannot find module '../EmergencyCard'").

- [ ] **Step 3: Implement `EmergencyCard.tsx`**

```tsx
import { View } from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'
import { Phone, FirstAidKit, Drop, Warning } from 'phosphor-react-native'
import { Text } from '../ui/Text'
import { Button } from '../ui/Button'

type Contact = { name: string; role: string; phone: string }
type Props = {
  bloodGroup: string
  allergies: string[]
  paediatrician: Contact
  contacts: Contact[]
  onCall?: (phone: string) => void
}

const styles = StyleSheet.create(theme => ({
  card: { borderRadius: theme.radius.lg, overflow: 'hidden', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm, backgroundColor: theme.colors.danger, paddingVertical: 12, paddingHorizontal: 16 },
  section: { paddingHorizontal: 16, paddingVertical: 12, gap: 4, borderTopWidth: 1, borderTopColor: theme.colors.border },
  inline: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md, paddingVertical: 8 },
  contactMid: { flex: 1 },
}))

export function EmergencyCard({ bloodGroup, allergies, paediatrician, contacts, onCall }: Props) {
  const c = UnistylesRuntime.getTheme().colors
  const allergyText = allergies.length ? allergies.join(', ') : 'None recorded'
  return (
    <View style={styles.card} accessibilityLabel="Emergency information">
      <View style={styles.header}>
        <Warning size={22} color={c.onDanger} weight="fill" />
        <Text variant="h3" style={{ color: c.onDanger }}>Emergency</Text>
      </View>

      <View style={styles.section} accessibilityLabel={`Blood group ${bloodGroup}`}>
        <View style={styles.inline}>
          <Drop size={18} color={c.dangerText} weight="fill" />
          <Text variant="label" tone="muted">BLOOD GROUP</Text>
        </View>
        <Text variant="h2">{bloodGroup}</Text>
      </View>

      <View style={styles.section} accessibilityLabel={`Allergies: ${allergyText}`}>
        <View style={styles.inline}>
          <Warning size={18} color={c.warningText} weight="fill" />
          <Text variant="label" tone="muted">ALLERGIES</Text>
        </View>
        <Text variant="bodyEmphasis">{allergyText}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.inline}>
          <FirstAidKit size={18} color={c.infoText} weight="fill" />
          <Text variant="label" tone="muted">PAEDIATRICIAN & CONTACTS</Text>
        </View>
        {[paediatrician, ...contacts].map((ct, i) => (
          <View key={`${ct.phone}-${i}`} style={styles.contactRow} accessibilityLabel={`${ct.role}, ${ct.name}, ${ct.phone}`}>
            <View style={styles.contactMid}>
              <Text variant="bodyEmphasis">{ct.name}</Text>
              <Text variant="caption" tone="muted">{ct.role} · {ct.phone}</Text>
            </View>
            <Button label="Call" intent="danger" size="md" leftIcon={Phone} onPress={() => onCall?.(ct.phone)} />
          </View>
        ))}
      </View>
    </View>
  )
}
```

- [ ] **Step 4: Run — verify it passes**

```bash
pnpm test src/components/shell/__tests__/EmergencyCard.test.tsx
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/shell/EmergencyCard.tsx src/components/shell/__tests__/EmergencyCard.test.tsx
git commit -m "feat(shell): offline EmergencyCard (blood group/allergies/contacts)"
```

### Task 3.4: MemoryCard (media + Baloo title + meta)

**Files:**
- Create: `apps/mobile/src/components/shell/MemoryCard.tsx`
- Test: `apps/mobile/src/components/shell/__tests__/MemoryCard.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
jest.mock('expo-image', () => ({ Image: 'Image' }))

import { render } from '@testing-library/react-native'
import { MemoryCard } from '../MemoryCard'

describe('MemoryCard', () => {
  it('renders the title and author meta', () => {
    const { getByText } = render(
      <MemoryCard title="First steps" body="By the sofa" authorName="Meera" timestamp="Today" />,
    )
    expect(getByText('First steps')).toBeTruthy()
    expect(getByText('Meera · Today')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run — verify it fails**

```bash
pnpm test src/components/shell/__tests__/MemoryCard.test.tsx
```

Expected: FAIL ("Cannot find module '../MemoryCard'").

- [ ] **Step 3: Implement `MemoryCard.tsx`**

```tsx
import { View } from 'react-native'
import { Image } from 'expo-image'
import { StyleSheet } from 'react-native-unistyles'
import { Text } from '../ui/Text'
import { Tag } from '../ui/Tag'
import { Avatar } from '../ui/Avatar'
import type { PhIcon } from '../ui/Icon'

type ModuleKey = 'today' | 'timeline' | 'vault' | 'activities' | 'family'
type Props = {
  title: string
  body?: string
  imageUri?: string
  module?: ModuleKey
  moduleLabel?: string
  moduleIcon?: PhIcon
  authorName: string
  timestamp: string
}

const styles = StyleSheet.create(theme => ({
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border, ...theme.shadow.sm },
  media: { width: '100%', height: 200, backgroundColor: theme.colors.surfaceAlt },
  bodyWrap: { padding: theme.space.lg, gap: theme.space.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm, marginTop: theme.space.xs },
  title: { fontFamily: 'Baloo2_600SemiBold' },
}))

export function MemoryCard({ title, body, imageUri, module = 'timeline', moduleLabel, moduleIcon, authorName, timestamp }: Props) {
  return (
    <View style={styles.card}>
      {imageUri ? <Image source={{ uri: imageUri }} style={styles.media} contentFit="cover" accessibilityLabel={title} /> : null}
      <View style={styles.bodyWrap}>
        {moduleLabel ? <Tag label={moduleLabel} module={module} icon={moduleIcon} /> : null}
        <Text variant="h2" style={styles.title}>{title}</Text>
        {body ? <Text variant="body" tone="secondary">{body}</Text> : null}
        <View style={styles.metaRow}>
          <Avatar name={authorName} size={22} />
          <Text variant="caption" tone="muted">{authorName} · {timestamp}</Text>
        </View>
      </View>
    </View>
  )
}
```

- [ ] **Step 4: Run — verify it passes**

```bash
pnpm test src/components/shell/__tests__/MemoryCard.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/shell/MemoryCard.tsx src/components/shell/__tests__/MemoryCard.test.tsx
git commit -m "feat(shell): MemoryCard (media + Baloo 2 title + author meta)"
```

### Task 3.5: CelebrationOverlay (Lottie + haptics, respects reduce-motion)

**Files:**
- Create: `apps/mobile/src/components/shell/CelebrationOverlay.tsx`
- Test: `apps/mobile/src/components/shell/__tests__/CelebrationOverlay.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
}))
jest.mock('lottie-react-native', () => {
  const React = require('react')
  const { View } = require('react-native')
  return { __esModule: true, default: (props: any) => React.createElement(View, props) }
})
jest.mock('../../../lib/a11y', () => ({
  useReduceMotion: jest.fn(() => false),
  DISPLAY_MAX_FONT_SCALE: 1.3,
}))

import { render } from '@testing-library/react-native'
import * as Haptics from 'expo-haptics'
import { useReduceMotion } from '../../../lib/a11y'
import { CelebrationOverlay } from '../CelebrationOverlay'

const src = {}

describe('CelebrationOverlay', () => {
  afterEach(() => (useReduceMotion as jest.Mock).mockReturnValue(false))

  it('plays lottie and fires a success haptic when shown', () => {
    const { getByTestId } = render(<CelebrationOverlay visible title="First steps!" source={src} />)
    expect(getByTestId('celebration-lottie')).toBeTruthy()
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success')
  })

  it('skips lottie under reduce-motion but still shows the title', () => {
    ;(useReduceMotion as jest.Mock).mockReturnValue(true)
    const { queryByTestId, getByText } = render(<CelebrationOverlay visible title="First steps!" source={src} />)
    expect(queryByTestId('celebration-lottie')).toBeNull()
    expect(getByText('First steps!')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run — verify it fails**

```bash
pnpm test src/components/shell/__tests__/CelebrationOverlay.test.tsx
```

Expected: FAIL ("Cannot find module '../CelebrationOverlay'").

- [ ] **Step 3: Implement `CelebrationOverlay.tsx`**

```tsx
import { useEffect } from 'react'
import { View, Modal } from 'react-native'
import type { AnimationObject } from 'lottie-react-native'
import LottieView from 'lottie-react-native'
import * as Haptics from 'expo-haptics'
import { StyleSheet } from 'react-native-unistyles'
import { Text } from '../ui/Text'
import { useReduceMotion } from '../../lib/a11y'

type Props = {
  visible: boolean
  title: string
  source: AnimationObject | { uri: string }
  onDone?: () => void
}

const styles = StyleSheet.create(theme => ({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(19,16,25,0.55)', padding: theme.space['3xl'] },
  card: { alignItems: 'center', gap: theme.space.lg, backgroundColor: theme.colors.surface, borderRadius: theme.radius.xl, padding: theme.space['3xl'], ...theme.shadow.lg },
  lottie: { width: 200, height: 200 },
}))

export function CelebrationOverlay({ visible, title, source, onDone }: Props) {
  const reduce = useReduceMotion()

  useEffect(() => {
    if (visible) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  }, [visible])

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityRole="alert" accessibilityLabel={title}>
          {!reduce ? (
            <LottieView
              testID="celebration-lottie"
              source={source}
              autoPlay
              loop={false}
              style={styles.lottie}
              onAnimationFinish={onDone}
            />
          ) : null}
          <Text variant="display" tone="accent" style={{ textAlign: 'center' }}>{title}</Text>
        </View>
      </View>
    </Modal>
  )
}
```

- [ ] **Step 4: Run — verify it passes**

```bash
pnpm test src/components/shell/__tests__/CelebrationOverlay.test.tsx
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/shell/CelebrationOverlay.tsx src/components/shell/__tests__/CelebrationOverlay.test.tsx
git commit -m "feat(shell): CelebrationOverlay (Lottie + haptics, reduce-motion safe)"
```

---

## Phase 4 — Navigation Shell & Preview Gallery

Wire the primitives and composites into the Expo Router shell so every feature builds inside a consistent frame, then add a dev-only gallery for visual verification of both themes. The root `app/_layout.tsx` (fonts + unistyles + gesture root) already exists from Task 1.4.

### Task 4.1: Tab navigator shell (custom TabBar + AppHeader) + entry redirect

**Files:**
- Create: `apps/mobile/app/index.tsx`
- Create: `apps/mobile/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Create the entry redirect `app/index.tsx`**

```tsx
import { Redirect } from 'expo-router'

export default function Index() {
  return <Redirect href="/today" />
}
```

- [ ] **Step 2: Create `app/(tabs)/_layout.tsx`**

```tsx
import { Tabs, router } from 'expo-router'
import { TabBar } from '../../src/components/shell/TabBar'
import { AppHeader } from '../../src/components/shell/AppHeader'

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={props => <TabBar {...props} />}
      screenOptions={{
        header: () => (
          <AppHeader
            childName="Aarav"
            onPressEmergency={() => router.push('/emergency')}
            onPressSettings={() => {}}
          />
        ),
      }}
    >
      <Tabs.Screen name="today" />
      <Tabs.Screen name="timeline" />
      <Tabs.Screen name="vault" />
      <Tabs.Screen name="activities" />
      <Tabs.Screen name="family" />
    </Tabs>
  )
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: PASS (screens are added in Task 4.2; a temporary "missing default export" runtime warning for the tab routes is fine until then — typecheck itself passes).

- [ ] **Step 4: Commit**

```bash
git add app/index.tsx "app/(tabs)/_layout.tsx"
git commit -m "feat(nav): tab shell with custom TabBar + AppHeader"
```

### Task 4.2: Five tab screens (placeholder content on the shell)

Each screen scrolls on the themed background and demonstrates its module's accent so the shell is visibly correct. Real feature content lands in later feature work.

**Files:**
- Create: `apps/mobile/app/(tabs)/today.tsx`
- Create: `apps/mobile/app/(tabs)/timeline.tsx`
- Create: `apps/mobile/app/(tabs)/vault.tsx`
- Create: `apps/mobile/app/(tabs)/activities.tsx`
- Create: `apps/mobile/app/(tabs)/family.tsx`

- [ ] **Step 1: `today.tsx`**

```tsx
import { ScrollView, View } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { Baby, Syringe } from 'phosphor-react-native'
import { Text, InfoCard, StatusChip } from '../../src/components/ui'

const styles = StyleSheet.create(theme => ({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.space.lg, gap: theme.space.lg },
  row: { flexDirection: 'row', gap: theme.space.sm, flexWrap: 'wrap' },
}))

export default function TodayScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text variant="display">Good morning ☀️</Text>
      <Text variant="body" tone="secondary">Here’s what’s happening with Aarav today.</Text>
      <InfoCard icon={Syringe} title="MMR dose due in 6 days" subtitle="Tap to see the schedule" />
      <View style={styles.row}>
        <StatusChip kind="dueSoon" />
        <StatusChip kind="success" />
      </View>
      <InfoCard icon={Baby} title="14 months old today" subtitle="A new milestone every week" />
    </ScrollView>
  )
}
```

- [ ] **Step 2: `timeline.tsx`**

```tsx
import { ScrollView } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { Camera } from 'phosphor-react-native'
import { Text } from '../../src/components/ui'
import { MemoryCard } from '../../src/components/shell/MemoryCard'

const styles = StyleSheet.create(theme => ({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.space.lg, gap: theme.space.lg },
}))

export default function TimelineScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text variant="h1">Timeline</Text>
      <MemoryCard
        module="timeline"
        moduleLabel="Milestone"
        moduleIcon={Camera}
        title="First steps"
        body="Aarav walked three whole steps by the sofa before the big happy tumble."
        authorName="Meera"
        timestamp="Today · 9:12 AM"
      />
    </ScrollView>
  )
}
```

- [ ] **Step 3: `vault.tsx`**

```tsx
import { ScrollView, View } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { FileText, IdentificationCard, Syringe } from 'phosphor-react-native'
import { Text, SearchField, ListRow, StatusChip, Card } from '../../src/components/ui'

const styles = StyleSheet.create(theme => ({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.space.lg, gap: theme.space.lg },
}))

export default function VaultScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text variant="h1">Vault</Text>
      <SearchField placeholder="Search documents" />
      <Card padded={false}>
        <ListRow module="vault" icon={IdentificationCard} title="Birth certificate" subtitle="PDF · Jun 2" onPress={() => {}} />
        <ListRow module="vault" icon={FileText} title="Aadhaar" subtitle="PDF · Jun 2" onPress={() => {}} />
        <ListRow module="vault" icon={Syringe} title="Vaccination card" subtitle="Updated last week" right={<StatusChip kind="success" />} />
      </Card>
    </ScrollView>
  )
}
```

- [ ] **Step 4: `activities.tsx`**

```tsx
import { ScrollView, View } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { Sparkle, MusicNotes, PuzzlePiece } from 'phosphor-react-native'
import { Text, Tag, Card } from '../../src/components/ui'

const styles = StyleSheet.create(theme => ({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.space.lg, gap: theme.space.lg },
  tags: { flexDirection: 'row', gap: theme.space.sm, flexWrap: 'wrap' },
  cardBody: { gap: theme.space.sm },
}))

export default function ActivitiesScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text variant="h1">Activities</Text>
      <View style={styles.tags}>
        <Tag module="activities" label="Sensory" icon={Sparkle} />
        <Tag module="activities" label="Music" icon={MusicNotes} />
        <Tag module="activities" label="Motor" icon={PuzzlePiece} />
      </View>
      <Card>
        <View style={styles.cardBody}>
          <Text variant="h3">Peek-a-boo</Text>
          <Text variant="body" tone="secondary">Builds object permanence — perfect for 12–18 months.</Text>
        </View>
      </Card>
    </ScrollView>
  )
}
```

- [ ] **Step 5: `family.tsx`**

```tsx
import { ScrollView, View } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { Text, Avatar } from '../../src/components/ui'

const styles = StyleSheet.create(theme => ({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.space.lg, gap: theme.space.lg },
  people: { flexDirection: 'row', gap: theme.space.lg },
  person: { alignItems: 'center', gap: theme.space.xs },
}))

export default function FamilyScreen() {
  const family = ['Meera', 'Arjun', 'Naani']
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text variant="h1">Family</Text>
      <Text variant="body" tone="secondary">Everyone who helps care for Aarav.</Text>
      <View style={styles.people}>
        {family.map(name => (
          <View key={name} style={styles.person}>
            <Avatar name={name} size={56} />
            <Text variant="caption" tone="secondary">{name}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}
```

- [ ] **Step 6: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add "app/(tabs)"
git commit -m "feat(nav): five tab screens on the design-system shell"
```

### Task 4.3: Emergency route

**Files:**
- Create: `apps/mobile/app/emergency.tsx`

- [ ] **Step 1: Implement `emergency.tsx`**

```tsx
import { ScrollView, View, Pressable } from 'react-native'
import { router } from 'expo-router'
import { Linking } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { X } from 'phosphor-react-native'
import { Text } from '../src/components/ui'
import { IconButton } from '../src/components/ui'
import { EmergencyCard } from '../src/components/shell/EmergencyCard'

const styles = StyleSheet.create(theme => ({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.space.lg, gap: theme.space.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
}))

export default function EmergencyScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="h1">Emergency</Text>
        <IconButton icon={X} accessibilityLabel="Close" onPress={() => router.back()} />
      </View>
      <EmergencyCard
        bloodGroup="O+"
        allergies={['Peanuts', 'Penicillin']}
        paediatrician={{ name: 'Dr. Rao', role: 'Paediatrician', phone: '+91 90000 00000' }}
        contacts={[
          { name: 'Meera (Mom)', role: 'Guardian', phone: '+91 90000 11111' },
          { name: 'Arjun (Dad)', role: 'Guardian', phone: '+91 90000 22222' },
        ]}
        onCall={phone => Linking.openURL(`tel:${phone.replace(/\s/g, '')}`)}
      />
    </ScrollView>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/emergency.tsx
git commit -m "feat(nav): offline emergency quick-view route"
```

### Task 4.4: Dev preview gallery + theme toggle

A single screen that renders every primitive and composite in both a light and dark run, with a live theme toggle — the primary visual-verification surface.

**Files:**
- Create: `apps/mobile/app/_dev/gallery.tsx`

- [ ] **Step 1: Implement `_dev/gallery.tsx`**

```tsx
import { ScrollView, View } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { Camera, Bell, IdentificationCard } from 'phosphor-react-native'
import {
  Text, Button, IconButton, FAB, TextField, SearchField,
  Chip, Tag, StatusChip, Card, ListRow, InfoCard, Avatar,
} from '../../src/components/ui'
import { toggleTheme } from '../../src/theme/useAppTheme'

const styles = StyleSheet.create(theme => ({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.space.lg, gap: theme.space['2xl'] },
  section: { gap: theme.space.md },
  row: { flexDirection: 'row', gap: theme.space.sm, flexWrap: 'wrap', alignItems: 'center' },
}))

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="label" tone="muted">{title.toUpperCase()}</Text>
      {children}
    </View>
  )
}

export default function Gallery() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Button label="Toggle light / dark" intent="secondary" onPress={toggleTheme} />

      <Section title="Buttons">
        <View style={styles.row}>
          <Button label="Primary" intent="primary" />
          <Button label="Secondary" intent="secondary" />
          <Button label="Ghost" intent="ghost" />
          <Button label="Danger" intent="danger" />
        </View>
        <View style={styles.row}>
          <IconButton icon={Bell} accessibilityLabel="Notifications" />
          <FAB accessibilityLabel="Add" />
        </View>
      </Section>

      <Section title="Inputs">
        <TextField label="Child’s name" placeholder="Aarav" helper="Shown across the app" />
        <TextField label="Blood group" placeholder="O+" error="Required" />
        <SearchField placeholder="Search" />
      </Section>

      <Section title="Chips · Tags · Status">
        <View style={styles.row}>
          <Chip label="All" selected />
          <Chip label="Docs" />
          <Tag module="vault" label="Vault" icon={IdentificationCard} />
          <Tag module="timeline" label="Milestone" icon={Camera} />
        </View>
        <View style={styles.row}>
          <StatusChip kind="success" />
          <StatusChip kind="dueSoon" />
          <StatusChip kind="overdue" />
          <StatusChip kind="info" />
        </View>
      </Section>

      <Section title="Cards · Rows">
        <InfoCard icon={Bell} title="Next up: MMR dose" subtitle="Due in 6 days" />
        <Card padded={false}>
          <ListRow module="vault" icon={IdentificationCard} title="Birth certificate" subtitle="PDF · Jun 2" onPress={() => {}} />
          <ListRow module="activities" icon={Camera} title="Photo album" subtitle="24 items" right={<StatusChip kind="success" />} />
        </Card>
        <View style={styles.row}>
          <Avatar name="Meera" size={48} />
          <Avatar name="Arjun" size={48} />
        </View>
      </Section>
    </ScrollView>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/_dev/gallery.tsx
git commit -m "chore(dev): component preview gallery with live theme toggle"
```

### Task 4.5: Full-suite + on-device verification (light and dark)

**Files:** none (verification only).

- [ ] **Step 1: Run the whole test suite + typecheck + lint**

```bash
pnpm test && pnpm exec tsc --noEmit && pnpm lint
```

Expected: all tests PASS, no type errors, lint clean.

- [ ] **Step 2: Launch on iOS and Android (New Architecture)**

```bash
pnpm expo run:ios
pnpm expo run:android
```

Expected on each: app launches past splash with fonts applied; no red-box; no Unistyles `configure` crash (this is the Android edge case from design-system.md §14 — if it crashes, that is the risk materialising, capture the stack before changing anything).

- [ ] **Step 3: Manual walkthrough (both platforms)**

Verify, in order:
1. App opens on **Today**; `AppHeader` shows "Aarav" + emergency + settings; custom `TabBar` shows five tabs with **Today** active in violet with a filled icon.
2. Tap through **Timeline / Vault / Activities / Family** — each active tab wears its module accent (coral / blue / mint / sun) with a filled icon; inactive tabs are muted.
3. Tap the emergency button in the header → **emergency** route opens; blood group, allergies, paediatrician and contacts are all legible; VoiceOver/TalkBack reads each row.
4. Open `/_dev/gallery`, tap **Toggle light / dark** — every component flips to the dark theme with no unreadable text and no missing shadows/borders.
5. Enable **Reduce Motion** in OS settings; confirm any celebration surface skips the Lottie and cross-fades instead.
6. Confirm Baloo 2 display text (the "Good morning" greeting, memory title) renders correctly, **including a Devanagari string** if you temporarily set one (design-system.md §14 glyph-coverage risk).

- [ ] **Step 4: Capture evidence**

Screenshot Today, Vault, and the gallery in **both** light and dark; attach to the PR. These are the acceptance artefacts for the design system.

- [ ] **Step 5: Commit any fixes discovered during verification**

```bash
git add -A
git commit -m "fix(ui): on-device polish from light/dark verification"
```

---

## Self-Review (completed by plan author)

**1. Spec coverage vs `docs/core/design-system.md`:**

| Design-system section | Implemented by |
| --- | --- |
| §3 Styling engine (Unistyles v3 + custom) | Phase 0 (Tasks 0.3–0.5), Phase 1 Task 1.5 |
| §4 Theming architecture (light+dark, adaptive + toggle) | Phase 1 Tasks 1.5–1.6 (`unistyles.ts`, `useAppTheme.ts`) |
| §5 Colour (violet ramp, 5 modules, functional, tints) | Phase 1 Tasks 1.1–1.2 (`palette.ts`, `light.ts`, `dark.ts`) |
| §6 Typography (Hanken + Baloo 2 + Noto Devanagari, scale, font-scale clamp) | Phase 1 Task 1.3 + Task 1.4 (fonts) + Task 2.2 (Text) |
| §7 Spacing / radius / elevation | Phase 1 Task 1.1 (`spacing.ts`, `elevation.ts`) |
| §8 Iconography (Phosphor, weights, sizing) | Task 2.1 (`Icon.tsx`/`PhIcon`), used throughout |
| §9 Motion (durations/springs, haptics, reduce-motion) | Task 1.1 (`motion.ts`), Task 1.6 (`useReduceMotion`), Task 3.5 |
| §10 Component inventory (Button, IconButton, FAB, TextField, SearchField, Chip, Tag, StatusChip, Card, ListRow, InfoCard, Avatar) | Phase 2 Tasks 2.1–2.8 |
| §10 Composites (AppHeader, TabBar, EmergencyCard, MemoryCard, CelebrationOverlay) | Phase 3 Tasks 3.1–3.5 |
| §11 Navigation / IA (5 tabs, active accent + fill, emergency in 2 taps) | Phase 4 Tasks 4.1–4.3 |
| §12 Accessibility (colour+icon+label, ≥44pt, screen readers, reduce-motion) | Task 2.3 (`STATUS` map), 44pt targets in every pressable, Task 3.5 |
| §13 Voice & tone | Reflected in copy across Phase 4 screens |
| §14 Risks (Android configure, Baloo Devanagari, versions) | Task 0.6 + Task 4.5 verification steps |

No spec section is left without an implementing task.

**2. Placeholder scan:** No `TBD` / `TODO` / "handle edge cases" / "similar to Task N" left in the plan; every code step contains complete code.

**3. Type consistency:** `PhIcon` (Task 2.1) is the single icon type used by Button (`leftIcon`), IconButton/Tag/ListRow/InfoCard (`icon`), TabBar and MemoryCard. `StatusKind` + `STATUS` (Task 2.3) drive `StatusChip` and are consumed by the same `kind` prop everywhere (`success | dueSoon | overdue | info`). Theme token names (`colors.modules.<key>.{solid,text,tint}`, `primaryTint`, `dangerTint`, `dangerText`, `onDanger`, `onPrimary`, `shadow.{sm,md,lg}`, `space`, `radius`) match the `light.ts`/`dark.ts` definitions in Task 1.2. `Button` uses `label`/`intent`/`size`(`md`|`lg`)/`leftIcon` consistently in EmergencyCard and the gallery. `Text` `variant` values used everywhere are all keys of `typeScale` (`display,h1,h2,h3,body,bodyEmphasis,caption,label`).

---

## Execution Handoff

The plan is complete: **Phase 0** (bootstrap), **Phase 1** (theme foundation), **Phase 2** (12 primitives), **Phase 3** (5 signature composites), **Phase 4** (navigation shell + emergency route + preview gallery), plus on-device light/dark verification. It is TDD-first, uses exact file paths and complete code, and each task ends in a commit.

**Two execution options (per the writing-plans skill):**

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task with two-stage review between tasks (uses `superpowers:subagent-driven-development`). Best for keeping each task's context clean in this greenfield app.
2. **Inline Execution** — execute tasks in-session in batches with checkpoints (uses `superpowers:executing-plans`).

Because bootstrapping scaffolds a brand-new Expo app (a hard, irreversible-ish step), execution should begin only on the user's explicit go-ahead.
