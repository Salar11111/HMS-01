import { prisma } from "@/lib/prisma"
import { patientScope } from "@/server/assignment"
import { requireActor, withErrorHandling } from "@/server/authz"

type Hit = {
  id: string
  title: string
  subtitle: string
  href: string
}

export const GET = withErrorHandling(async (request: Request) => {
  const actor = await requireActor()
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? ""
  if (query.length < 2) return Response.json({ results: [] })

  const scope = await patientScope(actor)
  const patientIds = scope.all ? undefined : scope.ids
  const contains = { contains: query, mode: "insensitive" as const }
  const results: Hit[] = []

  if (actor.role === "ADMIN") {
    const [patients, invoices] = await Promise.all([
      prisma.patient.findMany({
        where: { user: { name: contains } },
        take: 8,
        select: { id: true, medicalRecordNumber: true, user: { select: { name: true } } },
      }),
      prisma.invoice.findMany({
        where: { invoiceNumber: contains },
        take: 5,
        select: { id: true, invoiceNumber: true, patient: { select: { user: { select: { name: true } } } } },
      }),
    ])
    for (const patient of patients) {
      results.push({
        id: patient.id,
        title: patient.user.name ?? "Patient",
        subtitle: patient.medicalRecordNumber ?? "Patient",
        href: "/portal/admin/billing",
      })
    }
    for (const invoice of invoices) {
      results.push({
        id: invoice.id,
        title: invoice.invoiceNumber,
        subtitle: invoice.patient.user.name ?? "Invoice",
        href: "/portal/admin/billing",
      })
    }
    return Response.json({ results })
  }

  const patients = await prisma.patient.findMany({
    where: {
      ...(patientIds ? { id: { in: patientIds } } : {}),
      user: { name: contains },
    },
    take: 8,
    select: { id: true, medicalRecordNumber: true, user: { select: { name: true } } },
  })

  const href =
    actor.role === "DOCTOR"
      ? "/portal/doctor/patients"
      : actor.role === "NURSE"
        ? "/portal/nurse/patients"
        : "/portal/patient/records"

  for (const patient of patients) {
    results.push({
      id: patient.id,
      title: patient.user.name ?? "Patient",
      subtitle: patient.medicalRecordNumber ?? "Record",
      href,
    })
  }

  if (actor.role === "PATIENT" && actor.patientId) {
    const appointments = await prisma.appointment.findMany({
      where: { patientId: actor.patientId, reason: contains },
      take: 5,
      select: { id: true, reason: true, doctor: { select: { user: { select: { name: true } } } } },
    })
    for (const visit of appointments) {
      results.push({
        id: visit.id,
        title: visit.reason ?? "Appointment",
        subtitle: visit.doctor.user.name ?? "Appointment",
        href: "/portal/patient/appointments",
      })
    }
  }

  return Response.json({ results })
})
