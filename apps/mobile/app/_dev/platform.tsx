import { useQuery } from '@tanstack/react-query'
import { Redirect } from 'expo-router'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StyleSheet } from 'react-native-unistyles'
import { Button, Card, Text } from '../../src/components/ui'
import {
  classifyPlatformPingError,
  type PlatformPingErrorKind,
} from '../../src/lib/platformPingError'
import { useTRPC } from '../../src/lib/trpc'

const styles = StyleSheet.create((theme) => ({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.space.lg, gap: theme.space.lg },
  row: { gap: theme.space.sm },
}))

const ERROR_COPY: Record<PlatformPingErrorKind, { title: string; description: string }> = {
  'database-unavailable': {
    title: 'Database unavailable',
    description:
      'The API is reachable but PostgreSQL did not return the seeded platform_probe row. Run `pnpm db:seed` and retry.',
  },
  transport: {
    title: 'Cannot reach the API',
    description:
      'The device could not reach the API. Confirm the API is running and that EXPO_PUBLIC_API_URL (or your dev host) is correct, then retry.',
  },
  unexpected: {
    title: 'Unexpected error',
    description: 'Something unexpected happened. Retry, or check the API server logs.',
  },
}

function PlatformProbeScreen() {
  const insets = useSafeAreaInsets()
  const trpc = useTRPC()
  const pingQuery = useQuery(trpc.platform.ping.queryOptions(undefined, { retry: false }))

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
    >
      <Text variant="h2">Platform vertical-slice probe</Text>

      {pingQuery.isPending ? (
        <Card>
          <Text>Loading...</Text>
        </Card>
      ) : null}

      {pingQuery.isSuccess ? (
        <Card>
          <View style={styles.row}>
            <Text selectable variant="bodyEmphasis">
              {pingQuery.data.message}
            </Text>
            <Text selectable tone="muted">
              Seeded at: {pingQuery.data.seededAt}
            </Text>
            <Text selectable tone="muted">
              Database time: {pingQuery.data.databaseTime}
            </Text>
            <Text selectable tone="muted">
              Request ID: {pingQuery.data.requestId}
            </Text>
          </View>
        </Card>
      ) : null}

      {pingQuery.isError
        ? (() => {
            const kind = classifyPlatformPingError(pingQuery.error)
            const copy = ERROR_COPY[kind]
            return (
              <Card>
                <View style={styles.row}>
                  <Text selectable variant="bodyEmphasis" tone="danger">
                    {copy.title}
                  </Text>
                  <Text selectable tone="muted">
                    {copy.description}
                  </Text>
                  <Button label="Retry" intent="secondary" onPress={() => pingQuery.refetch()} />
                </View>
              </Card>
            )
          })()
        : null}
    </ScrollView>
  )
}

export default function PlatformProbeRoute() {
  if (!__DEV__) return <Redirect href="/today" />
  return <PlatformProbeScreen />
}
