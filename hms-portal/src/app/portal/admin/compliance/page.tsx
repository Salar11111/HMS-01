"use client"

import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { DataTable, type Column } from "@/components/portal/DataTable"
import { PageHeader } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { useAdminPortal } from "@/lib/use-portal-data"
import type { AdminPortalData } from "@/server/queries/portal"
import { formatDate, formatTime } from "@/lib/utils"

type Entry = AdminPortalData["auditLog"][number]

export default function AdminCompliancePage() {
  const { data, loading, error } = useAdminPortal()
  if (loading) return <PortalLayout role="admin"><PortalState loading /></PortalLayout>
  if (error || !data.stats) return <PortalLayout role="admin"><PortalState error={error} /></PortalLayout>

  const columns: Column<Entry>[] = [
    { key: "when", header: "When", render: a => <span>{formatDate(a.createdAt)} {formatTime(a.createdAt)}</span> },
    { key: "who", header: "Actor", render: a => <span className="font-medium">{a.userName ?? "Unknown"}</span> },
    { key: "action", header: "Action", render: a => <span>{a.action}</span> },
    { key: "entity", header: "Entity", render: a => <span>{a.entity}{a.entityId ? ` · ${a.entityId}` : ""}</span> },
  ]

  return (
    <PortalLayout role="admin">
      <div className="space-y-6">
        <PageHeader title="Compliance" description="Recent audit log entries" />
        <Card>
          <CardHeader><CardTitle>Audit log</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={columns} rows={data.auditLog} rowKey={a => a.id} empty="No audit entries." />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
