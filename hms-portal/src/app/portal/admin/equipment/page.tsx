"use client"

import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { DataTable, StatusBadge, type Column } from "@/components/portal/DataTable"
import { PageHeader } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { useAdminPortal } from "@/lib/use-portal-data"
import type { AdminPortalData } from "@/server/queries/portal"
import { formatDate } from "@/lib/utils"

type Asset = AdminPortalData["equipment"][number]

export default function AdminEquipmentPage() {
  const { data, loading, error } = useAdminPortal()
  if (loading) return <PortalLayout role="admin"><PortalState loading /></PortalLayout>
  if (error || !data.stats) return <PortalLayout role="admin"><PortalState error={error} /></PortalLayout>

  const columns: Column<Asset>[] = [
    { key: "tag", header: "Tag", render: e => <span className="font-medium">{e.assetTag}</span> },
    { key: "name", header: "Asset", render: e => <span>{e.name}</span> },
    { key: "where", header: "Location", render: e => <span>{e.location ?? "—"}</span> },
    { key: "status", header: "Status", render: e => <StatusBadge status={e.status} /> },
    { key: "next", header: "Next service", render: e => <span className={e.maintenanceOverdue ? "text-accent-coral" : ""}>{e.nextMaintenanceAt ? formatDate(e.nextMaintenanceAt) : "—"}</span> },
  ]

  return (
    <PortalLayout role="admin">
      <div className="space-y-6">
        <PageHeader title="Equipment" description={`${data.stats.overdueMaintenanceCount} overdue for service`} />
        <Card>
          <CardHeader><CardTitle>Assets</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={columns} rows={data.equipment} rowKey={e => e.id} empty="No equipment." />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
