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
  it('navigates to a tab on press when not focused', async () => {
    const navigation = { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() }
    const { getByLabelText } = await render(<TabBar {...makeProps(0, navigation)} />)
    await fireEvent.press(getByLabelText('Vault', { exact: false }))
    expect(navigation.navigate).toHaveBeenCalledWith('vault')
  })

  it('marks the focused tab as selected', async () => {
    const navigation = { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() }
    const { getByLabelText } = await render(<TabBar {...makeProps(0, navigation)} />)
    expect(getByLabelText('Today', { exact: false }).props.accessibilityState.selected).toBe(true)
  })

  it('does not navigate when pressing the already-focused tab', async () => {
    const navigation = { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() }
    const { getByLabelText } = await render(<TabBar {...makeProps(0, navigation)} />)
    await fireEvent.press(getByLabelText('Today', { exact: false }))
    expect(navigation.navigate).not.toHaveBeenCalled()
  })

  it('does not navigate when the tabPress event is defaultPrevented', async () => {
    const navigation = { emit: jest.fn(() => ({ defaultPrevented: true })), navigate: jest.fn() }
    const { getByLabelText } = await render(<TabBar {...makeProps(0, navigation)} />)
    await fireEvent.press(getByLabelText('Vault', { exact: false }))
    expect(navigation.navigate).not.toHaveBeenCalled()
  })

  it('renders nothing for an unknown route name', async () => {
    const navigation = { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() }
    const props = {
      state: { index: 0, routes: [{ key: 'x-1', name: 'not-a-tab' }] },
      descriptors: {},
      navigation,
      insets: { top: 0, bottom: 0, left: 0, right: 0 },
    } as any
    const { queryByLabelText } = await render(<TabBar {...props} />)
    expect(queryByLabelText('not-a-tab', { exact: false })).toBeNull()
  })
})
