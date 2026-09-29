import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireActor, withErrorHandling } from "@/server/authz"
import { notificationPrefsSchema, readNotificationPrefs } from "@/server/preferences"

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  notifications: notificationPrefsSchema,
})

export const GET = withErrorHandling(async () => {
  const actor = await requireActor()
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: actor.userId },
    select: { name: true, email: true, notificationPrefs: true },
  })

  return Response.json({
    name: user.name ?? "",
    email: user.email,
    notifications: readNotificationPrefs(user.notificationPrefs),
  })
})

export const PATCH = withErrorHandling(async (request: Request) => {
  const actor = await requireActor()
  const body = updateSchema.parse(await request.json())

  const user = await prisma.user.update({
    where: { id: actor.userId },
    data: {
      name: body.name,
      notificationPrefs: body.notifications,
    },
    select: { name: true, email: true, notificationPrefs: true },
  })

  return Response.json({
    name: user.name ?? "",
    email: user.email,
    notifications: readNotificationPrefs(user.notificationPrefs),
  })
})
