"use client"

import { FormEvent, useEffect, useState } from "react"
import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { DataTable, type Column } from "@/components/portal/DataTable"
import { PageHeader, StatCard } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { sendJson } from "@/lib/api-action"
import { useAdminPortal } from "@/lib/use-portal-data"
import type { AdminPortalData } from "@/server/queries/portal"

type Ward = AdminPortalData["wards"][number]
type Board = {
  beds: Array<{ id: string; number: string; wardName: string; occupied: boolean }>
  admissions: Array<{ id: string; patientName: string; wardName: string; bedNumber: string }>
  patients: Array<{ id: string; name: string; medicalRecordNumber: string | null }>
  doctors: Array<{ id: string; name: string }>
}

export default function AdminWardsPage() {
  const { data, loading, error, refresh } = useAdminPortal()
  const [board, setBoard] = useState<Board | null>(null)
  const [boardError, setBoardError] = useState<string | null>(null)
  const [patientId, setPatientId] = useState("")
  const [bedId, setBedId] = useState("")
  const [doctorId, setDoctorId] = useState("")
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let live = true
    fetch("/api/admissions")
      .then(async response => {
        const body = (await response.json().catch(() => null)) as (Board & { error?: string }) | null
        if (!live) return
        if (!response.ok) {
          setBoardError(body?.error ?? "Could not load beds")
          return
        }
        setBoard(body)
        setBoardError(null)
      })
      .catch(() => {
        if (live) setBoardError("Could not load beds")
      })
    return () => {
      live = false
    }
  }, [revision])

  if (loading) return <PortalLayout role="admin"><PortalState loading /></PortalLayout>
  if (error || !data.stats) return <PortalLayout role="admin"><PortalState error={error} /></PortalLayout>

  const freeBeds = board?.beds.filter(bed => !bed.occupied) ?? []
  const selectedPatient = patientId || board?.patients[0]?.id || ""
  const selectedBed = bedId || freeBeds[0]?.id || ""

  async function admit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      await sendJson("/api/admissions", "POST", {
        patientId: selectedPatient,
        bedId: selectedBed,
        doctorId: doctorId || undefined,
        reason,
      })
      setReason("")
      setRevision(value => value + 1)
      refresh()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Could not admit the patient")
    } finally {
      setSaving(false)
    }
  }

  async function discharge(id: string) {
    setFormError(null)
    try {
      await sendJson(`/api/admissions/${id}`, "PATCH")
      setRevision(value => value + 1)
      refresh()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Could not discharge the patient")
    }
  }

  const columns: Column<Ward>[] = [
    { key: "name", header: "Ward", render: w => <span className="font-medium">{w.name}</span> },
    { key: "floor", header: "Floor", render: w => <span>{w.floor ?? "—"}</span> },
    { key: "occupied", header: "Occupied", render: w => <span>{w.occupied}/{w.total}</span> },
    { key: "free", header: "Available", render: w => <span>{w.total - w.occupied}</span> },
  ]

  return (
    <PortalLayout role="admin">
      <div className="space-y-6">
        <PageHeader title="Ward & Beds" description="Live occupancy" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Beds" value={String(data.stats.totalBeds)} />
          <StatCard label="Occupied" value={String(data.stats.occupiedBeds)} accent="gold" />
          <StatCard label="Occupancy" value={`${data.stats.bedOccupancyRate}%`} accent="sage" />
        </div>
        <Card padding="md">
          <CardHeader><CardTitle>Admit a patient</CardTitle></CardHeader>
          <CardContent>
            {boardError && <p role="alert" className="text-sm text-red-700 mb-3">{boardError}</p>}
            <form onSubmit={event => void admit(event)} className="grid sm:grid-cols-2 gap-4">
              <label className="text-sm font-medium text-clay-700">
                Patient
                <select className="clay-input mt-1.5" value={selectedPatient} onChange={event => setPatientId(event.target.value)} required>
                  {(board?.patients ?? []).map(patient => (
                    <option key={patient.id} value={patient.id}>{patient.name}{patient.medicalRecordNumber ? ` · ${patient.medicalRecordNumber}` : ""}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-clay-700">
                Free bed
                <select className="clay-input mt-1.5" value={selectedBed} onChange={event => setBedId(event.target.value)} required>
                  {freeBeds.map(bed => (
                    <option key={bed.id} value={bed.id}>{bed.wardName} · {bed.number}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-clay-700">
                Attending
                <select className="clay-input mt-1.5" value={doctorId} onChange={event => setDoctorId(event.target.value)}>
                  <option value="">Unassigned</option>
                  {(board?.doctors ?? []).map(doctor => (
                    <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                  ))}
                </select>
              </label>
              <Input label="Reason" value={reason} onChange={event => setReason(event.target.value)} />
              {formError && <p role="alert" className="sm:col-span-2 text-sm text-red-700">{formError}</p>}
              <div>
                <Button type="submit" disabled={saving || !selectedPatient || !selectedBed}>{saving ? "Admitting…" : "Admit"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Open admissions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(board?.admissions ?? []).length === 0 ? <p className="text-sm text-clay-500">No open admissions.</p> : board?.admissions.map(row => (
              <div key={row.id} className="flex items-center justify-between gap-3">
                <p className="text-sm text-clay-800">{row.patientName} · {row.wardName} {row.bedNumber}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => void discharge(row.id)}>Discharge</Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Wards</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={columns} rows={data.wards} rowKey={w => w.id} empty="No wards." />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
