import { View, StyleProp, ViewStyle } from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'
import { Text } from './Text'
import type { PhIcon } from './Icon'

type Props = { icon: PhIcon; title: string; subtitle?: string; style?: StyleProp<ViewStyle>; testID?: string }

const styles = StyleSheet.create(theme => ({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: theme.space.lg,
    backgroundColor: theme.colors.primaryTint, borderColor: theme.colors.primary, borderWidth: 1,
    borderRadius: theme.radius.lg, padding: theme.space.lg,
  },
  iconWrap: { width: 44, height: 44, borderRadius: theme.radius.md, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  mid: { flex: 1 },
}))

export function InfoCard({ icon: Icon, title, subtitle, style, testID }: Props) {
  const c = UnistylesRuntime.getTheme().colors
  return (
    <View style={[styles.card, style]} testID={testID}>
      <View style={styles.iconWrap}><Icon size={22} color={c.onPrimary} weight="fill" /></View>
      <View style={styles.mid}>
        <Text variant="bodyEmphasis">{title}</Text>
        {subtitle ? <Text variant="caption" tone="secondary">{subtitle}</Text> : null}
      </View>
    </View>
  )
}
