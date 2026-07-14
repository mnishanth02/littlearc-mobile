import { UnistylesRuntime } from 'react-native-unistyles'
import { toggleTheme } from '../useAppTheme'

jest.mock('react-native-unistyles', () => ({
  UnistylesRuntime: { themeName: 'light', setAdaptiveThemes: jest.fn(), setTheme: jest.fn() },
}))

describe('toggleTheme', () => {
  it('disables adaptive themes and switches to the opposite theme', () => {
    toggleTheme()
    expect(UnistylesRuntime.setAdaptiveThemes).toHaveBeenCalledWith(false)
    expect(UnistylesRuntime.setTheme).toHaveBeenCalledWith('dark')
  })
})
