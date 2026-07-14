import { render, fireEvent } from '@testing-library/react-native'
import { Chip } from '../Chip'
import { Avatar } from '../Avatar'

describe('small primitives', () => {
  it('Chip reflects selected state and fires onPress', async () => {
    const onPress = jest.fn()
    const { getByRole } = await render(<Chip label="All" selected onPress={onPress} />)
    const chip = getByRole('button')
    expect(chip.props.accessibilityState.selected).toBe(true)
    await fireEvent.press(chip)
    expect(onPress).toHaveBeenCalled()
  })

  it('Chip reports its unselected state', async () => {
    const { getByRole } = await render(<Chip label="None" onPress={jest.fn()} />)
    expect(getByRole('button').props.accessibilityState.selected).toBe(false)
  })

  it('Avatar shows the first initial when no image', async () => {
    const { getByText } = await render(<Avatar name="Aarav" />)
    expect(getByText('A')).toBeTruthy()
  })
})
