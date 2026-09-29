"use client"

import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { DataTable, StatusBadge, type Column } from "@/components/portal/DataTable"
import { PageHeader, StatCard } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { useAdminPortal } from "@/lib/use-portal-data"
import type { AdminPortalData } from "@/server/queries/portal"
import { formatCurrency, formatDate } from "@/lib/utils"

type Invoice = AdminPortalData["invoices"][number]

export default function AdminBillingPage() {
  const { data, loading, error } = useAdminPortal()
  if (loading) return <PortalLayout role="admin"><PortalState loading /></PortalLayout>
  if (error || !data.stats) return <PortalLayout role="admin"><PortalState error={error} /></PortalLayout>

  const columns: Column<Invoice>[] = [
    { key: "number", header: "Invoice", render: i => <span className="font-medium">{i.invoiceNumber}</span> },
    { key: "patient", header: "Patient", render: i => <span>{i.patientName}</span> },
    { key: "total", header: "Total", align: "right", render: i => <span>{formatCurrency(i.totalAmount)}</span> },
    { key: "balance", header: "Balance", align: "right", render: i => <span>{formatCurrency(i.balance)}</span> },
    { key: "due", header: "Due", render: i => <span>{i.dueAt ? formatDate(i.dueAt) : "—"}</span> },
    { key: "status", header: "Status", render: i => <StatusBadge status={i.status} /> },
  ]

  return (
    <PortalLayout role="admin">
      <div className="space-y-6">
        <PageHeader title="Billing & Claims" description="Open invoices and outstanding balances" />
        <StatCard label="Outstanding" value={formatCurrency(data.stats.outstandingBalance)} accent="coral" />
        <Card>
          <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={columns} rows={data.invoices} rowKey={i => i.id} empty="No invoices." />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
