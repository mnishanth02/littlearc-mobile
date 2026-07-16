import { Baby, Syringe } from 'phosphor-react-native'
import { ScrollView, View } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { InfoCard, StatusChip, Text } from '../../src/components/ui'

const styles = StyleSheet.create((theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.space.lg, gap: theme.space.lg },
  row: { flexDirection: 'row', gap: theme.space.sm, flexWrap: 'wrap' },
}))

export default function TodayScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text variant="display">Good morning ☀️</Text>
      <Text variant="body" tone="secondary">
        Here's what's happening with Aarav today.
      </Text>
      <InfoCard icon={Syringe} title="MMR dose due in 6 days" subtitle="Tap to see the schedule" />
      <View style={styles.row}>
        <StatusChip kind="dueSoon" />
        <StatusChip kind="success" />
      </View>
      <InfoCard icon={Baby} title="14 months old today" subtitle="A new milestone every week" />
    </ScrollView>
  )
}
