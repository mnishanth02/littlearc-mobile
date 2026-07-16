# PLAT-08 — One-Call Vertical Slice (Expo → tRPC → Fastify → PostgreSQL) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing Expo Router app to the real Fastify/tRPC/PostgreSQL stack built in `PLAT-05-06-07-api-contracts-types.md`, add a tested API URL resolver and request headers, and build the developer-only `/_dev/platform` route that proves the whole path — Expo → tRPC client → Fastify → PostgreSQL → seeded row → rendered value — works on both iOS and Android, with a real, automated Expo-bundle leak check proving no server-only code crosses into the mobile bundle.

**Architecture:** `apps/mobile/src/lib/trpc.tsx` creates the tRPC + TanStack Query client and exposes `AppQueryProvider`/`useTRPC`; the existing root layout wraps its children with it, unchanged otherwise. A deferred tRPC link resolves the API URL only when the first operation executes, so an unconfigured non-development build does not crash merely by rendering the app shell; the route that actually requests data receives the configuration failure through its query error state. A pure, dependency-injectable `resolveApiUrl()` implements the three-rule precedence from the approved design (explicit override, dev-derived host, fail closed outside development). `apps/mobile/app/_dev/platform.tsx` exports a hook-free `__DEV__` guard and mounts the hook-using query screen only in development, so production rendering cannot initiate the probe request; the screen uses existing design-system components and a pure error-classifier function. A Node script exports the mobile bundle without Hermes bytecode or minification and recursively inspects every emitted JavaScript file for banned server-only identifiers.

**Tech Stack:** `@tanstack/react-query` `5.101.2`, `@trpc/client` `11.18.0`, `@trpc/tanstack-react-query` `11.18.0`, `expo-crypto` (Expo-managed, installed via `npx expo install expo-crypto`), existing Expo SDK `~57.0.4` / React Native `0.86.0` / TypeScript `6.0.3`.

---

## Before you start

This is cluster plan 4 of 6.

Read the exact versioned Expo SDK 57 docs at `https://docs.expo.dev/versions/v57.0.0/` before writing any Expo-related code, per `apps/mobile/AGENTS.md`. `PLAT-05-06-07-api-contracts-types.md` must be fully done first: `apps/api` runs and responds on `http://localhost:3000`, and `docker compose ps` shows PostgreSQL healthy with the `platform_probe` row seeded. Read `docs/impl-plan/M1/README.md` for the shared ports/env/package-name contract.

Start the API before working through this plan's manual steps:

```bash
pnpm --filter @littlearc/api run start
```

Leave it running in a separate terminal (or `pnpm --filter @littlearc/api run dev` for auto-reload).

---

### Task 1: Install mobile dependencies and add `apps/mobile/.env.example`

**Files:**
- Modify: `apps/mobile/package.json`
- Create: `apps/mobile/.env.example`

- [ ] **Step 1: Install the Expo-managed `expo-crypto` module through Expo's own installer**

```bash
cd apps/mobile && npx expo install expo-crypto
```

Expected: `apps/mobile/package.json` gains a new dependency line resembling `"expo-crypto": "~57.0.0"` (Expo's installer resolves the exact version compatible with the pinned SDK — record whatever it writes). `expo-crypto` is the only reliable source of `crypto.randomUUID()`-equivalent behavior on Hermes; React Native does not ship a global Web Crypto implementation, and using it directly would silently fail on-device even though it might appear to work in some tooling.

- [ ] **Step 2: Add the remaining runtime and type-only dependencies**

```bash
pnpm --filter @littlearc/mobile add @tanstack/react-query@5.101.2 @trpc/client@11.18.0 @trpc/tanstack-react-query@11.18.0 @littlearc/contracts@workspace:*
pnpm --filter @littlearc/mobile add -D @littlearc/api-types@workspace:*
```

Expected: both commands exit `0`. `@littlearc/api-types` is a devDependency — mobile only ever imports a type from it, never a runtime value.

- [ ] **Step 3: Create `apps/mobile/.env.example`**

```
# An explicit URL always wins over host derivation and is required outside
# development (see src/lib/apiUrl.ts). Leave blank for iOS simulator/Android
# emulator local development — the dev host is usually derived automatically.
EXPO_PUBLIC_API_URL=

# Used only when EXPO_PUBLIC_API_URL is unset and running in development:
# combined with the Metro dev server's detected host to build
# http://<host>:<port>. Must match apps/api's API_PORT (see root .env.example).
EXPO_PUBLIC_API_PORT=3000
```

Expo only auto-loads `.env` files from the app's own project directory (`apps/mobile/`), not the monorepo root — this is why mobile gets its own `.env.example` separate from the root one created in `PLAT-03-database-local-stack.md`.

- [ ] **Step 4: Create your local, untracked `apps/mobile/.env`**

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Leave both variables blank/default for simulator and emulator development — Task 2's resolver derives the host automatically in that case.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/package.json apps/mobile/.env.example pnpm-lock.yaml
git commit -m "chore: add trpc/tanstack-query/expo-crypto dependencies to apps/mobile"
```

---

### Task 2: Tested API URL resolver

**Files:**
- Create: `apps/mobile/src/lib/apiUrl.ts`
- Test: `apps/mobile/src/lib/__tests__/apiUrl.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { ApiUrlConfigurationError, resolveApiUrl } from '../apiUrl'

describe('resolveApiUrl', () => {
  it('returns an explicit EXPO_PUBLIC_API_URL when set, regardless of dev/prod', () => {
    expect(resolveApiUrl({ isDev: false, explicitUrl: 'https://api.example.com/' })).toBe(
      'https://api.example.com',
    )
  })

  it('derives the host from Expo dev-host metadata in development when no explicit URL is set', () => {
    expect(resolveApiUrl({ isDev: true, hostUri: '192.168.1.23:8081', port: '3000' })).toBe(
      'http://192.168.1.23:3000',
    )
  })

  it('uses the default port 3000 when no port is configured', () => {
    expect(resolveApiUrl({ isDev: true, hostUri: '192.168.1.23:8081' })).toBe(
      'http://192.168.1.23:3000',
    )
  })

  it('throws outside development when no explicit URL is configured', () => {
    expect(() => resolveApiUrl({ isDev: false })).toThrow(ApiUrlConfigurationError)
  })

  it('throws in development when no explicit URL and no dev host are available', () => {
    expect(() => resolveApiUrl({ isDev: true, hostUri: undefined })).toThrow(
      ApiUrlConfigurationError,
    )
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
cd apps/mobile && pnpm exec jest src/lib/__tests__/apiUrl.test.ts
```

Expected: `FAIL` — `Cannot find module '../apiUrl'`.

- [ ] **Step 3: Implement the resolver**

```ts
import Constants from 'expo-constants'

export class ApiUrlConfigurationError extends Error {}

type ResolveApiUrlOptions = {
  isDev?: boolean
  explicitUrl?: string
  hostUri?: string
  port?: string
}

/**
 * Resolves the API base URL following the rules in
 * docs/superpowers/specs/2026-07-14-m1-local-platform-bootstrap-design.md §3.6:
 * 1. An explicit EXPO_PUBLIC_API_URL always wins.
 * 2. In development, derive the host from Expo's dev-host metadata plus the
 *    configured local API port.
 * 3. Outside development, fail clearly when no explicit URL is configured —
 *    never fall back to a production-shaped "success" pointing at localhost.
 */
export function resolveApiUrl(options: ResolveApiUrlOptions = {}): string {
  const isDev = options.isDev ?? __DEV__
  const explicitUrl = options.explicitUrl ?? process.env.EXPO_PUBLIC_API_URL

  if (explicitUrl) {
    return explicitUrl.replace(/\/+$/, '')
  }

  if (!isDev) {
    throw new ApiUrlConfigurationError(
      'EXPO_PUBLIC_API_URL is not set. Non-development builds must configure an explicit API URL.',
    )
  }

  const hostUri = options.hostUri ?? Constants.expoConfig?.hostUri
  if (!hostUri) {
    throw new ApiUrlConfigurationError(
      'EXPO_PUBLIC_API_URL is not set and no development host could be derived from Expo. Set EXPO_PUBLIC_API_URL in apps/mobile/.env.',
    )
  }

  const host = hostUri.split(':')[0]
  const port = options.port ?? process.env.EXPO_PUBLIC_API_PORT ?? '3000'
  return `http://${host}:${port}`
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
cd apps/mobile && pnpm exec jest src/lib/__tests__/apiUrl.test.ts
```

Expected: `PASS`, `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/apiUrl.ts apps/mobile/src/lib/__tests__/apiUrl.test.ts
git commit -m "feat: add tested api url resolver"
```

---

### Task 3: Request headers (platform, version, build, request ID)

**Files:**
- Create: `apps/mobile/src/lib/requestHeaders.ts`
- Test: `apps/mobile/src/lib/__tests__/requestHeaders.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.2.3' }, nativeBuildVersion: '42' },
}))

jest.mock('expo-crypto', () => ({
  randomUUID: () => 'fixed-request-id',
}))

import { buildRequestHeaders } from '../requestHeaders'

describe('buildRequestHeaders', () => {
  it('includes platform, version, build, and a request id', () => {
    const headers = buildRequestHeaders()

    expect(headers['x-app-platform']).toBe('ios')
    expect(headers['x-app-version']).toBe('1.2.3')
    expect(headers['x-app-build']).toBe('42')
    expect(headers['x-request-id']).toBe('fixed-request-id')
  })
})
```

`Platform.OS` reports `'ios'` in this project's Jest environment (`jest-expo`'s default target) — verified by running a throwaway probe test before writing this plan.

- [ ] **Step 2: Run it to confirm it fails**

```bash
cd apps/mobile && pnpm exec jest src/lib/__tests__/requestHeaders.test.ts
```

Expected: `FAIL` — `Cannot find module '../requestHeaders'`.

- [ ] **Step 3: Implement the header builder**

```ts
import Constants from 'expo-constants'
import * as Crypto from 'expo-crypto'
import { Platform } from 'react-native'

export function buildRequestHeaders(): Record<string, string> {
  return {
    'x-app-platform': Platform.OS,
    'x-app-version': Constants.expoConfig?.version ?? 'unknown',
    'x-app-build': String(Constants.nativeBuildVersion ?? Constants.expoConfig?.version ?? 'unknown'),
    'x-request-id': Crypto.randomUUID(),
  }
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
cd apps/mobile && pnpm exec jest src/lib/__tests__/requestHeaders.test.ts
```

Expected: `PASS`, `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/requestHeaders.ts apps/mobile/src/lib/__tests__/requestHeaders.test.ts
git commit -m "feat: add request headers builder (platform/version/build/request-id)"
```

---

### Task 4: tRPC + TanStack Query client and provider

**Files:**
- Modify: `apps/mobile/jest.config.js`
- Create: `apps/mobile/src/lib/trpc.tsx`
- Test: `apps/mobile/src/lib/__tests__/trpc.test.tsx`

- [ ] **Step 0: Allow Jest to transform LittleArc workspace packages**

In `apps/mobile/jest.config.js`, add `@littlearc` to the first `transformIgnorePatterns` allowlist. The resulting array must be:

```js
  transformIgnorePatterns: [
    "/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@shopify|@gorhom|phosphor-react-native|lottie-react-native|@littlearc))",
    "/node_modules/react-native-reanimated/plugin/",
    "/node_modules/@react-native/babel-preset/",
  ],
```

`trpc.tsx` imports the real source-TypeScript `@littlearc/contracts` workspace package at runtime. Explicitly allowlisting `@littlearc` makes the Jest behavior independent of whether the current Jest/pnpm combination resolves the workspace symlink to `packages/contracts` or keeps a `node_modules/@littlearc` path.

- [ ] **Step 1: Write the failing test**

```tsx
import { render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { AppQueryProvider } from '../trpc'

describe('AppQueryProvider', () => {
  const originalDev = global.__DEV__
  const originalApiUrl = process.env.EXPO_PUBLIC_API_URL

  afterEach(() => {
    global.__DEV__ = originalDev
    if (originalApiUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL
    } else {
      process.env.EXPO_PUBLIC_API_URL = originalApiUrl
    }
  })

  it('renders children without throwing, given an explicit apiUrl', () => {
    const { getByText } = render(
      <AppQueryProvider apiUrl="http://localhost:3000">
        <Text>child content</Text>
      </AppQueryProvider>,
    )

    expect(getByText('child content')).toBeTruthy()
  })

  it('does not resolve a missing production API URL until an operation executes', () => {
    global.__DEV__ = false
    delete process.env.EXPO_PUBLIC_API_URL

    const { getByText } = render(
      <AppQueryProvider>
        <Text>release shell</Text>
      </AppQueryProvider>,
    )

    expect(getByText('release shell')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
cd apps/mobile && pnpm exec jest src/lib/__tests__/trpc.test.tsx
```

Expected: `FAIL` — `Cannot find module '../trpc'`.

- [ ] **Step 3: Implement the client and provider**

```tsx
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createTRPCClient, httpBatchLink, type TRPCLink } from '@trpc/client'
import { createTRPCContext } from '@trpc/tanstack-react-query'
import { transformer } from '@littlearc/contracts'
import type { AppRouter } from '@littlearc/api-types'
import { resolveApiUrl } from './apiUrl'
import { buildRequestHeaders } from './requestHeaders'

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>()

function createDeferredHttpBatchLink(apiUrl?: string): TRPCLink<AppRouter> {
  return (runtime) => {
    let requestLink: ReturnType<TRPCLink<AppRouter>> | undefined

    return (operation) => {
      requestLink ??= httpBatchLink<AppRouter>({
        url: `${apiUrl ?? resolveApiUrl()}/trpc`,
        transformer,
        headers: () => buildRequestHeaders(),
      })(runtime)

      return requestLink(operation)
    }
  }
}

type AppQueryProviderProps = {
  children: React.ReactNode
  /** Injectable for tests; production call sites resolve lazily on first operation. */
  apiUrl?: string
}

export function AppQueryProvider({ children, apiUrl }: AppQueryProviderProps) {
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [createDeferredHttpBatchLink(apiUrl)],
    }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  )
}
```

`httpBatchLink` requires a concrete `string | URL`; it does not accept a URL callback. The outer `TRPCLink` above defers constructing `httpBatchLink` until its operation function is called. Therefore `resolveApiUrl()` still fails closed when backend data is requested without production configuration, but rendering the root provider alone cannot crash an otherwise backend-independent app shell.

- [ ] **Step 4: Run the test to confirm it passes**

```bash
cd apps/mobile && pnpm exec jest src/lib/__tests__/trpc.test.tsx
```

Expected: `PASS`, `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/jest.config.js apps/mobile/src/lib/trpc.tsx apps/mobile/src/lib/__tests__/trpc.test.tsx
git commit -m "feat: add trpc + tanstack query client and provider"
```

---

### Task 5: Wire the provider into the root layout

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Add the provider import and wrap the existing tree**

Replace the full contents of `apps/mobile/app/_layout.tsx`:

```tsx
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useFonts, HankenGrotesk_400Regular, HankenGrotesk_500Medium, HankenGrotesk_600SemiBold, HankenGrotesk_700Bold, HankenGrotesk_800ExtraBold } from '@expo-google-fonts/hanken-grotesk'
import { Baloo2_600SemiBold, Baloo2_700Bold } from '@expo-google-fonts/baloo-2'
import { NotoSansDevanagari_400Regular, NotoSansDevanagari_600SemiBold } from '@expo-google-fonts/noto-sans-devanagari'
import { AppQueryProvider } from '../src/lib/trpc'

SplashScreen.preventAutoHideAsync().catch(() => {})

export default function RootLayout() {
  const [loaded, error] = useFonts({
    HankenGrotesk_400Regular, HankenGrotesk_500Medium, HankenGrotesk_600SemiBold, HankenGrotesk_700Bold, HankenGrotesk_800ExtraBold,
    Baloo2_600SemiBold, Baloo2_700Bold,
    NotoSansDevanagari_400Regular, NotoSansDevanagari_600SemiBold,
  })

  // Release the splash on either outcome; if fonts fail we still render (system-font fallback) rather than hang forever.
  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {})
  }, [loaded, error])

  if (!loaded && !error) return null

  return (
    <AppQueryProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }} />
      </GestureHandlerRootView>
    </AppQueryProvider>
  )
}
```

The only change from the pre-existing file is the `AppQueryProvider` import and wrapping it around the existing `GestureHandlerRootView` tree — no design-system, theming, or navigation behavior changes.

- [ ] **Step 2: Run the full mobile test suite to confirm nothing regressed**

```bash
pnpm --filter @littlearc/mobile run test
```

Expected: `Test Suites: 19 passed, 19 total`, `Tests: 43 passed, 43 total` (the 16 pre-existing suites / 35 tests from `PLAT-01-02-MOB-01-workspace-mobile.md`, plus this plan's `apiUrl.test.ts` (5 tests), `requestHeaders.test.ts` (1 test), and `trpc.test.tsx` (2 tests) — `platformPingError.test.ts` from Task 6 has not been added yet at this point in the plan).

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @littlearc/mobile run typecheck
```

Expected: exits `0`.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/_layout.tsx
git commit -m "feat: wire AppQueryProvider into the root layout"
```

---

### Task 6: Platform-ping error classifier

**Files:**
- Create: `apps/mobile/src/lib/platformPingError.ts`
- Test: `apps/mobile/src/lib/__tests__/platformPingError.test.ts`

- [ ] **Step 1: Write the failing test**

This test constructs real `TRPCClientError` instances via the library's own `.from()` factory (verified against the real package) rather than hand-shaping internal fields, so it exercises the same construction path the real client uses.

```ts
import { TRPCClientError } from '@trpc/client'
import { classifyPlatformPingError } from '../platformPingError'

describe('classifyPlatformPingError', () => {
  it('classifies a server INTERNAL_SERVER_ERROR as database-unavailable', () => {
    const error = TRPCClientError.from({
      error: {
        message: 'Something went wrong. Please try again.',
        code: -32603,
        data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500, requestId: 'abc' },
      },
    })

    expect(classifyPlatformPingError(error)).toBe('database-unavailable')
  })

  it('classifies a server NOT_FOUND (unseeded probe row) as database-unavailable', () => {
    const error = TRPCClientError.from({
      error: {
        message: 'Platform probe row is not seeded.',
        code: -32004,
        data: { code: 'NOT_FOUND', httpStatus: 404, requestId: 'abc' },
      },
    })

    expect(classifyPlatformPingError(error)).toBe('database-unavailable')
  })

  it('classifies a network/fetch failure (no server response) as transport', () => {
    const error = TRPCClientError.from(new Error('Network request failed'))

    expect(classifyPlatformPingError(error)).toBe('transport')
  })

  it('classifies a non-TRPCClientError as unexpected', () => {
    expect(classifyPlatformPingError(new Error('some other error'))).toBe('unexpected')
  })

  it('classifies an unrecognized tRPC error code as unexpected', () => {
    const error = TRPCClientError.from({
      error: {
        message: 'Rate limit exceeded, retry in 1 minute',
        code: -32029,
        data: { code: 'TOO_MANY_REQUESTS', httpStatus: 429, requestId: 'abc' },
      },
    })

    expect(classifyPlatformPingError(error)).toBe('unexpected')
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
cd apps/mobile && pnpm exec jest src/lib/__tests__/platformPingError.test.ts
```

Expected: `FAIL` — `Cannot find module '../platformPingError'`.

- [ ] **Step 3: Implement the classifier**

```ts
import { TRPCClientError } from '@trpc/client'
import type { AppRouter } from '@littlearc/api-types'

export type PlatformPingErrorKind = 'database-unavailable' | 'transport' | 'unexpected'

/**
 * The dev-only /_dev/platform route needs to tell three failure shapes apart:
 * - the API responded but PostgreSQL didn't return the expected row (or
 *   failed to answer at all) — NOT_FOUND (unseeded) and INTERNAL_SERVER_ERROR
 *   (real database failure) are both bucketed as "database-unavailable" for
 *   this diagnostic screen's purposes.
 * - the device could not reach the API at all (no HTTP response) — a real
 *   TRPCClientError with no `.data`, confirmed empirically: a network/fetch
 *   failure produces `error.data === undefined`.
 * - anything else is "unexpected".
 */
export function classifyPlatformPingError(error: unknown): PlatformPingErrorKind {
  if (!(error instanceof TRPCClientError)) {
    return 'unexpected'
  }

  const typed = error as TRPCClientError<AppRouter>
  if (!typed.data) {
    return 'transport'
  }

  if (typed.data.code === 'NOT_FOUND' || typed.data.code === 'INTERNAL_SERVER_ERROR') {
    return 'database-unavailable'
  }

  return 'unexpected'
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
cd apps/mobile && pnpm exec jest src/lib/__tests__/platformPingError.test.ts
```

Expected: `PASS`, `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/platformPingError.ts apps/mobile/src/lib/__tests__/platformPingError.test.ts
git commit -m "feat: add platform-ping error classifier"
```

---

### Task 7: The developer-only `/_dev/platform` route

**Files:**
- Create: `apps/mobile/app/_dev/platform.tsx`
- Test: `apps/mobile/app/_dev/__tests__/platform.test.tsx`

The exported route will be a thin guard component with no hooks of its own; all the query/tRPC hooks will live in a separate, dev-only child component that the guard only ever renders when `__DEV__` is true. This is different from the `_dev/gallery.tsx` precedent (which calls its hooks unconditionally before an `if (!__DEV__) return <Redirect />` check) specifically because `gallery.tsx`'s hooks (`useSafeAreaInsets`, `toggleTheme`) are side-effect-free and harmless to call in production, whereas this route's hooks initiate a real network request — so it must never call them at all outside development, not merely discard their result.

- [ ] **Step 1: Write the failing render test**

```tsx
const mockUseTRPC = jest.fn()

jest.mock('../../../src/lib/trpc', () => ({
  useTRPC: () => mockUseTRPC(),
}))

jest.mock('expo-router', () => {
  const { Text } = require('react-native')
  return {
    Redirect: ({ href }: { href: string }) => <Text testID="redirect">{href}</Text>,
  }
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react-native'
import PlatformProbeRoute from '../platform'

describe('PlatformProbeRoute', () => {
  const originalDev = global.__DEV__

  afterEach(() => {
    global.__DEV__ = originalDev
    mockUseTRPC.mockReset()
  })

  it('redirects to /today without ever calling useTRPC when __DEV__ is false', () => {
    global.__DEV__ = false

    const { getByTestId } = render(<PlatformProbeRoute />)

    expect(getByTestId('redirect')).toHaveTextContent('/today')
    expect(mockUseTRPC).not.toHaveBeenCalled()
  })

  it('renders the dev screen (not a redirect) and calls useTRPC when __DEV__ is true', () => {
    global.__DEV__ = true
    mockUseTRPC.mockReturnValue({
      platform: {
        ping: {
          queryOptions: () => ({
            queryKey: ['platform.ping'],
            queryFn: () => new Promise(() => {}), // left pending on purpose — only presence is asserted below
          }),
        },
      },
    })
    const queryClient = new QueryClient()

    const { queryByTestId } = render(
      <QueryClientProvider client={queryClient}>
        <PlatformProbeRoute />
      </QueryClientProvider>,
    )

    expect(queryByTestId('redirect')).toBeNull()
    expect(mockUseTRPC).toHaveBeenCalledTimes(1)
  })
})
```

Save as `apps/mobile/app/_dev/__tests__/platform.test.tsx`.

- [ ] **Step 2: Run it to confirm it fails**

```bash
cd apps/mobile && pnpm exec jest app/_dev/__tests__/platform.test.tsx
```

Expected: `FAIL` — `Cannot find module '../platform'`. This is a genuine red state: `apps/mobile/app/_dev/platform.tsx` does not exist yet.

- [ ] **Step 3: Write the route**

```tsx
import { useQuery } from '@tanstack/react-query'
import { Redirect } from 'expo-router'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StyleSheet } from 'react-native-unistyles'
import { Button, Card, Text } from '../../src/components/ui'
import { classifyPlatformPingError, type PlatformPingErrorKind } from '../../src/lib/platformPingError'
import { useTRPC } from '../../src/lib/trpc'

const styles = StyleSheet.create((theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.space.lg, gap: theme.space.lg },
  row: { gap: theme.space.sm },
}))

const ERROR_COPY: Record<PlatformPingErrorKind, { title: string; description: string }> = {
  'database-unavailable': {
    title: 'Database unavailable',
    description:
      'The API is reachable but PostgreSQL did not return the seeded platform_probe row. Run `pnpm db:seed` and retry.',
  },
  transport: {
    title: 'Cannot reach the API',
    description:
      'The device could not reach the API. Confirm the API is running and that EXPO_PUBLIC_API_URL (or your dev host) is correct, then retry.',
  },
  unexpected: {
    title: 'Unexpected error',
    description: 'Something unexpected happened. Retry, or check the API server logs.',
  },
}

// Only ever mounted by PlatformProbeRoute below when __DEV__ is true — every
// hook here (including the one that fires the real network request) is
// therefore never called in a production render.
function PlatformProbeScreen() {
  const insets = useSafeAreaInsets()
  const trpc = useTRPC()
  const pingQuery = useQuery(trpc.platform.ping.queryOptions(undefined, { retry: false }))

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
    >
      <Text variant="h2">Platform vertical-slice probe</Text>

      {pingQuery.isPending ? (
        <Card>
          <Text>Loading…</Text>
        </Card>
      ) : null}

      {pingQuery.isSuccess ? (
        <Card>
          <View style={styles.row}>
            <Text variant="bodyEmphasis">{pingQuery.data.message}</Text>
            <Text tone="muted">Seeded at: {pingQuery.data.seededAt}</Text>
            <Text tone="muted">Database time: {pingQuery.data.databaseTime}</Text>
            <Text tone="muted">Request ID: {pingQuery.data.requestId}</Text>
          </View>
        </Card>
      ) : null}

      {pingQuery.isError
        ? (() => {
            const kind = classifyPlatformPingError(pingQuery.error)
            const copy = ERROR_COPY[kind]
            return (
              <Card>
                <View style={styles.row}>
                  <Text variant="bodyEmphasis" tone="danger">
                    {copy.title}
                  </Text>
                  <Text tone="muted">{copy.description}</Text>
                  <Button label="Retry" intent="secondary" onPress={() => pingQuery.refetch()} />
                </View>
              </Card>
            )
          })()
        : null}
    </ScrollView>
  )
}

export default function PlatformProbeRoute() {
  if (!__DEV__) return <Redirect href="/today" />
  return <PlatformProbeScreen />
}
```

`retry: false` on the query means TanStack Query never silently retries in the background — recovery only happens through the explicit "Retry" button, per the approved design's requirement that database/transport failures "remain visible and recoverable through an explicit retry action," not retried forever.

- [ ] **Step 4: Run the test to confirm it passes**

```bash
cd apps/mobile && pnpm exec jest app/_dev/__tests__/platform.test.tsx
```

Expected: `PASS`, `2 passed`. If the first test fails with `mockUseTRPC` having been called, the guard/child split from Step 3 is broken — check that `PlatformProbeRoute` has no hooks of its own and only renders `PlatformProbeScreen` after the `__DEV__` check.

- [ ] **Step 5: Confirm the route is absent from production navigation**

```bash
grep -rn "_dev/platform" apps/mobile/src apps/mobile/app/'(tabs)' apps/mobile/app/_layout.tsx
```

Expected: no output (empty) — nothing links to this route from the authenticated app shell or any tab.

- [ ] **Step 6: Typecheck**

```bash
pnpm --filter @littlearc/mobile run typecheck
```

Expected: exits `0`.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/app/_dev/platform.tsx apps/mobile/app/_dev/__tests__/platform.test.tsx
git commit -m "feat: add developer-only /_dev/platform vertical-slice route with a hook-safety render test"
```

---

### Task 8: Automated Expo-bundle leak check

**Files:**
- Create: `apps/mobile/scripts/check-bundle-leak.mjs`
- Modify: `apps/mobile/package.json`

This is the mobile-side half of `PLAT-07`'s boundary proof from `PLAT-05-06-07-api-contracts-types.md` — now that mobile actually imports `@littlearc/contracts` (runtime) and `@littlearc/api-types` (type-only), this check proves the exported bundle contains neither Fastify, Drizzle, `pg`, nor any committed secret value.

- [ ] **Step 1: Write the check script**

```js
#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const BANNED_PATTERNS = [
  'fastify',
  'drizzle-orm',
  'node-postgres',
  'pg-pool',
  'pg-connection-string',
  'DATABASE_URL',
  'POSTGRES_PASSWORD',
]

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const outDir = mkdtempSync(join(tmpdir(), 'littlearc-bundle-leak-'))

try {
  execSync(
    `npx expo export --platform ios --no-bytecode --no-minify --output-dir "${outDir}"`,
    { stdio: 'inherit', cwd: projectRoot },
  )

  // Recursively scan every exported .js file, not just the first one found
  // in one known subdirectory — Metro's default single-bundle-per-platform
  // output is not a guarantee, and a future lazy-loaded route or additional
  // export target could add more .js chunks that must be scanned too.
  const jsFiles = readdirSync(outDir, { recursive: true })
    .filter((entry) => entry.endsWith('.js'))
    .map((entry) => join(outDir, entry))
    .filter((fullPath) => statSync(fullPath).isFile())

  if (jsFiles.length === 0) {
    console.error(`Bundle leak check FAILED: no exported .js files found under ${outDir}. The export step may be broken — investigate before assuming the bundle is clean.`)
    process.exit(1)
  }

  const matches = []
  for (const filePath of jsFiles) {
    const contents = readFileSync(filePath, 'utf8')
    for (const pattern of BANNED_PATTERNS) {
      if (contents.includes(pattern)) {
        matches.push({ file: filePath, pattern })
      }
    }
  }

  if (matches.length > 0) {
    console.error('Bundle leak check FAILED. Found banned identifiers:')
    for (const { file, pattern } of matches) {
      console.error(`  "${pattern}" in ${file}`)
    }
    process.exit(1)
  }

  console.log(
    `Bundle leak check passed: scanned ${jsFiles.length} exported .js file(s), no server-only identifiers found.`,
  )
} finally {
  rmSync(outDir, { recursive: true, force: true })
}
```

- [ ] **Step 2: Add the package script**

In `apps/mobile/package.json`, add:

```json
    "test:bundle-leak": "node scripts/check-bundle-leak.mjs",
```

next to the existing `"test"` script.

- [ ] **Step 3: Run it**

```bash
pnpm --filter @littlearc/mobile run test:bundle-leak
```

Expected: the `expo export` step logs its usual bundling output, then:

```
Bundle leak check passed: scanned 1 exported .js file(s), no server-only identifiers found.
```

exit `0`. The exact file count depends on how many JS chunks Metro produces for this app (currently one, since there is no lazy-loaded route splitting) — the check scans however many actually exist, and fails closed if it finds none at all. If it fails and lists `fastify`, `drizzle-orm`, or similar (with the exact file each was found in), check `apps/mobile/src/lib/trpc.tsx` for an accidental value-level (not type-only) import of `@littlearc/api` or `@littlearc/db` — the only intended imports are the type-only `AppRouter` from `@littlearc/api-types` and the runtime-safe `transformer` from `@littlearc/contracts`.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/scripts/check-bundle-leak.mjs apps/mobile/package.json
git commit -m "feat: add automated expo bundle leak check"
```

---

### Task 9: Manual verification on iOS simulator and Android emulator

**Files:** none — this task is manual verification evidence, per the approved design's "Manual evidence" requirements (§9.2). It cannot be scripted from this environment.

- [ ] **Step 1: Confirm the local stack and API are healthy**

```bash
docker compose ps
curl -s http://localhost:3000/health/ready
```

Expected: all four Compose services `(healthy)`; `/health/ready` returns `{"status":"ok"}`.

- [ ] **Step 2: Run on iOS simulator**

```bash
pnpm --filter @littlearc/mobile exec expo run:ios
```

Expected: the app builds and boots in the iOS Simulator with no New Architecture warnings. Navigate to `/_dev/platform` (e.g. via the URL bar in Expo Dev Tools, or a temporary deep link `littlearc://_dev/platform`).

Expected: the screen shows `Loading…` briefly, then a card with the seeded message `littlearc-platform-bootstrap`, a `Seeded at`, a `Database time`, and a `Request ID`.

- [ ] **Step 3: Run on Android emulator**

```bash
pnpm --filter @littlearc/mobile exec expo run:android
```

Expected: same boot behavior and the same successful `/_dev/platform` result as Step 2, on the Android emulator.

- [ ] **Step 4: Prove the database-unavailable state**

```bash
docker compose stop postgres
```

On the running app, pull down or tap "Retry" on `/_dev/platform`.

Expected: the card now shows **Database unavailable** with the explanatory copy from Task 7, and a **Retry** button — no SQL, connection string, or stack trace is visible anywhere on screen.

- [ ] **Step 5: Restore and confirm recovery**

```bash
docker compose start postgres
docker compose ps postgres
```

Expected: `postgres` returns to `(healthy)`. Tap **Retry** on the device.

Expected: the screen returns to the success state from Step 2/3 without restarting the app.

- [ ] **Step 6: Record evidence**

Capture a screen recording or screenshots of Steps 2, 3, 4, and 5 for the M1 exit evidence required by `PLAT-09-recovery-and-m1-exit.md`.

---

### Task 10: Final full verification

**Files:** none — final verification for this plan.

- [ ] **Step 1: Full mobile test suite**

```bash
pnpm --filter @littlearc/mobile run test
```

Expected: `Test Suites: 21 passed, 21 total`, `Tests: 50 passed, 50 total` (16 pre-existing suites / 35 tests, plus `apiUrl.test.ts` (5), `requestHeaders.test.ts` (1), `trpc.test.tsx` (2), `platformPingError.test.ts` (5), and `platform.test.tsx` (2) added across Tasks 2–7). If your count differs, recount the `describe`/`it` blocks you actually added rather than treating a mismatch as acceptable drift.

- [ ] **Step 2: Full mobile typecheck**

```bash
pnpm --filter @littlearc/mobile run typecheck
```

Expected: exits `0`.

- [ ] **Step 3: Bundle leak check**

```bash
pnpm --filter @littlearc/mobile run test:bundle-leak
```

Expected: exits `0`, prints the pass message from Task 8.

- [ ] **Step 4: Full workspace check from the root**

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm lint
```

Expected: all four exit `0`.

- [ ] **Step 5: Confirm git is clean**

```bash
git status --porcelain
```

Expected: empty.

---

## Evidence required before advancing to `PLAT-04-OBS-02-ci-observability.md`

- [ ] `resolveApiUrl` is proven correct for all three rules — explicit override, dev-derived host, and fail-closed outside development — by automated tests (Task 2).
- [ ] Every request carries `x-app-platform`, `x-app-version`, `x-app-build`, and `x-request-id` headers (Task 3), and the server preserves that request ID into its safe response/error context (already proven server-side in `PLAT-05-06-07-api-contracts-types.md`).
- [ ] `apps/mobile/app/_dev/platform.tsx` is reachable only in development, redirects outside `__DEV__` without ever calling `useTRPC` (proven by an automated render test, Task 7 Steps 1–4), and is absent from production navigation (Task 7 Step 5).
- [ ] `pnpm --filter @littlearc/mobile run test:bundle-leak` exits `0`, proving the exported mobile bundle contains no Fastify, Drizzle, PostgreSQL driver, or secret-bearing identifier (Task 8).
- [ ] The developer route shows the seeded database value on both a real iOS simulator and a real Android emulator (Task 9 Steps 2–3), and shows the designed database-unavailable error state with recovery after a Postgres restart (Task 9 Steps 4–5) — recorded evidence exists for `PLAT-09-recovery-and-m1-exit.md`.
- [ ] The full workspace (`pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, `pnpm lint`) is green from the repo root.
