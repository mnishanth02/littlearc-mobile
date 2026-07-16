jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success' },
}))
jest.mock('lottie-react-native', () => {
  const React = require('react')
  const { View } = require('react-native')
  return { __esModule: true, default: (props: any) => React.createElement(View, props) }
})
jest.mock('../../../lib/a11y', () => ({
  useReduceMotion: jest.fn(() => false),
  DISPLAY_MAX_FONT_SCALE: 1.3,
}))

import { act, render } from '@testing-library/react-native'
import * as Haptics from 'expo-haptics'
import { useReduceMotion } from '../../../lib/a11y'
import { CelebrationOverlay } from '../CelebrationOverlay'

const src = { uri: 'test.json' }

describe('CelebrationOverlay', () => {
  afterEach(() => {
    ;(useReduceMotion as jest.Mock).mockReturnValue(false)
    jest.useRealTimers()
  })

  it('auto-dismisses under reduce-motion after a short delay', async () => {
    jest.useFakeTimers({ legacyFakeTimers: true })
    ;(useReduceMotion as jest.Mock).mockReturnValue(true)
    const onDone = jest.fn()
    await render(<CelebrationOverlay visible title="First steps!" source={src} onDone={onDone} />)
    expect(onDone).not.toHaveBeenCalled()
    await act(async () => {
      jest.advanceTimersByTime(1800)
    })
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('plays lottie and fires a success haptic when shown', async () => {
    const { getByTestId } = await render(
      <CelebrationOverlay visible title="First steps!" source={src} />,
    )
    expect(getByTestId('celebration-lottie')).toBeTruthy()
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success')
  })

  it('skips lottie under reduce-motion but still shows the title', async () => {
    ;(useReduceMotion as jest.Mock).mockReturnValue(true)
    const { queryByTestId, getByText } = await render(
      <CelebrationOverlay visible title="First steps!" source={src} />,
    )
    expect(queryByTestId('celebration-lottie')).toBeNull()
    expect(getByText('First steps!')).toBeTruthy()
  })
})
