import { Pressable, PressableProps } from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'
import { Plus } from 'phosphor-react-native'

type Props = Omit<PressableProps, 'children'> & { accessibilityLabel?: string }

const styles = StyleSheet.create(theme => ({
  fab: {
    width: 58, height: 58, borderRadius: theme.radius.xl, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    shadowColor: theme.shadow.md.shadowColor,
    shadowOpacity: theme.shadow.md.shadowOpacity,
    shadowRadius: theme.shadow.md.shadowRadius,
    shadowOffset: theme.shadow.md.shadowOffset,
    elevation: theme.shadow.md.elevation,
  },
}))

export function FAB({ accessibilityLabel = 'Add', ...rest }: Props) {
  const c = UnistylesRuntime.getTheme().colors
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={styles.fab} {...rest}>
      <Plus size={28} color={c.onPrimary} weight="bold" />
    </Pressable>
  )
}
