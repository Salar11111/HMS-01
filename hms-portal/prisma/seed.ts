import {
  PrismaClient,
  Role,
  AppointmentStatus,
  AdmissionStatus,
  LabOrderStatus,
  LabPriority,
  PrescriptionStatus,
  InvoiceStatus,
  PaymentMethod,
  EquipmentStatus,
  LeaveStatus,
} from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

/** Fixed ObjectIds so re-running the seed upserts the same documents. */
const SEED_IDS = {
  wardIcu: "64a000000000000000000001",
  wardGeneral: "64a000000000000000000002",
  admission1: "64a000000000000000000003",
  drugLisinopril: "64a000000000000000000011",
  drugAtorvastatin: "64a000000000000000000012",
  drugAmpicillin: "64a000000000000000000013",
  drugAmlodipine: "64a000000000000000000014",
  drugApixaban: "64a000000000000000000015",
  drugMetoprolol: "64a000000000000000000016",
  drugAspirin: "64a000000000000000000017",
} as const

const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000)

/**
 * A fixed day in the calendar month `months` ago. Used so demo invoices land in
 * six distinct months and the admin revenue trend chart has a full x-axis.
 * Day 12 is safe in every month, so the date never rolls over.
 */
function monthsAgoOnDay(months: number, dayOfMonth = 12) {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - months)
  d.setDate(dayOfMonth)
  d.setHours(10, 0, 0, 0)
  return d
}

/** Invoice numbers follow the issue date, e.g. `INV-2025-0312`. */
function invoiceNumberFor(issuedAt: Date) {
  return `INV-${issuedAt.getFullYear()}-${String(issuedAt.getMonth() + 1).padStart(2, "0")}${String(issuedAt.getDate()).padStart(2, "0")}`
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/** Errors that mean "the server went away", which are worth retrying. */
function isTransient(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code
  if (code === "P1001" || code === "P1002" || code === "P1017") return true
  const message = error instanceof Error ? error.message : String(error)
  return /Can't reach database server|Connection reset|Connection closed|server closed the connection|ETIMEDOUT|ECONNRESET|EPIPE/i.test(
    message
  )
}

/**
 * The first command after a cold start can fail while the server accepts
 * connections. Retry with backoff rather than aborting a long seed.
 */
async function withRetry<T>(label: string, run: () => Promise<T>, attempts = 4): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await run()
    } catch (error) {
      if (!isTransient(error) || attempt === attempts) throw error
      lastError = error
      const wait = attempt * 2000
      console.warn(
        `   ${label} hit a transient database error (attempt ${attempt}/${attempts}). Retrying in ${wait / 1000}s...`
      )
      await sleep(wait)
    }
  }

  throw lastError
}

/**
 * Clears the clinical demo data so the seed is safe to re-run and always
 * produces the same known-good demo state. Only rows attached to the four
 * demo accounts are touched, so any real accounts in the database survive.
 */
async function resetDemoClinicalData() {
  const demoUsers = await prisma.user.findMany({
    where: { email: { in: DEMO_EMAILS } },
    select: {
      id: true,
      patient: { select: { id: true } },
      doctor: { select: { id: true } },
      nurse: { select: { id: true } },
    },
  })

  const userIds = demoUsers.map(u => u.id)
  const patientIds = demoUsers.flatMap(u => (u.patient ? [u.patient.id] : []))
  const doctorIds = demoUsers.flatMap(u => (u.doctor ? [u.doctor.id] : []))
  const nurseIds = demoUsers.flatMap(u => (u.nurse ? [u.nurse.id] : []))

  if (patientIds.length === 0) return

  // Inventory and equipment are department-scoped rather than patient-scoped,
  // so clear the demo catalogue separately to keep the seed repeatable.
  const demoDepartmentNames = ["Pharmacy", "Laboratory", "Nursing", "Cardiology", "General Ward"]
  const demoDepartmentIds = (
    await prisma.department.findMany({
      where: { name: { in: demoDepartmentNames } },
      select: { id: true },
    })
  ).map(d => d.id)

  await prisma.$transaction([
    prisma.equipment.deleteMany({ where: { assetTag: { startsWith: "EQ-" } } }),
    prisma.inventory.deleteMany({ where: { departmentId: { in: demoDepartmentIds } } }),
    prisma.stockBatch.deleteMany({ where: { drug: { name: { in: DEMO_DRUG_NAMES } } } }),
  ])

  await prisma.$transaction([
    prisma.payment.deleteMany({ where: { invoice: { patientId: { in: patientIds } } } }),
    prisma.invoiceItem.deleteMany({ where: { invoice: { patientId: { in: patientIds } } } }),
    prisma.invoice.deleteMany({ where: { patientId: { in: patientIds } } }),
    prisma.medicationAdministration.deleteMany({ where: { patientId: { in: patientIds } } }),
    prisma.nursingNote.deleteMany({ where: { patientId: { in: patientIds } } }),
    prisma.vitalSign.deleteMany({ where: { patientId: { in: patientIds } } }),
    prisma.testResult.deleteMany({ where: { patientId: { in: patientIds } } }),
    prisma.labOrderItem.deleteMany({ where: { order: { patientId: { in: patientIds } } } }),
    prisma.labOrder.deleteMany({ where: { patientId: { in: patientIds } } }),
    prisma.prescriptionItem.deleteMany({ where: { prescription: { patientId: { in: patientIds } } } }),
    prisma.prescription.deleteMany({ where: { patientId: { in: patientIds } } }),
    prisma.medicalRecord.deleteMany({ where: { patientId: { in: patientIds } } }),
    prisma.appointment.deleteMany({ where: { patientId: { in: patientIds } } }),
    prisma.message.deleteMany({
      where: { OR: [{ senderId: { in: userIds } }, { recipientId: { in: userIds } }] },
    }),
    prisma.notification.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.leaveRequest.deleteMany({
      where: { OR: [{ requesterId: { in: userIds } }, { reviewerId: { in: userIds } }] },
    }),
    prisma.schedule.deleteMany({
      where: { OR: [{ doctorId: { in: doctorIds } }, { nurseId: { in: nurseIds } }] },
    }),
    prisma.admission.deleteMany({ where: { patientId: { in: patientIds } } }),
    prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } }),
  ])

  // Free any beds the previous run occupied.
  await prisma.bed.updateMany({ where: { isOccupied: true }, data: { isOccupied: false } })
}

// The demo cohort. Every user listed here has their clinical data cleared on
// each run, so the seed always produces the same known-good state. Keep this in
// sync with the cohort arrays in main().
const DEMO_EMAILS = [
  "patient@demo.com",
  "doctor@demo.com",
  "nurse@demo.com",
  "admin@demo.com",
  "robert.alvarez@demo.com",
  "amina.yusuf@demo.com",
  "daniel.okafor@demo.com",
  "grace.lindqvist@demo.com",
  "priya.nair@demo.com",
  "lena.fischer@demo.com",
  "tobias.lang@demo.com",
  "j.patel@demo.com",
  "maria.ortiz@demo.com",
  "a.bello@demo.com",
]

const DEMO_DRUG_NAMES = [
  "Lisinopril",
  "Atorvastatin",
  "Ampicillin",
]

async function main() {
  console.log("🌱 Seeding database...")

  await withRetry("connect", () => prisma.$runCommandRaw({ ping: 1 }))
  await withRetry("reset", () => resetDemoClinicalData())

  const passwordHash = await hash("demo123", 12)

  const patientUser = await prisma.user.upsert({
    where: { email: "patient@demo.com" },
    update: {},
    create: { email: "patient@demo.com", name: "Sarah Johnson", passwordHash, role: Role.PATIENT },
  })

  const doctorUser = await prisma.user.upsert({
    where: { email: "doctor@demo.com" },
    update: {},
    create: { email: "doctor@demo.com", name: "Dr. Michael Chen", passwordHash, role: Role.DOCTOR },
  })

  const nurseUser = await prisma.user.upsert({
    where: { email: "nurse@demo.com" },
    update: {},
    create: { email: "nurse@demo.com", name: "Emily Rodriguez", passwordHash, role: Role.NURSE },
  })

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: { email: "admin@demo.com", name: "James Wilson", passwordHash, role: Role.ADMIN },
  })

  const mainBranch = await prisma.branch.upsert({
    where: { code: "MHC-MAIN" },
    update: {},
    create: {
      name: "Meridian Health — Main Campus",
      code: "MHC-MAIN",
      address: "400 Wellness Way, Wellness City, WC 12345",
      phone: "(555) 010-1000",
    },
  })

  const northBranch = await prisma.branch.upsert({
    where: { code: "MHC-NORTH" },
    update: {},
    create: {
      name: "Meridian Health — Northside Clinic",
      code: "MHC-NORTH",
      address: "88 Northside Ave, Wellness City, WC 12346",
      phone: "(555) 010-2000",
    },
  })

  const departmentSeeds = [
    { name: "Cardiology", description: "Heart and vascular care", location: "Building A, 3rd Floor" },
    { name: "General Medicine", description: "Primary and internal medicine", location: "Building B, 1st Floor" },
    { name: "Laboratory", description: "Diagnostics and pathology", location: "Building A, Ground Floor" },
    { name: "Pharmacy", description: "Dispensing and clinical supply", location: "Building A, Ground Floor" },
    { name: "Nursing", description: "Inpatient and ward care", location: "Building C, 2nd Floor" },
    { name: "Administration", description: "Finance, HR and compliance", location: "Building B, 4th Floor" },
  ]

  const departments: Record<string, string> = {}
  for (const dept of departmentSeeds) {
    const created = await prisma.department.upsert({
      where: { name: dept.name },
      update: { location: dept.location },
      create: { ...dept, branchId: mainBranch.id },
    })
    departments[dept.name] = created.id
  }

  const patient = await prisma.patient.upsert({
    where: { userId: patientUser.id },
    update: {},
    create: {
      userId: patientUser.id,
      medicalRecordNumber: "MRN-100234",
      dateOfBirth: new Date("1979-03-15"),
      bloodGroup: "O+",
      phone: "(555) 123-4567",
      address: "123 Main St, Wellness City, WC 12345",
      emergencyContact: "John Johnson - (555) 123-4568",
      insuranceProvider: "Blue Cross Blue Shield",
      insurancePolicyNumber: "BCBS-123456789",
    },
  })

  const doctor = await prisma.doctor.upsert({
    where: { userId: doctorUser.id },
    update: {},
    create: {
      userId: doctorUser.id,
      specialization: "Cardiology",
      licenseNumber: "MD-12345-CA",
      departmentId: departments["Cardiology"],
      consultationFee: 150,
    },
  })

  const nurse = await prisma.nurse.upsert({
    where: { userId: nurseUser.id },
    update: {},
    create: {
      userId: nurseUser.id,
      departmentId: departments["Nursing"],
      shift: "Day",
      licenseNumber: "RN-88231-CA",
    },
  })

  await prisma.admin.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      permissions: ["billing", "inventory", "hr", "compliance", "reports"],
    },
  })

  const appointments = await Promise.all(
    [
      { at: daysFromNow(2), status: AppointmentStatus.CONFIRMED, reason: "Hypertension follow-up", duration: 30 },
      { at: daysFromNow(7), status: AppointmentStatus.SCHEDULED, reason: "Annual checkup", duration: 45 },
      { at: daysFromNow(-5), status: AppointmentStatus.COMPLETED, reason: "Chest pain evaluation", duration: 30 },
    ].map((data) =>
      prisma.appointment.create({
        data: { patientId: patient.id, doctorId: doctor.id, scheduledAt: data.at, duration: data.duration, status: data.status, reason: data.reason },
      }),
    ),
  )

  await prisma.medicalRecord.createMany({
    data: [
      {
        patientId: patient.id,
        doctorId: doctor.id,
        diagnosis: "Essential hypertension (I10)",
        treatment: "Lisinopril 10mg daily, lifestyle modifications",
        notes: "BP well controlled at 128/82. Continue current regimen. Follow up in 3 months.",
      },
      {
        patientId: patient.id,
        doctorId: doctor.id,
        diagnosis: "Hyperlipidemia (E78.5)",
        treatment: "Atorvastatin 20mg at bedtime, statin recheck in 12 weeks",
        notes: "LDL 118 mg/dL, improving but above target. Reinforced dietary counselling.",
      },
    ],
  })

  await prisma.testResult.createMany({
    data: [
      {
        patientId: patient.id,
        testName: "Comprehensive Metabolic Panel",
        result: "All values within normal limits. Glucose 94, BUN 18, Creatinine 0.9, eGFR >60.",
        referenceRange: "Normal",
        status: "FINAL",
        orderedBy: "Dr. Michael Chen",
        performedAt: daysFromNow(-3),
      },
      {
        patientId: patient.id,
        testName: "Lipid Panel",
        result: "Total cholesterol 198, LDL 118, HDL 52, Triglycerides 140. LDL slightly elevated.",
        referenceRange: "LDL <100 optimal",
        status: "FINAL",
        orderedBy: "Dr. Michael Chen",
        performedAt: daysFromNow(-10),
      },
    ],
  })

  const icuWard = await prisma.ward.upsert({
    where: { id: SEED_IDS.wardIcu },
    update: {},
    create: { id: SEED_IDS.wardIcu, name: "Intensive Care", floor: "3rd Floor", branchId: mainBranch.id, departmentId: departments["Cardiology"] },
  })

  const generalWard = await prisma.ward.upsert({
    where: { id: SEED_IDS.wardGeneral },
    update: {},
    create: { id: SEED_IDS.wardGeneral, name: "General Ward", floor: "2nd Floor", branchId: mainBranch.id, departmentId: departments["Nursing"] },
  })

  const bedSeeds = [
    { wardId: icuWard.id, number: "ICU-01", bedType: "ICU", dailyRate: 2400 },
    { wardId: icuWard.id, number: "ICU-02", bedType: "ICU", dailyRate: 2400 },
    { wardId: icuWard.id, number: "ICU-03", bedType: "ICU", dailyRate: 2400 },
    { wardId: generalWard.id, number: "GW-101", bedType: "STANDARD", dailyRate: 950 },
    { wardId: generalWard.id, number: "GW-102", bedType: "STANDARD", dailyRate: 950 },
    { wardId: generalWard.id, number: "GW-103", bedType: "STANDARD", dailyRate: 950 },
    { wardId: generalWard.id, number: "GW-104", bedType: "DELUXE", dailyRate: 1200 },
  ]

  for (const bed of bedSeeds) {
    await prisma.bed.upsert({
      where: { wardId_number: { wardId: bed.wardId, number: bed.number } },
      update: {},
      create: { ...bed, isOccupied: false },
    })
  }

  const firstBed = await prisma.bed.findFirstOrThrow({ where: { wardId: icuWard.id, number: "ICU-01" } })

  await prisma.admission.upsert({
    where: { id: SEED_IDS.admission1 },
    update: {},
    create: {
      id: SEED_IDS.admission1,
      patientId: patient.id,
      bedId: firstBed.id,
      doctorId: doctor.id,
      status: AdmissionStatus.ADMITTED,
      reason: "Unstable angina, under observation",
      diagnosis: "I20.0 Unstable angina",
      admittedAt: daysFromNow(-2),
      notes: "Telemetry monitoring, cardiac workup in progress.",
    },
  })
  await prisma.bed.update({ where: { id: firstBed.id }, data: { isOccupied: true } })

  const labs = await Promise.all([
    prisma.labOrder.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentId: appointments[2].id,
        status: LabOrderStatus.COMPLETED,
        priority: LabPriority.URGENT,
        orderedAt: daysFromNow(-4),
        completedAt: daysFromNow(-3),
        items: {
          create: [
            { testName: "Troponin I", result: "0.02", unit: "ng/mL", referenceRange: "< 0.04", flag: "NORMAL", performedAt: daysFromNow(-3) },
            { testName: "BNP", result: "184", unit: "pg/mL", referenceRange: "< 100", flag: "HIGH", performedAt: daysFromNow(-3) },
            { testName: "CBC with Differential", result: "WBC 8.4, Hgb 13.6, Plt 250", unit: "", referenceRange: "Normal", flag: "NORMAL", performedAt: daysFromNow(-3) },
          ],
        },
      },
    }),
    prisma.labOrder.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentId: appointments[0].id,
        status: LabOrderStatus.ORDERED,
        priority: LabPriority.ROUTINE,
        orderedAt: daysFromNow(1),
        items: { create: [{ testName: "Lipid Panel" }, { testName: "HbA1c" }] },
      },
    }),
  ])

  const lisinopril = await prisma.drug.upsert({
    where: { id: SEED_IDS.drugLisinopril },
    update: {},
    create: { id: SEED_IDS.drugLisinopril, name: "Lisinopril", genericName: "Lisinopril", form: "Tablet", strength: "10mg", unitCost: 0.15, reorderLevel: 100, supplier: "PharmaCorp" },
  })

  const atorvastatin = await prisma.drug.upsert({
    where: { id: SEED_IDS.drugAtorvastatin },
    update: {},
    create: { id: SEED_IDS.drugAtorvastatin, name: "Atorvastatin", genericName: "Atorvastatin Calcium", form: "Tablet", strength: "20mg", unitCost: 0.22, reorderLevel: 50, supplier: "PharmaCorp" },
  })

  const ampicillin = await prisma.drug.upsert({
    where: { id: SEED_IDS.drugAmpicillin },
    update: {},
    create: { id: SEED_IDS.drugAmpicillin, name: "Ampicillin", genericName: "Ampicillin Sodium", form: "Vial", strength: "1g", unitCost: 4.8, reorderLevel: 40, supplier: "MedSupply Inc" },
  })

  const batchSeeds = [
    { drugId: lisinopril.id, batchNumber: "LIS-2401A", expiryDate: daysFromNow(420), quantity: 500 },
    { drugId: lisinopril.id, batchNumber: "LIS-2311C", expiryDate: daysFromNow(60), quantity: 40 },
    { drugId: atorvastatin.id, batchNumber: "ATO-2403B", expiryDate: daysFromNow(300), quantity: 300 },
    { drugId: ampicillin.id, batchNumber: "AMP-2312A", expiryDate: daysFromNow(-12), quantity: 65 },
  ]

  for (const batch of batchSeeds) {
    await prisma.stockBatch.upsert({
      where: { drugId_batchNumber: { drugId: batch.drugId, batchNumber: batch.batchNumber } },
      update: {},
      create: { ...batch, unitCost: 0.15 },
    })
  }

  const prescription = await prisma.prescription.create({
    data: {
      patientId: patient.id,
      prescriberId: doctor.id,
      appointmentId: appointments[0].id,
      status: PrescriptionStatus.ACTIVE,
      issuedAt: daysFromNow(-30),
      expiresAt: daysFromNow(335),
      notes: "Continue unless BP drops below 100/60 or persistent dry cough occurs.",
      items: {
        create: [
          { drugId: lisinopril.id, dosage: "10mg", frequency: "Once daily", duration: "90 days", quantity: 90, refillsLeft: 2 },
          { drugId: atorvastatin.id, dosage: "20mg", frequency: "Once daily at bedtime", duration: "90 days", quantity: 90, refillsLeft: 1 },
        ],
      },
    },
  })

  const demoPatientInvoiceNumber = invoiceNumberFor(daysFromNow(-6))

  await prisma.invoice.create({
    data: {
      patientId: patient.id,
      invoiceNumber: demoPatientInvoiceNumber,
      status: InvoiceStatus.PARTIALLY_PAID,
      totalAmount: 3480,
      paidAmount: 1500,
      issuedAt: daysFromNow(-6),
      dueAt: daysFromNow(9),
      items: {
        create: [
          { description: "Cardiology consultation", category: "Consultation", quantity: 1, unitPrice: 150, amount: 150 },
          { description: "ICU bed — 2 days", category: "Accommodation", quantity: 2, unitPrice: 950, amount: 1900 },
          { description: "Troponin / BNP panel", category: "Laboratory", quantity: 1, unitPrice: 320, amount: 320 },
          { description: "Pharmacy — Lisinopril 90 tabs", category: "Pharmacy", quantity: 1, unitPrice: 13.5, amount: 13.5 },
          { description: "Cardiac imaging", category: "Imaging", quantity: 1, unitPrice: 1096.5, amount: 1096.5 },
        ],
      },
      payments: { create: [{ amount: 1500, method: PaymentMethod.INSURANCE, reference: "CLM-88213" }] },
    },
  })

  await prisma.vitalSign.createMany({
    data: [
      { patientId: patient.id, recordedById: nurseUser.id, recordedAt: daysFromNow(-2), temperature: 37.1, heartRate: 78, systolic: 132, diastolic: 86, respiratoryRate: 18, oxygenSaturation: 97, weightKg: 74.8, painScore: 2 },
      { patientId: patient.id, recordedById: nurseUser.id, recordedAt: daysFromNow(-1), temperature: 36.8, heartRate: 74, systolic: 128, diastolic: 82, respiratoryRate: 16, oxygenSaturation: 98, weightKg: 74.6, painScore: 1 },
      { patientId: patient.id, recordedById: nurseUser.id, recordedAt: new Date(), temperature: 36.9, heartRate: 71, systolic: 126, diastolic: 80, respiratoryRate: 16, oxygenSaturation: 98, weightKg: 74.5, painScore: 1 },
    ],
  })

  await prisma.nursingNote.createMany({
    data: [
      { patientId: patient.id, authorId: nurseUser.id, noteType: "PROGRESS", content: "Telemetry: sinus rhythm, occasional isolated PACs. Tolerating activity well, no chest pain reported." },
      { patientId: patient.id, authorId: nurseUser.id, noteType: "MEDICATION", content: "Lisinopril 10mg administered 08:00. Atorvastatin 20mg administered 21:00 per MAR." },
      { patientId: patient.id, authorId: nurseUser.id, noteType: "HANDOFF", content: "Handoff to day shift: stable, awaiting cardiology consult and repeat troponin at 14:00." },
    ],
  })

  await prisma.medicationAdministration.createMany({
    data: [
      { patientId: patient.id, nurseId: nurse.id, drugName: "Lisinopril", dosage: "10mg", status: "GIVEN", administeredAt: daysFromNow(-1) },
      { patientId: patient.id, nurseId: nurse.id, drugName: "Atorvastatin", dosage: "20mg", status: "GIVEN", administeredAt: daysFromNow(-1) },
      { patientId: patient.id, nurseId: nurse.id, drugName: "Lisinopril", dosage: "10mg", status: "HELD", administeredAt: new Date(), notes: "Held pending repeat BP — systolic 96 at 06:00." },
    ],
  })

  await prisma.inventory.createMany({
    data: [
      { departmentId: departments["Pharmacy"], name: "IV Saline 0.9% 500ml", category: "Fluids", quantity: 180, unit: "bags", reorderLevel: 60, unitCost: 3.2, supplier: "MedSupply Inc" },
      { departmentId: departments["Laboratory"], name: "Blood Culture Vials", category: "Diagnostics", quantity: 40, unit: "units", reorderLevel: 80, unitCost: 6.5, supplier: "MedSupply Inc" },
      { departmentId: departments["Nursing"], name: "Nitrile Gloves (M)", category: "Consumables", quantity: 900, unit: "pairs", reorderLevel: 400, unitCost: 0.12, supplier: "SafeCare" },
    ],
  })

  await prisma.equipment.createMany({
    data: [
      { name: "Cardiac Monitor — Philips IntelliVue", category: "Monitoring", assetTag: "EQ-CARD-001", serialNumber: "PH-88213", location: "ICU Bay 1", status: EquipmentStatus.OPERATIONAL, lastMaintenanceAt: daysFromNow(-40), nextMaintenanceAt: daysFromNow(50), unitCost: 18500 },
      { name: "Ventilator — Hamilton C6", category: "Respiratory", assetTag: "EQ-VENT-002", serialNumber: "HM-44190", location: "ICU Bay 2", status: EquipmentStatus.MAINTENANCE, lastMaintenanceAt: daysFromNow(-95), nextMaintenanceAt: daysFromNow(-5), unitCost: 42000 },
      { name: "Chemistry Analyzer — Roche cobas", category: "Laboratory", assetTag: "EQ-LAB-003", serialNumber: "RC-11872", location: "Laboratory", status: EquipmentStatus.OPERATIONAL, lastMaintenanceAt: daysFromNow(-20), nextMaintenanceAt: daysFromNow(70), unitCost: 96000 },
      { name: "Patient Bed — Hillrom Advance 2", category: "Furniture", assetTag: "EQ-BED-004", serialNumber: "HR-70923", location: "General Ward", status: EquipmentStatus.OPERATIONAL, lastMaintenanceAt: daysFromNow(-120), nextMaintenanceAt: daysFromNow(-30), unitCost: 3200 },
    ],
  })

  await prisma.leaveRequest.createMany({
    data: [
      { requesterId: nurseUser.id, reviewerId: adminUser.id, type: "ANNUAL", startDate: daysFromNow(21), endDate: daysFromNow(28), reason: "Family holiday", status: LeaveStatus.PENDING },
      { requesterId: doctorUser.id, reviewerId: adminUser.id, type: "CME", startDate: daysFromNow(40), endDate: daysFromNow(42), reason: "Cardiology conference", status: LeaveStatus.APPROVED },
    ],
  })

  await prisma.message.createMany({
    data: [
      { senderId: doctorUser.id, recipientId: patientUser.id, patientId: patient.id, subject: "Repeat troponin scheduled", body: "Hi Sarah, we've scheduled a repeat troponin for 2pm today. No preparation needed — you can continue your normal routine until then." },
      { senderId: patientUser.id, recipientId: doctorUser.id, patientId: patient.id, subject: "Question about atorvastatin timing", body: "Should I still take the atorvastatin if I miss a dose at bedtime?" },
    ],
  })

  await prisma.notification.createMany({
    data: [
      { userId: doctorUser.id, title: "BNP result flagged HIGH", body: `${patient.medicalRecordNumber} — BNP 184 pg/mL (ref < 100)`, link: "/portal/doctor/ehr" },
      { userId: nurseUser.id, title: "MAR entry required", body: "Morning medication round has 1 held dose pending review.", link: "/portal/nurse/medications" },
      { userId: adminUser.id, title: "Bed turnover pending", body: "GW-102 discharge paperwork awaiting bed credit allocation.", link: "/portal/admin/inventory" },
    ],
  })

  await prisma.schedule.createMany({
    data: [
      { doctorId: doctor.id, dayOfWeek: 1, startTime: "08:00", endTime: "12:00" },
      { doctorId: doctor.id, dayOfWeek: 1, startTime: "13:00", endTime: "17:00" },
      { doctorId: doctor.id, dayOfWeek: 3, startTime: "08:00", endTime: "12:00" },
      { doctorId: doctor.id, dayOfWeek: 3, startTime: "13:00", endTime: "17:00" },
      { doctorId: doctor.id, dayOfWeek: 5, startTime: "08:00", endTime: "12:00" },
      { nurseId: nurse.id, dayOfWeek: 1, startTime: "07:00", endTime: "15:00" },
      { nurseId: nurse.id, dayOfWeek: 2, startTime: "07:00", endTime: "15:00" },
      { nurseId: nurse.id, dayOfWeek: 3, startTime: "07:00", endTime: "15:00" },
      { nurseId: nurse.id, dayOfWeek: 4, startTime: "15:00", endTime: "23:00" },
      { nurseId: nurse.id, dayOfWeek: 5, startTime: "07:00", endTime: "15:00" },
    ],
  })

  await prisma.auditLog.createMany({
    data: [
      { userId: adminUser.id, action: "UPDATE", entity: "Invoice", entityId: "INV-2024-0912", newData: JSON.stringify({ status: "PARTIALLY_PAID", paidAmount: 1500 }) },
      { userId: doctorUser.id, action: "CREATE", entity: "LabOrder", entityId: labs[0].id, newData: JSON.stringify({ priority: "URGENT" }) },
      { userId: nurseUser.id, action: "CREATE", entity: "MedicationAdministration", newData: JSON.stringify({ drugName: "Lisinopril", status: "HELD" }) },
    ],
  })

  // ---------------------------------------------------------------------------
  // Cohort
  //
  // The four demo logins above are the accounts reviewers sign in with, but a
  // single patient makes every list page look empty. The cohort below gives the
  // doctor queue, nurse assignment board, admin dashboards and patient charts
  // enough rows to be representative.
  // ---------------------------------------------------------------------------

  const hoursFromNow = (h: number) => new Date(Date.now() + h * 60 * 60 * 1000)

  const cohortPatientSeeds = [
    {
      email: "robert.alvarez@demo.com",
      name: "Robert Alvarez",
      mrn: "MRN-100871",
      dateOfBirth: new Date("1965-07-22"),
      bloodGroup: "A+",
      phone: "(555) 234-5678",
      insuranceProvider: "Aetna",
      condition: "Hypertension",
      risk: "MEDIUM",
    },
    {
      email: "amina.yusuf@demo.com",
      name: "Amina Yusuf",
      mrn: "MRN-100455",
      dateOfBirth: new Date("1992-11-04"),
      bloodGroup: "O-",
      phone: "(555) 345-6789",
      insuranceProvider: "Self-pay",
      condition: "Palpitations — new",
      risk: "LOW",
    },
    {
      email: "daniel.okafor@demo.com",
      name: "Daniel Okafor",
      mrn: "MRN-100612",
      dateOfBirth: new Date("1974-02-18"),
      bloodGroup: "B+",
      phone: "(555) 456-7890",
      insuranceProvider: "United Healthcare",
      condition: "Coronary artery disease",
      risk: "MEDIUM",
    },
    {
      email: "grace.lindqvist@demo.com",
      name: "Grace Lindqvist",
      mrn: "MRN-100988",
      dateOfBirth: new Date("1958-09-30"),
      bloodGroup: "AB+",
      phone: "(555) 567-8901",
      insuranceProvider: "Medicare",
      condition: "Atrial fibrillation",
      risk: "HIGH",
    },
  ]

  const cohortPatients: { id: string; mrn: string; name: string }[] = []
  for (const seed of cohortPatientSeeds) {
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: {},
      create: { email: seed.email, name: seed.name, passwordHash, role: Role.PATIENT },
    })
    const profile = await prisma.patient.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        medicalRecordNumber: seed.mrn,
        dateOfBirth: seed.dateOfBirth,
        bloodGroup: seed.bloodGroup,
        phone: seed.phone,
        address: "1 Demo Way, Wellness City, WC 12345",
        emergencyContact: "Emergency Contact — (555) 000-0000",
        insuranceProvider: seed.insuranceProvider,
        insurancePolicyNumber: `${seed.insuranceProvider?.slice(0, 3).toUpperCase() ?? "GEN"}-${seed.mrn.slice(4)}`,
      },
    })
    cohortPatients.push({ id: profile.id, mrn: seed.mrn, name: seed.name })
  }

  const cohortDoctorSeeds = [
    { email: "priya.nair@demo.com", name: "Dr. Priya Nair", specialization: "General Medicine", licenseNumber: "MD-33218-CA", fee: 120 },
    { email: "lena.fischer@demo.com", name: "Dr. Lena Fischer", specialization: "Dermatology", licenseNumber: "MD-40903-CA", fee: 135 },
    { email: "tobias.lang@demo.com", name: "Dr. Tobias Lang", specialization: "Orthopedics", licenseNumber: "MD-55120-CA", fee: 145 },
  ]

  const cohortDoctors: { id: string; name: string; fee: number; userId: string }[] = []
  for (const seed of cohortDoctorSeeds) {
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: {},
      create: { email: seed.email, name: seed.name, passwordHash, role: Role.DOCTOR },
    })
    const profile = await prisma.doctor.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        specialization: seed.specialization,
        licenseNumber: seed.licenseNumber,
        departmentId: departments["General Medicine"],
        consultationFee: seed.fee,
      },
    })
    cohortDoctors.push({ id: profile.id, name: seed.name, fee: seed.fee, userId: user.id })
  }

  const cohortNurseSeeds = [
    { email: "j.patel@demo.com", name: "J. Patel", shift: "Night", licenseNumber: "RN-74410-CA" },
    { email: "maria.ortiz@demo.com", name: "Maria Ortiz", shift: "Night", licenseNumber: "RN-90118-CA" },
    { email: "a.bello@demo.com", name: "A. Bello", shift: "Day", licenseNumber: "RN-61244-CA" },
  ]

  const cohortNurses: { id: string; name: string; userId: string }[] = []
  for (const seed of cohortNurseSeeds) {
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: {},
      create: { email: seed.email, name: seed.name, passwordHash, role: Role.NURSE },
    })
    const profile = await prisma.nurse.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        departmentId: departments["Nursing"],
        shift: seed.shift,
        licenseNumber: seed.licenseNumber,
      },
    })
    cohortNurses.push({ id: profile.id, name: seed.name, userId: user.id })
  }

  const allDoctors = [{ id: doctor.id, name: "Dr. Michael Chen", fee: 150, userId: doctorUser.id }, ...cohortDoctors]
  const allNurses = [{ id: nurse.id, name: "Emily Rodriguez", userId: nurseUser.id }, ...cohortNurses]
  const allPatients = [{ id: patient.id, mrn: patient.medicalRecordNumber ?? "MRN-100234", name: "Sarah Johnson" }, ...cohortPatients]

  // Appointments across the cohort, mixing past visits with upcoming ones so the
  // doctor queue and each patient's schedule both have rows.
  const appointmentPlan: { patientIndex: number; doctorIndex: number; at: Date; status: AppointmentStatus; reason: string; duration: number }[] = [
    { patientIndex: 1, doctorIndex: 0, at: hoursFromNow(-5), status: AppointmentStatus.COMPLETED, reason: "Chest pain follow-up", duration: 30 },
    { patientIndex: 2, doctorIndex: 1, at: hoursFromNow(-3), status: AppointmentStatus.COMPLETED, reason: "Hypertension review", duration: 30 },
    { patientIndex: 3, doctorIndex: 0, at: hoursFromNow(1), status: AppointmentStatus.CONFIRMED, reason: "New patient consult", duration: 45 },
    { patientIndex: 4, doctorIndex: 2, at: hoursFromNow(2), status: AppointmentStatus.CONFIRMED, reason: "Arrhythmia assessment", duration: 45 },
    { patientIndex: 1, doctorIndex: 0, at: hoursFromNow(3), status: AppointmentStatus.SCHEDULED, reason: "Post-discharge review", duration: 30 },
    { patientIndex: 2, doctorIndex: 1, at: daysFromNow(4), status: AppointmentStatus.SCHEDULED, reason: "Medication review", duration: 30 },
    { patientIndex: 3, doctorIndex: 1, at: daysFromNow(6), status: AppointmentStatus.SCHEDULED, reason: "Initial consultation", duration: 45 },
    { patientIndex: 4, doctorIndex: 2, at: daysFromNow(9), status: AppointmentStatus.SCHEDULED, reason: "Orthopaedic follow-up", duration: 30 },
  ]

  for (const plan of appointmentPlan) {
    const p = allPatients[plan.patientIndex]
    const d = allDoctors[plan.doctorIndex]
    const existing = await prisma.appointment.findFirst({
      where: { patientId: p.id, doctorId: d.id, scheduledAt: plan.at },
      select: { id: true },
    })
    if (existing) continue
    await prisma.appointment.create({
      data: {
        patientId: p.id,
        doctorId: d.id,
        scheduledAt: plan.at,
        duration: plan.duration,
        status: plan.status,
        reason: plan.reason,
      },
    })
  }

  // Inpatient admissions fill beds so ward occupancy is non-zero.
  const admissionPlan: { patientIndex: number; bedNumber: string; status: AdmissionStatus; reason: string; diagnosis: string; doctorIndex: number; daysAgo: number }[] = [
    { patientIndex: 4, bedNumber: "ICU-02", status: AdmissionStatus.ADMITTED, reason: "Tachycardia, under observation", diagnosis: "I48.91 Atrial fibrillation with RVR", doctorIndex: 0, daysAgo: 1 },
    { patientIndex: 3, bedNumber: "GW-101", status: AdmissionStatus.ADMITTED, reason: "Post-PCI observation", diagnosis: "I25.10 Coronary artery disease", doctorIndex: 0, daysAgo: 2 },
    { patientIndex: 2, bedNumber: "GW-102", status: AdmissionStatus.ADMITTED, reason: "Chest pain under evaluation", diagnosis: "R07.9 Chest pain, unspecified", doctorIndex: 1, daysAgo: 1 },
  ]

  for (const plan of admissionPlan) {
    const p = allPatients[plan.patientIndex]
    const d = allDoctors[plan.doctorIndex]
    const bed = await prisma.bed.findFirst({ where: { number: plan.bedNumber }, select: { id: true } })
    if (!bed) continue
    const existing = await prisma.admission.findFirst({
      where: { patientId: p.id, bedId: bed.id },
      select: { id: true },
    })
    if (existing) continue
    await prisma.admission.create({
      data: {
        patientId: p.id,
        bedId: bed.id,
        doctorId: d.id,
        status: plan.status,
        reason: plan.reason,
        diagnosis: plan.diagnosis,
        admittedAt: daysFromNow(-plan.daysAgo),
        notes: "Admitted for observation and serial monitoring.",
      },
    })
    await prisma.bed.update({ where: { id: bed.id }, data: { isOccupied: true } })
  }

  // Vitals for every cohort patient, newest last.
  const vitalPlan: { patientIndex: number; at: Date; temperature: number; heartRate: number; systolic: number; diastolic: number; respiratoryRate: number; oxygenSaturation: number; painScore: number }[] = [
    { patientIndex: 1, at: hoursFromNow(-3), temperature: 36.9, heartRate: 112, systolic: 104, diastolic: 62, respiratoryRate: 24, oxygenSaturation: 93, painScore: 3 },
    { patientIndex: 1, at: hoursFromNow(-1), temperature: 37.1, heartRate: 98, systolic: 108, diastolic: 66, respiratoryRate: 21, oxygenSaturation: 95, painScore: 2 },
    { patientIndex: 2, at: hoursFromNow(-4), temperature: 37.2, heartRate: 88, systolic: 112, diastolic: 70, respiratoryRate: 18, oxygenSaturation: 96, painScore: 5 },
    { patientIndex: 3, at: hoursFromNow(-2), temperature: 36.7, heartRate: 68, systolic: 118, diastolic: 74, respiratoryRate: 15, oxygenSaturation: 97, painScore: 0 },
    { patientIndex: 3, at: hoursFromNow(-6), temperature: 36.5, heartRate: 66, systolic: 116, diastolic: 72, respiratoryRate: 14, oxygenSaturation: 98, painScore: 0 },
    { patientIndex: 4, at: hoursFromNow(-1), temperature: 37.4, heartRate: 118, systolic: 102, diastolic: 60, respiratoryRate: 26, oxygenSaturation: 92, painScore: 4 },
  ]

  for (const v of vitalPlan) {
    const p = allPatients[v.patientIndex]
    const existing = await prisma.vitalSign.findFirst({
      where: { patientId: p.id, recordedAt: v.at },
      select: { id: true },
    })
    if (existing) continue
    await prisma.vitalSign.create({
      data: {
        patientId: p.id,
        recordedById: nurseUser.id,
        nurseId: nurse.id,
        recordedAt: v.at,
        temperature: v.temperature,
        heartRate: v.heartRate,
        systolic: v.systolic,
        diastolic: v.diastolic,
        respiratoryRate: v.respiratoryRate,
        oxygenSaturation: v.oxygenSaturation,
        painScore: v.painScore,
      },
    })
  }

  await prisma.medicalRecord.createMany({
    data: [
      { patientId: allPatients[1].id, doctorId: allDoctors[0].id, diagnosis: "I48.91 Atrial fibrillation with rapid ventricular response", treatment: "Metoprolol 25mg twice daily, rate control", notes: "Rate 110-120 overnight, responded to metoprolol. Needs 4h ECG and electrolytes." },
      { patientId: allPatients[1].id, doctorId: allDoctors[0].id, diagnosis: "I10 Essential hypertension", treatment: "Amlodipine 5mg daily", notes: "BP averaging 132/86. Continue current regimen and reassess in 4 weeks." },
      { patientId: allPatients[2].id, doctorId: allDoctors[1].id, diagnosis: "R07.9 Chest pain, unspecified", treatment: "Observation, serial troponin", notes: "ECG non-diagnostic for ischaemia. Troponin negative at 3h. For cardiology input." },
      { patientId: allPatients[3].id, doctorId: allDoctors[0].id, diagnosis: "I25.10 Coronary artery disease", treatment: "Aspirin 81mg daily, statin therapy", notes: "Access site clean and dry. No haematoma. Ambulating unassisted." },
      { patientId: allPatients[4].id, doctorId: allDoctors[2].id, diagnosis: "I48.91 Atrial fibrillation", treatment: "Apixaban 5mg twice daily, rate control", notes: "Rate control titrated overnight. Recheck electrolytes before discharge." },
    ],
  })

  await prisma.nursingNote.createMany({
    data: [
      { patientId: allPatients[1].id, authorId: nurseUser.id, nurseId: nurse.id, noteType: "HANDOFF", content: "Handoff to day shift: stable overnight, telemetry sinus rhythm with isolated PACs. Repeat troponin due 14:00." },
      { patientId: allPatients[1].id, authorId: nurseUser.id, nurseId: nurse.id, noteType: "VITALS", content: "New irregular tachycardia 112 bpm, SpO2 93% on room air. Escalated to on-call physician." },
      { patientId: allPatients[3].id, authorId: nurseUser.id, nurseId: nurse.id, noteType: "MEDICATION", content: "Aspirin 81mg administered. No bleeding from access site." },
      { patientId: allPatients[4].id, authorId: nurseUser.id, nurseId: nurse.id, noteType: "PROGRESS", content: "Rate 110-120 overnight, responded to metoprolol. Needs 4h ECG and electrolytes." },
      { patientId: allPatients[2].id, authorId: nurseUser.id, nurseId: nurse.id, noteType: "PROGRESS", content: "Chest pain under evaluation. Denies radiation to jaw or arm. Serial troponin pending." },
    ],
  })

  await prisma.medicationAdministration.createMany({
    data: [
      { patientId: allPatients[1].id, nurseId: nurse.id, drugName: "Metoprolol", dosage: "25mg", status: "GIVEN", administeredAt: hoursFromNow(-6), notes: "Rate 112 before dose, 96 after." },
      { patientId: allPatients[1].id, nurseId: nurse.id, drugName: "Apixaban", dosage: "5mg", status: "HELD", administeredAt: hoursFromNow(-1), notes: "Held pending physician review of morning INR." },
      { patientId: allPatients[2].id, nurseId: nurse.id, drugName: "Amlodipine", dosage: "5mg", status: "GIVEN", administeredAt: hoursFromNow(-8) },
      { patientId: allPatients[3].id, nurseId: nurse.id, drugName: "Aspirin", dosage: "81mg", status: "GIVEN", administeredAt: hoursFromNow(-9) },
      { patientId: allPatients[3].id, nurseId: nurse.id, drugName: "Atorvastatin", dosage: "20mg", status: "GIVEN", administeredAt: hoursFromNow(-9) },
      { patientId: allPatients[4].id, nurseId: nurse.id, drugName: "Metoprolol", dosage: "25mg", status: "PENDING", administeredAt: hoursFromNow(2) },
      { patientId: allPatients[4].id, nurseId: nurse.id, drugName: "Furosemide", dosage: "40mg", status: "GIVEN", administeredAt: hoursFromNow(-5) },
    ],
  })

  // Prescriptions for the cohort, so the doctor's prescribing list and each
  // patient's medication list are populated.
  const extraDrugs = [
    { key: "amlodipine", data: { id: SEED_IDS.drugAmlodipine, name: "Amlodipine", genericName: "Amlodipine Besylate", form: "Tablet", strength: "5mg", unitCost: 0.11, reorderLevel: 60, supplier: "PharmaCorp" } },
    { key: "apixaban", data: { id: SEED_IDS.drugApixaban, name: "Apixaban", genericName: "Apixaban", form: "Tablet", strength: "5mg", unitCost: 1.85, reorderLevel: 40, supplier: "MedSupply Inc" } },
    { key: "metoprolol", data: { id: SEED_IDS.drugMetoprolol, name: "Metoprolol", genericName: "Metoprolol Tartrate", form: "Tablet", strength: "25mg", unitCost: 0.18, reorderLevel: 80, supplier: "PharmaCorp" } },
    { key: "aspirin", data: { id: SEED_IDS.drugAspirin, name: "Aspirin", genericName: "Acetylsalicylic Acid", form: "Tablet", strength: "81mg", unitCost: 0.04, reorderLevel: 200, supplier: "PharmaCorp" } },
  ]
  const drugByKey: Record<string, string> = {
    lisinopril: lisinopril.id,
    atorvastatin: atorvastatin.id,
  }
  for (const extra of extraDrugs) {
    const created = await prisma.drug.upsert({
      where: { id: extra.data.id },
      update: {},
      create: extra.data,
    })
    drugByKey[extra.key] = created.id
  }

  const prescriptionPlan: { patientIndex: number; doctorIndex: number; drug: string; dosage: string; frequency: string; refills: number; issuedDaysAgo: number }[] = [
    { patientIndex: 1, doctorIndex: 1, drug: "amlodipine", dosage: "5mg", frequency: "Once daily", refills: 0, issuedDaysAgo: 60 },
    { patientIndex: 1, doctorIndex: 0, drug: "metoprolol", dosage: "25mg", frequency: "Twice daily", refills: 1, issuedDaysAgo: 14 },
    { patientIndex: 4, doctorIndex: 0, drug: "apixaban", dosage: "5mg", frequency: "Twice daily", refills: 0, issuedDaysAgo: 12 },
    { patientIndex: 3, doctorIndex: 0, drug: "aspirin", dosage: "81mg", frequency: "Once daily", refills: 3, issuedDaysAgo: 90 },
    { patientIndex: 2, doctorIndex: 1, drug: "atorvastatin", dosage: "20mg", frequency: "Once daily at bedtime", refills: 2, issuedDaysAgo: 45 },
  ]

  for (const plan of prescriptionPlan) {
    const p = allPatients[plan.patientIndex]
    const d = allDoctors[plan.doctorIndex]
    const drugId = drugByKey[plan.drug]
    if (!drugId) continue
    const existing = await prisma.prescription.findFirst({
      where: { patientId: p.id, items: { some: { drugId } } },
      select: { id: true },
    })
    if (existing) continue
    await prisma.prescription.create({
      data: {
        patientId: p.id,
        prescriberId: d.id,
        status: PrescriptionStatus.ACTIVE,
        issuedAt: daysFromNow(-plan.issuedDaysAgo),
        expiresAt: daysFromNow(335 - plan.issuedDaysAgo),
        items: {
          create: [
            {
              drugId,
              dosage: plan.dosage,
              frequency: plan.frequency,
              duration: "90 days",
              quantity: 90,
              refillsLeft: plan.refills,
            },
          ],
        },
      },
    })
  }

  // Lab orders for the cohort, including flagged results for the doctor review
  // queue and the admin laboratory worklist.
  const labPlan: { patientIndex: number; doctorIndex: number; status: LabOrderStatus; priority: LabPriority; at: Date; items: { testName: string; result?: string; unit?: string; referenceRange?: string; flag?: string }[] }[] = [
    {
      patientIndex: 4,
      doctorIndex: 0,
      status: LabOrderStatus.COMPLETED,
      priority: LabPriority.URGENT,
      at: hoursFromNow(-20),
      items: [
        { testName: "HbA1c", result: "7.8", unit: "%", referenceRange: "< 5.7", flag: "HIGH" },
        { testName: "eGFR", result: "68", unit: "mL/min", referenceRange: "> 60", flag: "NORMAL" },
      ],
    },
    {
      patientIndex: 1,
      doctorIndex: 0,
      status: LabOrderStatus.COMPLETED,
      priority: LabPriority.URGENT,
      at: hoursFromNow(-18),
      items: [{ testName: "Troponin I", result: "0.06", unit: "ng/mL", referenceRange: "< 0.04", flag: "HIGH" }],
    },
    {
      patientIndex: 3,
      doctorIndex: 0,
      status: LabOrderStatus.IN_PROGRESS,
      priority: LabPriority.ROUTINE,
      at: hoursFromNow(-4),
      items: [{ testName: "CMP" }],
    },
    {
      patientIndex: 2,
      doctorIndex: 1,
      status: LabOrderStatus.COLLECTED,
      priority: LabPriority.ROUTINE,
      at: hoursFromNow(-2),
      items: [{ testName: "Lipid Panel" }],
    },
  ]

  for (const plan of labPlan) {
    const p = allPatients[plan.patientIndex]
    const d = allDoctors[plan.doctorIndex]
    const existing = await prisma.labOrder.findFirst({
      where: { patientId: p.id, orderedAt: plan.at },
      select: { id: true },
    })
    if (existing) continue
    await prisma.labOrder.create({
      data: {
        patientId: p.id,
        doctorId: d.id,
        status: plan.status,
        priority: plan.priority,
        orderedAt: plan.at,
        completedAt: plan.status === LabOrderStatus.COMPLETED ? hoursFromNow(-19) : undefined,
        items: { create: plan.items },
      },
    })
  }

  // Invoices across the cohort, one per calendar month for the last six months,
  // covering paid, partial, unpaid and overdue so the admin billing and revenue
  // dashboards exercise every status and the trend chart has a full axis.
  const invoicePlan: { patientIndex: number; status: InvoiceStatus; total: number; paid: number; issuedMonthsAgo: number; dueInDays: number; insurer: string; description: string }[] = [
    { patientIndex: 2, status: InvoiceStatus.PAID, total: 4820, paid: 4820, issuedMonthsAgo: 5, dueInDays: -128, insurer: "Self-pay", description: "General medicine consultation" },
    { patientIndex: 4, status: InvoiceStatus.PAID, total: 21650, paid: 21650, issuedMonthsAgo: 4, dueInDays: -97, insurer: "Blue Cross", description: "Surgical ward admission" },
    { patientIndex: 1, status: InvoiceStatus.PARTIALLY_PAID, total: 17320, paid: 9000, issuedMonthsAgo: 3, dueInDays: -66, insurer: "Aetna", description: "Cardiology day procedure" },
    { patientIndex: 3, status: InvoiceStatus.PARTIALLY_PAID, total: 28700, paid: 20000, issuedMonthsAgo: 2, dueInDays: 14, insurer: "United Healthcare", description: "Interventional cardiology" },
    { patientIndex: 1, status: InvoiceStatus.OVERDUE, total: 12450, paid: 0, issuedMonthsAgo: 1, dueInDays: -8, insurer: "Aetna", description: "Cardiology inpatient stay" },
    { patientIndex: 4, status: InvoiceStatus.ISSUED, total: 9340, paid: 0, issuedMonthsAgo: 0, dueInDays: 15, insurer: "Medicare", description: "ICU admission" },
  ]

  for (const plan of invoicePlan) {
    const p = allPatients[plan.patientIndex]
    const issuedAt = monthsAgoOnDay(plan.issuedMonthsAgo)
    const number = invoiceNumberFor(issuedAt)
    const existing = await prisma.invoice.findFirst({
      where: { invoiceNumber: number },
      select: { id: true },
    })
    if (existing) continue
    await prisma.invoice.create({
      data: {
        patientId: p.id,
        invoiceNumber: number,
        status: plan.status,
        totalAmount: plan.total,
        paidAmount: plan.paid,
        issuedAt,
        dueAt: daysFromNow(plan.dueInDays),
        items: {
          create: [
            { description: plan.description, category: "Consultation", quantity: 1, unitPrice: plan.total, amount: plan.total },
          ],
        },
        ...(plan.paid > 0
          ? {
              payments: {
                create: [
                  { amount: plan.paid, method: PaymentMethod.INSURANCE, reference: `CLM-${number.slice(-4)}` },
                ],
              },
            }
          : {}),
      },
    })
  }

  // More inventory and equipment so those admin pages have depth.
  await prisma.inventory.createMany({
    data: [
      { departmentId: departments["Pharmacy"], name: "Lisinopril 10mg", category: "Medication", quantity: 540, unit: "tablets", reorderLevel: 100, unitCost: 0.15, supplier: "PharmaCorp" },
      { departmentId: departments["Pharmacy"], name: "Atorvastatin 20mg", category: "Medication", quantity: 300, unit: "tablets", reorderLevel: 50, unitCost: 0.22, supplier: "PharmaCorp" },
      { departmentId: departments["Pharmacy"], name: "Ampicillin 1g", category: "Medication", quantity: 65, unit: "vials", reorderLevel: 40, unitCost: 4.8, supplier: "MedSupply Inc", expiryDate: daysFromNow(-12) },
      { departmentId: departments["Nursing"], name: "Surgical Masks", category: "Consumables", quantity: 2400, unit: "units", reorderLevel: 800, unitCost: 0.08, supplier: "SafeCare" },
      { departmentId: departments["Laboratory"], name: "Reagent Pack — Chemistry", category: "Diagnostics", quantity: 25, unit: "packs", reorderLevel: 30, unitCost: 148, supplier: "MedSupply Inc" },
    ],
  })

  await prisma.equipment.createMany({
    data: [
      { name: "Defibrillator — Zoll R Series", category: "Emergency", assetTag: "EQ-EMR-005", serialNumber: "ZL-55910", location: "Emergency Dept", status: EquipmentStatus.OPERATIONAL, lastMaintenanceAt: daysFromNow(-30), nextMaintenanceAt: daysFromNow(60), unitCost: 21400 },
      { name: "Infusion Pump — B.Braun Space", category: "Infusion", assetTag: "EQ-INF-006", serialNumber: "BB-31022", location: "General Ward", status: EquipmentStatus.OPERATIONAL, lastMaintenanceAt: daysFromNow(-50), nextMaintenanceAt: daysFromNow(40), unitCost: 6800 },
      { name: "Ultrasound — GE LOGIQ", category: "Imaging", assetTag: "EQ-IMG-007", serialNumber: "GE-77231", location: "Cardiology", status: EquipmentStatus.MAINTENANCE, lastMaintenanceAt: daysFromNow(-140), nextMaintenanceAt: daysFromNow(-20), unitCost: 54000 },
    ],
  })

  await prisma.leaveRequest.createMany({
    data: [
      { requesterId: nurseUser.id, reviewerId: adminUser.id, type: "SICK", startDate: daysFromNow(-2), endDate: daysFromNow(0), reason: "Influenza", status: LeaveStatus.APPROVED },
      { requesterId: allNurses[1].userId, reviewerId: adminUser.id, type: "ANNUAL", startDate: daysFromNow(35), endDate: daysFromNow(39), reason: "Personal leave", status: LeaveStatus.REJECTED },
      { requesterId: allDoctors[2].userId, reviewerId: adminUser.id, type: "CME", startDate: daysFromNow(40), endDate: daysFromNow(42), reason: "Orthopaedics conference", status: LeaveStatus.APPROVED },
    ],
  })

  await prisma.message.createMany({
    data: [
      { senderId: doctorUser.id, recipientId: patientUser.id, patientId: allPatients[1].id, subject: "Rate control adjustment", body: "We have increased your metoprolol to twice daily. Please let us know if you feel dizzy when standing." },
      { senderId: allDoctors[0].userId, recipientId: nurseUser.id, patientId: allPatients[3].id, subject: "Access site check", body: "Please confirm the PCI access site remains clean and dry at this evening's round." },
    ],
  })

  console.log("✅ Database seeded successfully!")
  console.log(`   Patient: ${patient.medicalRecordNumber} | Prescription: ${prescription.id}`)
  console.log(`   Beds: ${bedSeeds.length} across 2 wards | Lab orders: ${labs.length}`)
  console.log(`   Branches: ${mainBranch.code}, ${northBranch.code}`)
  console.log("\n📋 Demo Accounts:")
  console.log("  Patient:  patient@demo.com  / demo123")
  console.log("  Doctor:   doctor@demo.com   / demo123")
  console.log("  Nurse:    nurse@demo.com    / demo123")
  console.log("  Admin:    admin@demo.com    / demo123")
}

/**
 * Retries the whole seed on transient database failures. Safe because `main()`
 * starts by calling `resetDemoClinicalData()`, so a partial run is wiped
 * before the retry rebuilds the demo cohort.
 */
async function runSeed() {
  const attempts = 3
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await main()
      return
    } catch (error) {
      if (attempt === attempts || !isTransient(error)) throw error
      const wait = 2000 * attempt
      console.warn(`⚠️  Transient database error (attempt ${attempt}/${attempts}), retrying in ${wait}ms`)
      await sleep(wait)
    }
  }
}

runSeed()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
