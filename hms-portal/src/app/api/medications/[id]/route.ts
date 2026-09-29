import { prisma } from "@/lib/prisma"
import {
  ConflictError,
  recordAudit,
  requireRole,
  withErrorHandling,
} from "@/server/authz"

type Context = { params: Promise<{ id: string }> }

/**
 * MAR entries are part of the legal medication record, so a correction is a
 * void-and-replace rather than a hard delete. The original row is retained with
 * status VOIDED so the trail stays auditable.
 */
export const DELETE = withErrorHandling(async (request: Request, ctx: Context) => {
  const actor = await requireRole("NURSE")
  const { id } = await ctx.params

  const existing = await prisma.medicationAdministration.findUnique({
    where: { id },
    select: { id: true, nurseId: true, drugName: true, dosage: true, status: true },
  })

  if (!existing) {
    return Response.json({ error: "Entry not found" }, { status: 404 })
  }

  if (existing.nurseId !== actor.nurseId && actor.role !== "ADMIN") {
    return Response.json(
      { error: "Only the administering nurse can void this entry" },
      { status: 403 }
    )
  }

  if (existing.status === "VOIDED") {
    throw new ConflictError("This entry has already been voided")
  }

  const voided = await prisma.medicationAdministration.update({
    where: { id },
    data: { status: "VOIDED", notes: "Entry voided and corrected" },
  })

  await recordAudit(
    actor,
    "VOID",
    "MedicationAdministration",
    id,
    { drugName: existing.drugName, dosage: existing.dosage },
    request
  )

  return Response.json({ administration: voided })
})
