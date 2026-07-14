import { palette as p } from './palette'
import { space, radius } from './spacing'
import { shadowNone } from './elevation'

export const darkTheme = {
  name: 'dark',
  colors: {
    bg: p.night, surface: p.nightSurface, surfaceAlt: p.nightSurface2, border: p.nightBorder,
    textPrimary: p.moon, textSecondary: p.moon2, textMuted: p.moon3,

    primary: p.violet[500], primaryPressed: p.violet[600], onPrimary: p.white,
    accent: p.violet[300], primaryTint: 'rgba(176,155,255,0.16)',

    success: p.mint[500], successText: p.mint[500], successTint: 'rgba(22,190,153,0.20)',
    warning: p.sun[500], warningText: p.sun[500], warningTint: 'rgba(245,166,35,0.22)',
    danger: p.danger[300], dangerText: p.danger[300], dangerTint: 'rgba(229,72,77,0.20)', onDanger: p.white,
    info: p.blue[500], infoText: p.blue[300], infoTint: 'rgba(46,147,222,0.20)',

    modules: {
      today:      { solid: p.violet[500], text: p.violet[300], tint: 'rgba(176,155,255,0.16)' },
      timeline:   { solid: p.coral[500],  text: p.coral[300],  tint: 'rgba(255,115,85,0.20)' },
      vault:      { solid: p.blue[500],   text: p.blue[300],   tint: 'rgba(46,147,222,0.20)' },
      activities: { solid: p.mint[500],   text: p.mint[500],   tint: 'rgba(22,190,153,0.20)' },
      family:     { solid: p.sun[500],    text: p.sun[500],    tint: 'rgba(245,166,35,0.22)' },
    },
  },
  space, radius, shadow: { sm: shadowNone, md: shadowNone, lg: shadowNone },
} as const
