import { fireEvent, render } from '@testing-library/react-native'
import { House } from 'phosphor-react-native'
import { ListRow } from '../ListRow'

describe('ListRow', () => {
  it('renders title + subtitle and fires onPress', async () => {
    const onPress = jest.fn()
    const { getByText, getByRole } = await render(
      <ListRow icon={House} title="Birth certificate" subtitle="PDF · Jun 2" onPress={onPress} />,
    )
    expect(getByText('Birth certificate')).toBeTruthy()
    expect(getByText('PDF · Jun 2')).toBeTruthy()
    await fireEvent.press(getByRole('button'))
    expect(onPress).toHaveBeenCalled()
  })

  it('renders as a non-interactive row when no onPress', async () => {
    const { queryByRole } = await render(<ListRow icon={House} title="Read-only" />)
    expect(queryByRole('button')).toBeNull()
  })
})
