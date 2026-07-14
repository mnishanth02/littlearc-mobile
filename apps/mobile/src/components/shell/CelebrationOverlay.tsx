import { useEffect } from 'react'
import { View, Modal } from 'react-native'
import type { AnimationObject } from 'lottie-react-native'
import LottieView from 'lottie-react-native'
import * as Haptics from 'expo-haptics'
import { StyleSheet } from 'react-native-unistyles'
import { Text } from '../ui/Text'
import { useReduceMotion } from '../../lib/a11y'

type Props = {
  visible: boolean
  title: string
  source: AnimationObject | { uri: string }
  onDone?: () => void
}

const styles = StyleSheet.create(theme => ({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(19,16,25,0.55)', padding: theme.space['3xl'] },
  card: {
    alignItems: 'center',
    gap: theme.space.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.space['3xl'],
    shadowColor: theme.shadow.lg.shadowColor,
    shadowOpacity: theme.shadow.lg.shadowOpacity,
    shadowRadius: theme.shadow.lg.shadowRadius,
    shadowOffset: theme.shadow.lg.shadowOffset,
    elevation: theme.shadow.lg.elevation,
  },
  lottie: { width: 200, height: 200 },
}))

export function CelebrationOverlay({ visible, title, source, onDone }: Props) {
  const reduce = useReduceMotion()

  useEffect(() => {
    if (!visible) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    if (reduce) {
      const t = setTimeout(() => onDone?.(), 1800)
      return () => clearTimeout(t)
    }
  }, [visible, reduce])

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityRole="alert" accessibilityLabel={title}>
          {!reduce ? (
            <LottieView
              testID="celebration-lottie"
              source={source}
              autoPlay
              loop={false}
              style={styles.lottie}
              onAnimationFinish={onDone}
            />
          ) : null}
          <Text variant="display" tone="accent" style={{ textAlign: 'center' }}>{title}</Text>
        </View>
      </View>
    </Modal>
  )
}
