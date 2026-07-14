import { render } from '@testing-library/react-native'
import { Text } from '../Text'

describe('Text', () => {
  it('renders children with the display font for the display variant', async () => {
    const { getByText } = await render(<Text variant="display">First steps</Text>)
    expect(getByText('First steps')).toHaveStyle({ fontFamily: 'Baloo2_700Bold' })
  })

  it('caps font scaling on display text', async () => {
    const { getByText } = await render(<Text variant="display">Big</Text>)
    expect(getByText('Big').props.maxFontSizeMultiplier).toBe(1.3)
  })
})
