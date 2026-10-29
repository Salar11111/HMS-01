"use client"

import { FormEvent, useState } from "react"
import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { DataTable, type Column } from "@/components/portal/DataTable"
import { PageHeader } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { sendJson } from "@/lib/api-action"
import { useNursePortal } from "@/lib/use-portal-data"
import type { NursePortalData } from "@/server/queries/portal"
import { formatTime } from "@/lib/utils"

type Vital = NursePortalData["latestVitals"][number]

export default function NurseVitalsPage() {
  const { data, loading, error, refresh } = useNursePortal()
  const [patientId, setPatientId] = useState("")
  const [systolic, setSystolic] = useState("")
  const [diastolic, setDiastolic] = useState("")
  const [heartRate, setHeartRate] = useState("")
  const [oxygen, setOxygen] = useState("")
  const [temperature, setTemperature] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (loading) return <PortalLayout role="nurse"><PortalState loading /></PortalLayout>
  if (error || !data.profile) return <PortalLayout role="nurse"><PortalState error={error} /></PortalLayout>

  const selectedPatient = patientId || data.patients[0]?.id || ""

  async function record(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      await sendJson("/api/vitals", "POST", {
        patientId: selectedPatient,
        systolic: systolic ? Number(systolic) : undefined,
        diastolic: diastolic ? Number(diastolic) : undefined,
        heartRate: heartRate ? Number(heartRate) : undefined,
        oxygenSaturation: oxygen ? Number(oxygen) : undefined,
        temperature: temperature ? Number(temperature) : undefined,
      })
      setSystolic("")
      setDiastolic("")
      setHeartRate("")
      setOxygen("")
      setTemperature("")
      refresh()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Could not record vitals")
    } finally {
      setSaving(false)
    }
  }

  const nameById = new Map(data.patients.map(p => [p.id, p.name]))
  const columns: Column<Vital>[] = [
    { key: "patient", header: "Patient", render: v => <span className="font-medium">{nameById.get(v.patientId) ?? "Patient"}</span> },
    { key: "time", header: "Time", render: v => <span>{formatTime(v.recordedAt)}</span> },
    { key: "bp", header: "BP", render: v => <span>{v.systolic ?? "—"}/{v.diastolic ?? "—"}</span> },
    { key: "hr", header: "HR", render: v => <span>{v.heartRate ?? "—"}</span> },
    { key: "spo2", header: "SpO2", render: v => <span>{v.oxygenSaturation ?? "—"}</span> },
    { key: "temp", header: "Temp", render: v => <span>{v.temperature ?? "—"}</span> },
    { key: "flag", header: "Flag", render: v => <span className={v.abnormal ? "text-accent-coral font-medium" : "text-clay-500"}>{v.abnormal ? "Out of range" : "In range"}</span> },
  ]

  return (
    <PortalLayout role="nurse">
      <div className="space-y-6">
        <PageHeader title="Vitals & Observations" description="Latest reading for each admitted patient" />
        <Card padding="md">
          <CardHeader><CardTitle>Record vitals</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={event => void record(event)} className="grid sm:grid-cols-3 gap-4">
              <label className="text-sm font-medium text-clay-700 sm:col-span-3">
                Patient
                <select className="clay-input mt-1.5" value={selectedPatient} onChange={event => setPatientId(event.target.value)} required>
                  {data.patients.map(patient => (
                    <option key={patient.id} value={patient.id}>{patient.name} · {patient.wardName} {patient.bedNumber}</option>
                  ))}
                </select>
              </label>
              <Input label="Systolic" type="number" value={systolic} onChange={event => setSystolic(event.target.value)} />
              <Input label="Diastolic" type="number" value={diastolic} onChange={event => setDiastolic(event.target.value)} />
              <Input label="Heart rate" type="number" value={heartRate} onChange={event => setHeartRate(event.target.value)} />
              <Input label="SpO2" type="number" value={oxygen} onChange={event => setOxygen(event.target.value)} />
              <Input label="Temperature C" type="number" step="0.1" value={temperature} onChange={event => setTemperature(event.target.value)} />
              {formError && <p role="alert" className="sm:col-span-3 text-sm text-red-700">{formError}</p>}
              <div>
                <Button type="submit" disabled={saving || !selectedPatient}>{saving ? "Saving…" : "Save vitals"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Latest vitals</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={columns} rows={data.latestVitals} rowKey={v => v.id} empty="No vitals recorded for admitted patients." />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
