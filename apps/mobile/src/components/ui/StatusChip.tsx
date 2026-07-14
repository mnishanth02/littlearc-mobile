import { View } from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'
import { Text } from './Text'
import { STATUS, StatusKind } from './status'

type Props = { kind: StatusKind; label?: string }

const styles = StyleSheet.create(theme => ({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 5, paddingHorizontal: 11, borderRadius: theme.radius.pill,
    alignSelf: 'flex-start',
    variants: {
      tone: {
        success: { backgroundColor: theme.colors.successTint },
        warning: { backgroundColor: theme.colors.warningTint },
        danger: { backgroundColor: theme.colors.dangerTint },
        info: { backgroundColor: theme.colors.infoTint },
      },
    },
  },
}))

export function StatusChip({ kind, label }: Props) {
  const spec = STATUS[kind]
  styles.useVariants({ tone: spec.toneKey })
  const c = UnistylesRuntime.getTheme().colors
  const textColor = { success: c.successText, warning: c.warningText, danger: c.dangerText, info: c.infoText }[spec.toneKey]
  const Icon = spec.icon
  const text = label ?? spec.defaultLabel
  return (
    <View style={styles.chip} accessibilityRole="text" accessibilityLabel={text}>
      <Icon size={14} color={textColor} weight="fill" />
      <Text variant="caption" style={{ color: textColor, fontFamily: 'HankenGrotesk_700Bold' }}>{text}</Text>
    </View>
  )
}
