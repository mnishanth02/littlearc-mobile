import { palette as p } from './palette'
import { space, radius } from './spacing'
import { shadowNoneSet } from './elevation'
import { hexA } from './color'
import type { Theme } from './contract'

export const darkTheme = {
  name: 'dark',
  colors: {
    bg: p.night, surface: p.nightSurface, surfaceAlt: p.nightSurface2, border: p.nightBorder,
    textPrimary: p.moon, textSecondary: p.moon2, textMuted: p.moon3,

    primary: p.violet[500], primaryPressed: p.violet[600], onPrimary: p.white,
    accent: p.violet[300], primaryTint: hexA(p.violet[300], 0.16),

    success: p.mint[500], successText: p.mint[500], successTint: hexA(p.mint[500], 0.20),
    warning: p.sun[500], warningText: p.sun[500], warningTint: hexA(p.sun[500], 0.22),
    danger: p.danger[300], dangerText: p.danger[300], dangerTint: hexA(p.danger[500], 0.20), onDanger: p.white,
    info: p.blue[500], infoText: p.blue[300], infoTint: hexA(p.blue[500], 0.20),

    modules: {
      today:      { solid: p.violet[500], text: p.violet[300], tint: hexA(p.violet[300], 0.16) },
      timeline:   { solid: p.coral[500],  text: p.coral[300],  tint: hexA(p.coral[500], 0.20) },
      vault:      { solid: p.blue[500],   text: p.blue[300],   tint: hexA(p.blue[500], 0.20) },
      activities: { solid: p.mint[500],   text: p.mint[500],   tint: hexA(p.mint[500], 0.20) },
      family:     { solid: p.sun[500],    text: p.sun[500],    tint: hexA(p.sun[500], 0.22) },
    },
  },
  space, radius, shadow: shadowNoneSet,
} as const satisfies Theme
