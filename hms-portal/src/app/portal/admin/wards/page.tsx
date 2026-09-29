"use client"

import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { DataTable, type Column } from "@/components/portal/DataTable"
import { PageHeader, StatCard } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { useAdminPortal } from "@/lib/use-portal-data"
import type { AdminPortalData } from "@/server/queries/portal"

type Ward = AdminPortalData["wards"][number]

export default function AdminWardsPage() {
  const { data, loading, error } = useAdminPortal()
  if (loading) return <PortalLayout role="admin"><PortalState loading /></PortalLayout>
  if (error || !data.stats) return <PortalLayout role="admin"><PortalState error={error} /></PortalLayout>

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
