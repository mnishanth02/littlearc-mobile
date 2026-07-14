import { View, Image } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { Text } from './Text'
import { fonts } from '../../theme/tokens/typography'

type Props = { name: string; uri?: string; size?: number }

const styles = StyleSheet.create(theme => ({
  base: { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, overflow: 'hidden' },
}))

export function Avatar({ name, uri, size = 40 }: Props) {
  const initial = name.trim().charAt(0).toUpperCase()
  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: size / 2 }]} accessibilityLabel={name}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} />
      ) : (
        <Text variant="bodyEmphasis" tone="onPrimary" style={{ fontFamily: fonts.ui800 }}>{initial}</Text>
      )}
    </View>
  )
}
