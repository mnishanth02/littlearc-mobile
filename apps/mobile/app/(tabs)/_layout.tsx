import { router } from 'expo-router'
import { Tabs } from 'expo-router/js-tabs'
import { AppHeader } from '../../src/components/shell/AppHeader'
import { TabBar } from '../../src/components/shell/TabBar'

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        header: () => (
          <AppHeader
            childName="Aarav"
            onPressEmergency={() => router.push('/emergency')}
            onPressSettings={() => {}}
          />
        ),
      }}
    >
      <Tabs.Screen name="today" />
      <Tabs.Screen name="timeline" />
      <Tabs.Screen name="vault" />
      <Tabs.Screen name="activities" />
      <Tabs.Screen name="family" />
    </Tabs>
  )
}
