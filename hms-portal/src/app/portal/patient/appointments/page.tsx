"use client"

import { useState } from "react"
import { Calendar, Clock } from "lucide-react"
import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { DataTable, StatusBadge, type Column } from "@/components/portal/DataTable"
import { PageHeader, StatCard } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { usePatientPortal } from "@/lib/use-portal-data"
import type { PatientPortalData } from "@/server/queries/portal"
import { formatDate, formatTime } from "@/lib/utils"

type Appointment = PatientPortalData["appointments"][number]

export default function PatientAppointmentsPage() {
  const { data, loading, error } = usePatientPortal()
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming")

  if (loading) {
    return <PortalLayout role="patient"><PortalState loading /></PortalLayout>
  }
  if (error || !data.profile) {
    return <PortalLayout role="patient"><PortalState error={error} /></PortalLayout>
  }

  const rows = data.appointments.filter(a => (filter === "upcoming" ? a.upcoming : !a.upcoming))
  const upcoming = data.appointments.filter(a => a.upcoming).length
  const past = data.appointments.length - upcoming
  const confirmed = data.appointments.filter(a => a.status === "CONFIRMED").length

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
          <div className="flex flex-wrap gap-2 mb-4">
            <Button variant={filter === "upcoming" ? "primary" : "secondary"} size="sm" onClick={() => setFilter("upcoming")}>Upcoming</Button>
            <Button variant={filter === "past" ? "primary" : "secondary"} size="sm" onClick={() => setFilter("past")}>Past</Button>
          </div>
          <CardHeader className="px-0">
            <CardTitle>{filter === "upcoming" ? "Upcoming visits" : "Past visits"}</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <DataTable columns={columns} rows={rows} rowKey={a => a.id} empty="No visits in this list." />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
