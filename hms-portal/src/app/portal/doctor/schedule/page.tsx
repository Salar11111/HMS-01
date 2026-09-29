"use client"

import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { DataTable, StatusBadge, type Column } from "@/components/portal/DataTable"
import { PageHeader } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { useDoctorPortal } from "@/lib/use-portal-data"
import type { DoctorPortalData } from "@/server/queries/portal"
import { formatTime } from "@/lib/utils"

type Visit = DoctorPortalData["todaysAppointments"][number]
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export default function DoctorSchedulePage() {
  const { data, loading, error } = useDoctorPortal()

  if (loading) return <PortalLayout role="doctor"><PortalState loading /></PortalLayout>
  if (error || !data.profile) return <PortalLayout role="doctor"><PortalState error={error} /></PortalLayout>

  const columns: Column<Visit>[] = [
    { key: "time", header: "Time", render: a => <span>{formatTime(a.scheduledAt)}</span> },
    { key: "patient", header: "Patient", render: a => <span className="font-medium">{a.patientName}</span> },
    { key: "reason", header: "Reason", render: a => <span className="text-clay-600">{a.reason ?? "—"}</span> },
    { key: "status", header: "Status", render: a => <StatusBadge status={a.status} /> },
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
            <DataTable columns={columns} rows={data.todaysAppointments} rowKey={a => a.id} empty="No appointments scheduled for today." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recurring clinic hours</CardTitle></CardHeader>
          <CardContent>
            {data.schedule.length === 0 ? (
              <p className="text-sm text-clay-500">No recurring hours on file.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.schedule.map(slot => (
                  <li key={slot.id} className="flex justify-between gap-4">
                    <span className="font-medium text-clay-900">{DAYS[slot.dayOfWeek] ?? `Day ${slot.dayOfWeek}`}</span>
                    <span className="text-clay-600">{slot.startTime} – {slot.endTime}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
