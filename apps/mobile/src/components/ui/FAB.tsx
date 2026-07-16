import { Plus } from 'phosphor-react-native'
import { Pressable, type PressableProps } from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'

type Props = Omit<PressableProps, 'children'> & { accessibilityLabel?: string }

const styles = StyleSheet.create((theme) => ({
  fab: {
    width: 58,
    height: 58,
    borderRadius: theme.radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    shadowColor: theme.shadow.md.shadowColor,
    shadowOpacity: theme.shadow.md.shadowOpacity,
    shadowRadius: theme.shadow.md.shadowRadius,
    shadowOffset: theme.shadow.md.shadowOffset,
    elevation: theme.shadow.md.elevation,
  },
}))

export function FAB({ accessibilityLabel = 'Add', style, ...rest }: Props) {
  const c = UnistylesRuntime.getTheme().colors
  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={(state) => [styles.fab, typeof style === 'function' ? style(state) : style]}
    >
      <Plus size={28} color={c.onPrimary} weight="bold" />
    </Pressable>
  )
}
