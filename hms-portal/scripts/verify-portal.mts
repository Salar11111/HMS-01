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

console.log(failures === 0 ? "\nAll RBAC expectations met." : `\n${failures} expectation(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
