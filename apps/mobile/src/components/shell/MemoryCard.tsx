import { Image } from 'expo-image'
import { View } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import type { ModuleKey } from '../../theme/tokens/contract'
import { fonts } from '../../theme/tokens/typography'
import { Avatar } from '../ui/Avatar'
import type { PhIcon } from '../ui/Icon'
import { Tag } from '../ui/Tag'
import { Text } from '../ui/Text'

type Props = {
  title: string
  body?: string
  imageUri?: string
  module?: ModuleKey
  moduleLabel?: string
  moduleIcon?: PhIcon
  authorName: string
  timestamp: string
}

const styles = StyleSheet.create((theme) => ({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.shadow.sm.shadowColor,
    shadowOpacity: theme.shadow.sm.shadowOpacity,
    shadowRadius: theme.shadow.sm.shadowRadius,
    shadowOffset: theme.shadow.sm.shadowOffset,
    elevation: theme.shadow.sm.elevation,
  },
  media: { width: '100%', height: 200, backgroundColor: theme.colors.surfaceAlt },
  bodyWrap: { padding: theme.space.lg, gap: theme.space.sm },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    marginTop: theme.space.xs,
  },
  title: { fontFamily: fonts.display600 },
}))

export function MemoryCard({
  title,
  body,
  imageUri,
  module = 'timeline',
  moduleLabel,
  moduleIcon,
  authorName,
  timestamp,
}: Props) {
  return (
    <View style={styles.card}>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.media}
          contentFit="cover"
          accessibilityLabel={title}
        />
      ) : null}
      <View style={styles.bodyWrap}>
        {moduleLabel ? <Tag label={moduleLabel} module={module} icon={moduleIcon} /> : null}
        <Text variant="h2" style={styles.title}>
          {title}
        </Text>
        {body ? (
          <Text variant="body" tone="secondary">
            {body}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <Avatar name={authorName} size={22} />
          <Text variant="caption" tone="muted">
            {authorName} · {timestamp}
          </Text>
        </View>
      </View>
    </View>
  )
}
