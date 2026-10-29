/**
 * End-to-end check for the four role-scoped portal data endpoints.
 *
 * Logs in as each demo account, then calls every portal endpoint with that
 * session. A role must receive 200 from its own endpoint and 403 from the
 * other three.
 *
 * Run with the app already serving, e.g. `npm run build && npm run start`.
 * Override the target with `BASE_URL=http://localhost:3000`.
 */
import type {
  AdminPortalData,
  DoctorPortalData,
  NursePortalData,
  PatientPortalData,
} from "../src/server/queries/portal"

const BASE = process.env.BASE_URL ?? "http://localhost:3111"

const ROLES = ["patient", "doctor", "nurse", "admin"] as const
type Role = (typeof ROLES)[number]

const EMAILS: Record<Role, string> = {
  patient: "patient@demo.com",
  doctor: "doctor@demo.com",
  nurse: "nurse@demo.com",
  admin: "admin@demo.com",
}

type CookieJar = Map<string, string>

function storeCookies(jar: CookieJar, res: Response) {
  for (const line of res.headers.getSetCookie?.() ?? []) {
    const [pair] = line.split(";")
    const idx = pair.indexOf("=")
    if (idx > 0) jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim())
  }
}

function cookieHeader(jar: CookieJar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ")
}

async function login(email: string) {
  const jar: CookieJar = new Map()

  const csrfRes = await fetch(`${BASE}/api/auth/csrf`)
  storeCookies(jar, csrfRes)
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string }

  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: cookieHeader(jar),
    },
    body: new URLSearchParams({
      csrfToken,
      email,
      password: "demo123",
      callbackUrl: `${BASE}/portal`,
    }),
    redirect: "manual",
  })
  storeCookies(jar, res)

  if (!jar.has("authjs.session-token")) {
    throw new Error(`login failed for ${email} (status ${res.status})`)
  }
  return jar
}

async function portalData<T>(jar: CookieJar, role: Role) {
  const res = await fetch(`${BASE}/api/portal/${role}`, {
    headers: { cookie: cookieHeader(jar) },
  })
  if (res.status !== 200) {
    throw new Error(`GET /api/portal/${role} returned ${res.status}`)
  }
  return (await res.json()) as T
}

let failures = 0

for (const role of ROLES) {
  const jar = await login(EMAILS[role])
  const codes: string[] = []

  for (const target of ROLES) {
    const res = await fetch(`${BASE}/api/portal/${target}`, {
      headers: { cookie: cookieHeader(jar) },
    })
    const expected = target === role ? 200 : 403
    const ok = res.status === expected
    if (!ok) failures++
    codes.push(`${target}=${res.status}${ok ? "" : ` (want ${expected})`}`)
  }

  console.log(`${role.padEnd(7)} ${codes.join("  ")}`)
}

const admin = await portalData<AdminPortalData>(await login(EMAILS.admin), "admin")
console.log("\nadmin stats:", JSON.stringify(admin.stats))
console.log(
  "admin wards:",
  admin.wards.map(w => `${w.name} ${w.occupied}/${w.total}`).join(", ")
)
console.log(
  "admin labQueue:",
  `${admin.labQueue.length} orders |`,
  admin.labQueue.slice(0, 2).map(l => `${l.patientName}:${l.tests.join("+")}`).join(" | ")
)
console.log(
  "admin branches:",
  admin.branches.map(b => `${b.code}(${b.departmentCount}d/${b.wardCount}w)`).join(", ")
)
console.log(
  "admin revenueByMonth:",
  admin.revenueByMonth.map(m => `${m.month} ${m.collected}/${m.total}`).join(", ")
)
console.log("admin auditLog:", `${admin.auditLog.length} entries`)

const nurse = await portalData<NursePortalData>(await login(EMAILS.nurse), "nurse")
console.log(
  "\nnurse census:",
  `${nurse.patients.length} patients |`,
  nurse.patients.map(p => p.name).join(", ")
)

// Mirrors the dashboard: names come from `patients`, keyed by patient id.
const nameByPatientId = new Map(nurse.patients.map(p => [p.id, p.name]))
const named = nurse.latestVitals.map(v => nameByPatientId.get(v.patientId) ?? "UNRESOLVED")
console.log("nurse latestVitals:", `${nurse.latestVitals.length} rows |`, named.join(", "))
if (named.includes("UNRESOLVED")) {
  console.log("  ^ unresolved patient names in the vitals table")
  failures++
}
if (nurse.patients.some(patient => patient.name === "Sarah Johnson")) {
  failures++
  console.log("nurse census included Sarah Johnson, who is outside the Nursing ward")
}
if (!nurse.patients.some(patient => patient.name === "Daniel Okafor")) {
  failures++
  console.log("nurse census omitted Daniel Okafor on the General Ward")
}

const patient = await portalData<PatientPortalData>(await login(EMAILS.patient), "patient")
console.log(
  "\npatient profile:",
  `${patient.profile?.name} | appointments: ${patient.appointments.length} |`,
  `results: ${patient.results.length} | invoices: ${patient.invoices.length}`
)

const doctor = await portalData<DoctorPortalData>(await login(EMAILS.doctor), "doctor")
console.log(
  "doctor profile:",
  `${doctor.profile?.name} | today: ${doctor.schedule.length} |`,
  `patients: ${doctor.patients.length} | abnormal: ${doctor.abnormalResults.length}`
)

const unreleased = patient.results.filter(result => result.status !== "COMPLETED")
if (unreleased.length) {
  failures++
  console.log(`patient dashboard included ${unreleased.length} unreleased lab item(s)`)
}

async function api(jar: CookieJar, path: string, init?: RequestInit) {
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      cookie: cookieHeader(jar),
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  })
}

const patientJar = await login(EMAILS.patient)
const patientList = await api(patientJar, "/api/appointments?scope=upcoming")
const patientBody = (await patientList.json()) as {
  appointments: Array<{ id: string; patient: { id: string } }>
}
if (patientList.status !== 200) {
  failures++
  console.log(`patient appointment list returned ${patientList.status}`)
} else if (patientBody.appointments.some(row => row.patient.id !== patient.profile.id)) {
  failures++
  console.log("patient appointment list included another patient's visit")
}

const doctorJar = await login(EMAILS.doctor)
const doctorList = await api(doctorJar, "/api/appointments?scope=upcoming")
const doctorBody = (await doctorList.json()) as {
  appointments: Array<{ doctor: { id: string } }>
}
if (doctorList.status !== 200) {
  failures++
  console.log(`doctor appointment list returned ${doctorList.status}`)
} else if (doctorBody.appointments.some(row => row.doctor.id !== doctor.profile.id)) {
  failures++
  console.log("doctor appointment list included another physician's visit")
}

const nurseJar = await login(EMAILS.nurse)
const sampleId = patientBody.appointments[0]?.id
if (sampleId) {
  const nurseRead = await api(nurseJar, `/api/appointments/${sampleId}`)
  if (nurseRead.status !== 403) {
    failures++
    console.log(`nurse read of an out-of-ward appointment returned ${nurseRead.status}, want 403`)
  }
}

const foreignInvoice = admin.invoices.find(
  invoice => invoice.patientName !== patient.profile.name && invoice.balance > 0
)
if (foreignInvoice) {
  const payment = await api(patientJar, `/api/billing/${foreignInvoice.id}`, {
    method: "POST",
    body: JSON.stringify({ amount: 1, method: "CASH" }),
  })
  if (payment.status !== 403) {
    failures++
    console.log(`patient payment on another invoice returned ${payment.status}, want 403`)
  }
}

const nurseVitals = await api(nurseJar, "/api/vitals?hours=720")
const nurseVitalBody = (await nurseVitals.json()) as {
  vitals: Array<{ patient: { user: { name: string | null } } }>
}
const nurseVitalNames = nurseVitalBody.vitals?.map(row => row.patient.user.name) ?? []
if (nurseVitals.status !== 200) {
  failures++
  console.log(`nurse vitals list returned ${nurseVitals.status}`)
} else if (nurseVitalNames.includes("Sarah Johnson") || nurseVitalNames.includes("Grace Lindqvist")) {
  failures++
  console.log("nurse vitals list included a patient outside the Nursing ward")
}

const account = await api(patientJar, "/api/account")
if (account.status !== 200) {
  failures++
  console.log(`account settings returned ${account.status}`)
} else {
  const saved = await api(patientJar, "/api/account", {
    method: "PATCH",
    body: JSON.stringify({
      name: "Sarah Johnson",
      notifications: {
        appointments: true,
        results: true,
        messages: true,
        billing: true,
        marketing: true,
      },
    }),
  })
  const savedBody = (await saved.json()) as { notifications?: { marketing?: boolean } }
  if (saved.status !== 200 || savedBody.notifications?.marketing !== true) {
    failures++
    console.log(`saving notification preferences returned ${saved.status}`)
  }
  await api(patientJar, "/api/account", {
    method: "PATCH",
    body: JSON.stringify({
      name: "Sarah Johnson",
      notifications: {
        appointments: true,
        results: true,
        messages: true,
        billing: true,
        marketing: false,
      },
    }),
  })
}

const badId = await api(patientJar, "/api/appointments/not-an-id")
if (badId.status !== 400) {
  failures++
  console.log(`invalid appointment id returned ${badId.status}, want 400`)
}

const pastVisits = await api(patientJar, "/api/appointments?scope=past")
const pastBody = (await pastVisits.json()) as { appointments?: Array<{ id: string; status: string }> }
const completedVisit = pastBody.appointments?.find(row => row.status === "COMPLETED")
if (completedVisit) {
  const cancelled = await api(patientJar, `/api/appointments/${completedVisit.id}`, { method: "DELETE" })
  if (cancelled.status !== 409) {
    failures++
    console.log(`cancelling a completed visit returned ${cancelled.status}, want 409`)
  }
}

const blockedOrder = await api(doctorJar, "/api/lab-orders", {
  method: "POST",
  body: JSON.stringify({ patientId: "aaaaaaaaaaaaaaaaaaaaaaaa", tests: ["CBC"] }),
})
if (blockedOrder.status !== 403) {
  failures++
  console.log(`cross-panel lab order returned ${blockedOrder.status}, want 403`)
}

const foreignResult = patient.results[0]?.id
if (foreignResult) {
  const entered = await api(nurseJar, "/api/lab-orders", {
    method: "PUT",
    body: JSON.stringify({ items: [{ id: foreignResult, result: "1", flag: "NORMAL" }] }),
  })
  if (entered.status !== 403) {
    failures++
    console.log(`nurse result outside the ward returned ${entered.status}, want 403`)
  }
}

const payable = patient.invoices.find(invoice => invoice.balance > 0 && invoice.status !== "PAID" && invoice.status !== "VOID")
if (payable) {
  const overpay = await api(patientJar, `/api/billing/${payable.id}`, {
    method: "POST",
    body: JSON.stringify({ amount: payable.balance + 1, method: "CASH" }),
  })
  if (overpay.status !== 400) {
    failures++
    console.log(`overpayment returned ${overpay.status}, want 400`)
  }
}

const wardPatient = nurse.patients[0]
if (wardPatient) {
  const given = await api(nurseJar, "/api/medications", {
    method: "POST",
    body: JSON.stringify({
      patientId: wardPatient.id,
      drugName: "Verify Tablet",
      dosage: "1 mg",
      notes: "original note",
    }),
  })
  const givenBody = (await given.json()) as { administration?: { id: string } }
  if (given.status !== 201 || !givenBody.administration) {
    failures++
    console.log(`recording a dose returned ${given.status}`)
  } else {
    const voided = await api(nurseJar, `/api/medications/${givenBody.administration.id}`, { method: "DELETE" })
    const voidedBody = (await voided.json()) as { administration?: { notes?: string | null } }
    if (voided.status !== 200 || !String(voidedBody.administration?.notes ?? "").includes("original note")) {
      failures++
      console.log(`voiding a dose returned ${voided.status} and did not keep the original note`)
    }
  }
}

const outsideHours = await api(patientJar, "/api/appointments", {
  method: "POST",
  body: JSON.stringify({
    doctorId: doctor.profile.id,
    scheduledAt: "2027-01-02T18:00:00.000Z",
    duration: 30,
    reason: "Saturday clinic check",
  }),
})
if (outsideHours.status !== 409) {
  failures++
  console.log(`booking outside clinic hours returned ${outsideHours.status}, want 409`)
}

const blockedRx = await api(doctorJar, "/api/prescriptions", {
  method: "POST",
  body: JSON.stringify({
    patientId: "aaaaaaaaaaaaaaaaaaaaaaaa",
    items: [{ drugId: "aaaaaaaaaaaaaaaaaaaaaaaa", dosage: "10mg", frequency: "daily", duration: "7 days", quantity: 7 }],
  }),
})
if (blockedRx.status !== 403) {
  failures++
  console.log(`cross-panel prescription returned ${blockedRx.status}, want 403`)
}

if (patient.profile?.id) {
  const chart = await api(nurseJar, `/api/patients/${patient.profile.id}/chart`)
  if (chart.status !== 403) {
    failures++
    console.log(`nurse chart for Sarah returned ${chart.status}, want 403`)
  }
}

if (wardPatient) {
  const handoff = await api(nurseJar, "/api/notes", {
    method: "POST",
    body: JSON.stringify({
      patientId: wardPatient.id,
      content: "Verify handoff: stable for the next shift.",
      noteType: "HANDOFF",
    }),
  })
  if (handoff.status !== 201) {
    failures++
    console.log(`handoff note returned ${handoff.status}, want 201`)
  }

  const vitals = await api(nurseJar, "/api/vitals", {
    method: "POST",
    body: JSON.stringify({
      patientId: wardPatient.id,
      systolic: 118,
      diastolic: 76,
      heartRate: 72,
      oxygenSaturation: 98,
    }),
  })
  if (vitals.status !== 201) {
    failures++
    console.log(`chart vitals returned ${vitals.status}, want 201`)
  }
}

const panelPatient = doctor.patients[0]
if (panelPatient) {
  const labs = await api(doctorJar, "/api/lab-orders", {
    method: "POST",
    body: JSON.stringify({ patientId: panelPatient.id, tests: ["CBC"], priority: "ROUTINE" }),
  })
  if (labs.status !== 201) {
    failures++
    console.log(`chart lab order returned ${labs.status}, want 201`)
  }

  if (panelPatient.userId) {
    const reply = await api(doctorJar, "/api/messages", {
      method: "POST",
      body: JSON.stringify({
        recipientId: panelPatient.userId,
        patientId: panelPatient.id,
        subject: "Visit follow-up",
        body: "Please reply if symptoms change before your next visit.",
      }),
    })
    if (reply.status !== 201) {
      failures++
      console.log(`doctor message reply returned ${reply.status}, want 201`)
    }
  }
}

const blockedReply = await api(doctorJar, "/api/messages", {
  method: "POST",
  body: JSON.stringify({
    recipientId: "aaaaaaaaaaaaaaaaaaaaaaaa",
    patientId: "aaaaaaaaaaaaaaaaaaaaaaaa",
    subject: "Out of panel",
    body: "This should be rejected for a patient outside the panel.",
  }),
})
if (blockedReply.status !== 403) {
  failures++
  console.log(`out-of-panel doctor message returned ${blockedReply.status}, want 403`)
}

const openVisit = doctor.todaysAppointments.find(row =>
  row.status === "SCHEDULED" || row.status === "CONFIRMED" || row.status === "IN_PROGRESS"
) ?? (await api(doctorJar, "/api/appointments?scope=upcoming").then(async res => {
  const body = (await res.json()) as { appointments?: Array<{ id: string; status: string }> }
  return body.appointments?.find(row => row.status === "SCHEDULED" || row.status === "CONFIRMED")
}))

if (openVisit) {
  const completed = await api(doctorJar, `/api/appointments/${openVisit.id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "COMPLETED" }),
  })
  if (completed.status !== 200) {
    failures++
    console.log(`completing a visit returned ${completed.status}, want 200`)
  } else {
    const again = await api(doctorJar, `/api/appointments/${openVisit.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "COMPLETED" }),
    })
    if (again.status !== 200) {
      failures++
      console.log(`idempotent complete returned ${again.status}, want 200`)
    }
    const billing = await api(patientJar, "/api/billing")
    const billingBody = (await billing.json()) as { invoices?: Array<{ invoiceNumber: string }> }
    const consult = billingBody.invoices?.find(row => row.invoiceNumber === `CONSULT-${openVisit.id}`)
    if (!consult) {
      // The completed visit may belong to another patient on the doctor's panel.
      const adminBilling = await api(await login(EMAILS.admin), "/api/billing")
      const adminBody = (await adminBilling.json()) as { invoices?: Array<{ invoiceNumber: string }> }
      if (!adminBody.invoices?.some(row => row.invoiceNumber === `CONSULT-${openVisit.id}`)) {
        failures++
        console.log(`consultation invoice CONSULT-${openVisit.id} was not created`)
      }
    }
  }
}

const adminJar = await login(EMAILS.admin)
const outpatient = doctor.patients.find(row => !row.admitted)
const beds = await api(adminJar, "/api/admissions")
const bedBody = (await beds.json()) as { beds?: Array<{ id: string; occupied: boolean }> }
const freeBed = bedBody.beds?.find(bed => !bed.occupied)
if (beds.status === 200 && outpatient && freeBed) {
  const admitted = await api(adminJar, "/api/admissions", {
    method: "POST",
    body: JSON.stringify({ patientId: outpatient.id, bedId: freeBed.id, reason: "Verify placement" }),
  })
  const admittedBody = (await admitted.json()) as { admission?: { id: string } }
  if (admitted.status !== 201 || !admittedBody.admission) {
    failures++
    console.log(`admit returned ${admitted.status}, want 201`)
  } else {
    const stayId = admittedBody.admission.id
    const discharged = await api(adminJar, `/api/admissions/${stayId}`, { method: "PATCH" })
    if (discharged.status !== 200) {
      failures++
      console.log(`discharge returned ${discharged.status}, want 200`)
    } else {
      const adminBilling = await api(adminJar, "/api/billing")
      const adminBody = (await adminBilling.json()) as { invoices?: Array<{ invoiceNumber: string }> }
      if (!adminBody.invoices?.some(row => row.invoiceNumber === `STAY-${stayId}`)) {
        failures++
        console.log(`stay invoice STAY-${stayId} was not created`)
      }
    }
  }
}

const stockItem = admin.inventory.find(row => row.lowStock) ?? admin.inventory[0]
if (stockItem) {
  const beforeQty = stockItem.quantity
  const restocked = await api(adminJar, `/api/inventory/${stockItem.id}`, {
    method: "PATCH",
    body: JSON.stringify({ addQuantity: 25 }),
  })
  const restockBody = (await restocked.json()) as { item?: { quantity: number } }
  if (restocked.status !== 200 || restockBody.item?.quantity !== beforeQty + 25) {
    failures++
    console.log(`inventory restock returned ${restocked.status}, qty ${restockBody.item?.quantity}, want ${beforeQty + 25}`)
  }
}

const drugList = await api(adminJar, "/api/drugs")
const drugBody = (await drugList.json()) as { drugs?: Array<{ id: string; name: string }> }
const drug = drugBody.drugs?.[0]
if (drug) {
  const batchNumber = `VERIFY-${Date.now().toString(36).toUpperCase()}`
  const received = await api(adminJar, "/api/batches", {
    method: "POST",
    body: JSON.stringify({
      drugId: drug.id,
      batchNumber,
      expiryDate: new Date(Date.now() + 400 * 86_400_000).toISOString(),
      quantity: 40,
      unitCost: 0.2,
    }),
  })
  if (received.status !== 201) {
    failures++
    console.log(`receive batch returned ${received.status}, want 201`)
  }
}

const overdueAsset = admin.equipment.find(row => row.maintenanceOverdue) ?? admin.equipment[0]
if (overdueAsset) {
  const next = new Date(Date.now() + 90 * 86_400_000).toISOString()
  const serviced = await api(adminJar, `/api/equipment/${overdueAsset.id}`, {
    method: "PATCH",
    body: JSON.stringify({ nextMaintenanceAt: next, status: "OPERATIONAL" }),
  })
  if (serviced.status !== 200) {
    failures++
    console.log(`equipment service returned ${serviced.status}, want 200`)
  }
}

const hours = await api(doctorJar, "/api/schedule", {
  method: "POST",
  body: JSON.stringify({ dayOfWeek: 6, startTime: "09:00", endTime: "11:00" }),
})
const hoursBody = (await hours.json()) as { schedule?: { id: string } }
if (hours.status !== 201 || !hoursBody.schedule) {
  failures++
  console.log(`add clinic hours returned ${hours.status}, want 201`)
} else {
  const removed = await api(doctorJar, `/api/schedule/${hoursBody.schedule.id}`, { method: "DELETE" })
  if (removed.status !== 200) {
    failures++
    console.log(`remove clinic hours returned ${removed.status}, want 200`)
  }
}

const leave = await api(nurseJar, "/api/leave", {
  method: "POST",
  body: JSON.stringify({
    type: "ANNUAL",
    startDate: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    endDate: new Date(Date.now() + 34 * 86_400_000).toISOString(),
    reason: "Verify leave submit",
  }),
})
const leaveBody = (await leave.json()) as { leave?: { id: string; status: string } }
if (leave.status !== 201 || leaveBody.leave?.status !== "PENDING") {
  failures++
  console.log(`staff leave submit returned ${leave.status}, want 201 PENDING`)
}

const patientLeave = await api(patientJar, "/api/leave", {
  method: "POST",
  body: JSON.stringify({
    type: "ANNUAL",
    startDate: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    endDate: new Date(Date.now() + 34 * 86_400_000).toISOString(),
  }),
})
if (patientLeave.status !== 403) {
  failures++
  console.log(`patient leave submit returned ${patientLeave.status}, want 403`)
}

console.log(failures === 0 ? "\nAll RBAC expectations met." : `\n${failures} expectation(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
