import { ScrollView, View } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { Text, Avatar } from '../../src/components/ui'

const styles = StyleSheet.create(theme => ({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.space.lg, gap: theme.space.lg },
  people: { flexDirection: 'row', gap: theme.space.lg },
  person: { alignItems: 'center', gap: theme.space.xs },
}))

export default function FamilyScreen() {
  const family = ['Meera', 'Arjun', 'Naani']
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text variant="h1">Family</Text>
      <Text variant="body" tone="secondary">Everyone who helps care for Aarav.</Text>
      <View style={styles.people}>
        {family.map(name => (
          <View key={name} style={styles.person}>
            <Avatar name={name} size={56} />
            <Text variant="caption" tone="secondary">{name}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}
