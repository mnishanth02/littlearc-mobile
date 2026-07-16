jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

import { fireEvent, render } from '@testing-library/react-native'
import { AppHeader } from '../AppHeader'

describe('AppHeader', () => {
  it('shows the child name and fires the emergency action', async () => {
    const onPressEmergency = jest.fn()
    const { getByText, getByLabelText } = await render(
      <AppHeader childName="Aarav" onPressEmergency={onPressEmergency} />,
    )
    expect(getByText('Aarav')).toBeTruthy()
    await fireEvent.press(getByLabelText('Emergency information'))
    expect(onPressEmergency).toHaveBeenCalled()
  })
})
