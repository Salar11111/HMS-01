import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { nurseCoversPatient, patientScope, scopedPatientFilter } from "@/server/assignment"
import { assertObjectId, recordAudit, requireRole, withErrorHandling } from "@/server/authz"
import { criticalVitalSummary } from "@/lib/vitals"

const createSchema = z.object({
  patientId: z.string().min(1),
  temperature: z.coerce.number().min(30).max(45).optional(),
  heartRate: z.coerce.number().int().min(20).max(260).optional(),
  systolic: z.coerce.number().int().min(50).max(300).optional(),
  diastolic: z.coerce.number().int().min(30).max(200).optional(),
  respiratoryRate: z.coerce.number().int().min(5).max(80).optional(),
  oxygenSaturation: z.coerce.number().int().min(50).max(100).optional(),
  weightKg: z.coerce.number().min(0.5).max(500).optional(),
  painScore: z.coerce.number().int().min(0).max(10).optional(),
  notes: z.string().max(2000).optional(),
})

const listSchema = z.object({
  patientId: z.string().optional(),
  hours: z.coerce.number().int().min(1).max(720).default(24),
  take: z.coerce.number().int().min(1).max(200).default(100),
})

export const GET = withErrorHandling(async (request: Request) => {
  const actor = await requireRole("NURSE", "DOCTOR", "ADMIN")
  const url = new URL(request.url)
  const { patientId, hours, take } = listSchema.parse(
    Object.fromEntries(url.searchParams.entries())
  )
  const visiblePatientId = scopedPatientFilter(await patientScope(actor), patientId)

  const since = new Date(Date.now() - hours * 3_600_000)

  const vitals = await prisma.vitalSign.findMany({
    where: {
      recordedAt: { gte: since },
      ...(visiblePatientId ? { patientId: visiblePatientId } : {}),
    },
    take,
    orderBy: { recordedAt: "desc" },
    include: {
      patient: { select: { id: true, medicalRecordNumber: true, user: { select: { name: true } } } },
      nurse: { select: { id: true, user: { select: { name: true } } } },
    },
  })

  return Response.json({ vitals, actorRole: actor.role })
})

export const POST = withErrorHandling(async (request: Request) => {
  const actor = await requireRole("NURSE")
  const body = createSchema.parse(await request.json())
  assertObjectId(body.patientId, "patient id")

  if (!actor.nurseId) {
    return Response.json(
      { error: "Your account is not linked to a nurse profile" },
      { status: 403 }
    )
  }

  const patient = await prisma.patient.findUnique({
    where: { id: body.patientId },
    select: { id: true, user: { select: { name: true } } },
  })
  if (!patient) {
    return Response.json({ error: "Patient not found" }, { status: 404 })
  }
  if (!(await nurseCoversPatient(actor.nurseId, patient.id))) {
    return Response.json(
      { error: "This patient is not admitted to a ward in your department" },
      { status: 403 }
    )
  }

  const hasAnyMeasurement = [
    body.temperature,
    body.heartRate,
    body.systolic,
    body.diastolic,
    body.respiratoryRate,
    body.oxygenSaturation,
    body.weightKg,
  ].some(v => v !== undefined)

  if (!hasAnyMeasurement) {
    return Response.json(
      { error: "Record at least one measurement" },
      { status: 400 }
    )
  }

  if (
    body.systolic !== undefined &&
    body.diastolic !== undefined &&
    body.diastolic >= body.systolic
  ) {
    return Response.json(
      { error: "Diastolic must be lower than systolic" },
      { status: 400 }
    )
  }

  const alert = criticalVitalSummary(body)

  const vital = await prisma.vitalSign.create({
    data: {
      patientId: body.patientId,
      recordedById: actor.userId,
      nurseId: actor.nurseId,
      temperature: body.temperature,
      heartRate: body.heartRate,
      systolic: body.systolic,
      diastolic: body.diastolic,
      respiratoryRate: body.respiratoryRate,
      oxygenSaturation: body.oxygenSaturation,
      weightKg: body.weightKg,
      painScore: body.painScore,
      notes: body.notes,
    },
  })

  if (alert) {
    const doctorUserId = await resolveDoctorUserId(body.patientId)
    if (doctorUserId) {
      await prisma.notification.create({
        data: {
          userId: doctorUserId,
          title: `Critical vitals: ${patient.user.name}`,
          body: alert,
          link: "/portal/doctor/patients",
        },
      })
    }
  }

  await recordAudit(actor, "CREATE", "VitalSign", vital.id, alert ? { alert } : null, request)

  return Response.json({ vital, alert }, { status: 201 })
})

async function resolveDoctorUserId(patientId: string) {
  const admission = await prisma.admission.findFirst({
    where: { patientId, status: "ADMITTED" },
    orderBy: { admittedAt: "desc" },
    select: { doctor: { select: { userId: true } } },
  })

  return admission?.doctor?.userId ?? null
}
