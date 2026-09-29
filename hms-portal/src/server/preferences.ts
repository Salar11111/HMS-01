import { z } from "zod"

export const notificationPrefsSchema = z.object({
  appointments: z.boolean(),
  results: z.boolean(),
  messages: z.boolean(),
  billing: z.boolean(),
  marketing: z.boolean(),
})

export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>

export const notificationDefaults: NotificationPrefs = {
  appointments: true,
  results: true,
  messages: true,
  billing: true,
  marketing: false,
}

export function readNotificationPrefs(value: unknown): NotificationPrefs {
  const parsed = notificationPrefsSchema.safeParse(value)
  return parsed.success ? parsed.data : notificationDefaults
}
