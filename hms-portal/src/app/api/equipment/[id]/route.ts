import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { assertObjectId, AuthError, recordAudit, requireRole, withErrorHandling } from "@/server/authz"

const serviceSchema = z.object({
  nextMaintenanceAt: z.coerce.date(),
  status: z.enum(["OPERATIONAL", "MAINTENANCE", "RETIRED"]).optional(),
  servicedAt: z.coerce.date().optional(),
})

type Context = { params: Promise<{ id: string }> }

export const PATCH = withErrorHandling(async (request: Request, ctx: Context) => {
  const actor = await requireRole("ADMIN")
  const { id } = await ctx.params
  assertObjectId(id, "equipment id")
  const body = serviceSchema.parse(await request.json())

  const existing = await prisma.equipment.findUnique({
    where: { id },
    select: { id: true, assetTag: true },
  })
  if (!existing) throw new AuthError("Equipment not found", 404)

  const servicedAt = body.servicedAt ?? new Date()
  if (body.nextMaintenanceAt.getTime() <= servicedAt.getTime()) {
    throw new AuthError("Next service must be after the service date", 400)
  }

  const equipment = await prisma.equipment.update({
    where: { id },
    data: {
      lastMaintenanceAt: servicedAt,
      nextMaintenanceAt: body.nextMaintenanceAt,
      status: body.status ?? "OPERATIONAL",
    },
  })

  await recordAudit(
    actor,
    "SERVICE",
    "Equipment",
    id,
    {
      assetTag: existing.assetTag,
      lastMaintenanceAt: servicedAt.toISOString(),
      nextMaintenanceAt: body.nextMaintenanceAt.toISOString(),
      status: equipment.status,
    },
    request,
  )
  return Response.json({ equipment })
})
