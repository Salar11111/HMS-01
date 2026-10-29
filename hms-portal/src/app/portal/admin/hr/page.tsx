"use client"

import { useState } from "react"
import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { DataTable, StatusBadge, type Column } from "@/components/portal/DataTable"
import { PageHeader } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { sendJson } from "@/lib/api-action"
import { useAdminPortal } from "@/lib/use-portal-data"
import type { AdminPortalData } from "@/server/queries/portal"
import { formatDate } from "@/lib/utils"

type UserRow = AdminPortalData["users"][number]
type Leave = AdminPortalData["leaveRequests"][number]

export default function AdminHrPage() {
  const { data, loading, error, refresh } = useAdminPortal()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  if (loading) return <PortalLayout role="admin"><PortalState loading /></PortalLayout>
  if (error || !data.stats) return <PortalLayout role="admin"><PortalState error={error} /></PortalLayout>

  const staffColumns: Column<UserRow>[] = [
    { key: "name", header: "Name", render: u => <span className="font-medium">{u.name}</span> },
    { key: "role", header: "Role", render: u => <StatusBadge status={u.role} /> },
    { key: "email", header: "Email", render: u => <span className="text-clay-600">{u.email}</span> },
    { key: "detail", header: "Detail", render: u => <span>{u.specialization ?? u.shift ?? u.medicalRecordNumber ?? "—"}</span> },
  ]
  async function review(id: string, status: "APPROVED" | "REJECTED") {
    setBusyId(id)
    setFormError(null)
    try {
      await sendJson(`/api/leave/${id}`, "PATCH", { status })
      refresh()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Could not review the request")
    } finally {
      setBusyId(null)
    }
  }

  const leaveColumns: Column<Leave>[] = [
    { key: "who", header: "Staff", render: l => <span className="font-medium">{l.requesterName}</span> },
    { key: "type", header: "Type", render: l => <span>{l.type}</span> },
    { key: "when", header: "Dates", render: l => <span>{formatDate(l.startDate)} – {formatDate(l.endDate)}</span> },
    { key: "status", header: "Status", render: l => <StatusBadge status={l.status} /> },
    {
      key: "review",
      header: "Review",
      render: l => l.status === "PENDING" ? (
        <span className="flex gap-2">
          <Button type="button" size="sm" disabled={busyId === l.id} onClick={() => void review(l.id, "APPROVED")}>Approve</Button>
          <Button type="button" size="sm" variant="outline" disabled={busyId === l.id} onClick={() => void review(l.id, "REJECTED")}>Reject</Button>
        </span>
      ) : <span className="text-clay-500">Reviewed</span>,
    },
  ]

  return (
    <PortalLayout role="admin">
      <div className="space-y-6">
        <PageHeader title="Staff & HR" description={`${data.stats.userCount} accounts · ${data.stats.pendingLeaveCount} pending leave requests`} />
        <Card>
          <CardHeader><CardTitle>Leave requests</CardTitle></CardHeader>
          <CardContent>
            {formError && <p role="alert" className="text-sm text-red-700 mb-3">{formError}</p>}
            <DataTable columns={leaveColumns} rows={data.leaveRequests} rowKey={l => l.id} empty="No leave requests." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Directory</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={staffColumns} rows={data.users} rowKey={u => u.id} empty="No accounts." />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
