import { Drop, FirstAidKit, Phone, Warning } from 'phosphor-react-native'
import { View } from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'
import { Button } from '../ui/Button'
import { Text } from '../ui/Text'

type Contact = { name: string; role: string; phone: string }
type Props = {
  bloodGroup: string
  allergies: string[]
  paediatrician: Contact
  contacts: Contact[]
  onCall?: (phone: string) => void
}

const styles = StyleSheet.create((theme) => ({
  card: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    backgroundColor: theme.colors.danger,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  inline: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingVertical: 8,
  },
  contactMid: { flex: 1 },
}))

export function EmergencyCard({ bloodGroup, allergies, paediatrician, contacts, onCall }: Props) {
  const c = UnistylesRuntime.getTheme().colors
  const allergyText = allergies.length ? allergies.join(', ') : 'None recorded'
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Warning size={22} color={c.onDanger} weight="fill" />
        <Text variant="h3" style={{ color: c.onDanger }}>
          Emergency
        </Text>
      </View>

      <View style={styles.section} accessible accessibilityLabel={`Blood group ${bloodGroup}`}>
        <View style={styles.inline}>
          <Drop size={18} color={c.dangerText} weight="fill" />
          <Text variant="label" tone="muted">
            BLOOD GROUP
          </Text>
        </View>
        <Text variant="h2">{bloodGroup}</Text>
      </View>

      <View style={styles.section} accessible accessibilityLabel={`Allergies: ${allergyText}`}>
        <View style={styles.inline}>
          <Warning size={18} color={c.warningText} weight="fill" />
          <Text variant="label" tone="muted">
            ALLERGIES
          </Text>
        </View>
        <Text variant="bodyEmphasis">{allergyText}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.inline}>
          <FirstAidKit size={18} color={c.infoText} weight="fill" />
          <Text variant="label" tone="muted">
            PAEDIATRICIAN & CONTACTS
          </Text>
        </View>
        {[paediatrician, ...contacts].map((ct, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: contacts can share the same phone number, so the loop index disambiguates otherwise-identical keys.
          <View key={`${ct.phone}-${i}`} style={styles.contactRow}>
            <View style={styles.contactMid}>
              <Text variant="bodyEmphasis">{ct.name}</Text>
              <Text variant="caption" tone="muted">
                {ct.role} · {ct.phone}
              </Text>
            </View>
            <Button
              label="Call"
              accessibilityLabel={`Call ${ct.name}`}
              intent="danger"
              size="md"
              leftIcon={Phone}
              onPress={() => onCall?.(ct.phone)}
            />
          </View>
        ))}
      </View>
    </View>
  )
}
