import type { BottomTabBarProps } from 'expo-router/js-tabs'
import { ClockCounterClockwise, House, Sparkle, Users, Vault } from 'phosphor-react-native'
import { Platform, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'
import type { ModuleKey } from '../../theme/tokens/contract'
import type { PhIcon } from '../ui/Icon'
import { Text } from '../ui/Text'

const TABS: Record<string, { module: ModuleKey; icon: PhIcon; label: string }> = {
  today: { module: 'today', icon: House, label: 'Today' },
  timeline: { module: 'timeline', icon: ClockCounterClockwise, label: 'Timeline' },
  vault: { module: 'vault', icon: Vault, label: 'Vault' },
  activities: { module: 'activities', icon: Sparkle, label: 'Activities' },
  family: { module: 'family', icon: Users, label: 'Family' },
}

const styles = StyleSheet.create((theme) => ({
  bar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 10 },
}))

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const c = UnistylesRuntime.getTheme().colors
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}
    >
      {state.routes.map((route, index) => {
        const cfg = TABS[route.name]
        if (!cfg) return null
        const focused = state.index === index
        const color = focused ? c.modules[cfg.module].text : c.textMuted
        const Icon = cfg.icon
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          })
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name)
        }
        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key })
        }
        return (
          <Pressable
            key={route.key}
            accessibilityRole={Platform.select({ ios: 'button', default: 'tab' })}
            accessibilityState={{ selected: focused }}
            accessibilityLabel={
              Platform.OS === 'ios'
                ? `${cfg.label}, tab, ${index + 1} of ${state.routes.length}`
                : cfg.label
            }
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tab}
          >
            <Icon size={26} color={color} weight={focused ? 'fill' : 'regular'} />
            <Text variant="label" style={{ color, fontSize: 11, letterSpacing: 0.3 }}>
              {cfg.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
