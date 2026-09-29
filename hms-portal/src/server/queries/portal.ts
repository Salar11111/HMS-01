import { prisma } from "@/lib/prisma"
import { doctorPatientIds } from "@/server/assignment"

/**
 * Role-scoped read models for the portal dashboards.
 *
 * Each builder returns a single denormalised payload shaped for one role's
 * pages. Keeping the composition in one place means the API surface stays four
 * routes wide while the pages keep simple `GET` calls, and it keeps every
 * scope decision auditable next to the queries it applies.
 *
 * Money and measurement fields are Prisma `Float` values. `Number()` keeps
 * the JSON payload as plain numbers for the portal pages.
 */

/**
 * Payload types for the four role endpoints. Inferred from the builders so the
 * API routes and the client hooks cannot drift apart.
 */
export type PatientPortalData = Awaited<ReturnType<typeof buildPatientPortal>>
export type DoctorPortalData = Awaited<ReturnType<typeof buildDoctorPortal>>
export type NursePortalData = Awaited<ReturnType<typeof buildNursePortal>>
export type AdminPortalData = Awaited<ReturnType<typeof buildAdminPortal>>

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

const endOfToday = () => {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

const isAbnormalVitals = (v: {
  temperature: unknown
  heartRate: number | null
  systolic: number | null
  diastolic: number | null
  respiratoryRate?: number | null
  oxygenSaturation: number | null
}) => {
  const temperature = v.temperature == null ? null : Number(v.temperature)
  return (
    (v.systolic != null && (v.systolic > 140 || v.systolic < 90)) ||
    (v.diastolic != null && (v.diastolic > 90 || v.diastolic < 60)) ||
    (v.heartRate != null && (v.heartRate > 100 || v.heartRate < 60)) ||
    (v.oxygenSaturation != null && v.oxygenSaturation < 95) ||
    (temperature != null && (temperature > 38 || temperature < 36)) ||
    (v.respiratoryRate != null && (v.respiratoryRate > 20 || v.respiratoryRate < 10))
  )
}

export async function buildPatientPortal(patientId: string) {
  const now = new Date()
  const weekAhead = new Date(now.getTime() + 7 * 86_400_000)

  // Resolved first so the message query can scope to this patient's user id.
  // `findUniqueOrThrow` is safe here: the caller passes a `patientId` that came
  // from this patient's own User row, so the profile cannot be missing.
  const profile = await prisma.patient.findUniqueOrThrow({
    where: { id: patientId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  })

  // One transaction keeps the dashboard read set on a single snapshot.
  const [
    appointments,
    vitals,
    results,
    prescriptions,
    administrations,
    invoices,
    messages,
    records,
    admission,
  ] = await prisma.$transaction([
    prisma.appointment.findMany({
      where: { patientId },
      orderBy: { scheduledAt: "asc" },
      take: 50,
      include: {
        doctor: {
          select: {
            id: true,
            specialization: true,
            consultationFee: true,
            user: { select: { name: true, image: true } },
          },
        },
      },
    }),
    prisma.vitalSign.findMany({
      where: { patientId },
      orderBy: { recordedAt: "desc" },
      take: 30,
      include: { nurse: { select: { user: { select: { name: true } } } } },
    }),
    prisma.labOrderItem.findMany({
      where: { order: { patientId, status: "COMPLETED" }, result: { not: null } },
      orderBy: { performedAt: "desc" },
      take: 100,
      include: { order: { select: { orderedAt: true, completedAt: true, status: true, priority: true } } },
    }),
    prisma.prescription.findMany({
      where: { patientId },
      orderBy: { issuedAt: "desc" },
      include: {
        items: { include: { drug: true } },
        prescriber: { select: { user: { select: { name: true } } } },
      },
    }),
    prisma.medicationAdministration.findMany({
      where: { patientId },
      orderBy: { administeredAt: "desc" },
      take: 50,
    }),
    prisma.invoice.findMany({
      where: { patientId },
      orderBy: { issuedAt: "desc" },
      include: { items: true, payments: true },
    }),
    prisma.message.findMany({
      where: { OR: [{ recipientId: profile.userId }, { senderId: profile.userId }] },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        sender: { select: { name: true, image: true } },
        recipient: { select: { name: true } },
      },
    }),
    prisma.medicalRecord.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      include: { doctor: { select: { user: { select: { name: true } } } } },
    }),
    prisma.admission.findFirst({
      where: { patientId, status: "ADMITTED" },
      include: {
        bed: { include: { ward: { select: { name: true } } } },
        doctor: { select: { user: { select: { name: true } } } },
      },
    }),
  ])

  return {
    profile: {
      id: profile.id,
      userId: profile.userId,
      name: profile.user.name,
      email: profile.user.email,
      image: profile.user.image,
      medicalRecordNumber: profile.medicalRecordNumber,
      dateOfBirth: profile.dateOfBirth,
      bloodGroup: profile.bloodGroup,
      phone: profile.phone,
      address: profile.address,
      emergencyContact: profile.emergencyContact,
      insuranceProvider: profile.insuranceProvider,
      insurancePolicyNumber: profile.insurancePolicyNumber,
    },
    appointments: appointments.map(a => ({
      id: a.id,
      doctorId: a.doctorId,
      doctorName: a.doctor.user.name,
      doctorSpecialization: a.doctor.specialization,
      doctorImage: a.doctor.user.image,
      consultationFee: a.doctor.consultationFee == null ? null : Number(a.doctor.consultationFee),
      scheduledAt: a.scheduledAt,
      duration: a.duration,
      status: a.status,
      reason: a.reason,
      upcoming: a.scheduledAt >= now,
      withinWeek: a.scheduledAt <= weekAhead,
    })),
    vitals: vitals.map(v => ({
      id: v.id,
      recordedAt: v.recordedAt,
      temperature: v.temperature == null ? null : Number(v.temperature),
      heartRate: v.heartRate,
      systolic: v.systolic,
      diastolic: v.diastolic,
      respiratoryRate: v.respiratoryRate,
      oxygenSaturation: v.oxygenSaturation,
      painScore: v.painScore,
      recordedBy: v.nurse?.user.name ?? null,
      abnormal: isAbnormalVitals(v),
    })),
    latestVitals: vitals[0]
      ? {
          recordedAt: vitals[0].recordedAt,
          heartRate: vitals[0].heartRate,
          systolic: vitals[0].systolic,
          diastolic: vitals[0].diastolic,
          oxygenSaturation: vitals[0].oxygenSaturation,
          temperature: vitals[0].temperature == null ? null : Number(vitals[0].temperature),
          abnormal: isAbnormalVitals(vitals[0]),
        }
      : null,
    results: results.map(r => ({
      id: r.id,
      testName: r.testName,
      result: r.result,
      unit: r.unit,
      referenceRange: r.referenceRange,
      flag: r.flag,
      performedAt: r.performedAt,
      completedAt: r.order.completedAt ?? r.performedAt ?? r.order.orderedAt,
      status: r.order.status,
      priority: r.order.priority,
    })),
    prescriptions: prescriptions.map(p => ({
      id: p.id,
      prescriberName: p.prescriber.user.name,
      status: p.status,
      issuedAt: p.issuedAt,
      expiresAt: p.expiresAt,
      notes: p.notes,
      items: p.items.map(i => ({
        id: i.id,
        drugName: i.drug.name,
        genericName: i.drug.genericName,
        form: i.drug.form,
        strength: i.drug.strength,
        dosage: i.dosage,
        frequency: i.frequency,
        duration: i.duration,
        quantity: i.quantity,
        refillsLeft: i.refillsLeft,
      })),
    })),
    medications: administrations.map(m => ({
      id: m.id,
      drugName: m.drugName,
      dosage: m.dosage,
      status: m.status,
      administeredAt: m.administeredAt,
      notes: m.notes,
    })),
    invoices: invoices.map(i => {
      const total = Number(i.totalAmount)
      const paid = Number(i.paidAmount)
      return {
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        status: i.status,
        totalAmount: total,
        paidAmount: paid,
        balance: total - paid,
        issuedAt: i.issuedAt,
        dueAt: i.dueAt,
        overdue: i.dueAt != null && i.dueAt < now && paid < total,
        items: i.items.map(item => ({
          id: item.id,
          description: item.description,
          category: item.category,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          amount: Number(item.amount),
        })),
        payments: i.payments.map(pay => ({
          id: pay.id,
          amount: Number(pay.amount),
          method: pay.method,
          reference: pay.reference,
          paidAt: pay.paidAt,
        })),
      }
    }),
    outstandingBalance: invoices
      .filter(i => i.status !== "VOID")
      .reduce((sum, i) => sum + (Number(i.totalAmount) - Number(i.paidAmount)), 0),
    messages: messages.map(m => ({
      id: m.id,
      subject: m.subject,
      body: m.body,
      createdAt: m.createdAt,
      readAt: m.readAt,
      read: m.readAt != null,
      direction: m.recipientId === profile.userId ? "incoming" : "outgoing",
      senderName: m.sender.name,
      senderImage: m.sender.image,
      recipientName: m.recipient.name,
    })),
    unreadMessages: messages.filter(m => m.readAt == null && m.recipientId === profile.userId).length,
    records: records.map(r => ({
      id: r.id,
      doctorName: r.doctor.user.name,
      diagnosis: r.diagnosis,
      treatment: r.treatment,
      notes: r.notes,
      recordedAt: r.createdAt,
    })),
    admission: admission
      ? {
          id: admission.id,
          status: admission.status,
          reason: admission.reason,
          diagnosis: admission.diagnosis,
          admittedAt: admission.admittedAt,
          dischargedAt: admission.dischargedAt,
          bedNumber: admission.bed.number,
          wardName: admission.bed.ward.name,
          attendingDoctor: admission.doctor?.user.name ?? null,
        }
      : null,
  }
}

export async function buildDoctorPortal(doctorId: string) {
  const now = new Date()
  const dayStart = startOfToday()
  const dayEnd = endOfToday()

  const profile = await prisma.doctor.findUniqueOrThrow({
    where: { id: doctorId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      department: { select: { name: true } },
    },
  })

  const panelIds = await doctorPatientIds(doctorId)

  const [
    todaysAppointments,
    patients,
    recentRecords,
    abnormalResults,
    prescriptions,
    messages,
    notifications,
    schedules,
  ] = await prisma.$transaction([
    prisma.appointment.findMany({
      where: { doctorId, scheduledAt: { gte: dayStart, lte: dayEnd } },
      orderBy: { scheduledAt: "asc" },
      include: { patient: { include: { user: { select: { name: true } } } } },
    }),
    prisma.patient.findMany({
      where: { id: { in: panelIds } },
      take: 100,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        admissions: { where: { status: "ADMITTED" }, include: { bed: { include: { ward: { select: { name: true } } } } } },
        _count: { select: { appointments: true, prescriptions: true, medicalRecords: true } },
      },
    }),
    prisma.medicalRecord.findMany({
      where: { doctorId },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { patient: { include: { user: { select: { name: true } } } } },
    }),
    prisma.labOrderItem.findMany({
      where: {
        order: { doctorId },
        result: { not: null },
        flag: { in: ["HIGH", "LOW", "CRITICAL"] },
      },
      orderBy: { performedAt: "desc" },
      take: 50,
      include: {
        order: { include: { patient: { include: { user: { select: { name: true } } } } } },
      },
    }),
    prisma.prescription.findMany({
      where: { prescriberId: doctorId },
      orderBy: { issuedAt: "desc" },
      take: 50,
      include: {
        items: { include: { drug: true } },
        patient: { include: { user: { select: { name: true } } } },
      },
    }),
    prisma.message.findMany({
      where: { recipientId: profile.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { sender: { select: { name: true, image: true } } },
    }),
    prisma.notification.findMany({
      where: { userId: profile.userId, readAt: null },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.schedule.findMany({ where: { doctorId, isActive: true }, orderBy: { dayOfWeek: "asc" } }),
  ])

  return {
    profile: {
      id: profile.id,
      name: profile.user.name,
      email: profile.user.email,
      image: profile.user.image,
      specialization: profile.specialization,
      licenseNumber: profile.licenseNumber,
      consultationFee: profile.consultationFee == null ? null : Number(profile.consultationFee),
      departmentName: profile.department?.name ?? null,
    },
    stats: {
      todayAppointments: todaysAppointments.length,
      patientCount: patients.length,
      abnormalResultCount: abnormalResults.length,
      unreadMessages: messages.filter(m => m.readAt == null).length,
      unreadNotifications: notifications.length,
      todayRecordCount: recentRecords.filter(r => r.createdAt >= dayStart).length,
    },
    todaysAppointments: todaysAppointments.map(a => ({
      id: a.id,
      patientId: a.patientId,
      patientName: a.patient.user.name,
      scheduledAt: a.scheduledAt,
      duration: a.duration,
      status: a.status,
      reason: a.reason,
      past: a.scheduledAt < now,
    })),
    patients: patients.map(p => {
      const admitted = p.admissions[0]
      return {
        id: p.id,
        userId: p.user.id,
        name: p.user.name,
        email: p.user.email,
        image: p.user.image,
        medicalRecordNumber: p.medicalRecordNumber,
        dateOfBirth: p.dateOfBirth,
        bloodGroup: p.bloodGroup,
        phone: p.phone,
        insuranceProvider: p.insuranceProvider,
        admitted: Boolean(admitted),
        wardName: admitted?.bed.ward.name ?? null,
        bedNumber: admitted?.bed.number ?? null,
        admittedAt: admitted?.admittedAt ?? null,
        appointmentCount: p._count.appointments,
        prescriptionCount: p._count.prescriptions,
        recordCount: p._count.medicalRecords,
      }
    }),
    records: recentRecords.map(r => ({
      id: r.id,
      patientId: r.patientId,
      patientName: r.patient.user.name,
      diagnosis: r.diagnosis,
      treatment: r.treatment,
      notes: r.notes,
      recordedAt: r.createdAt,
    })),
    abnormalResults: abnormalResults.map(r => ({
      id: r.id,
      patientId: r.order.patientId,
      patientName: r.order.patient.user.name,
      testName: r.testName,
      result: r.result,
      unit: r.unit,
      referenceRange: r.referenceRange,
      flag: r.flag,
      performedAt: r.performedAt,
      completedAt: r.order.completedAt ?? r.performedAt,
    })),
    prescriptions: prescriptions.map(p => ({
      id: p.id,
      patientId: p.patientId,
      patientName: p.patient.user.name,
      status: p.status,
      issuedAt: p.issuedAt,
      expiresAt: p.expiresAt,
      notes: p.notes,
      items: p.items.map(i => ({
        id: i.id,
        drugName: i.drug.name,
        dosage: i.dosage,
        frequency: i.frequency,
        duration: i.duration,
        quantity: i.quantity,
        refillsLeft: i.refillsLeft,
      })),
    })),
    messages: messages.map(m => ({
      id: m.id,
      subject: m.subject,
      body: m.body,
      createdAt: m.createdAt,
      readAt: m.readAt,
      read: m.readAt != null,
      senderName: m.sender.name,
      senderImage: m.sender.image,
    })),
    notifications: notifications.map(n => ({
      id: n.id,
      title: n.title,
      body: n.body,
      link: n.link,
      createdAt: n.createdAt,
    })),
    schedule: schedules.map(s => ({
      id: s.id,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
    })),
  }
}

export async function buildNursePortal(nurseId: string) {
  const now = new Date()
  const dayStart = startOfToday()
  const emptyIds: string[] = []

  const profile = await prisma.nurse.findUniqueOrThrow({
    where: { id: nurseId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      department: { select: { name: true } },
    },
  })

  // A nurse's board is the admitted patients in wards of their own department.
  const census = profile.departmentId
    ? await prisma.admission.findMany({
    where: {
      status: "ADMITTED",
      bed: { ward: { departmentId: profile.departmentId } },
    },
    orderBy: { admittedAt: "asc" },
    include: {
      patient: {
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      },
      bed: { include: { ward: { select: { name: true } } } },
      doctor: { select: { user: { select: { name: true } } } },
    },
  })
    : []

  const patientIds = census.map(c => c.patientId)
  const scope = patientIds.length ? patientIds : emptyIds

  const [latestVitals, medications, notes, dueMedications, labOrders] = await prisma.$transaction([
    // Newest first; the first row per patient is their most recent reading.
    prisma.vitalSign.findMany({
      where: { patientId: { in: patientIds } },
      orderBy: { recordedAt: "desc" },
      take: 100,
      select: {
        id: true,
        patientId: true,
        recordedAt: true,
        temperature: true,
        heartRate: true,
        systolic: true,
        diastolic: true,
        oxygenSaturation: true,
        painScore: true,
      },
    }),
    prisma.medicationAdministration.findMany({
      where: { patientId: { in: scope } },
      orderBy: { administeredAt: "desc" },
      take: 50,
    }),
    prisma.nursingNote.findMany({
      where: { patientId: { in: scope } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { author: { select: { name: true, image: true } } },
    }),
    prisma.medicationAdministration.findMany({
      where: {
        patientId: { in: scope },
        status: "PENDING",
        administeredAt: { gte: dayStart },
      },
      orderBy: { administeredAt: "asc" },
    }),
    prisma.labOrder.findMany({
      where: {
        patientId: { in: scope },
        status: { in: ["ORDERED", "COLLECTED", "IN_PROGRESS"] },
      },
      orderBy: { orderedAt: "asc" },
      include: { patient: { include: { user: { select: { name: true } } } } },
    }),
  ])

  // `latestVitals` comes back newest-first, so the first row per patient is the
  // most recent reading. The MAR and dashboard both surface these, so they are
  // de-duplicated here rather than refetched per page.
  const latestVitalByPatient = new Map<
    string,
    {
      id: string
      patientId: string
      recordedAt: Date
      temperature: number | null
      heartRate: number | null
      systolic: number | null
      diastolic: number | null
      oxygenSaturation: number | null
      painScore: number | null
      abnormal: boolean
    }
  >()
  for (const v of latestVitals) {
    if (latestVitalByPatient.has(v.patientId)) continue
    latestVitalByPatient.set(v.patientId, {
      id: v.id,
      patientId: v.patientId,
      recordedAt: v.recordedAt,
      temperature: v.temperature == null ? null : Number(v.temperature),
      heartRate: v.heartRate,
      systolic: v.systolic,
      diastolic: v.diastolic,
      oxygenSaturation: v.oxygenSaturation,
      painScore: v.painScore,
      abnormal: isAbnormalVitals(v),
    })
  }
  const medsByPatient = new Map<string, number>()
  for (const m of medications) medsByPatient.set(m.patientId, (medsByPatient.get(m.patientId) ?? 0) + 1)
  const dueByPatient = new Map<string, number>()
  for (const m of dueMedications) dueByPatient.set(m.patientId, (dueByPatient.get(m.patientId) ?? 0) + 1)

  return {
    profile: {
      id: profile.id,
      name: profile.user.name,
      email: profile.user.email,
      image: profile.user.image,
      shift: profile.shift,
      licenseNumber: profile.licenseNumber,
      departmentName: profile.department?.name ?? null,
    },
    stats: {
      admittedCount: census.length,
      dueMedicationCount: dueMedications.length,
      pendingLabCount: labOrders.length,
      noteCount: notes.length,
      wardsOccupied: new Set(census.map(c => c.bed.ward.name)).size,
    },
    patients: census.map(c => ({
      id: c.patientId,
      name: c.patient.user.name,
      image: c.patient.user.image,
      medicalRecordNumber: c.patient.medicalRecordNumber,
      bloodGroup: c.patient.bloodGroup,
      bedNumber: c.bed.number,
      wardName: c.bed.ward.name,
      admittedAt: c.admittedAt,
      diagnosis: c.diagnosis,
      reason: c.reason,
      attendingDoctor: c.doctor?.user.name ?? null,
      lastVitalsAt: latestVitalByPatient.get(c.patientId)?.recordedAt ?? null,
      lastVitals: latestVitalByPatient.get(c.patientId) ?? null,
      medicationCount: medsByPatient.get(c.patientId) ?? 0,
      dueMedicationCount: dueByPatient.get(c.patientId) ?? 0,
    })),
    latestVitals: [...latestVitalByPatient.values()].sort(
      (a, b) => Number(b.abnormal) - Number(a.abnormal) || b.recordedAt.getTime() - a.recordedAt.getTime()
    ),
    medications: medications.map(m => ({
      id: m.id,
      patientId: m.patientId,
      drugName: m.drugName,
      dosage: m.dosage,
      status: m.status,
      administeredAt: m.administeredAt,
      notes: m.notes,
      overdue: m.status === "PENDING" && m.administeredAt < now,
    })),
    notes: notes.map(n => ({
      id: n.id,
      patientId: n.patientId,
      noteType: n.noteType,
      content: n.content,
      createdAt: n.createdAt,
      authorName: n.author.name,
      authorImage: n.author.image,
    })),
    labOrders: labOrders.map(l => ({
      id: l.id,
      patientId: l.patientId,
      patientName: l.patient.user.name,
      status: l.status,
      priority: l.priority,
      orderedAt: l.orderedAt,
    })),
  }
}

export async function buildAdminPortal() {
  const now = new Date()
  const dayStart = startOfToday()

  // `groupBy` return types are not inferred correctly inside the array form of
  // `$transaction`, so these three aggregations run on their own connection.
  const roleCounts = await prisma.user.groupBy({ by: ["role"], _count: { _all: true } })
  const bedStats = await prisma.bed.groupBy({ by: ["isOccupied"], _count: { _all: true } })
  const labStats = await prisma.labOrder.groupBy({ by: ["status"], _count: { _all: true } })

  const [
    openAppointments,
    invoices,
    users,
    departments,
    equipment,
    inventory,
    leaveRequests,
    recentAudit,
    wards,
    labQueue,
    branches,
    monthBuckets,
  ] = await prisma.$transaction([
    prisma.appointment.count({
      where: { scheduledAt: { gte: dayStart }, status: { in: ["SCHEDULED", "CONFIRMED"] } },
    }),
    prisma.invoice.findMany({
      orderBy: { issuedAt: "desc" },
      take: 100,
      include: { patient: { include: { user: { select: { name: true } } } } },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        patient: { select: { medicalRecordNumber: true } },
        doctor: { select: { specialization: true, departmentId: true } },
        nurse: { select: { shift: true, departmentId: true } },
      },
    }),
    prisma.department.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { doctors: true, nurses: true, inventory: true, wards: true } } },
    }),
    prisma.equipment.findMany({ orderBy: { assetTag: "asc" } }),
    prisma.inventory.findMany({
      orderBy: { name: "asc" },
      include: { department: { select: { name: true } } },
    }),
    prisma.leaveRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { startDate: "asc" },
      include: { requester: { select: { name: true, image: true } } },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: { select: { name: true } } },
    }),
    prisma.ward.findMany({
      orderBy: { name: "asc" },
      include: { beds: { select: { id: true, isOccupied: true } } },
    }),
    prisma.labOrder.findMany({
      where: { status: { in: ["ORDERED", "COLLECTED", "IN_PROGRESS"] } },
      orderBy: [{ priority: "desc" }, { orderedAt: "asc" }],
      take: 50,
      include: {
        patient: { include: { user: { select: { name: true } } } },
        items: { select: { id: true, testName: true } },
      },
    }),
    prisma.branch.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { departments: true, wards: true } } },
    }),
    // Six months of invoice volume for the revenue trend chart.
    prisma.invoice.findMany({
      where: { issuedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1) } },
      select: { issuedAt: true, totalAmount: true, paidAmount: true },
    }),
  ])

  const totalBeds = bedStats.reduce((sum, b) => sum + b._count._all, 0)
  const occupiedBeds = bedStats.find(b => b.isOccupied)?._count._all ?? 0
  const outstanding = invoices
    .filter(i => i.status !== "VOID" && i.status !== "PAID")
    .reduce((sum, i) => sum + (Number(i.totalAmount) - Number(i.paidAmount)), 0)

  // Billed revenue bucketed by calendar month, oldest first, always six entries
  // so the chart keeps a stable x-axis even when a month has no invoices.
  const revenueByMonth = (() => {
    const now = new Date()
    const buckets: { month: string; total: number; collected: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      buckets.push({
        month: d.toLocaleDateString("en-US", { month: "short" }),
        total: 0,
        collected: 0,
      })
    }
    for (const invoice of monthBuckets) {
      const d = new Date(invoice.issuedAt)
      const offset = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
      const bucket = buckets[5 - offset]
      if (!bucket) continue
      bucket.total += Number(invoice.totalAmount)
      bucket.collected += Number(invoice.paidAmount)
    }
    return buckets
  })()

  return {
    stats: {
      userCount: roleCounts.reduce((sum, r) => sum + r._count._all, 0),
      roleCounts: roleCounts.map(r => ({ role: r.role, count: r._count._all })),
      departmentCount: departments.length,
      totalBeds,
      occupiedBeds,
      availableBeds: totalBeds - occupiedBeds,
      bedOccupancyRate: totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
      equipmentCount: equipment.length,
      openAppointments,
      outstandingBalance: outstanding,
      // Summed per line item, since aggregating quantity and unitCost separately
      // would multiply unrelated averages together.
      inventoryValue: inventory.reduce((sum, i) => sum + i.quantity * Number(i.unitCost), 0),
      labStats: labStats.map(l => ({ status: l.status, count: l._count._all })),
      pendingLeaveCount: leaveRequests.length,
      lowStockCount: inventory.filter(i => i.quantity <= i.reorderLevel).length,
      overdueMaintenanceCount: equipment.filter(
        e => e.nextMaintenanceAt != null && e.nextMaintenanceAt < now
      ).length,
    },
    users: users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      image: u.image,
      createdAt: u.createdAt,
      medicalRecordNumber: u.patient?.medicalRecordNumber ?? null,
      specialization: u.doctor?.specialization ?? null,
      shift: u.nurse?.shift ?? null,
    })),
    departments: departments.map(d => ({
      id: d.id,
      name: d.name,
      location: d.location,
      description: d.description,
      doctorCount: d._count.doctors,
      nurseCount: d._count.nurses,
      inventoryCount: d._count.inventory,
      wardCount: d._count.wards,
    })),
    equipment: equipment.map(e => ({
      id: e.id,
      name: e.name,
      category: e.category,
      assetTag: e.assetTag,
      serialNumber: e.serialNumber,
      location: e.location,
      status: e.status,
      lastMaintenanceAt: e.lastMaintenanceAt,
      nextMaintenanceAt: e.nextMaintenanceAt,
      maintenanceOverdue: e.nextMaintenanceAt != null && e.nextMaintenanceAt < now,
      unitCost: e.unitCost == null ? null : Number(e.unitCost),
    })),
    inventory: inventory.map(i => ({
      id: i.id,
      name: i.name,
      category: i.category,
      quantity: i.quantity,
      unit: i.unit,
      reorderLevel: i.reorderLevel,
      unitCost: Number(i.unitCost),
      supplier: i.supplier,
      expiryDate: i.expiryDate,
      departmentName: i.department.name,
      lowStock: i.quantity <= i.reorderLevel,
      expired: i.expiryDate != null && i.expiryDate < now,
    })),
    invoices: invoices.map(i => {
      const total = Number(i.totalAmount)
      const paid = Number(i.paidAmount)
      return {
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        patientName: i.patient.user.name,
        status: i.status,
        totalAmount: total,
        paidAmount: paid,
        balance: total - paid,
        issuedAt: i.issuedAt,
        dueAt: i.dueAt,
        overdue: i.dueAt != null && i.dueAt < now && paid < total,
      }
    }),
    leaveRequests: leaveRequests.map(l => ({
      id: l.id,
      requesterName: l.requester.name,
      requesterImage: l.requester.image,
      type: l.type,
      startDate: l.startDate,
      endDate: l.endDate,
      reason: l.reason,
      status: l.status,
    })),
    auditLog: recentAudit.map(a => ({
      id: a.id,
      userName: a.user.name,
      action: a.action,
      entity: a.entity,
      entityId: a.entityId,
      createdAt: a.createdAt,
    })),
    wards: wards.map(w => ({
      id: w.id,
      name: w.name,
      floor: w.floor,
      total: w.beds.length,
      occupied: w.beds.filter(b => b.isOccupied).length,
      isIcu: /icu|critical/i.test(w.name),
    })),
    labQueue: labQueue.map(l => ({
      id: l.id,
      patientName: l.patient.user.name,
      status: l.status,
      priority: l.priority,
      orderedAt: l.orderedAt,
      tests: l.items.map(i => i.testName),
    })),
    branches: branches.map(b => ({
      id: b.id,
      name: b.name,
      code: b.code,
      address: b.address,
      phone: b.phone,
      isActive: b.isActive,
      departmentCount: b._count.departments,
      wardCount: b._count.wards,
    })),
    revenueByMonth,
  }
}
