import { FileText, IdentificationCard, Syringe } from 'phosphor-react-native'
import { ScrollView } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { Card, ListRow, SearchField, StatusChip, Text } from '../../src/components/ui'

const styles = StyleSheet.create((theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.space.lg, gap: theme.space.lg },
}))

export default function VaultScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text variant="h1">Vault</Text>
      <SearchField placeholder="Search documents" />
      <Card padded={false}>
        <ListRow
          module="vault"
          icon={IdentificationCard}
          title="Birth certificate"
          subtitle="PDF · Jun 2"
          onPress={() => {}}
        />
        <ListRow
          module="vault"
          icon={FileText}
          title="Aadhaar"
          subtitle="PDF · Jun 2"
          onPress={() => {}}
        />
        <ListRow
          module="vault"
          icon={Syringe}
          title="Vaccination card"
          subtitle="Updated last week"
          right={<StatusChip kind="success" />}
        />
      </Card>
    </ScrollView>
  )
}
