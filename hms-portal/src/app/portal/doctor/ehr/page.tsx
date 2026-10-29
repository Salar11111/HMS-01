"use client"

import { FormEvent, useState } from "react"
import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { DataTable, StatusBadge, type Column } from "@/components/portal/DataTable"
import { PageHeader } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { sendJson } from "@/lib/api-action"
import { useDoctorPortal } from "@/lib/use-portal-data"
import type { DoctorPortalData } from "@/server/queries/portal"
import { formatDate } from "@/lib/utils"

type RecordRow = DoctorPortalData["records"][number]
type Flag = DoctorPortalData["abnormalResults"][number]

export default function DoctorEhrPage() {
  const { data, loading, error, refresh } = useDoctorPortal()
  const [patientId, setPatientId] = useState("")
  const [tests, setTests] = useState("")
  const [priority, setPriority] = useState<"ROUTINE" | "URGENT" | "STAT">("ROUTINE")
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [diagnosis, setDiagnosis] = useState("")
  const [note, setNote] = useState("")

  if (loading) return <PortalLayout role="doctor"><PortalState loading /></PortalLayout>
  if (error || !data.profile) return <PortalLayout role="doctor"><PortalState error={error} /></PortalLayout>

  const selectedPatient = patientId || data.patients[0]?.id || ""

  async function fileNote(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      await sendJson("/api/records", "POST", { patientId: selectedPatient, diagnosis, notes: note })
      setDiagnosis("")
      setNote("")
      refresh()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Could not file the note")
    } finally {
      setSaving(false)
    }
  }

  async function orderLabs(event: FormEvent) {
    event.preventDefault()
    const names = tests.split(",").map(item => item.trim()).filter(Boolean)
    setSaving(true)
    setFormError(null)
    try {
      await sendJson("/api/lab-orders", "POST", {
        patientId: selectedPatient,
        priority,
        tests: names,
      })
      setTests("")
      refresh()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Could not order the tests")
    } finally {
      setSaving(false)
    }
  }

  const noteColumns: Column<RecordRow>[] = [
    { key: "when", header: "Date", render: r => <span>{formatDate(r.recordedAt)}</span> },
    { key: "patient", header: "Patient", render: r => <span className="font-medium">{r.patientName}</span> },
    { key: "diagnosis", header: "Diagnosis", render: r => <span>{r.diagnosis ?? "—"}</span> },
    { key: "treatment", header: "Treatment", render: r => <span className="text-clay-600">{r.treatment ?? "—"}</span> },
  ]

  const flagColumns: Column<Flag>[] = [
    { key: "patient", header: "Patient", render: r => <span className="font-medium">{r.patientName}</span> },
    { key: "test", header: "Test", render: r => <span>{r.testName}</span> },
    { key: "value", header: "Result", render: r => <span>{[r.result, r.unit].filter(Boolean).join(" ")}</span> },
    { key: "flag", header: "Flag", render: r => <StatusBadge status={r.flag ?? "NORMAL"} /> },
  ]

  return (
    <PortalLayout role="doctor">
      <div className="space-y-6">
        <PageHeader title="EHR & Charting" description="Notes you filed and abnormal results on your orders" />
        <Card padding="md">
          <CardHeader><CardTitle>File a note</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={event => void fileNote(event)} className="grid gap-4">
              <label className="text-sm font-medium text-clay-700">
                Patient
                <select className="clay-input mt-1.5" value={selectedPatient} onChange={event => setPatientId(event.target.value)} required>
                  {data.patients.map(patient => (
                    <option key={patient.id} value={patient.id}>{patient.name}</option>
                  ))}
                </select>
              </label>
              <Input label="Diagnosis" value={diagnosis} onChange={event => setDiagnosis(event.target.value)} />
              <label className="text-sm font-medium text-clay-700">
                Note
                <textarea className="clay-input mt-1.5 min-h-24" value={note} onChange={event => setNote(event.target.value)} />
              </label>
              {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
              <div>
                <Button type="submit" disabled={saving || !selectedPatient || (!diagnosis.trim() && !note.trim())}>{saving ? "Saving…" : "File note"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card padding="md">
          <CardHeader><CardTitle>Order labs</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={event => void orderLabs(event)} className="grid sm:grid-cols-2 gap-4">
              <label className="text-sm font-medium text-clay-700">
                Patient
                <select className="clay-input mt-1.5" value={selectedPatient} onChange={event => setPatientId(event.target.value)} required>
                  {data.patients.map(patient => (
                    <option key={patient.id} value={patient.id}>{patient.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-clay-700">
                Priority
                <select className="clay-input mt-1.5" value={priority} onChange={event => setPriority(event.target.value as typeof priority)}>
                  <option value="ROUTINE">Routine</option>
                  <option value="URGENT">Urgent</option>
                  <option value="STAT">STAT</option>
                </select>
              </label>
              <Input label="Tests" hint="Separate names with commas" value={tests} onChange={event => setTests(event.target.value)} className="sm:col-span-2" required />
              {formError && <p role="alert" className="sm:col-span-2 text-sm text-red-700">{formError}</p>}
              <div>
                <Button type="submit" disabled={saving || !selectedPatient || !tests.trim()}>{saving ? "Ordering…" : "Place order"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Abnormal results</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={flagColumns} rows={data.abnormalResults} rowKey={r => r.id} empty="No abnormal results." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent notes</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={noteColumns} rows={data.records} rowKey={r => r.id} empty="No notes filed." />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
