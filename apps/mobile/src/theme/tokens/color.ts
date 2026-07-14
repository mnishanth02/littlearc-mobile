// Convert a #RRGGBB hex to an rgba() string so semantic tints derive from
// palette primitives (single source of truth: retuning a hue updates every tint).
export function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
