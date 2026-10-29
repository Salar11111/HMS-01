"use client"

import { FormEvent, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { Calendar, Clock } from "lucide-react"
import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { DataTable, StatusBadge, type Column } from "@/components/portal/DataTable"
import { PageHeader, StatCard } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { sendJson } from "@/lib/api-action"
import { usePatientPortal } from "@/lib/use-portal-data"
import type { PatientPortalData } from "@/server/queries/portal"
import { formatDate, formatTime } from "@/lib/utils"

type Appointment = PatientPortalData["appointments"][number]

function localInputMin() {
  const date = new Date(Date.now() + 60_000)
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function PatientAppointmentsContent() {
  const params = useSearchParams()
  const focusId = params.get("appointmentId")
  const { data, loading, error, refresh } = usePatientPortal()
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming")
  const [doctorId, setDoctorId] = useState("")
  const [when, setWhen] = useState("")
  const [reason, setReason] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (loading) {
    return <PortalLayout role="patient"><PortalState loading /></PortalLayout>
  }
  if (error || !data.profile) {
    return <PortalLayout role="patient"><PortalState error={error} /></PortalLayout>
  }

  const rows = data.appointments.filter(appointment => {
    if (focusId) return appointment.id === focusId
    return filter === "upcoming" ? appointment.upcoming : !appointment.upcoming
  })
  const upcoming = data.appointments.filter(a => a.upcoming).length
  const past = data.appointments.filter(a => !a.upcoming).length
  const confirmed = data.appointments.filter(a => a.status === "CONFIRMED").length

  async function book(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      await sendJson("/api/appointments", "POST", {
        doctorId,
        scheduledAt: new Date(when).toISOString(),
        reason: reason || undefined,
        duration: 30,
      })
      setReason("")
      setWhen("")
      refresh()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Could not book the visit")
    } finally {
      setSaving(false)
    }
  }

  async function cancel(id: string) {
    setFormError(null)
    try {
      await sendJson(`/api/appointments/${id}`, "DELETE")
      refresh()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Could not cancel the visit")
    }
  }

  const columns: Column<Appointment>[] = [
    {
      key: "when",
      header: "Date & time",
      render: a => (
        <div>
          <p className="font-medium text-clay-900">{formatDate(a.scheduledAt)}</p>
          <p className="text-xs text-clay-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(a.scheduledAt)} · {a.duration} min
          </p>
        </div>
      ),
    },
    { key: "doctor", header: "Provider", render: a => <span className="font-medium text-clay-900">{a.doctorName}</span> },
    { key: "specialty", header: "Specialty", render: a => <span className="text-clay-600">{a.doctorSpecialization ?? "General"}</span> },
    { key: "reason", header: "Reason", render: a => <span className="text-clay-600">{a.reason ?? "—"}</span> },
    { key: "status", header: "Status", render: a => <StatusBadge status={a.status} /> },
    {
      key: "cancel",
      header: "",
      render: a =>
        a.status === "SCHEDULED" || a.status === "CONFIRMED" ? (
          <Button variant="ghost" size="sm" onClick={() => void cancel(a.id)}>Cancel</Button>
        ) : (
          <span />
        ),
    },
  ]

  return (
    <PortalLayout role="patient">
      <div className="space-y-6">
        <PageHeader title="Appointments" description="Upcoming visits and past visits from your record" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Upcoming" value={String(upcoming)} icon={Calendar} accent="sage" />
          <StatCard label="Confirmed" value={String(confirmed)} icon={Calendar} accent="sage" />
          <StatCard label="Past visits" value={String(past)} icon={Calendar} accent="clay" />
        </div>
        <Card padding="md">
          <CardHeader className="px-0"><CardTitle>Book a visit</CardTitle></CardHeader>
          <CardContent className="px-0">
            <form onSubmit={event => void book(event)} className="grid sm:grid-cols-2 gap-4">
              <label className="text-sm font-medium text-clay-700">
                Physician
                <select className="clay-input mt-1.5" value={doctorId} onChange={event => setDoctorId(event.target.value)} required>
                  <option value="">Select a physician</option>
                  {data.physicians.map(doctor => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name}{doctor.specialization ? ` · ${doctor.specialization}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <Input label="Date and time" type="datetime-local" min={localInputMin()} value={when} onChange={event => setWhen(event.target.value)} required />
              <Input label="Reason" value={reason} onChange={event => setReason(event.target.value)} className="sm:col-span-2" />
              {formError && <p role="alert" className="sm:col-span-2 text-sm text-red-700">{formError}</p>}
              <div>
                <Button type="submit" disabled={saving || !doctorId || !when}>{saving ? "Booking…" : "Book appointment"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card padding="md">
          <div className="flex flex-wrap gap-2 mb-4">
            <Button variant={filter === "upcoming" ? "primary" : "secondary"} size="sm" onClick={() => setFilter("upcoming")}>Upcoming</Button>
            <Button variant={filter === "past" ? "primary" : "secondary"} size="sm" onClick={() => setFilter("past")}>Past</Button>
          </div>
          <CardHeader className="px-0">
            <CardTitle>{focusId ? "Selected visit" : filter === "upcoming" ? "Upcoming visits" : "Past visits"}</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <DataTable columns={columns} rows={rows} rowKey={a => a.id} empty="No visits in this list." />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}

export default function PatientAppointmentsPage() {
  return (
    <Suspense fallback={<PortalLayout role="patient"><PortalState loading /></PortalLayout>}>
      <PatientAppointmentsContent />
    </Suspense>
  )
}
