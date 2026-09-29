"use client"

import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { DataTable, StatusBadge, type Column } from "@/components/portal/DataTable"
import { PageHeader } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { useAdminPortal } from "@/lib/use-portal-data"
import type { AdminPortalData } from "@/server/queries/portal"
import { formatDate } from "@/lib/utils"

type Order = AdminPortalData["labQueue"][number]

export default function AdminLaboratoryPage() {
  const { data, loading, error } = useAdminPortal()
  if (loading) return <PortalLayout role="admin"><PortalState loading /></PortalLayout>
  if (error || !data.stats) return <PortalLayout role="admin"><PortalState error={error} /></PortalLayout>

  const columns: Column<Order>[] = [
    { key: "patient", header: "Patient", render: o => <span className="font-medium">{o.patientName}</span> },
    { key: "tests", header: "Tests", render: o => <span>{o.tests.join(", ") || "—"}</span> },
    { key: "priority", header: "Priority", render: o => <StatusBadge status={o.priority} /> },
    { key: "status", header: "Status", render: o => <StatusBadge status={o.status} /> },
    { key: "ordered", header: "Ordered", render: o => <span>{formatDate(o.orderedAt)}</span> },
  ]

  return (
    <PortalLayout role="admin">
      <div className="space-y-6">
        <PageHeader title="Laboratory" description="Orders that are not yet completed" />
        <Card>
          <CardHeader><CardTitle>Queue</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={columns} rows={data.labQueue} rowKey={o => o.id} empty="The lab queue is clear." />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
