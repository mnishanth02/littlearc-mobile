import { ScrollView } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { Camera } from 'phosphor-react-native'
import { Text } from '../../src/components/ui'
import { MemoryCard } from '../../src/components/shell/MemoryCard'

const styles = StyleSheet.create(theme => ({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.space.lg, gap: theme.space.lg },
}))

export default function TimelineScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text variant="h1">Timeline</Text>
      <MemoryCard
        module="timeline"
        moduleLabel="Milestone"
        moduleIcon={Camera}
        title="First steps"
        body="Aarav walked three whole steps by the sofa before the big happy tumble."
        authorName="Meera"
        timestamp="Today · 9:12 AM"
      />
    </ScrollView>
  )
}
