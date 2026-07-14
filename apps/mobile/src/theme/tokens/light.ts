import { palette as p } from './palette'
import { space, radius } from './spacing'
import { shadowLight } from './elevation'

export const lightTheme = {
  name: 'light',
  colors: {
    bg: p.paper, surface: p.white, surfaceAlt: p.sand, border: p.border,
    textPrimary: p.ink, textSecondary: p.ink2, textMuted: p.ink3,

    primary: p.violet[500], primaryPressed: p.violet[600], onPrimary: p.white,
    accent: p.violet[700], primaryTint: 'rgba(124,92,240,0.12)',

    success: p.mint[500], successText: p.mint[700], successTint: 'rgba(22,190,153,0.16)',
    warning: p.sun[500], warningText: p.sun[700], warningTint: 'rgba(245,166,35,0.18)',
    danger: p.danger[500], dangerText: p.danger[700], dangerTint: 'rgba(229,72,77,0.12)', onDanger: p.white,
    info: p.blue[500], infoText: p.blue[700], infoTint: 'rgba(46,147,222,0.15)',

    modules: {
      today:      { solid: p.violet[500], text: p.violet[700], tint: 'rgba(124,92,240,0.12)' },
      timeline:   { solid: p.coral[500],  text: p.coral[700],  tint: 'rgba(255,115,85,0.16)' },
      vault:      { solid: p.blue[500],   text: p.blue[700],   tint: 'rgba(46,147,222,0.15)' },
      activities: { solid: p.mint[500],   text: p.mint[700],   tint: 'rgba(22,190,153,0.16)' },
      family:     { solid: p.sun[500],    text: p.sun[700],    tint: 'rgba(245,166,35,0.18)' },
    },
  },
  space, radius, shadow: shadowLight,
} as const
