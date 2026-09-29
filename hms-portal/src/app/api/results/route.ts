import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { patientScope, scopedPatientFilter } from "@/server/assignment"
import { recordAudit, requireRole, withErrorHandling } from "@/server/authz"

const listSchema = z.object({
  flaggedOnly: z.coerce.boolean().default(false),
  take: z.coerce.number().int().min(1).max(200).default(50),
})

/**
 * Released lab results, projected from completed lab orders.
 *
 * LabOrderItem is the source of truth for a result value because it carries
 * the unit, reference range and abnormal flag that the patient chart needs.
 * Patients are always scoped to their own record; clinical staff may pass
 * patientId to review a specific chart.
 */
export const GET = withErrorHandling(async (request: Request) => {
  const actor = await requireRole("PATIENT", "DOCTOR", "NURSE", "ADMIN")
  const url = new URL(request.url)
  const { flaggedOnly, take } = listSchema.parse(
    Object.fromEntries(url.searchParams.entries())
  )

  const requestedPatientId = actor.role === "PATIENT"
    ? actor.patientId
    : url.searchParams.get("patientId")
  const patientId = scopedPatientFilter(await patientScope(actor), requestedPatientId)

  if (actor.role === "PATIENT" && !patientId) {
    return Response.json(
      { error: "Your account is not linked to a patient record" },
      { status: 403 }
    )
  }

  const items = await prisma.labOrderItem.findMany({
    take,
    orderBy: [{ performedAt: "desc" }],
    where: {
      result: { not: null },
      ...(flaggedOnly ? { flag: { not: "NORMAL" } } : {}),
      order: {
        status: "COMPLETED",
        ...(patientId ? { patientId } : {}),
      },
    },
    select: {
      id: true,
      testName: true,
      result: true,
      unit: true,
      referenceRange: true,
      flag: true,
      performedAt: true,
      order: {
        select: {
          id: true,
          completedAt: true,
          doctor: { select: { user: { select: { name: true } } } },
        },
      },
    },
  })

  const results = items.map(item => ({
    id: item.id,
    test: item.testName,
    value: item.unit ? `${item.result} ${item.unit}` : (item.result ?? ""),
    rawValue: item.result ?? "",
    unit: item.unit,
    referenceRange: item.referenceRange,
    flag: item.flag ?? "NORMAL",
    performedAt: item.performedAt ?? item.order.completedAt,
    orderedBy: item.order.doctor.user.name,
    orderId: item.order.id,
  }))

  await recordAudit(actor, "READ", "LabOrderItem", undefined, {
    patientId: patientId ?? null,
    count: results.length,
  }, request)

  return Response.json({ results })
})
