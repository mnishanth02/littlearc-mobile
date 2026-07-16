import { fireEvent, render } from '@testing-library/react-native'
import { TextField } from '../TextField'

describe('TextField', () => {
  it('renders a label and forwards typing', async () => {
    const onChangeText = jest.fn()
    const { getByText, getByPlaceholderText } = await render(
      <TextField label="Child's name" placeholder="Aarav" onChangeText={onChangeText} />,
    )
    expect(getByText("Child's name")).toBeTruthy()
    await fireEvent.changeText(getByPlaceholderText('Aarav'), 'Aa')
    expect(onChangeText).toHaveBeenCalledWith('Aa')
  })

  it('shows an error message instead of the helper', async () => {
    const { getByText, queryByText } = await render(
      <TextField helper="Optional" error="Required" placeholder="x" />,
    )
    expect(getByText('Required')).toBeTruthy()
    expect(queryByText('Optional')).toBeNull()
  })
})
