import { View, ViewProps } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'

type Props = ViewProps & { elevated?: boolean; padded?: boolean }

const styles = StyleSheet.create(theme => ({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    variants: {
      elevated: { true: theme.shadow.md, false: {} },
      padded: { true: { padding: theme.space.xl }, false: {} },
    },
  },
}))

export function Card({ elevated = true, padded = true, style, ...rest }: Props) {
  styles.useVariants({ elevated, padded })
  return <View style={[styles.card, style]} {...rest} />
}
