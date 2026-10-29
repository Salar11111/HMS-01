import { prisma } from "@/lib/prisma"
import { assertObjectId, AuthError, recordAudit, requireRole, withErrorHandling } from "@/server/authz"

type Context = { params: Promise<{ id: string }> }

export const DELETE = withErrorHandling(async (request: Request, ctx: Context) => {
  const actor = await requireRole("DOCTOR")
  if (!actor.doctorId) throw new AuthError("Your account is not linked to a doctor profile", 403)
  const { id } = await ctx.params
  assertObjectId(id, "schedule id")

  const existing = await prisma.schedule.findUnique({
    where: { id },
    select: { id: true, doctorId: true },
  })
  if (!existing || existing.doctorId !== actor.doctorId) {
    throw new AuthError("Clinic hour not found", 404)
  }

  await prisma.schedule.delete({ where: { id } })
  await recordAudit(actor, "DELETE", "Schedule", id, null, request)
  return Response.json({ deleted: true })
})
