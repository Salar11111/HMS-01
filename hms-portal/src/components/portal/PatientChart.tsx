"use client"

import { FormEvent, useEffect, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { sendJson } from "@/lib/api-action"
import { formatDate, formatTime } from "@/lib/utils"

type Chart = {
  patient: {
    id: string
    userId: string
    name: string
    medicalRecordNumber: string | null
    dateOfBirth: string | null
    bloodGroup: string | null
  }
  admission: { wardName: string; bedNumber: string; diagnosis: string | null } | null
  appointments: Array<{ id: string; scheduledAt: string; status: string; reason: string | null; doctorName: string }>
  vitals: Array<{ id: string; recordedAt: string; systolic: number | null; diastolic: number | null; heartRate: number | null; oxygenSaturation: number | null }>
  records: Array<{ id: string; diagnosis: string | null; treatment: string | null; notes: string | null; createdAt: string; authorName: string }>
  notes: Array<{ id: string; noteType: string; content: string; createdAt: string; authorName: string }>
  orders: Array<{ id: string; status: string; priority: string; orderedAt: string; tests: string[] }>
  prescriptions: Array<{
    id: string
    status: string
    issuedAt: string
    items: Array<{ label: string; drugName: string; dosage: string }>
  }>
  medications: Array<{ id: string; drugName: string; dosage: string; status: string; administeredAt: string; prescriptionId: string | null }>
}

type Drug = { id: string; name: string; strength: string; form: string }

const OPEN = new Set(["SCHEDULED", "CONFIRMED", "IN_PROGRESS"])

export function PatientChart({ role, patientId }: { role: "doctor" | "nurse"; patientId: string }) {
  const [chart, setChart] = useState<Chart | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const [diagnosis, setDiagnosis] = useState("")
  const [drugs, setDrugs] = useState<Drug[]>([])
  const [drugId, setDrugId] = useState("")
  const [dosage, setDosage] = useState("")
  const [frequency, setFrequency] = useState("Once daily")
  const [duration, setDuration] = useState("30 days")
  const [quantity, setQuantity] = useState("30")
  const [tests, setTests] = useState("")
  const [priority, setPriority] = useState<"ROUTINE" | "URGENT" | "STAT">("ROUTINE")
  const [systolic, setSystolic] = useState("")
  const [diastolic, setDiastolic] = useState("")
  const [heartRate, setHeartRate] = useState("")
  const [oxygen, setOxygen] = useState("")
  const [marDrug, setMarDrug] = useState("")
  const [marDosage, setMarDosage] = useState("")
  const [marPrescriptionId, setMarPrescriptionId] = useState("")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function load() {
    const response = await fetch(`/api/patients/${patientId}/chart`)
    const body = (await response.json().catch(() => null)) as (Chart & { error?: string }) | null
    if (!response.ok) {
      setError(body?.error ?? "Could not open this chart")
      setChart(null)
      return
    }
    setError(null)
    setChart(body)
  }

  useEffect(() => {
    let live = true
    fetch(`/api/patients/${patientId}/chart`)
      .then(async response => {
        const body = (await response.json().catch(() => null)) as (Chart & { error?: string }) | null
        if (!live) return
        if (!response.ok) {
          setError(body?.error ?? "Could not open this chart")
          return
        }
        setChart(body)
      })
      .catch(() => {
        if (live) setError("Could not open this chart")
      })
    return () => {
      live = false
    }
  }, [patientId])

  useEffect(() => {
    if (role !== "doctor") return
    let live = true
    sendJson("/api/drugs", "GET")
      .then(payload => {
        if (!live) return
        const rows = (payload as { drugs?: Drug[] } | null)?.drugs ?? []
        setDrugs(rows)
        setDrugId(current => current || rows[0]?.id || "")
      })
      .catch(() => {
        if (live) setFormError("The formulary could not be loaded")
      })
    return () => {
      live = false
    }
  }, [role])

  async function run(action: () => Promise<void>, fallback: string) {
    setSaving(true)
    setFormError(null)
    try {
      await action()
      await load()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : fallback)
    } finally {
      setSaving(false)
    }
  }

  async function saveNote(event: FormEvent) {
    event.preventDefault()
    await run(async () => {
      if (role === "doctor") {
        await sendJson("/api/records", "POST", { patientId, diagnosis, notes: note })
        setDiagnosis("")
      } else {
        await sendJson("/api/notes", "POST", { patientId, content: note, noteType: "PROGRESS" })
      }
      setNote("")
    }, "Could not save the note")
  }

  async function prescribe(event: FormEvent) {
    event.preventDefault()
    await run(async () => {
      await sendJson("/api/prescriptions", "POST", {
        patientId,
        items: [{ drugId, dosage, frequency, duration, quantity: Number(quantity) }],
      })
      setDosage("")
    }, "Could not write the prescription")
  }

  async function orderLabs(event: FormEvent) {
    event.preventDefault()
    const names = tests.split(",").map(item => item.trim()).filter(Boolean)
    await run(async () => {
      await sendJson("/api/lab-orders", "POST", { patientId, priority, tests: names })
      setTests("")
    }, "Could not order the tests")
  }

  async function completeVisit(id: string) {
    await run(async () => {
      await sendJson(`/api/appointments/${id}`, "PATCH", { status: "COMPLETED" })
    }, "Could not complete the visit")
  }

  async function recordVitals(event: FormEvent) {
    event.preventDefault()
    await run(async () => {
      await sendJson("/api/vitals", "POST", {
        patientId,
        systolic: systolic ? Number(systolic) : undefined,
        diastolic: diastolic ? Number(diastolic) : undefined,
        heartRate: heartRate ? Number(heartRate) : undefined,
        oxygenSaturation: oxygen ? Number(oxygen) : undefined,
      })
      setSystolic("")
      setDiastolic("")
      setHeartRate("")
      setOxygen("")
    }, "Could not record vitals")
  }

  async function giveDose(event: FormEvent) {
    event.preventDefault()
    await run(async () => {
      await sendJson("/api/medications", "POST", {
        patientId,
        drugName: marDrug,
        dosage: marDosage,
        prescriptionId: marPrescriptionId || undefined,
      })
      setMarDrug("")
      setMarDosage("")
      setMarPrescriptionId("")
    }, "Could not record the dose")
  }

  async function voidDose(id: string) {
    await run(async () => {
      await sendJson(`/api/medications/${id}`, "DELETE")
    }, "Could not void the dose")
  }

  if (error) return <p role="alert" className="text-sm text-red-700">{error}</p>
  if (!chart) return <p className="text-sm text-clay-500">Opening the chart…</p>

  const openVisits = chart.appointments.filter(row => OPEN.has(row.status))
  const activeRx = chart.prescriptions.filter(row => row.status === "ACTIVE")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-clay-900">{chart.patient.name}</h1>
        <p className="text-sm text-clay-600">
          {chart.patient.medicalRecordNumber ?? "No MRN"}
          {chart.patient.bloodGroup ? ` · ${chart.patient.bloodGroup}` : ""}
          {chart.admission ? ` · ${chart.admission.wardName} ${chart.admission.bedNumber}` : " · Outpatient"}
        </p>
      </div>

      {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}

      <Card padding="md">
        <CardHeader><CardTitle>{role === "doctor" ? "Add a chart note" : "Add a progress note"}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={event => void saveNote(event)} className="grid gap-4">
            {role === "doctor" && (
              <Input label="Diagnosis" value={diagnosis} onChange={event => setDiagnosis(event.target.value)} />
            )}
            <label className="text-sm font-medium text-clay-700">
              Note
              <textarea className="clay-input mt-1.5 min-h-24" value={note} onChange={event => setNote(event.target.value)} required={role === "nurse"} />
            </label>
            <div>
              <Button type="submit" disabled={saving || (role === "nurse" ? !note.trim() : !note.trim() && !diagnosis.trim())}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {role === "doctor" && (
        <>
          <Card padding="md">
            <CardHeader><CardTitle>Order labs</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={event => void orderLabs(event)} className="grid sm:grid-cols-2 gap-4">
                <label className="text-sm font-medium text-clay-700">
                  Priority
                  <select className="clay-input mt-1.5" value={priority} onChange={event => setPriority(event.target.value as typeof priority)}>
                    <option value="ROUTINE">Routine</option>
                    <option value="URGENT">Urgent</option>
                    <option value="STAT">STAT</option>
                  </select>
                </label>
                <Input label="Tests" hint="Separate names with commas" value={tests} onChange={event => setTests(event.target.value)} className="sm:col-span-2" required />
                <div>
                  <Button type="submit" disabled={saving || !tests.trim()}>Place order</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card padding="md">
            <CardHeader><CardTitle>Prescribe</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={event => void prescribe(event)} className="grid sm:grid-cols-2 gap-4">
                <label className="text-sm font-medium text-clay-700 sm:col-span-2">
                  Drug
                  <select className="clay-input mt-1.5" value={drugId} onChange={event => setDrugId(event.target.value)} required>
                    {drugs.map(drug => (
                      <option key={drug.id} value={drug.id}>{drug.name} {drug.strength} {drug.form}</option>
                    ))}
                  </select>
                </label>
                <Input label="Dosage" value={dosage} onChange={event => setDosage(event.target.value)} required />
                <Input label="Frequency" value={frequency} onChange={event => setFrequency(event.target.value)} required />
                <Input label="Duration" value={duration} onChange={event => setDuration(event.target.value)} required />
                <Input label="Quantity" type="number" min={1} value={quantity} onChange={event => setQuantity(event.target.value)} required />
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={saving || !drugId}>Write prescription</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {openVisits.length > 0 && (
            <Card padding="md">
              <CardHeader><CardTitle>Open visits</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {openVisits.map(visit => (
                  <div key={visit.id} className="flex items-center justify-between gap-3">
                    <p className="text-sm text-clay-800">
                      {formatDate(visit.scheduledAt)} · {visit.status}
                      {visit.reason ? ` — ${visit.reason}` : ""}
                    </p>
                    <Button type="button" size="sm" disabled={saving} onClick={() => void completeVisit(visit.id)}>
                      Complete
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {role === "nurse" && (
        <>
          <Card padding="md">
            <CardHeader><CardTitle>Record vitals</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={event => void recordVitals(event)} className="grid sm:grid-cols-2 gap-4">
                <Input label="Systolic" type="number" value={systolic} onChange={event => setSystolic(event.target.value)} />
                <Input label="Diastolic" type="number" value={diastolic} onChange={event => setDiastolic(event.target.value)} />
                <Input label="Heart rate" type="number" value={heartRate} onChange={event => setHeartRate(event.target.value)} />
                <Input label="SpO₂" type="number" value={oxygen} onChange={event => setOxygen(event.target.value)} />
                <div>
                  <Button type="submit" disabled={saving || (!systolic && !diastolic && !heartRate && !oxygen)}>
                    Save vitals
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card padding="md">
            <CardHeader><CardTitle>Give a dose</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={event => void giveDose(event)} className="grid sm:grid-cols-2 gap-4">
                <label className="text-sm font-medium text-clay-700 sm:col-span-2">
                  Active prescription
                  <select
                    className="clay-input mt-1.5"
                    value={marPrescriptionId}
                    onChange={event => {
                      const id = event.target.value
                      setMarPrescriptionId(id)
                      const rx = activeRx.find(row => row.id === id)
                      const item = rx?.items[0]
                      if (item) {
                        setMarDrug(item.drugName)
                        setMarDosage(item.dosage)
                      }
                    }}
                  >
                    <option value="">Free text</option>
                    {activeRx.map(rx => (
                      <option key={rx.id} value={rx.id}>
                        {rx.items.map(item => item.label).join(", ") || "Prescription"}
                      </option>
                    ))}
                  </select>
                </label>
                <Input label="Drug" value={marDrug} onChange={event => setMarDrug(event.target.value)} required />
                <Input label="Dosage" value={marDosage} onChange={event => setMarDosage(event.target.value)} required />
                <div>
                  <Button type="submit" disabled={saving || !marDrug.trim() || !marDosage.trim()}>Record given</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </>
      )}

      <Section title="Visits" empty="No visits." rows={chart.appointments.map(row => ({
        id: row.id,
        title: `${formatDate(row.scheduledAt)} · ${row.status}`,
        body: `${row.doctorName}${row.reason ? ` — ${row.reason}` : ""}`,
      }))} />
      <Section title="Vitals" empty="No vitals." rows={chart.vitals.map(row => ({
        id: row.id,
        title: `${formatDate(row.recordedAt)} · ${formatTime(row.recordedAt)}`,
        body: `BP ${row.systolic ?? "—"}/${row.diastolic ?? "—"} · HR ${row.heartRate ?? "—"} · SpO₂ ${row.oxygenSaturation ?? "—"}`,
      }))} />
      <Section title="Chart notes" empty="No chart notes." rows={chart.records.map(row => ({
        id: row.id,
        title: `${formatDate(row.createdAt)} · ${row.authorName}`,
        body: [row.diagnosis, row.treatment, row.notes].filter(Boolean).join(" · ") || "—",
      }))} />
      <Section title="Nursing notes" empty="No nursing notes." rows={chart.notes.map(row => ({
        id: row.id,
        title: `${row.noteType} · ${formatDate(row.createdAt)} · ${row.authorName}`,
        body: row.content,
      }))} />
      <Section title="Orders" empty="No orders." rows={chart.orders.map(row => ({
        id: row.id,
        title: `${row.priority} · ${row.status}`,
        body: row.tests.join(", ") || "—",
      }))} />
      <Section title="Prescriptions" empty="No prescriptions." rows={chart.prescriptions.map(row => ({
        id: row.id,
        title: `${row.status} · ${formatDate(row.issuedAt)}`,
        body: row.items.map(item => item.label).join(", ") || "—",
      }))} />
      <Card>
        <CardHeader><CardTitle>Medication record</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {chart.medications.length === 0 ? (
            <p className="text-sm text-clay-500">No administrations.</p>
          ) : chart.medications.map(row => (
            <div key={row.id} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-clay-900">{row.status} · {formatDate(row.administeredAt)}</p>
                <p className="text-sm text-clay-600">{row.drugName} {row.dosage}</p>
              </div>
              {role === "nurse" && row.status !== "VOIDED" && (
                <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => void voidDose(row.id)}>
                  Void
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function Section({ title, empty, rows }: { title: string; empty: string; rows: Array<{ id: string; title: string; body: string }> }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? <p className="text-sm text-clay-500">{empty}</p> : rows.map(row => (
          <div key={row.id}>
            <p className="text-sm font-medium text-clay-900">{row.title}</p>
            <p className="text-sm text-clay-600">{row.body}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
