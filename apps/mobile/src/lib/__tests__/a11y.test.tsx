import { renderHook, act, waitFor } from '@testing-library/react-native'
import { AccessibilityInfo } from 'react-native'
import { useReduceMotion } from '../a11y'

describe('useReduceMotion', () => {
  it('reflects the initial state, reacts to changes, and unsubscribes on unmount', async () => {
    const remove = jest.fn()
    let changeHandler: ((v: boolean) => void) | undefined
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true)
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockImplementation((_event, handler) => {
        changeHandler = handler as unknown as (v: boolean) => void
        return { remove } as never
      })

    const { result, unmount } = await renderHook(() => useReduceMotion())

    await waitFor(() => expect(result.current).toBe(true))

    await act(async () => {
      changeHandler?.(false)
    })
    expect(result.current).toBe(false)

    await unmount()
    expect(remove).toHaveBeenCalledTimes(1)
  })
})
