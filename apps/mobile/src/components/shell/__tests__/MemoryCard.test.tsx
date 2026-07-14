jest.mock('expo-image', () => ({ Image: 'Image' }))

import { render } from '@testing-library/react-native'
import { MemoryCard } from '../MemoryCard'

describe('MemoryCard', () => {
  it('renders the title and author meta', async () => {
    const { getByText } = await render(
      <MemoryCard title="First steps" body="By the sofa" authorName="Meera" timestamp="Today" />,
    )
    expect(getByText('First steps')).toBeTruthy()
    expect(getByText('Meera · Today')).toBeTruthy()
  })
})
