import { palette as p } from './palette'
import { space, radius } from './spacing'
import { shadowLight } from './elevation'
import { hexA } from './color'
import type { Theme } from './contract'

export const lightTheme = {
  name: 'light',
  colors: {
    bg: p.paper, surface: p.white, surfaceAlt: p.sand, border: p.border,
    textPrimary: p.ink, textSecondary: p.ink2, textMuted: p.ink3,

    primary: p.violet[500], primaryPressed: p.violet[600], onPrimary: p.white,
    accent: p.violet[700], primaryTint: hexA(p.violet[500], 0.12),

    success: p.mint[500], successText: p.mint[700], successTint: hexA(p.mint[500], 0.16),
    warning: p.sun[500], warningText: p.sun[700], warningTint: hexA(p.sun[500], 0.18),
    danger: p.danger[500], dangerText: p.danger[700], dangerTint: hexA(p.danger[500], 0.12), onDanger: p.white,
    info: p.blue[500], infoText: p.blue[700], infoTint: hexA(p.blue[500], 0.15),

    modules: {
      today:      { solid: p.violet[500], text: p.violet[700], tint: hexA(p.violet[500], 0.12) },
      timeline:   { solid: p.coral[500],  text: p.coral[700],  tint: hexA(p.coral[500], 0.16) },
      vault:      { solid: p.blue[500],   text: p.blue[700],   tint: hexA(p.blue[500], 0.15) },
      activities: { solid: p.mint[500],   text: p.mint[700],   tint: hexA(p.mint[500], 0.16) },
      family:     { solid: p.sun[500],    text: p.sun[700],    tint: hexA(p.sun[500], 0.18) },
    },
  },
  space, radius, shadow: shadowLight,
} as const satisfies Theme
