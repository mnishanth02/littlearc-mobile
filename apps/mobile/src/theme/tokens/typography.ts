export const fonts = {
  // Hanken Grotesk — UI/body
  ui400: 'HankenGrotesk_400Regular',
  ui500: 'HankenGrotesk_500Medium',
  ui600: 'HankenGrotesk_600SemiBold',
  ui700: 'HankenGrotesk_700Bold',
  ui800: 'HankenGrotesk_800ExtraBold',
  // Baloo 2 — display/emotional (also Devanagari)
  display600: 'Baloo2_600SemiBold',
  display700: 'Baloo2_700Bold',
  // Noto Sans Devanagari — Hindi body
  hi400: 'NotoSansDevanagari_400Regular',
  hi600: 'NotoSansDevanagari_600SemiBold',
} as const

type Variant = { family: string; size: number; lineHeight: number; letterSpacing?: number }

export const typeScale = {
  display: { family: fonts.display700, size: 34, lineHeight: 40 },
  h1: { family: fonts.ui800, size: 24, lineHeight: 30 },
  h2: { family: fonts.ui700, size: 20, lineHeight: 26 },
  h3: { family: fonts.ui600, size: 17, lineHeight: 24 },
  body: { family: fonts.ui400, size: 16, lineHeight: 24 },
  bodyEmphasis: { family: fonts.ui600, size: 16, lineHeight: 24 },
  caption: { family: fonts.ui500, size: 13, lineHeight: 18 },
  label: { family: fonts.ui800, size: 12, lineHeight: 16, letterSpacing: 1.4 },
} satisfies Record<string, Variant>

export type TypeVariant = keyof typeof typeScale
