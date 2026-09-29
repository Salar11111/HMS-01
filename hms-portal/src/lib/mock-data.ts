const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000)
const daysFromNow = (d: number) => new Date(Date.now() + d * 24 * 60 * 60 * 1000)

export const patientPortal = {
  metrics: [
    { label: "Blood Pressure", value: "126/80", unit: "mmHg", trend: "stable", range: "<120/80" },
    { label: "Heart Rate", value: "71", unit: "bpm", trend: "down", range: "60-100" },
    { label: "Weight", value: "74.5", unit: "kg", trend: "stable", range: "68-78" },
    { label: "HbA1c", value: "5.6", unit: "%", trend: "up", range: "<5.7" },
  ],
  appointments: [
    { id: "a1", doctor: "Dr. Michael Chen", specialty: "Cardiology", at: daysFromNow(2), time: "10:30 AM", type: "Follow-up", status: "CONFIRMED", location: "Building A, Room 304" },
    { id: "a2", doctor: "Dr. Priya Nair", specialty: "Primary Care", at: daysFromNow(7), time: "2:00 PM", type: "Annual Checkup", status: "SCHEDULED", location: "Building B, Room 112" },
    { id: "a3", doctor: "Dr. Lena Fischer", specialty: "Dermatology", at: daysFromNow(14), time: "9:00 AM", type: "Consultation", status: "PENDING", location: "Building C, Room 201" },
    { id: "a4", doctor: "Dr. Michael Chen", specialty: "Cardiology", at: daysFromNow(-5), time: "11:15 AM", type: "Chest pain evaluation", status: "COMPLETED", location: "Emergency Dept" },
  ],
  results: [
    { id: "r1", test: "Troponin I", value: "0.02 ng/mL", flag: "NORMAL", at: daysFromNow(-3), orderedBy: "Dr. Michael Chen" },
    { id: "r2", test: "BNP", value: "184 pg/mL", flag: "HIGH", at: daysFromNow(-3), orderedBy: "Dr. Michael Chen" },
    { id: "r3", test: "CBC with Differential", value: "WBC 8.4, Hgb 13.6", flag: "NORMAL", at: daysFromNow(-3), orderedBy: "Dr. Michael Chen" },
    { id: "r4", test: "Lipid Panel", value: "LDL 118 mg/dL", flag: "HIGH", at: daysFromNow(-10), orderedBy: "Dr. Michael Chen" },
  ],
  medications: [
    { id: "m1", name: "Lisinopril", dosage: "10 mg", frequency: "Once daily", prescriber: "Dr. Michael Chen", refills: 2, nextRefill: daysFromNow(15) },
    { id: "m2", name: "Atorvastatin", dosage: "20 mg", frequency: "Once daily at bedtime", prescriber: "Dr. Michael Chen", refills: 0, nextRefill: daysFromNow(5) },
  ],
  invoices: [
    { id: "INV-2024-0912", at: daysFromNow(-6), due: daysFromNow(9), total: 3480, paid: 1500, status: "PARTIALLY_PAID", items: 5 },
    { id: "INV-2024-0704", at: daysFromNow(-45), due: daysFromNow(-30), total: 265, paid: 265, status: "PAID", items: 3 },
  ],
  messages: [
    { id: "msg1", from: "Dr. Michael Chen", subject: "Repeat troponin scheduled", preview: "We've scheduled a repeat troponin for 2pm today…", at: hoursAgo(5), unread: true, direction: "in" },
    { id: "msg2", from: "You", subject: "Question about atorvastatin timing", preview: "Should I still take the atorvastatin if I miss a dose…", at: hoursAgo(28), unread: false, direction: "out" },
    { id: "msg3", from: "Billing Desk", subject: "Insurance claim processed", preview: "Your insurer has processed CLM-88213 for $1,500.00…", at: hoursAgo(52), unread: false, direction: "in" },
  ],
  records: [
    { id: "mr1", date: daysFromNow(-30), diagnosis: "Hyperlipidemia (E78.5)", provider: "Dr. Michael Chen", department: "Cardiology", type: "Progress Note" },
    { id: "mr2", date: daysFromNow(-30), diagnosis: "Essential hypertension (I10)", provider: "Dr. Michael Chen", department: "Cardiology", type: "Care Plan" },
    { id: "mr3", date: daysFromNow(-5), diagnosis: "I20.0 Unstable angina", provider: "Dr. Michael Chen", department: "Cardiology", type: "Admission Note" },
    { id: "mr4", date: daysFromNow(-3), diagnosis: "Cardiac workup", provider: "Lab — Chemistry", department: "Laboratory", type: "Lab Report" },
  ],
}

export const doctorPortal = {
  queue: [
    { id: "q1", time: "08:30 AM", patient: "Sarah Johnson", mrn: "MRN-100234", reason: "Chest pain follow-up", status: "IN_PROGRESS", room: "A-304", age: 47, sex: "F" },
    { id: "q2", time: "09:15 AM", patient: "Robert Alvarez", mrn: "MRN-100871", reason: "Hypertension review", status: "CONFIRMED", room: "A-305", age: 61, sex: "M" },
    { id: "q3", time: "10:00 AM", patient: "Amina Yusuf", mrn: "MRN-100455", reason: "New patient consult", status: "CONFIRMED", room: "A-306", age: 34, sex: "F" },
    { id: "q4", time: "11:00 AM", patient: "Daniel Okafor", mrn: "MRN-100612", reason: "Post-discharge review", status: "SCHEDULED", room: "A-307", age: 52, sex: "M" },
    { id: "q5", time: "01:30 PM", patient: "Grace Lindqvist", mrn: "MRN-100988", reason: "Arrhythmia assessment", status: "SCHEDULED", room: "A-308", age: 68, sex: "F" },
  ],
  stats: [
    { label: "Today's Appointments", value: "12", delta: "+2 vs yesterday" },
    { label: "Pending Lab Reviews", value: "4", delta: "1 flagged high" },
    { label: "Active Inpatients", value: "3", delta: "ICU 1, Ward 2" },
    { label: "Unread Messages", value: "5", delta: "2 need reply" },
  ],
  patients: [
    { id: "p1", name: "Sarah Johnson", mrn: "MRN-100234", age: 47, sex: "F", condition: "Unstable angina", risk: "HIGH", lastVisit: daysFromNow(-5), nextVisit: daysFromNow(2) },
    { id: "p2", name: "Robert Alvarez", mrn: "MRN-100871", age: 61, sex: "M", condition: "Hypertension", risk: "MEDIUM", lastVisit: daysFromNow(-30), nextVisit: daysFromNow(1) },
    { id: "p3", name: "Amina Yusuf", mrn: "MRN-100455", age: 34, sex: "F", condition: "Palpitations — new", risk: "LOW", lastVisit: null, nextVisit: daysFromNow(1) },
    { id: "p4", name: "Daniel Okafor", mrn: "MRN-100612", age: 52, sex: "M", condition: "Coronary artery disease", risk: "MEDIUM", lastVisit: daysFromNow(-7), nextVisit: daysFromNow(1) },
    { id: "p5", name: "Grace Lindqvist", mrn: "MRN-100988", age: 68, sex: "F", condition: "Atrial fibrillation", risk: "HIGH", lastVisit: daysFromNow(-14), nextVisit: daysFromNow(1) },
  ],
  prescriptions: [
    { id: "rx1", patient: "Sarah Johnson", drug: "Lisinopril 10mg", sig: "Once daily", issued: daysFromNow(-30), refills: 2, status: "ACTIVE" },
    { id: "rx2", patient: "Sarah Johnson", drug: "Atorvastatin 20mg", sig: "At bedtime", issued: daysFromNow(-30), refills: 1, status: "ACTIVE" },
    { id: "rx3", patient: "Robert Alvarez", drug: "Amlodipine 5mg", sig: "Once daily", issued: daysFromNow(-60), refills: 0, status: "ACTIVE" },
    { id: "rx4", patient: "Grace Lindqvist", drug: "Apixaban 5mg", sig: "Twice daily", issued: daysFromNow(-12), refills: 0, status: "ACTIVE" },
  ],
  schedule: [
    { day: "Monday", slots: ["08:00 – 12:00", "13:00 – 17:00"], location: "Main Campus — Cardiology", slotsCount: 16 },
    { day: "Tuesday", slots: [], location: "—", slotsCount: 0 },
    { day: "Wednesday", slots: ["08:00 – 12:00", "13:00 – 17:00"], location: "Main Campus — Cardiology", slotsCount: 16 },
    { day: "Thursday", slots: [], location: "—", slotsCount: 0 },
    { day: "Friday", slots: ["08:00 – 12:00"], location: "Main Campus — Cardiology", slotsCount: 8 },
    { day: "Saturday", slots: [], location: "—", slotsCount: 0 },
    { day: "Sunday", slots: [], location: "—", slotsCount: 0 },
  ],
  labFlags: [
    { id: "l1", patient: "Sarah Johnson", test: "BNP", value: "184 pg/mL", range: "< 100", flag: "HIGH", at: hoursAgo(6) },
    { id: "l2", patient: "Grace Lindqvist", test: "HbA1c", value: "7.8 %", range: "< 5.7", flag: "HIGH", at: hoursAgo(20) },
    { id: "l3", patient: "Daniel Okafor", test: "eGFR", value: "68 mL/min", range: "> 60", flag: "NORMAL", at: hoursAgo(26) },
  ],
}

export const nursePortal = {
  shift: { name: "Day shift", hours: "07:00 – 15:00", ward: "Intensive Care", patients: 4, hoursElapsed: 6 },
  patients: [
    { id: "np1", name: "Sarah Johnson", mrn: "MRN-100234", bed: "ICU-01", diagnosis: "I20.0 Unstable angina", acuity: "HIGH", lastVitals: hoursAgo(2), allergies: "Penicillin", code: "Full Code" },
    { id: "np2", name: "Grace Lindqvist", mrn: "MRN-100988", bed: "ICU-02", diagnosis: "Atrial fibrillation, RVR", acuity: "HIGH", lastVitals: hoursAgo(1), allergies: "NKDA", code: "Full Code" },
    { id: "np3", name: "Daniel Okafor", mrn: "MRN-100612", bed: "GW-101", diagnosis: "Post-PCI observation", acuity: "MEDIUM", lastVitals: hoursAgo(3), allergies: "Contrast dye", code: "Full Code" },
    { id: "np4", name: "Amina Yusuf", mrn: "MRN-100455", bed: "GW-102", diagnosis: "Chest pain — under evaluation", acuity: "MEDIUM", lastVitals: hoursAgo(4), allergies: "NKDA", code: "Full Code" },
  ],
  medications: [
    { id: "med1", time: "08:00", patient: "Sarah Johnson", drug: "Lisinopril 10mg", route: "PO", status: "GIVEN", note: "" },
    { id: "med2", time: "08:00", patient: "Grace Lindqvist", drug: "Apixaban 5mg", route: "PO", status: "GIVEN", note: "" },
    { id: "med3", time: "10:00", patient: "Daniel Okafor", drug: "Aspirin 81mg", route: "PO", status: "GIVEN", note: "" },
    { id: "med4", time: "12:00", patient: "Sarah Johnson", drug: "Lisinopril 10mg", route: "PO", status: "HELD", note: "Systolic 96 at 06:00 — awaiting repeat BP" },
    { id: "med5", time: "14:00", patient: "Grace Lindqvist", drug: "Metoprolol 25mg", route: "PO", status: "PENDING", note: "" },
    { id: "med6", time: "21:00", patient: "Daniel Okafor", drug: "Atorvastatin 20mg", route: "PO", status: "PENDING", note: "" },
  ],
  vitals: [
    { id: "v1", patient: "Sarah Johnson", at: hoursAgo(2), temp: 36.9, hr: 71, bp: "126/80", rr: 16, spo2: 98, pain: 1, flagged: false },
    { id: "v2", patient: "Grace Lindqvist", at: hoursAgo(1), temp: 37.4, hr: 112, bp: "104/62", rr: 24, spo2: 93, pain: 3, flagged: true },
    { id: "v3", patient: "Daniel Okafor", at: hoursAgo(3), temp: 36.7, hr: 68, bp: "118/74", rr: 15, spo2: 97, pain: 0, flagged: false },
    { id: "v4", patient: "Amina Yusuf", at: hoursAgo(4), temp: 37.2, hr: 88, bp: "112/70", rr: 18, spo2: 96, pain: 5, flagged: true },
  ],
  handoff: [
    { id: "h1", patient: "Sarah Johnson", from: "Night shift — J. Patel, RN", at: hoursAgo(7), acuity: "HIGH", summary: "Stable overnight. Telemetry sinus rhythm with isolated PACs. Repeat troponin due 14:00.", pending: "Repeat troponin, cardiology consult" },
    { id: "h2", patient: "Grace Lindqvist", from: "Night shift — J. Patel, RN", at: hoursAgo(7), acuity: "HIGH", summary: "Rate 110-120 overnight, responded to metoprolol. Needs 4h ECG and electrolytes.", pending: "ECG, BMP, rate-control titration" },
    { id: "h3", patient: "Daniel Okafor", from: "Night shift — M. Ortiz, RN", at: hoursAgo(7), acuity: "MEDIUM", summary: "Access site clean and dry, no haematoma. Ambulating to bathroom unassisted.", pending: "Morning access-site check" },
  ],
  tasks: [
    { id: "t1", label: "Complete 12:00 BP recheck for Sarah Johnson", due: "Due now", priority: "URGENT", done: false },
    { id: "t2", label: "Perform ECG for Grace Lindqvist", due: "Due in 45m", priority: "URGENT", done: false },
    { id: "t3", label: "Document morning medication round", due: "Due 15:00", priority: "ROUTINE", done: false },
    { id: "t4", label: "Turn Daniel Okafor q2h (skin integrity)", due: "Due in 1h", priority: "ROUTINE", done: false },
    { id: "t5", label: "Admission vitals for Amina Yusuf", due: "Completed 09:40", priority: "ROUTINE", done: true },
  ],
  notes: [
    { id: "n1", at: hoursAgo(3), author: "Emily Rodriguez, RN", type: "PROGRESS", patient: "Sarah Johnson", content: "Telemetry: sinus rhythm, occasional isolated PACs. Tolerating activity well, denies chest pain." },
    { id: "n2", at: hoursAgo(2), author: "Emily Rodriguez, RN", type: "VITALS", patient: "Grace Lindqvist", content: "New irregular tachycardia 112 bpm, SpO2 93% on room air. Escalated to on-call physician." },
    { id: "n3", at: hoursAgo(1), author: "Emily Rodriguez, RN", type: "MEDICATION", patient: "Daniel Okafor", content: "Aspirin 81mg administered. No bleeding from access site." },
  ],
}

export const adminPortal = {
  stats: [
    { label: "Revenue (MTD)", value: "$1.24M", delta: "+8.2% vs last month", tone: "sage" },
    { label: "Outstanding Invoices", value: "$184K", delta: "38 invoices overdue", tone: "coral" },
    { label: "Bed Occupancy", value: "78%", delta: "31 of 40 beds in use", tone: "gold" },
    { label: "Active Staff", value: "142", delta: "6 on leave today", tone: "sage" },
  ],
  revenue: {
    months: ["Mar", "Apr", "May", "Jun", "Jul", "Aug"],
    outpatient: [318, 342, 331, 376, 402, 428],
    inpatient: [512, 548, 561, 604, 638, 671],
    pharmacy: [88, 94, 91, 102, 110, 118],
  },
  revenueBreakdown: [
    { label: "Inpatient & surgical", amount: 671000, share: 55 },
    { label: "Outpatient clinics", amount: 428000, share: 35 },
    { label: "Pharmacy & lab", amount: 118000, share: 10 },
  ],
  invoices: [
    { id: "INV-2024-0912", patient: "Sarah Johnson", issued: daysFromNow(-6), due: daysFromNow(9), total: 3480, paid: 1500, status: "PARTIALLY_PAID", insurer: "Blue Cross Blue Shield" },
    { id: "INV-2024-0913", patient: "Robert Alvarez", issued: daysFromNow(-8), due: daysFromNow(7), total: 12450, paid: 0, status: "OVERDUE", insurer: "Aetna" },
    { id: "INV-2024-0914", patient: "Amina Yusuf", issued: daysFromNow(-2), due: daysFromNow(13), total: 620, paid: 620, status: "PAID", insurer: "Self-pay" },
    { id: "INV-2024-0915", patient: "Daniel Okafor", issued: daysFromNow(-1), due: daysFromNow(14), total: 28700, paid: 20000, status: "PARTIALLY_PAID", insurer: "United Healthcare" },
    { id: "INV-2024-0916", patient: "Grace Lindqvist", issued: daysFromNow(0), due: daysFromNow(15), total: 9340, paid: 0, status: "ISSUED", insurer: "Medicare" },
  ],
  staff: [
    { id: "s1", name: "Dr. Michael Chen", role: "DOCTOR", department: "Cardiology", status: "ACTIVE", shift: "Day", joined: "2019-03-11", licence: "MD-12345-CA" },
    { id: "s2", name: "Emily Rodriguez", role: "NURSE", department: "Nursing", status: "ACTIVE", shift: "Day", joined: "2021-06-02", licence: "RN-88231-CA" },
    { id: "s3", name: "J. Patel", role: "NURSE", department: "Intensive Care", status: "ACTIVE", shift: "Night", joined: "2020-01-20", licence: "RN-74410-CA" },
    { id: "s4", name: "Maria Ortiz", role: "NURSE", department: "General Ward", status: "ACTIVE", shift: "Night", joined: "2022-09-14", licence: "RN-90118-CA" },
    { id: "s5", name: "Dr. Priya Nair", role: "DOCTOR", department: "General Medicine", status: "ACTIVE", shift: "Day", joined: "2018-11-05", licence: "MD-33218-CA" },
    { id: "s6", name: "James Wilson", role: "ADMIN", department: "Administration", status: "ACTIVE", shift: "Day", joined: "2017-04-01", licence: "—" },
    { id: "s7", name: "Tobias Lang", role: "DOCTOR", department: "Orthopedics", status: "ON_LEAVE", shift: "—", joined: "2023-02-27", licence: "MD-55120-CA" },
  ],
  leaveRequests: [
    { id: "l1", name: "Emily Rodriguez", type: "ANNUAL", from: daysFromNow(21), to: daysFromNow(28), reason: "Family holiday", status: "PENDING" },
    { id: "l2", name: "Dr. Michael Chen", type: "CME", from: daysFromNow(40), to: daysFromNow(42), reason: "Cardiology conference", status: "APPROVED" },
    { id: "l3", name: "Maria Ortiz", type: "SICK", from: daysFromNow(-2), to: daysFromNow(0), reason: "Influenza", status: "APPROVED" },
    { id: "l4", name: "J. Patel", type: "ANNUAL", from: daysFromNow(35), to: daysFromNow(39), reason: "Personal", status: "REJECTED" },
  ],
  inventory: [
    { id: "i1", name: "Lisinopril 10mg", category: "Medication", dept: "Pharmacy", qty: 540, unit: "tablets", reorder: 100, cost: 0.15, supplier: "PharmaCorp", expiry: daysFromNow(420), status: "OK" },
    { id: "i2", name: "Atorvastatin 20mg", category: "Medication", dept: "Pharmacy", qty: 300, unit: "tablets", reorder: 50, cost: 0.22, supplier: "PharmaCorp", expiry: daysFromNow(300), status: "OK" },
    { id: "i3", name: "Ampicillin 1g", category: "Medication", dept: "Pharmacy", qty: 65, unit: "vials", reorder: 40, cost: 4.8, supplier: "MedSupply Inc", expiry: daysFromNow(-12), status: "EXPIRED" },
    { id: "i4", name: "Blood Culture Vials", category: "Diagnostics", dept: "Laboratory", qty: 40, unit: "units", reorder: 80, cost: 6.5, supplier: "MedSupply Inc", expiry: daysFromNow(200), status: "LOW" },
    { id: "i5", name: "Nitrile Gloves (M)", category: "Consumables", dept: "Nursing", qty: 900, unit: "pairs", reorder: 400, cost: 0.12, supplier: "SafeCare", expiry: daysFromNow(500), status: "OK" },
    { id: "i6", name: "IV Saline 0.9% 500ml", category: "Fluids", dept: "Pharmacy", qty: 180, unit: "bags", reorder: 60, cost: 3.2, supplier: "MedSupply Inc", expiry: daysFromNow(300), status: "OK" },
  ],
  equipment: [
    { id: "e1", name: "Cardiac Monitor — Philips IntelliVue", tag: "EQ-CARD-001", category: "Monitoring", location: "ICU Bay 1", status: "OPERATIONAL", lastService: daysFromNow(-40), nextService: daysFromNow(50), cost: 18500 },
    { id: "e2", name: "Ventilator — Hamilton C6", tag: "EQ-VENT-002", category: "Respiratory", location: "ICU Bay 2", status: "MAINTENANCE", lastService: daysFromNow(-95), nextService: daysFromNow(-5), cost: 42000 },
    { id: "e3", name: "Chemistry Analyzer — Roche cobas", tag: "EQ-LAB-003", category: "Laboratory", location: "Laboratory", status: "OPERATIONAL", lastService: daysFromNow(-20), nextService: daysFromNow(70), cost: 96000 },
    { id: "e4", name: "Patient Bed — Hillrom Advance 2", tag: "EQ-BED-004", category: "Furniture", location: "General Ward", status: "OPERATIONAL", lastService: daysFromNow(-120), nextService: daysFromNow(-30), cost: 3200 },
  ],
  wards: [
    { id: "w1", name: "Intensive Care", floor: "3rd Floor", total: 3, occupied: 2, icu: true, nurse: "J. Patel, RN", patients: ["Sarah Johnson", "Grace Lindqvist"] },
    { id: "w2", name: "General Ward", floor: "2nd Floor", total: 4, occupied: 2, icu: false, nurse: "Maria Ortiz, RN", patients: ["Daniel Okafor", "Amina Yusuf"] },
    { id: "w3", name: "Maternity", floor: "2nd Floor", total: 6, occupied: 4, icu: false, nurse: "A. Bello, RN", patients: ["—", "—", "—", "—"] },
    { id: "w4", name: "Pediatrics", floor: "1st Floor", total: 8, occupied: 6, icu: false, nurse: "L. Kim, RN", patients: ["—", "—", "—", "—", "—", "—"] },
    { id: "w5", name: "Surgical Recovery", floor: "3rd Floor", total: 5, occupied: 3, icu: false, nurse: "R. Silva, RN", patients: ["—", "—", "—"] },
    { id: "w6", name: "Long-Term Care", floor: "4th Floor", total: 14, occupied: 11, icu: false, nurse: "H. Novak, RN", patients: ["—", "—", "—", "—", "—", "—", "—", "—", "—", "—", "—"] },
  ],
  labQueue: [
    { id: "q1", order: "LAB-4417", test: "Troponin I", patient: "Sarah Johnson", priority: "STAT", status: "IN_PROGRESS", ordered: hoursAgo(1) },
    { id: "q2", order: "LAB-4418", test: "BNP", patient: "Grace Lindqvist", priority: "URGENT", status: "COLLECTED", ordered: hoursAgo(2) },
    { id: "q3", order: "LAB-4419", test: "Lipid Panel", patient: "Sarah Johnson", priority: "ROUTINE", status: "ORDERED", ordered: hoursAgo(4) },
    { id: "q4", order: "LAB-4420", test: "HbA1c", patient: "Grace Lindqvist", priority: "ROUTINE", status: "ORDERED", ordered: hoursAgo(6) },
    { id: "q5", order: "LAB-4421", test: "Blood Culture x2", patient: "Amina Yusuf", priority: "URGENT", status: "ORDERED", ordered: hoursAgo(7) },
    { id: "q6", order: "LAB-4412", test: "CMP", patient: "Daniel Okafor", priority: "ROUTINE", status: "COMPLETED", ordered: hoursAgo(20) },
  ],
  pharmacy: [
    { id: "rx1", drug: "Lisinopril 10mg", batches: [{ batch: "LIS-2401A", qty: 500, expiry: daysFromNow(420) }, { batch: "LIS-2311C", qty: 40, expiry: daysFromNow(60) }], dispensedToday: 18, status: "OK" },
    { id: "rx2", drug: "Atorvastatin 20mg", batches: [{ batch: "ATO-2403B", qty: 300, expiry: daysFromNow(300) }], dispensedToday: 12, status: "OK" },
    { id: "rx3", drug: "Ampicillin 1g", batches: [{ batch: "AMP-2312A", qty: 65, expiry: daysFromNow(-12) }], dispensedToday: 24, status: "EXPIRED" },
    { id: "rx4", drug: "Apixaban 5mg", batches: [{ batch: "APX-2402B", qty: 120, expiry: daysFromNow(240) }], dispensedToday: 9, status: "OK" },
    { id: "rx5", drug: "IV Saline 0.9% 500ml", batches: [{ batch: "SAL-2404C", qty: 180, expiry: daysFromNow(300) }], dispensedToday: 40, status: "OK" },
  ],
  audit: [
    { id: "au1", actor: "James Wilson", action: "UPDATE", entity: "Invoice", target: "INV-2024-0912", at: hoursAgo(1), detail: "status → PARTIALLY_PAID, paidAmount → 1500" },
    { id: "au2", actor: "Dr. Michael Chen", action: "CREATE", entity: "LabOrder", target: "LAB-4417", at: hoursAgo(1), detail: "priority → STAT" },
    { id: "au3", actor: "Emily Rodriguez, RN", action: "CREATE", entity: "MedicationAdministration", target: "Lisinopril 10mg", at: hoursAgo(3), detail: "status → HELD" },
    { id: "au4", actor: "James Wilson", action: "UPDATE", entity: "LeaveRequest", target: "J. Patel", at: hoursAgo(9), detail: "status → REJECTED" },
    { id: "au5", actor: "Maria Ortiz, RN", action: "CREATE", entity: "NursingNote", target: "MRN-100612", at: hoursAgo(14), detail: "noteType → PROGRESS" },
  ],
  branches: [
    { id: "b1", name: "Meridian Health — Main Campus", code: "MHC-MAIN", beds: 26, staff: 118, status: "ACTIVE", phone: "(555) 010-1000" },
    { id: "b2", name: "Meridian Health — Northside Clinic", code: "MHC-NORTH", beds: 14, staff: 24, status: "ACTIVE", phone: "(555) 010-2000" },
  ],
  compliance: [
    { id: "c1", control: "Access control review", standard: "HIPAA §164.308(a)(4)", lastAudit: daysFromNow(-12), nextDue: daysFromNow(78), status: "COMPLIANT" },
    { id: "c2", control: "Workforce training completion", standard: "HIPAA §164.308(a)(6)", lastAudit: daysFromNow(-30), nextDue: daysFromNow(60), status: "IN_PROGRESS" },
    { id: "c3", control: "Clinical record retention", standard: "HIPAA §164.316", lastAudit: daysFromNow(-90), nextDue: daysFromNow(-2), status: "OVERDUE" },
    { id: "c4", control: "Business associate agreements", standard: "HIPAA §164.504(e)", lastAudit: daysFromNow(-45), nextDue: daysFromNow(45), status: "COMPLIANT" },
    { id: "c5", control: "Incident response drill", standard: "HIPAA §164.308(a)(6)", lastAudit: daysFromNow(-75), nextDue: daysFromNow(15), status: "IN_PROGRESS" },
  ],
  throughput: [
    { label: "Mon", outpatient: 142, lab: 310, discharged: 28 },
    { label: "Tue", outpatient: 158, lab: 342, discharged: 31 },
    { label: "Wed", outpatient: 171, lab: 298, discharged: 26 },
    { label: "Thu", outpatient: 149, lab: 361, discharged: 34 },
    { label: "Fri", outpatient: 188, lab: 402, discharged: 38 },
    { label: "Sat", outpatient: 96, lab: 208, discharged: 17 },
    { label: "Sun", outpatient: 74, lab: 152, discharged: 12 },
  ],
}
