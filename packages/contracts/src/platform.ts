import { z } from 'zod'

export const platformPingResponseSchema = z.object({
  message: z.string(),
  seededAt: z.iso.datetime(),
  databaseTime: z.iso.datetime(),
  requestId: z.uuid(),
})

export type PlatformPingResponse = z.infer<typeof platformPingResponseSchema>
