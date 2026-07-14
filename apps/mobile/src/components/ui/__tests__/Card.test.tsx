import { render } from '@testing-library/react-native'
import { Text as RNText } from 'react-native'
import { Card } from '../Card'

describe('Card', () => {
  it('renders its children', async () => {
    const { getByText } = await render(<Card><RNText>Inside</RNText></Card>)
    expect(getByText('Inside')).toBeTruthy()
  })
})
