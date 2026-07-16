import { useState } from 'react'
import { TextInput, type TextInputProps, View } from 'react-native'
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles'
import { fonts } from '../../theme/tokens/typography'
import { Text } from './Text'

type Props = TextInputProps & { label?: string; helper?: string; error?: string }

const styles = StyleSheet.create((theme) => ({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    minHeight: 48,
    variants: {
      state: {
        rest: { borderColor: theme.colors.border },
        focus: { borderColor: theme.colors.primary },
        error: { borderColor: theme.colors.danger },
      },
    },
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: fonts.ui400,
    color: theme.colors.textPrimary,
  },
}))

export function TextField({ label, helper, error, onFocus, onBlur, style, ...rest }: Props) {
  const [focused, setFocused] = useState(false)
  const state = error ? 'error' : focused ? 'focus' : 'rest'
  styles.useVariants({ state })
  const c = UnistylesRuntime.getTheme().colors
  return (
    <View>
      {label ? (
        <Text
          variant="caption"
          tone="secondary"
          style={{ marginBottom: 6, fontFamily: fonts.ui700 }}
        >
          {label}
        </Text>
      ) : null}
      <View style={styles.field}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={c.textMuted}
          style={[styles.input, style]}
          onFocus={(e) => {
            setFocused(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            onBlur?.(e)
          }}
          {...rest}
        />
      </View>
      {error ? (
        <Text
          variant="caption"
          tone="danger"
          style={{ marginTop: 6 }}
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      ) : helper ? (
        <Text variant="caption" tone="muted" style={{ marginTop: 6 }}>
          {helper}
        </Text>
      ) : null}
    </View>
  )
}
