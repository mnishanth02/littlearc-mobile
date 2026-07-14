import { View } from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'
import { Text } from './Text'
import type { PhIcon } from './Icon'

type ModuleKey = 'today' | 'timeline' | 'vault' | 'activities' | 'family'
type Props = { label: string; module: ModuleKey; icon?: PhIcon }

const styles = StyleSheet.create(theme => ({
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 5, paddingHorizontal: 11, borderRadius: theme.radius.pill, alignSelf: 'flex-start',
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
}))

export function Tag({ label, module, icon: Icon }: Props) {
  styles.useVariants({ module })
  const color = UnistylesRuntime.getTheme().colors.modules[module].text
  return (
    <View style={styles.tag}>
      {Icon ? <Icon size={13} color={color} weight="fill" /> : null}
      <Text variant="label" style={{ color, fontSize: 11, letterSpacing: 0.6 }}>{label.toUpperCase()}</Text>
    </View>
  )
}
