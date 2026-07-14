import { ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'
import { CaretRight } from 'phosphor-react-native'
import { Text } from './Text'
import type { PhIcon } from './Icon'

type ModuleKey = 'today' | 'timeline' | 'vault' | 'activities' | 'family'
type Props = {
  icon: PhIcon
  module?: ModuleKey
  title: string
  subtitle?: string
  onPress?: () => void
  right?: ReactNode
}

const styles = StyleSheet.create(theme => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space.lg, paddingVertical: 14, paddingHorizontal: 16, minHeight: 44 },
  iconWrap: {
    width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    variants: {
      module: {
        today: { backgroundColor: theme.colors.modules.today.tint },
        timeline: { backgroundColor: theme.colors.modules.timeline.tint },
        vault: { backgroundColor: theme.colors.modules.vault.tint },
        activities: { backgroundColor: theme.colors.modules.activities.tint },
        family: { backgroundColor: theme.colors.modules.family.tint },
      },
    },
  },
  mid: { flex: 1 },
}))

export function ListRow({ icon: Icon, module = 'vault', title, subtitle, onPress, right }: Props) {
  styles.useVariants({ module })
  const c = UnistylesRuntime.getTheme().colors
  const iconColor = c.modules[module].text
  const body = (
    <View style={styles.row}>
      <View style={styles.iconWrap}><Icon size={21} color={iconColor} weight="fill" /></View>
      <View style={styles.mid}>
        <Text variant="bodyEmphasis">{title}</Text>
        {subtitle ? <Text variant="caption" tone="muted">{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <CaretRight size={18} color={c.textMuted} /> : null)}
    </View>
  )
  if (onPress) return <Pressable accessibilityRole="button" onPress={onPress}>{body}</Pressable>
  return body
}
