"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { DataTable, StatusBadge, type Column } from "@/components/portal/DataTable"
import { PageHeader } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { Input } from "@/components/ui/Input"
import { sendJson } from "@/lib/api-action"
import { useDoctorPortal } from "@/lib/use-portal-data"
import type { DoctorPortalData } from "@/server/queries/portal"
import { formatTime } from "@/lib/utils"

type Visit = DoctorPortalData["todaysAppointments"][number]
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export default function DoctorSchedulePage() {
  const { data, loading, error, refresh } = useDoctorPortal()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [dayOfWeek, setDayOfWeek] = useState("1")
  const [startTime, setStartTime] = useState("08:00")
  const [endTime, setEndTime] = useState("12:00")
  const [hoursError, setHoursError] = useState<string | null>(null)
  const [savingHours, setSavingHours] = useState(false)

  if (loading) return <PortalLayout role="doctor"><PortalState loading /></PortalLayout>
  if (error || !data.profile) return <PortalLayout role="doctor"><PortalState error={error} /></PortalLayout>

  async function setStatus(id: string, status: "CONFIRMED" | "COMPLETED" | "NO_SHOW") {
    setBusyId(id)
    setFormError(null)
    try {
      await sendJson(`/api/appointments/${id}`, "PATCH", { status })
      refresh()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Could not update the visit")
    } finally {
      setBusyId(null)
    }
  }

  async function addHours(event: FormEvent) {
    event.preventDefault()
    setSavingHours(true)
    setHoursError(null)
    try {
      await sendJson("/api/schedule", "POST", {
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
      })
      refresh()
    } catch (cause) {
      setHoursError(cause instanceof Error ? cause.message : "Could not save clinic hours")
    } finally {
      setSavingHours(false)
    }
  }

  async function removeHours(id: string) {
    setBusyId(id)
    setHoursError(null)
    try {
      await sendJson(`/api/schedule/${id}`, "DELETE")
      refresh()
    } catch (cause) {
      setHoursError(cause instanceof Error ? cause.message : "Could not remove clinic hours")
    } finally {
      setBusyId(null)
    }
  }

  const columns: Column<Visit>[] = [
    { key: "time", header: "Time", render: a => <span>{formatTime(a.scheduledAt)}</span> },
    { key: "patient", header: "Patient", render: a => <span className="font-medium">{a.patientName}</span> },
    { key: "reason", header: "Reason", render: a => <span className="text-clay-600">{a.reason ?? "—"}</span> },
    { key: "status", header: "Status", render: a => <StatusBadge status={a.status} /> },
    {
      key: "actions",
      header: "Actions",
      render: a => (
        <span className="flex flex-wrap items-center gap-2">
          {a.status === "SCHEDULED" && (
            <Button type="button" size="sm" variant="outline" disabled={busyId === a.id} onClick={() => void setStatus(a.id, "CONFIRMED")}>
              Confirm
            </Button>
          )}
          {(a.status === "SCHEDULED" || a.status === "CONFIRMED" || a.status === "IN_PROGRESS") && (
            <>
              <Button type="button" size="sm" disabled={busyId === a.id} onClick={() => void setStatus(a.id, "COMPLETED")}>
                Complete
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={busyId === a.id} onClick={() => void setStatus(a.id, "NO_SHOW")}>
                No-show
              </Button>
            </>
          )}
          <Link className="text-sm font-medium underline" href={`/portal/doctor/patients/${a.patientId}`}>
            Chart
          </Link>
        </span>
      ),
    },
  ]

  return (
    <PortalLayout role="doctor">
      <div className="space-y-6">
        <PageHeader
          title="Schedule"
          description={`${data.profile.departmentName ?? "Clinic"} · today's list and recurring hours`}
        />
        <Card>
          <CardHeader><CardTitle>Today</CardTitle></CardHeader>
          <CardContent>
            {formError && <p role="alert" className="text-sm text-red-700 mb-3">{formError}</p>}
            <DataTable columns={columns} rows={data.todaysAppointments} rowKey={a => a.id} empty="No appointments scheduled for today." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recurring clinic hours</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {data.schedule.length === 0 ? (
              <p className="text-sm text-clay-500">No recurring hours on file.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.schedule.map(slot => (
                  <li key={slot.id} className="flex items-center justify-between gap-4">
                    <span>
                      <span className="font-medium text-clay-900">{DAYS[slot.dayOfWeek] ?? `Day ${slot.dayOfWeek}`}</span>
                      <span className="text-clay-600"> · {slot.startTime} – {slot.endTime}</span>
                    </span>
                    <Button type="button" size="sm" variant="outline" disabled={busyId === slot.id} onClick={() => void removeHours(slot.id)}>
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={event => void addHours(event)} className="grid sm:grid-cols-4 gap-4 border-t border-clay-200 pt-4">
              <label className="text-sm font-medium text-clay-700">
                Day
                <select className="clay-input mt-1.5" value={dayOfWeek} onChange={event => setDayOfWeek(event.target.value)}>
                  {DAYS.map((label, index) => (
                    <option key={label} value={index}>{label}</option>
                  ))}
                </select>
              </label>
              <Input label="Start" type="time" value={startTime} onChange={event => setStartTime(event.target.value)} required />
              <Input label="End" type="time" value={endTime} onChange={event => setEndTime(event.target.value)} required />
              <div className="flex items-end">
                <Button type="submit" disabled={savingHours}>{savingHours ? "Saving…" : "Add hours"}</Button>
              </div>
              {hoursError && <p role="alert" className="sm:col-span-4 text-sm text-red-700">{hoursError}</p>}
            </form>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
