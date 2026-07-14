import { Pressable, PressableProps, ActivityIndicator } from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'
import { Text } from './Text'
import type { PhIcon } from './Icon'

type Intent = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'lg'
type Props = Omit<PressableProps, 'children'> & {
  label: string
  intent?: Intent
  size?: Size
  leftIcon?: PhIcon
  loading?: boolean
}

const TEXT_TONE: Record<Intent, 'onPrimary' | 'accent' | 'danger'> = {
  primary: 'onPrimary', secondary: 'accent', ghost: 'accent', danger: 'danger',
}

const styles = StyleSheet.create(theme => ({
  base: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.space.sm,
    borderRadius: theme.radius.pill, minHeight: 44,
    variants: {
      intent: {
        primary: {
          backgroundColor: theme.colors.primary,
          shadowColor: theme.shadow.sm.shadowColor,
          shadowOpacity: theme.shadow.sm.shadowOpacity,
          shadowRadius: theme.shadow.sm.shadowRadius,
          shadowOffset: theme.shadow.sm.shadowOffset,
          elevation: theme.shadow.sm.elevation,
        },
        secondary: { backgroundColor: theme.colors.primaryTint },
        ghost: { backgroundColor: 'transparent' },
        danger: { backgroundColor: theme.colors.dangerTint },
      },
      size: {
        md: { paddingVertical: theme.space.md, paddingHorizontal: theme.space.xl },
        lg: { paddingVertical: theme.space.lg, paddingHorizontal: theme.space['2xl'] },
      },
      disabled: { true: { opacity: 0.5 }, false: {} },
    },
  },
}))

export function Button({ label, intent = 'primary', size = 'md', leftIcon: Icon, loading = false, disabled = false, style, ...rest }: Props) {
  const isDisabled = disabled || loading
  styles.useVariants({ intent, size, disabled: isDisabled })
  const c = UnistylesRuntime.getTheme().colors
  const iconColor = intent === 'primary' ? c.onPrimary : intent === 'danger' ? c.dangerText : c.accent
  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        state.pressed && !isDisabled ? { opacity: 0.85 } : null,
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      {loading ? <ActivityIndicator color={iconColor} /> : Icon ? <Icon size={18} color={iconColor} weight="fill" /> : null}
      <Text variant="bodyEmphasis" tone={TEXT_TONE[intent]}>{label}</Text>
    </Pressable>
  )
}
