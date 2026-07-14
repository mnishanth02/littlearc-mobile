import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

// Clamp font scaling on decorative/display text (design-system.md §6.2).
export const DISPLAY_MAX_FONT_SCALE = 1.3

export function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    let mounted = true
    AccessibilityInfo.isReduceMotionEnabled().then(v => mounted && setReduced(v)).catch(() => {})
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced)
    return () => { mounted = false; sub.remove() }
  }, [])
  return reduced
}
