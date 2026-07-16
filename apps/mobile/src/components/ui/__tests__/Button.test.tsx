import { fireEvent, render } from '@testing-library/react-native'
import { Button } from '../Button'

describe('Button', () => {
  it('renders its label and fires onPress', async () => {
    const onPress = jest.fn()
    const { getByRole } = await render(<Button label="Add memory" onPress={onPress} />)
    await fireEvent.press(getByRole('button'))
    expect(onPress).toHaveBeenCalled()
  })

  it('is disabled and does not fire when disabled', async () => {
    const onPress = jest.fn()
    const { getByRole } = await render(<Button label="Add" disabled onPress={onPress} />)
    const btn = getByRole('button')
    expect(btn.props.accessibilityState.disabled).toBe(true)
    await fireEvent.press(btn)
    expect(onPress).not.toHaveBeenCalled()
  })

  it('does not fire onPress while loading and reports disabled state', async () => {
    const onPress = jest.fn()
    const { getByRole } = await render(<Button label="Saving" loading onPress={onPress} />)
    const btn = getByRole('button')
    expect(btn.props.accessibilityState.disabled).toBe(true)
    await fireEvent.press(btn)
    expect(onPress).not.toHaveBeenCalled()
  })
})
