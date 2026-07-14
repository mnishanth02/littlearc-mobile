import { ScrollView, View } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { Sparkle, MusicNotes, PuzzlePiece } from 'phosphor-react-native'
import { Text, Tag, Card } from '../../src/components/ui'

const styles = StyleSheet.create(theme => ({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.space.lg, gap: theme.space.lg },
  tags: { flexDirection: 'row', gap: theme.space.sm, flexWrap: 'wrap' },
  cardBody: { gap: theme.space.sm },
}))

export default function ActivitiesScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text variant="h1">Activities</Text>
      <View style={styles.tags}>
        <Tag module="activities" label="Sensory" icon={Sparkle} />
        <Tag module="activities" label="Music" icon={MusicNotes} />
        <Tag module="activities" label="Motor" icon={PuzzlePiece} />
      </View>
      <Card>
        <View style={styles.cardBody}>
          <Text variant="h3">Peek-a-boo</Text>
          <Text variant="body" tone="secondary">Builds object permanence — perfect for 12–18 months.</Text>
        </View>
      </Card>
    </ScrollView>
  )
}
