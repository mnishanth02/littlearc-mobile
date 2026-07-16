import type { AppRouter } from '@littlearc/api-types'
import { transformer } from '@littlearc/contracts'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createTRPCClient, httpBatchLink, type TRPCLink } from '@trpc/client'
import { createTRPCContext } from '@trpc/tanstack-react-query'
import { useState } from 'react'
import { resolveApiUrl } from './apiUrl'
import { buildRequestHeaders } from './requestHeaders'

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>()

function createDeferredHttpBatchLink(apiUrl?: string): TRPCLink<AppRouter> {
  return (runtime) => {
    let requestLink: ReturnType<TRPCLink<AppRouter>> | undefined

    return (operation) => {
      requestLink ??= httpBatchLink<AppRouter>({
        url: `${apiUrl ?? resolveApiUrl()}/trpc`,
        transformer,
        headers: () => buildRequestHeaders(),
      })(runtime)

      return requestLink(operation)
    }
  }
}

type AppQueryProviderProps = {
  children: React.ReactNode
  apiUrl?: string
}

export function AppQueryProvider({ children, apiUrl }: AppQueryProviderProps) {
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [createDeferredHttpBatchLink(apiUrl)],
    }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  )
}
