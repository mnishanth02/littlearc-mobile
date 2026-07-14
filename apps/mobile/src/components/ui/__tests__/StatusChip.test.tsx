import { render } from '@testing-library/react-native'
import { StatusChip } from '../StatusChip'

describe('StatusChip', () => {
  it('shows a text label alongside its icon', async () => {
    const { getByText } = await render(<StatusChip kind="overdue" />)
    expect(getByText('Overdue')).toBeTruthy()
  })

  it('supports a custom label', async () => {
    const { getByText } = await render(<StatusChip kind="dueSoon" label="Due in 6 days" />)
    expect(getByText('Due in 6 days')).toBeTruthy()
  })
})
