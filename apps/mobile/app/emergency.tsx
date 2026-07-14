import { ScrollView, View, Linking } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { StyleSheet } from 'react-native-unistyles'
import { X } from 'phosphor-react-native'
import { Text, IconButton } from '../src/components/ui'
import { EmergencyCard } from '../src/components/shell/EmergencyCard'

const styles = StyleSheet.create(theme => ({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.space.lg, gap: theme.space.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
}))

export default function EmergencyScreen() {
  const insets = useSafeAreaInsets()
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <Text variant="h1">Emergency</Text>
        <IconButton icon={X} accessibilityLabel="Close" onPress={() => router.back()} />
      </View>
      <EmergencyCard
        bloodGroup="O+"
        allergies={['Peanuts', 'Penicillin']}
        paediatrician={{ name: 'Dr. Rao', role: 'Paediatrician', phone: '+91 90000 00000' }}
        contacts={[
          { name: 'Meera (Mom)', role: 'Guardian', phone: '+91 90000 11111' },
          { name: 'Arjun (Dad)', role: 'Guardian', phone: '+91 90000 22222' },
        ]}
        onCall={phone => Linking.openURL(`tel:${phone.replace(/\s/g, '')}`)}
      />
    </ScrollView>
  )
}
