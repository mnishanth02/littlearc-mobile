import { Text as RNText, TextProps } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { typeScale, TypeVariant } from '../../theme/tokens/typography'
import { DISPLAY_MAX_FONT_SCALE } from '../../lib/a11y'

type Tone = 'primary' | 'secondary' | 'muted' | 'accent' | 'onPrimary' | 'danger' | 'success'
type Props = TextProps & { variant?: TypeVariant; tone?: Tone }

const styles = StyleSheet.create(theme => ({
  text: {
    variants: {
      tone: {
        primary: { color: theme.colors.textPrimary },
        secondary: { color: theme.colors.textSecondary },
        muted: { color: theme.colors.textMuted },
        accent: { color: theme.colors.accent },
        onPrimary: { color: theme.colors.onPrimary },
        danger: { color: theme.colors.dangerText },
        success: { color: theme.colors.successText },
      },
    },
  },
}))

export function Text({ variant = 'body', tone = 'primary', style, maxFontSizeMultiplier, ...rest }: Props) {
  styles.useVariants({ tone })
  const t = typeScale[variant]
  const clamp = variant === 'display' || variant === 'h1' ? DISPLAY_MAX_FONT_SCALE : undefined
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? clamp}
      style={[styles.text, { fontFamily: t.family, fontSize: t.size, lineHeight: t.lineHeight, ...('letterSpacing' in t && { letterSpacing: t.letterSpacing }) }, style]}
      {...rest}
    />
  )
}
