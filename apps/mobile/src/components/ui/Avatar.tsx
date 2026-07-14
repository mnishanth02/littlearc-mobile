import { View, Image, StyleProp, ViewStyle } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { Text } from './Text'
import { fonts } from '../../theme/tokens/typography'

type Props = { name: string; uri?: string; size?: number; style?: StyleProp<ViewStyle>; testID?: string }

const styles = StyleSheet.create(theme => ({
  base: { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, overflow: 'hidden' },
}))

export function Avatar({ name, uri, size = 40, style, testID }: Props) {
  const trimmed = name.trim()
  const initial = trimmed ? trimmed.charAt(0).toUpperCase() : '?'
  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: size / 2 }, style]} accessible accessibilityLabel={name} testID={testID}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} />
      ) : (
        <Text variant="bodyEmphasis" tone="onPrimary" style={{ fontFamily: fonts.ui800 }}>{initial}</Text>
      )}
    </View>
  )
}
