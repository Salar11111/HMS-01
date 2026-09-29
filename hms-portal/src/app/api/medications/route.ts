import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { nurseCoversPatient, patientScope, scopedPatientFilter } from "@/server/assignment"
import {
  recordAudit,
  requireRole,
  withErrorHandling,
} from "@/server/authz"

const administerSchema = z.object({
  patientId: z.string().min(1),
  prescriptionId: z.string().optional(),
  drugName: z.string().min(2).max(160),
  dosage: z.string().min(1).max(80),
  notes: z.string().max(1000).optional(),
})


export const GET = withErrorHandling(async (request: Request) => {
  const actor = await requireRole("NURSE", "DOCTOR", "ADMIN")
  const url = new URL(request.url)

  const requestedPatientId = url.searchParams.get("patientId")
  const hours = Number(url.searchParams.get("hours") ?? 24)

  if (!Number.isFinite(hours) || hours < 1 || hours > 720) {
    return Response.json({ error: "Invalid hours window" }, { status: 400 })
  }

  const patientId = scopedPatientFilter(await patientScope(actor), requestedPatientId)
  const since = new Date(Date.now() - hours * 3_600_000)

  const administrations = await prisma.medicationAdministration.findMany({
    where: {
      administeredAt: { gte: since },
      ...(patientId ? { patientId } : {}),
    },
    take: 200,
    orderBy: { administeredAt: "desc" },
    include: {
      patient: { select: { user: { select: { name: true } } } },
      nurse: { select: { user: { select: { name: true } } } },
    },
  })

  return Response.json({ administrations })
})

export const POST = withErrorHandling(async (request: Request) => {
  const actor = await requireRole("NURSE")

  if (!actor.nurseId) {
    return Response.json(
      { error: "Your account is not linked to a nurse profile" },
      { status: 403 }
    )
  }

  const body = administerSchema.parse(await request.json())

  if (!(await nurseCoversPatient(actor.nurseId, body.patientId))) {
    return Response.json(
      { error: "This patient is not admitted to a ward in your department" },
      { status: 403 }
    )
  }

  const administration = await prisma.medicationAdministration.create({
    data: {
      patientId: body.patientId,
      nurseId: actor.nurseId,
      userId: actor.userId,
      prescriptionId: body.prescriptionId,
      drugName: body.drugName,
      dosage: body.dosage,
      status: "GIVEN",
      notes: body.notes,
    },
  })

  await recordAudit(
    actor,
    "ADMINISTER",
    "MedicationAdministration",
    administration.id,
    { drugName: body.drugName, dosage: body.dosage, patientId: body.patientId },
    request
  )

  return Response.json({ administration }, { status: 201 })
})
