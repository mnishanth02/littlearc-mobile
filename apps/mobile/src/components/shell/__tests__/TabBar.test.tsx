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
    await fireEvent.press(getByLabelText('Vault'))
    expect(navigation.navigate).toHaveBeenCalledWith('vault')
  })

  it('marks the focused tab as selected', async () => {
    const navigation = { emit: jest.fn(() => ({ defaultPrevented: false })), navigate: jest.fn() }
    const { getByLabelText } = await render(<TabBar {...makeProps(0, navigation)} />)
    expect(getByLabelText('Today').props.accessibilityState.selected).toBe(true)
  })
})
