import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { assertPatientVisible, patientScope } from "@/server/assignment"
import { assertObjectId, AuthError, recordAudit, requireRole, withErrorHandling } from "@/server/authz"

const itemSchema = z.object({
  drugId: z.string().min(1),
  dosage: z.string().trim().min(1).max(80),
  frequency: z.string().trim().min(1).max(80),
  duration: z.string().trim().min(1).max(80),
  quantity: z.coerce.number().int().min(1).max(500),
})

const createSchema = z.object({
  patientId: z.string().min(1),
  notes: z.string().trim().max(1000).optional(),
  items: z.array(itemSchema).min(1).max(12),
})

export const GET = withErrorHandling(async (request: Request) => {
  const actor = await requireRole("DOCTOR", "ADMIN")
  if (actor.role === "DOCTOR" && !actor.doctorId) {
    throw new AuthError("Your account is not linked to a doctor profile", 403)
  }
  const status = new URL(request.url).searchParams.get("status")
  const prescriptions = await prisma.prescription.findMany({
    where: {
      ...(status ? { status: status as "ACTIVE" | "DISPENSED" | "DRAFT" | "CANCELLED" | "EXPIRED" } : {}),
      ...(actor.role === "DOCTOR" ? { prescriberId: actor.doctorId } : {}),
    },
    orderBy: { issuedAt: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      issuedAt: true,
      patient: { select: { id: true, user: { select: { name: true } } } },
      items: { select: { id: true, quantity: true, dosage: true, drug: { select: { id: true, name: true } } } },
    },
  })
  return Response.json({
    prescriptions: prescriptions.map(row => ({
      id: row.id,
      status: row.status,
      issuedAt: row.issuedAt,
      patientId: row.patient.id,
      patientName: row.patient.user.name ?? "Patient",
      items: row.items.map(item => ({
        id: item.id,
        drugId: item.drug.id,
        drugName: item.drug.name,
        dosage: item.dosage,
        quantity: item.quantity,
      })),
    })),
  })
})

export const POST = withErrorHandling(async (request: Request) => {
  const actor = await requireRole("DOCTOR")
  if (!actor.doctorId) throw new AuthError("Your account is not linked to a doctor profile", 403)
  const body = createSchema.parse(await request.json())
  assertObjectId(body.patientId, "patient id")
  for (const item of body.items) assertObjectId(item.drugId, "drug id")
  assertPatientVisible(await patientScope(actor), body.patientId)

  const drugs = await prisma.drug.findMany({
    where: { id: { in: body.items.map(item => item.drugId) }, isActive: true },
    select: { id: true },
  })
  if (drugs.length !== new Set(body.items.map(item => item.drugId)).size) {
    return Response.json({ error: "One or more drugs are not on the formulary" }, { status: 400 })
  }

  const prescription = await prisma.prescription.create({
    data: {
      patientId: body.patientId,
      prescriberId: actor.doctorId,
      status: "ACTIVE",
      notes: body.notes,
      items: { create: body.items },
    },
  })

  await recordAudit(actor, "CREATE", "Prescription", prescription.id, { patientId: body.patientId }, request)
  return Response.json({ prescription }, { status: 201 })
})
