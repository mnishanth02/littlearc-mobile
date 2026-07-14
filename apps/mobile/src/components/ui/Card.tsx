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
      elevated: {
        true: {
          shadowColor: theme.shadow.md.shadowColor,
          shadowOpacity: theme.shadow.md.shadowOpacity,
          shadowRadius: theme.shadow.md.shadowRadius,
          shadowOffset: theme.shadow.md.shadowOffset,
          elevation: theme.shadow.md.elevation,
        },
        false: {},
      },
      padded: {
        true: { padding: theme.space.xl },
        false: {},
      },
    },
  },
}))

export function Card({ elevated = true, padded = true, style, ...rest }: Props) {
  styles.useVariants({ elevated: elevated.toString() as 'true' | 'false', padded: padded.toString() as 'true' | 'false' })
  return <View style={[styles.card, style]} {...rest} />
}
