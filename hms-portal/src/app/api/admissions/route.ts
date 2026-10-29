import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { assertObjectId, AuthError, ConflictError, recordAudit, requireRole, withErrorHandling } from "@/server/authz"

const admitSchema = z.object({
  patientId: z.string().min(1),
  bedId: z.string().min(1),
  doctorId: z.string().min(1).optional(),
  reason: z.string().trim().max(500).optional(),
  diagnosis: z.string().trim().max(500).optional(),
})

export const GET = withErrorHandling(async () => {
  await requireRole("ADMIN")
  const [beds, admissions, patients, doctors] = await Promise.all([
    prisma.bed.findMany({
      orderBy: [{ wardId: "asc" }, { number: "asc" }],
      select: { id: true, number: true, isOccupied: true, ward: { select: { name: true } } },
    }),
    prisma.admission.findMany({
      where: { status: "ADMITTED" },
      orderBy: { admittedAt: "desc" },
      select: {
        id: true,
        patient: { select: { user: { select: { name: true } } } },
        bed: { select: { number: true, ward: { select: { name: true } } } },
      },
    }),
    prisma.patient.findMany({
      take: 80,
      orderBy: { createdAt: "desc" },
      select: { id: true, medicalRecordNumber: true, user: { select: { name: true } } },
    }),
    prisma.doctor.findMany({
      select: { id: true, user: { select: { name: true } } },
    }),
  ])

  return Response.json({
    beds: beds.map(bed => ({ id: bed.id, number: bed.number, wardName: bed.ward.name, occupied: bed.isOccupied })),
    admissions: admissions.map(row => ({
      id: row.id,
      patientName: row.patient.user.name ?? "Patient",
      wardName: row.bed.ward.name,
      bedNumber: row.bed.number,
    })),
    patients: patients.map(row => ({
      id: row.id,
      name: row.user.name ?? "Patient",
      medicalRecordNumber: row.medicalRecordNumber,
    })),
    doctors: doctors.map(row => ({ id: row.id, name: row.user.name ?? "Physician" })),
  })
})

export const POST = withErrorHandling(async (request: Request) => {
  const actor = await requireRole("ADMIN")
  const body = admitSchema.parse(await request.json())
  assertObjectId(body.patientId, "patient id")
  assertObjectId(body.bedId, "bed id")
  if (body.doctorId) assertObjectId(body.doctorId, "doctor id")

  const admission = await prisma.$transaction(async (tx) => {
    const existing = await tx.admission.findFirst({
      where: { patientId: body.patientId, status: "ADMITTED" },
      select: { id: true },
    })
    if (existing) throw new ConflictError("This patient already has an open admission")

    const bed = await tx.bed.findUnique({
      where: { id: body.bedId },
      select: { id: true, isOccupied: true, wardId: true },
    })
    if (!bed) throw new AuthError("Bed not found", 404)
    if (bed.isOccupied) throw new ConflictError("That bed is already occupied")

    await tx.bed.update({ where: { id: bed.id }, data: { isOccupied: true } })
    return tx.admission.create({
      data: {
        patientId: body.patientId,
        bedId: bed.id,
        wardId: bed.wardId,
        doctorId: body.doctorId,
        reason: body.reason,
        diagnosis: body.diagnosis,
        status: "ADMITTED",
      },
    })
  })

  await recordAudit(actor, "ADMIT", "Admission", admission.id, { patientId: body.patientId }, request)
  return Response.json({ admission }, { status: 201 })
})
