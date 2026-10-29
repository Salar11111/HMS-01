import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { assertPatientVisible, patientScope } from "@/server/assignment"
import { assertObjectId, recordAudit, requireRole, withErrorHandling } from "@/server/authz"

const schema = z.object({
  patientId: z.string().min(1),
  diagnosis: z.string().trim().max(500).optional(),
  treatment: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(4000).optional(),
}).refine(value => value.diagnosis || value.treatment || value.notes, {
  message: "Add a diagnosis, treatment, or note",
})

export const POST = withErrorHandling(async (request: Request) => {
  const actor = await requireRole("DOCTOR")
  if (!actor.doctorId) {
    return Response.json({ error: "Your account is not linked to a doctor profile" }, { status: 403 })
  }
  const body = schema.parse(await request.json())
  assertObjectId(body.patientId, "patient id")
  assertPatientVisible(await patientScope(actor), body.patientId)

  const record = await prisma.medicalRecord.create({
    data: {
      patientId: body.patientId,
      doctorId: actor.doctorId,
      diagnosis: body.diagnosis,
      treatment: body.treatment,
      notes: body.notes,
    },
  })

  await recordAudit(actor, "CREATE", "MedicalRecord", record.id, { patientId: body.patientId }, request)
  return Response.json({ record }, { status: 201 })
})
