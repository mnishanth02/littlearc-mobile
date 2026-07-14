import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Redirect } from 'expo-router'
import { StyleSheet } from 'react-native-unistyles'
import { Camera, Bell, IdentificationCard } from 'phosphor-react-native'
import {
  Text, Button, IconButton, FAB, TextField, SearchField,
  Chip, Tag, StatusChip, Card, ListRow, InfoCard, Avatar,
} from '../../src/components/ui'
import { toggleTheme } from '../../src/theme/useAppTheme'

const styles = StyleSheet.create(theme => ({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.space.lg, gap: theme.space['2xl'] },
  section: { gap: theme.space.md },
  row: { flexDirection: 'row', gap: theme.space.sm, flexWrap: 'wrap', alignItems: 'center' },
}))

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="label" tone="muted">{title.toUpperCase()}</Text>
      {children}
    </View>
  )
}

export default function Gallery() {
  const insets = useSafeAreaInsets()
  if (!__DEV__) return <Redirect href="/today" />
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}>
      <Button label="Toggle light / dark" intent="secondary" onPress={toggleTheme} />

      <Section title="Buttons">
        <View style={styles.row}>
          <Button label="Primary" intent="primary" />
          <Button label="Secondary" intent="secondary" />
          <Button label="Ghost" intent="ghost" />
          <Button label="Danger" intent="danger" />
        </View>
        <View style={styles.row}>
          <IconButton icon={Bell} accessibilityLabel="Notifications" />
          <FAB accessibilityLabel="Add" />
        </View>
      </Section>

      <Section title="Inputs">
        <TextField label="Child's name" placeholder="Aarav" helper="Shown across the app" />
        <TextField label="Blood group" placeholder="O+" error="Required" />
        <SearchField placeholder="Search" />
      </Section>

      <Section title="Chips · Tags · Status">
        <View style={styles.row}>
          <Chip label="All" selected />
          <Chip label="Docs" />
          <Tag module="vault" label="Vault" icon={IdentificationCard} />
          <Tag module="timeline" label="Milestone" icon={Camera} />
        </View>
        <View style={styles.row}>
          <StatusChip kind="success" />
          <StatusChip kind="dueSoon" />
          <StatusChip kind="overdue" />
          <StatusChip kind="info" />
        </View>
      </Section>

      <Section title="Cards · Rows">
        <InfoCard icon={Bell} title="Next up: MMR dose" subtitle="Due in 6 days" />
        <Card padded={false}>
          <ListRow module="vault" icon={IdentificationCard} title="Birth certificate" subtitle="PDF · Jun 2" onPress={() => {}} />
          <ListRow module="activities" icon={Camera} title="Photo album" subtitle="24 items" right={<StatusChip kind="success" />} />
        </Card>
        <View style={styles.row}>
          <Avatar name="Meera" size={48} />
          <Avatar name="Arjun" size={48} />
        </View>
      </Section>
    </ScrollView>
  )
}
