import { View, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'
import { CaretDown, FirstAid, GearSix } from 'phosphor-react-native'
import { Text } from '../ui/Text'
import { Avatar } from '../ui/Avatar'
import { IconButton } from '../ui/IconButton'

type Props = {
  childName: string
  childAvatarUri?: string
  onPressChild?: () => void
  onPressEmergency?: () => void
  onPressSettings?: () => void
}

const styles = StyleSheet.create(theme => ({
  wrap: { backgroundColor: theme.colors.bg, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md, paddingHorizontal: 16, paddingBottom: 12, minHeight: 56 },
  switcher: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm, flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
}))

export function AppHeader({ childName, childAvatarUri, onPressChild, onPressEmergency, onPressSettings }: Props) {
  const insets = useSafeAreaInsets()
  const c = UnistylesRuntime.getTheme().colors
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 6 }]}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Switch child, current ${childName}`}
          onPress={onPressChild}
          style={styles.switcher}
        >
          <Avatar name={childName} uri={childAvatarUri} size={36} />
          <Text variant="h3" numberOfLines={1}>{childName}</Text>
          <CaretDown size={16} color={c.textMuted} weight="bold" />
        </Pressable>
        <View style={styles.actions}>
          <IconButton icon={FirstAid} variant="danger" accessibilityLabel="Emergency information" onPress={onPressEmergency} />
          <IconButton icon={GearSix} accessibilityLabel="Settings" onPress={onPressSettings} />
        </View>
      </View>
    </View>
  )
}
