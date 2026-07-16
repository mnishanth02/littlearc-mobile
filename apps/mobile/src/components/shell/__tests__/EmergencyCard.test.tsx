import { fireEvent, render } from '@testing-library/react-native'
import { EmergencyCard } from '../EmergencyCard'

const ped = { name: 'Dr. Rao', role: 'Paediatrician', phone: '+91 90000 00000' }

describe('EmergencyCard', () => {
  it('renders blood group + allergies and calls a contact', async () => {
    const onCall = jest.fn()
    const { getByText, getAllByText } = await render(
      <EmergencyCard
        bloodGroup="O+"
        allergies={['Peanuts']}
        paediatrician={ped}
        contacts={[]}
        onCall={onCall}
      />,
    )
    expect(getByText('O+')).toBeTruthy()
    expect(getByText('Peanuts')).toBeTruthy()
    const [callButton] = getAllByText('Call')
    if (!callButton) throw new Error('expected at least one Call button')
    await fireEvent.press(callButton)
    expect(onCall).toHaveBeenCalledWith('+91 90000 00000')
  })

  it('shows a fallback when there are no allergies', async () => {
    const { getByText } = await render(
      <EmergencyCard bloodGroup="A+" allergies={[]} paediatrician={ped} contacts={[]} />,
    )
    expect(getByText('None recorded')).toBeTruthy()
  })

  it('labels each call button and dials the right number', async () => {
    const onCall = jest.fn()
    const contacts = [{ name: 'Meera', role: 'Guardian', phone: '+91 90000 11111' }]
    const { getByLabelText } = await render(
      <EmergencyCard
        bloodGroup="O+"
        allergies={['Peanuts']}
        paediatrician={ped}
        contacts={contacts}
        onCall={onCall}
      />,
    )
    await fireEvent.press(getByLabelText('Call Dr. Rao'))
    expect(onCall).toHaveBeenCalledWith('+91 90000 00000')
    await fireEvent.press(getByLabelText('Call Meera'))
    expect(onCall).toHaveBeenCalledWith('+91 90000 11111')
  })
})
