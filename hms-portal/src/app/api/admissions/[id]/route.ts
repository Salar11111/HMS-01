import { prisma } from "@/lib/prisma"
import { assertObjectId, AuthError, ConflictError, recordAudit, requireRole, withErrorHandling } from "@/server/authz"
import { ensureDischargeInvoice } from "@/server/billing"

type Context = { params: Promise<{ id: string }> }

export const PATCH = withErrorHandling(async (request: Request, ctx: Context) => {
  const actor = await requireRole("ADMIN")
  const { id } = await ctx.params
  assertObjectId(id, "admission id")

  const admission = await prisma.$transaction(async (tx) => {
    const existing = await tx.admission.findUnique({
      where: { id },
      select: { id: true, status: true, bedId: true },
    })
    if (!existing) throw new AuthError("Admission not found", 404)
    if (existing.status !== "ADMITTED") throw new ConflictError("This admission is already closed")

    await tx.bed.update({ where: { id: existing.bedId }, data: { isOccupied: false } })
    const updated = await tx.admission.update({
      where: { id },
      data: { status: "DISCHARGED", dischargedAt: new Date() },
    })
    await ensureDischargeInvoice(tx, id)
    return updated
  })

  await recordAudit(actor, "DISCHARGE", "Admission", id, null, request)
  return Response.json({ admission })
})
