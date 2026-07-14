import { View, TextInput, TextInputProps } from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'
import { MagnifyingGlass } from 'phosphor-react-native'
import { fonts } from '../../theme/tokens/typography'

const styles = StyleSheet.create(theme => ({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: theme.space.sm,
    backgroundColor: theme.colors.surface, borderWidth: 1.5, borderColor: theme.colors.border,
    borderRadius: theme.radius.md, paddingHorizontal: 14, minHeight: 48,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, fontFamily: fonts.ui400, color: theme.colors.textPrimary },
}))

export function SearchField({ style, ...rest }: TextInputProps) {
  const c = UnistylesRuntime.getTheme().colors
  return (
    <View style={styles.wrap}>
      <MagnifyingGlass size={18} color={c.textMuted} />
      <TextInput accessibilityLabel="Search" placeholderTextColor={c.textMuted} style={[styles.input, style]} {...rest} />
    </View>
  )
}
