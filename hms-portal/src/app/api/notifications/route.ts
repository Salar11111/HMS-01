import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireActor, withErrorHandling } from "@/server/authz"

export const GET = withErrorHandling(async () => {
  const actor = await requireActor()
  const notifications = await prisma.notification.findMany({
    where: { userId: actor.userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      body: true,
      link: true,
      readAt: true,
      createdAt: true,
    },
  })

  return Response.json({
    unread: notifications.filter(item => item.readAt == null).length,
    notifications,
  })
})

const readSchema = z.object({ id: z.string().min(1) })

export const PATCH = withErrorHandling(async (request: Request) => {
  const actor = await requireActor()
  const body = readSchema.parse(await request.json())

  const updated = await prisma.notification.updateMany({
    where: { id: body.id, userId: actor.userId, readAt: null },
    data: { readAt: new Date() },
  })

  return Response.json({ updated: updated.count })
})
