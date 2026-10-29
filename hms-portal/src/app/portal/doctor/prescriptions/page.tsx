"use client"

import { FormEvent, useEffect, useState } from "react"
import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { DataTable, StatusBadge, type Column } from "@/components/portal/DataTable"
import { PageHeader } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { sendJson } from "@/lib/api-action"
import { useDoctorPortal } from "@/lib/use-portal-data"
import { formatDate } from "@/lib/utils"

type Row = {
  id: string
  patientName: string
  drugName: string
  sig: string
  status: string
  issuedAt: Date | string
  refills: number
}

type Drug = { id: string; name: string; strength: string; form: string }

export default function DoctorPrescriptionsPage() {
  const { data, loading, error, refresh } = useDoctorPortal()
  const [drugs, setDrugs] = useState<Drug[]>([])
  const [patientId, setPatientId] = useState("")
  const [drugId, setDrugId] = useState("")
  const [dosage, setDosage] = useState("")
  const [frequency, setFrequency] = useState("Once daily")
  const [duration, setDuration] = useState("30 days")
  const [quantity, setQuantity] = useState("30")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
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
  }, [])

  if (loading) return <PortalLayout role="doctor"><PortalState loading /></PortalLayout>
  if (error || !data.profile) return <PortalLayout role="doctor"><PortalState error={error} /></PortalLayout>

  const selectedPatient = patientId || data.patients[0]?.id || ""

  async function prescribe(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      await sendJson("/api/prescriptions", "POST", {
        patientId: selectedPatient,
        items: [{ drugId, dosage, frequency, duration, quantity: Number(quantity) }],
      })
      setDosage("")
      refresh()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Could not write the prescription")
    } finally {
      setSaving(false)
    }
  }

  const rows: Row[] = data.prescriptions.flatMap(rx =>
    rx.items.map(item => ({
      id: item.id,
      patientName: rx.patientName ?? "Patient",
      drugName: item.drugName,
      sig: `${item.dosage} · ${item.frequency}`,
      status: rx.status,
      issuedAt: rx.issuedAt,
      refills: item.refillsLeft,
    }))
  )

  const columns: Column<Row>[] = [
    { key: "patient", header: "Patient", render: r => <span className="font-medium">{r.patientName}</span> },
    { key: "drug", header: "Drug", render: r => <span>{r.drugName}</span> },
    { key: "sig", header: "Sig", render: r => <span className="text-clay-600">{r.sig}</span> },
    { key: "refills", header: "Refills", render: r => <span>{r.refills}</span> },
    { key: "status", header: "Status", render: r => <StatusBadge status={r.status} /> },
    { key: "issued", header: "Issued", render: r => <span className="text-clay-500">{formatDate(r.issuedAt)}</span> },
  ]

  return (
    <PortalLayout role="doctor">
      <div className="space-y-6">
        <PageHeader title="Prescriptions" description="Orders you have written" />
        <Card padding="md">
          <CardHeader><CardTitle>Write a prescription</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={event => void prescribe(event)} className="grid sm:grid-cols-2 gap-4">
              <label className="text-sm font-medium text-clay-700">
                Patient
                <select className="clay-input mt-1.5" value={selectedPatient} onChange={event => setPatientId(event.target.value)} required>
                  {data.patients.map(patient => (
                    <option key={patient.id} value={patient.id}>{patient.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-clay-700">
                Drug
                <select className="clay-input mt-1.5" value={drugId} onChange={event => setDrugId(event.target.value)} required>
                  {drugs.map(drug => (
                    <option key={drug.id} value={drug.id}>{drug.name} {drug.strength}</option>
                  ))}
                </select>
              </label>
              <Input label="Dosage" value={dosage} onChange={event => setDosage(event.target.value)} required />
              <Input label="Frequency" value={frequency} onChange={event => setFrequency(event.target.value)} required />
              <Input label="Duration" value={duration} onChange={event => setDuration(event.target.value)} required />
              <Input label="Quantity" type="number" min={1} value={quantity} onChange={event => setQuantity(event.target.value)} required />
              {formError && <p role="alert" className="sm:col-span-2 text-sm text-red-700">{formError}</p>}
              <div>
                <Button type="submit" disabled={saving || !selectedPatient || !drugId}>{saving ? "Saving…" : "Prescribe"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Prescription items</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={columns} rows={rows} rowKey={r => r.id} empty="No prescriptions." />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
