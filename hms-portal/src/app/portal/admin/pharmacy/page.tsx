"use client"

import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { DataTable, type Column } from "@/components/portal/DataTable"
import { PageHeader } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { useAdminPortal } from "@/lib/use-portal-data"
import type { AdminPortalData } from "@/server/queries/portal"

type Item = AdminPortalData["inventory"][number]

export default function AdminPharmacyPage() {
  const { data, loading, error } = useAdminPortal()
  if (loading) return <PortalLayout role="admin"><PortalState loading /></PortalLayout>
  if (error || !data.stats) return <PortalLayout role="admin"><PortalState error={error} /></PortalLayout>

  const rows = data.inventory.filter(item => /pharm/i.test(item.departmentName))
  const columns: Column<Item>[] = [
    { key: "name", header: "Item", render: i => <span className="font-medium">{i.name}</span> },
    { key: "qty", header: "On hand", render: i => <span>{i.quantity} {i.unit}</span> },
    { key: "supplier", header: "Supplier", render: i => <span>{i.supplier ?? "—"}</span> },
    { key: "flag", header: "Flag", render: i => <span className={i.lowStock ? "text-accent-coral" : ""}>{i.lowStock ? "Low stock" : "OK"}</span> },
  ]

  return (
    <PortalLayout role="admin">
      <div className="space-y-6">
        <PageHeader title="Pharmacy" description="Pharmacy department stock from the inventory ledger" />
        <Card>
          <CardHeader><CardTitle>Pharmacy stock</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={columns} rows={rows} rowKey={i => i.id} empty="No pharmacy stock rows." />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
