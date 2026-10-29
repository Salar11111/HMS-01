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
import { useNursePortal } from "@/lib/use-portal-data"
import type { NursePortalData } from "@/server/queries/portal"
import { formatTime } from "@/lib/utils"

type Med = NursePortalData["medications"][number]

export default function NurseMedicationsPage() {
  const { data, loading, error, refresh } = useNursePortal()
  const [patientId, setPatientId] = useState("")
  const [drugName, setDrugName] = useState("")
  const [dosage, setDosage] = useState("")
  const [notes, setNotes] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (loading) return <PortalLayout role="nurse"><PortalState loading /></PortalLayout>
  if (error || !data.profile) return <PortalLayout role="nurse"><PortalState error={error} /></PortalLayout>

  const selectedPatient = patientId || data.patients[0]?.id || ""

  async function give(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      await sendJson("/api/medications", "POST", {
        patientId: selectedPatient,
        drugName,
        dosage,
        notes: notes || undefined,
      })
      setDrugName("")
      setDosage("")
      setNotes("")
      refresh()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Could not record the dose")
    } finally {
      setSaving(false)
    }
  }

  async function voidEntry(id: string) {
    setFormError(null)
    try {
      await sendJson(`/api/medications/${id}`, "DELETE")
      refresh()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Could not void the entry")
    }
  }

  const nameById = new Map(data.patients.map(p => [p.id, p.name]))
  const columns: Column<Med>[] = [
    { key: "time", header: "Time", render: m => <span>{formatTime(m.administeredAt)}</span> },
    { key: "patient", header: "Patient", render: m => <span className="font-medium">{nameById.get(m.patientId) ?? "Patient"}</span> },
    { key: "drug", header: "Drug", render: m => <span>{m.drugName} · {m.dosage}</span> },
    { key: "status", header: "Status", render: m => <StatusBadge status={m.status} /> },
    { key: "notes", header: "Notes", render: m => <span className="text-clay-500">{m.notes || "—"}</span> },
    {
      key: "void",
      header: "",
      render: m =>
        m.status === "GIVEN" ? (
          <Button variant="ghost" size="sm" onClick={() => void voidEntry(m.id)}>Void</Button>
        ) : (
          <span />
        ),
    },
  ]

  return (
    <PortalLayout role="nurse">
      <div className="space-y-6">
        <PageHeader title="Medication Record" description="Administrations for the current census" />
        <Card padding="md">
          <CardHeader><CardTitle>Give a dose</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={event => void give(event)} className="grid sm:grid-cols-2 gap-4">
              <label className="text-sm font-medium text-clay-700 sm:col-span-2">
                Patient
                <select className="clay-input mt-1.5" value={selectedPatient} onChange={event => setPatientId(event.target.value)} required>
                  {data.patients.map(patient => (
                    <option key={patient.id} value={patient.id}>{patient.name}</option>
                  ))}
                </select>
              </label>
              <Input label="Drug" value={drugName} onChange={event => setDrugName(event.target.value)} required />
              <Input label="Dose" value={dosage} onChange={event => setDosage(event.target.value)} required />
              <Input label="Note" value={notes} onChange={event => setNotes(event.target.value)} className="sm:col-span-2" />
              {formError && <p role="alert" className="sm:col-span-2 text-sm text-red-700">{formError}</p>}
              <div>
                <Button type="submit" disabled={saving || !selectedPatient}>{saving ? "Saving…" : "Record administration"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>MAR</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={columns} rows={data.medications} rowKey={m => m.id} empty="No medication administrations recorded." />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
