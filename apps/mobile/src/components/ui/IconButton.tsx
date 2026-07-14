import { Pressable, PressableProps } from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'
import type { PhIcon } from './Icon'

type Variant = 'neutral' | 'tinted' | 'danger'
type Props = Omit<PressableProps, 'children'> & { icon: PhIcon; variant?: Variant; accessibilityLabel: string }

const styles = StyleSheet.create(theme => ({
  btn: {
    width: 44, height: 44, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center',
    variants: {
      variant: {
        neutral: { backgroundColor: theme.colors.surfaceAlt },
        tinted: { backgroundColor: theme.colors.primaryTint },
        danger: { backgroundColor: theme.colors.dangerTint },
      },
    },
  },
}))

export function IconButton({ icon: Icon, variant = 'neutral', accessibilityLabel, ...rest }: Props) {
  styles.useVariants({ variant })
  const c = UnistylesRuntime.getTheme().colors
  const color = variant === 'danger' ? c.dangerText : variant === 'tinted' ? c.accent : c.textSecondary
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={styles.btn} {...rest}>
      <Icon size={20} color={color} weight="regular" />
    </Pressable>
  )
}
