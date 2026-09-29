"use client"

import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { DataTable, type Column } from "@/components/portal/DataTable"
import { PageHeader } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { useAdminPortal } from "@/lib/use-portal-data"
import type { AdminPortalData } from "@/server/queries/portal"
import { formatCurrency } from "@/lib/utils"

type Item = AdminPortalData["inventory"][number]

function InventoryTable({ rows, empty }: { rows: Item[]; empty: string }) {
  const columns: Column<Item>[] = [
    { key: "name", header: "Item", render: i => <span className="font-medium">{i.name}</span> },
    { key: "dept", header: "Department", render: i => <span>{i.departmentName}</span> },
    { key: "qty", header: "On hand", render: i => <span>{i.quantity} {i.unit}</span> },
    { key: "reorder", header: "Reorder", render: i => <span>{i.reorderLevel}</span> },
    { key: "cost", header: "Unit cost", align: "right", render: i => <span>{formatCurrency(i.unitCost)}</span> },
    { key: "flag", header: "Flag", render: i => <span className={i.lowStock ? "text-accent-coral" : "text-clay-500"}>{i.lowStock ? "Low stock" : i.expired ? "Expired" : "OK"}</span> },
  ]
  return <DataTable columns={columns} rows={rows} rowKey={i => i.id} empty={empty} />
}

export default function AdminInventoryPage() {
  const { data, loading, error } = useAdminPortal()
  if (loading) return <PortalLayout role="admin"><PortalState loading /></PortalLayout>
  if (error || !data.stats) return <PortalLayout role="admin"><PortalState error={error} /></PortalLayout>

  return (
    <PortalLayout role="admin">
      <div className="space-y-6">
        <PageHeader title="Inventory" description={`Stock value ${formatCurrency(data.stats.inventoryValue)}`} />
        <Card>
          <CardHeader><CardTitle>All stock</CardTitle></CardHeader>
          <CardContent>
            <InventoryTable rows={data.inventory} empty="No inventory rows." />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
