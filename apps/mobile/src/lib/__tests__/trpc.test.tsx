import { render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { AppQueryProvider } from '../trpc'

const runtimeGlobal = globalThis as typeof globalThis & { __DEV__: boolean }

describe('AppQueryProvider', () => {
  const originalDev = runtimeGlobal.__DEV__
  const originalApiUrl = process.env.EXPO_PUBLIC_API_URL

  afterEach(() => {
    runtimeGlobal.__DEV__ = originalDev
    if (originalApiUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL
    } else {
      process.env.EXPO_PUBLIC_API_URL = originalApiUrl
    }
  })

  it('renders children without throwing, given an explicit apiUrl', async () => {
    const { getByText } = await render(
      <AppQueryProvider apiUrl="http://localhost:3000">
        <Text>child content</Text>
      </AppQueryProvider>,
    )

    expect(getByText('child content')).toBeTruthy()
  })

  it('does not resolve a missing production API URL until an operation executes', async () => {
    runtimeGlobal.__DEV__ = false
    delete process.env.EXPO_PUBLIC_API_URL

    const { getByText } = await render(
      <AppQueryProvider>
        <Text>release shell</Text>
      </AppQueryProvider>,
    )

    expect(getByText('release shell')).toBeTruthy()
  })
})
