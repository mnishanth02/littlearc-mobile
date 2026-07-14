import { Pressable } from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'
import { CheckCircle } from 'phosphor-react-native'
import { Text } from './Text'
import { fonts } from '../../theme/tokens/typography'

type Props = { label: string; selected?: boolean; onPress?: () => void }

const styles = StyleSheet.create(theme => ({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: theme.radius.pill, borderWidth: 1.5,
    variants: {
      selected: {
        true: { backgroundColor: theme.colors.primaryTint, borderColor: theme.colors.primary },
        false: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      },
    },
  },
}))

export function Chip({ label, selected = false, onPress }: Props) {
  styles.useVariants({ selected })
  const c = UnistylesRuntime.getTheme().colors
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={styles.chip}>
      {selected ? <CheckCircle size={15} color={c.accent} weight="fill" /> : null}
      <Text variant="caption" style={{ color: selected ? c.accent : c.textSecondary, fontFamily: fonts.ui700 }}>{label}</Text>
    </Pressable>
  )
}
