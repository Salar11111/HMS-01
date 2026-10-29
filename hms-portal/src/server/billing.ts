import { Prisma } from "@prisma/client"

type Tx = Prisma.TransactionClient

/** Creates a consultation invoice once per completed appointment. */
export async function ensureConsultationInvoice(tx: Tx, appointmentId: string) {
  const invoiceNumber = `CONSULT-${appointmentId}`
  const existing = await tx.invoice.findUnique({
    where: { invoiceNumber },
    select: { id: true },
  })
  if (existing) return existing

  const appointment = await tx.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      patientId: true,
      doctor: { select: { consultationFee: true, user: { select: { name: true } } } },
    },
  })
  if (!appointment) return null

  const fee = appointment.doctor.consultationFee
  if (fee <= 0) return null

  const dueAt = new Date()
  dueAt.setDate(dueAt.getDate() + 30)
  const doctorName = appointment.doctor.user.name ?? "Physician"

  return tx.invoice.create({
    data: {
      patientId: appointment.patientId,
      invoiceNumber,
      status: "ISSUED",
      totalAmount: fee,
      paidAmount: 0,
      dueAt,
      items: {
        create: [{
          description: `Consultation — ${doctorName}`,
          category: "Consultation",
          quantity: 1,
          unitPrice: fee,
          amount: fee,
        }],
      },
    },
    select: { id: true },
  })
}

/** Creates a bed-stay invoice once per discharged admission. */
export async function ensureDischargeInvoice(tx: Tx, admissionId: string) {
  const invoiceNumber = `STAY-${admissionId}`
  const existing = await tx.invoice.findUnique({
    where: { invoiceNumber },
    select: { id: true },
  })
  if (existing) return existing

  const admission = await tx.admission.findUnique({
    where: { id: admissionId },
    select: {
      id: true,
      patientId: true,
      admittedAt: true,
      dischargedAt: true,
      bed: { select: { number: true, dailyRate: true, ward: { select: { name: true } } } },
    },
  })
  if (!admission?.dischargedAt) return null

  const rate = admission.bed.dailyRate
  if (rate <= 0) return null

  const ms = admission.dischargedAt.getTime() - admission.admittedAt.getTime()
  const nights = Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)))
  const amount = rate * nights
  const dueAt = new Date()
  dueAt.setDate(dueAt.getDate() + 30)

  return tx.invoice.create({
    data: {
      patientId: admission.patientId,
      invoiceNumber,
      status: "ISSUED",
      totalAmount: amount,
      paidAmount: 0,
      dueAt,
      items: {
        create: [{
          description: `${admission.bed.ward.name} · ${admission.bed.number} × ${nights} night${nights === 1 ? "" : "s"}`,
          category: "Accommodation",
          quantity: nights,
          unitPrice: rate,
          amount,
        }],
      },
    },
    select: { id: true },
  })
}
