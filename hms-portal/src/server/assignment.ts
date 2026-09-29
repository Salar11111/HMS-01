import { prisma } from "@/lib/prisma"
import { AuthError, type Actor } from "@/server/authz"

/**
 * A nurse covers a patient only while that patient is admitted to a ward in
 * the nurse's department. Outpatients and other departments are out of scope.
 */
export async function nurseCoversPatient(nurseId: string, patientId: string) {
  const nurse = await prisma.nurse.findUnique({
    where: { id: nurseId },
    select: { departmentId: true },
  })
  if (!nurse?.departmentId) return false

  const admission = await prisma.admission.findFirst({
    where: {
      patientId,
      status: "ADMITTED",
      bed: { ward: { departmentId: nurse.departmentId } },
    },
    select: { id: true },
  })
  return admission != null
}

export async function nurseWardPatientIds(nurseId: string) {
  const nurse = await prisma.nurse.findUnique({
    where: { id: nurseId },
    select: { departmentId: true },
  })
  if (!nurse?.departmentId) return []

  const rows = await prisma.admission.findMany({
    where: {
      status: "ADMITTED",
      bed: { ward: { departmentId: nurse.departmentId } },
    },
    select: { patientId: true },
  })
  return [...new Set(rows.map(row => row.patientId))]
}

/** Patients this doctor has seen, admitted, or documented. */
export async function doctorPatientIds(doctorId: string) {
  const [appointments, admissions, records] = await Promise.all([
    prisma.appointment.findMany({ where: { doctorId }, select: { patientId: true } }),
    prisma.admission.findMany({ where: { doctorId }, select: { patientId: true } }),
    prisma.medicalRecord.findMany({ where: { doctorId }, select: { patientId: true } }),
  ])
  return [
    ...new Set([
      ...appointments.map(row => row.patientId),
      ...admissions.map(row => row.patientId),
      ...records.map(row => row.patientId),
    ]),
  ]
}

export type PatientScope = { all: true } | { all: false; ids: string[] }

/** `all` is the administrator list. Every other role gets an explicit id set. */
export async function patientScope(actor: Actor): Promise<PatientScope> {
  if (actor.role === "ADMIN") return { all: true }
  if (actor.role === "PATIENT") {
    return { all: false, ids: actor.patientId ? [actor.patientId] : [] }
  }
  if (actor.role === "DOCTOR" && actor.doctorId) {
    return { all: false, ids: await doctorPatientIds(actor.doctorId) }
  }
  if (actor.role === "NURSE" && actor.nurseId) {
    return { all: false, ids: await nurseWardPatientIds(actor.nurseId) }
  }
  return { all: false, ids: [] }
}

export function assertPatientVisible(scope: PatientScope, patientId: string | null | undefined) {
  if (!patientId || scope.all) return
  if (!scope.ids.includes(patientId)) {
    throw new AuthError("You cannot view this patient's record", 403)
  }
}

/** Prisma filter for a list. An empty id set matches nobody. */
export function scopedPatientFilter(scope: PatientScope, patientId?: string | null) {
  assertPatientVisible(scope, patientId)
  if (patientId) return patientId
  if (scope.all) return undefined
  return { in: scope.ids }
}
