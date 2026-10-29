import { prisma } from "@/lib/prisma"
import { assertPatientVisible, patientScope } from "@/server/assignment"
import { AuthError, type Actor } from "@/server/authz"

export async function buildPatientChart(actor: Actor, patientId: string) {
  assertPatientVisible(await patientScope(actor), patientId)

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: {
      id: true,
      userId: true,
      medicalRecordNumber: true,
      dateOfBirth: true,
      bloodGroup: true,
      user: { select: { name: true } },
    },
  })
  if (!patient) throw new AuthError("Patient not found", 404)

  const [appointments, vitals, records, notes, orders, prescriptions, medications, admission] =
    await Promise.all([
      prisma.appointment.findMany({
        where: { patientId },
        orderBy: { scheduledAt: "desc" },
        take: 20,
        select: {
          id: true,
          scheduledAt: true,
          status: true,
          reason: true,
          doctor: { select: { user: { select: { name: true } } } },
        },
      }),
      prisma.vitalSign.findMany({
        where: { patientId },
        orderBy: { recordedAt: "desc" },
        take: 8,
        select: {
          id: true,
          recordedAt: true,
          systolic: true,
          diastolic: true,
          heartRate: true,
          oxygenSaturation: true,
          temperature: true,
        },
      }),
      prisma.medicalRecord.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          diagnosis: true,
          treatment: true,
          notes: true,
          createdAt: true,
          doctor: { select: { user: { select: { name: true } } } },
        },
      }),
      prisma.nursingNote.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, noteType: true, content: true, createdAt: true, author: { select: { name: true } } },
      }),
      prisma.labOrder.findMany({
        where: { patientId },
        orderBy: { orderedAt: "desc" },
        take: 12,
        select: { id: true, status: true, priority: true, orderedAt: true, items: { select: { testName: true, result: true } } },
      }),
      prisma.prescription.findMany({
        where: { patientId },
        orderBy: { issuedAt: "desc" },
        take: 12,
        select: {
          id: true,
          status: true,
          issuedAt: true,
          items: { select: { dosage: true, drug: { select: { name: true } } } },
        },
      }),
      prisma.medicationAdministration.findMany({
        where: { patientId },
        orderBy: { administeredAt: "desc" },
        take: 12,
        select: { id: true, drugName: true, dosage: true, status: true, administeredAt: true, prescriptionId: true },
      }),
      prisma.admission.findFirst({
        where: { patientId, status: "ADMITTED" },
        select: {
          id: true,
          admittedAt: true,
          diagnosis: true,
          bed: { select: { number: true, ward: { select: { name: true } } } },
        },
      }),
    ])

  return {
    patient: {
      id: patient.id,
      userId: patient.userId,
      name: patient.user.name ?? "Patient",
      medicalRecordNumber: patient.medicalRecordNumber,
      dateOfBirth: patient.dateOfBirth,
      bloodGroup: patient.bloodGroup,
    },
    admission: admission
      ? {
          id: admission.id,
          admittedAt: admission.admittedAt,
          diagnosis: admission.diagnosis,
          wardName: admission.bed.ward.name,
          bedNumber: admission.bed.number,
        }
      : null,
    appointments: appointments.map(row => ({
      id: row.id,
      scheduledAt: row.scheduledAt,
      status: row.status,
      reason: row.reason,
      doctorName: row.doctor.user.name ?? "Physician",
    })),
    vitals: vitals.map(row => ({
      ...row,
      temperature: row.temperature == null ? null : Number(row.temperature),
    })),
    records: records.map(row => ({
      id: row.id,
      diagnosis: row.diagnosis,
      treatment: row.treatment,
      notes: row.notes,
      createdAt: row.createdAt,
      authorName: row.doctor.user.name ?? "Physician",
    })),
    notes: notes.map(row => ({
      id: row.id,
      noteType: row.noteType,
      content: row.content,
      createdAt: row.createdAt,
      authorName: row.author.name ?? "Nurse",
    })),
    orders: orders.map(row => ({
      id: row.id,
      status: row.status,
      priority: row.priority,
      orderedAt: row.orderedAt,
      tests: row.items.map(item => item.result ? `${item.testName}: ${item.result}` : item.testName),
    })),
    prescriptions: prescriptions.map(row => ({
      id: row.id,
      status: row.status,
      issuedAt: row.issuedAt,
      items: row.items.map(item => ({
        label: `${item.drug.name} ${item.dosage}`,
        drugName: item.drug.name,
        dosage: item.dosage,
      })),
    })),
    medications: medications.map(row => ({
      id: row.id,
      drugName: row.drugName,
      dosage: row.dosage,
      status: row.status,
      administeredAt: row.administeredAt,
      prescriptionId: row.prescriptionId,
    })),
  }
}

