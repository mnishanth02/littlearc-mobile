const mockUseTRPC = jest.fn()
const mockUseQuery = jest.fn()

jest.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
}))

jest.mock('../../../src/lib/trpc', () => ({
  useTRPC: () => mockUseTRPC(),
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))

jest.mock('expo-router', () => {
  const { Text } = require('react-native')
  return {
    Redirect: ({ href }: { href: string }) => <Text testID="redirect">{href}</Text>,
  }
})

import { render } from '@testing-library/react-native'
import PlatformProbeRoute from '../platform'

const runtimeGlobal = globalThis as typeof globalThis & { __DEV__: boolean }

describe('PlatformProbeRoute', () => {
  const originalDev = runtimeGlobal.__DEV__

  afterEach(() => {
    runtimeGlobal.__DEV__ = originalDev
    mockUseTRPC.mockReset()
    mockUseQuery.mockReset()
  })

  it('redirects to /today without ever calling useTRPC when __DEV__ is false', async () => {
    runtimeGlobal.__DEV__ = false

    const { getByTestId, unmount } = await render(<PlatformProbeRoute />)

    expect(getByTestId('redirect')).toHaveTextContent('/today')
    expect(mockUseTRPC).not.toHaveBeenCalled()
    expect(mockUseQuery).not.toHaveBeenCalled()
    await unmount()
  })

  it('renders the dev screen (not a redirect) and calls useTRPC when __DEV__ is true', async () => {
    runtimeGlobal.__DEV__ = true
    mockUseTRPC.mockReturnValue({
      platform: {
        ping: {
          queryOptions: () => ({
            queryKey: ['platform.ping'],
            queryFn: jest.fn(),
          }),
        },
      },
    })
    mockUseQuery.mockReturnValue({
      isPending: true,
      isSuccess: false,
      isError: false,
    })

    const { queryByTestId, unmount } = await render(<PlatformProbeRoute />)

    expect(queryByTestId('redirect')).toBeNull()
    expect(mockUseTRPC).toHaveBeenCalledTimes(1)
    expect(mockUseQuery).toHaveBeenCalledTimes(1)
    await unmount()
  })
})
