"use client"

import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { DataTable, StatusBadge, type Column } from "@/components/portal/DataTable"
import { PageHeader, StatCard } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { usePatientPortal } from "@/lib/use-portal-data"
import type { PatientPortalData } from "@/server/queries/portal"
import { formatCurrency, formatDate } from "@/lib/utils"

type Invoice = PatientPortalData["invoices"][number]

const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)

export default function PatientBillingPage() {
  const { data, loading, error } = usePatientPortal()

  if (loading) return <PortalLayout role="patient"><PortalState loading /></PortalLayout>
  if (error || !data.profile) return <PortalLayout role="patient"><PortalState error={error} /></PortalLayout>

  const columns: Column<Invoice>[] = [
    { key: "number", header: "Invoice", render: i => <span className="font-medium">{i.invoiceNumber}</span> },
    { key: "issued", header: "Issued", render: i => <span>{formatDate(i.issuedAt)}</span> },
    { key: "due", header: "Due", render: i => <span>{i.dueAt ? formatDate(i.dueAt) : "—"}</span> },
    { key: "total", header: "Total", align: "right", render: i => <span>{money(i.totalAmount)}</span> },
    { key: "balance", header: "Balance", align: "right", render: i => <span>{money(i.balance)}</span> },
    { key: "status", header: "Status", render: i => <StatusBadge status={i.status} /> },
  ]

  return (
    <PortalLayout role="patient">
      <div className="space-y-6">
        <PageHeader
          title="Billing & Insurance"
          description={`${data.profile.insuranceProvider ?? "No insurer on file"}${data.profile.insurancePolicyNumber ? ` · ${data.profile.insurancePolicyNumber}` : ""}`}
        />
        <StatCard label="Outstanding balance" value={formatCurrency(data.outstandingBalance)} accent="coral" />
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
