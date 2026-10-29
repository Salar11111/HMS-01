"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { DataTable, StatusBadge, type Column } from "@/components/portal/DataTable"
import { PageHeader, StatCard } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { sendJson } from "@/lib/api-action"
import { useAdminPortal } from "@/lib/use-portal-data"
import type { AdminPortalData } from "@/server/queries/portal"
import { formatCurrency, formatDate } from "@/lib/utils"

type Invoice = AdminPortalData["invoices"][number]

function AdminBillingContent() {
  const params = useSearchParams()
  const invoiceId = params.get("invoiceId")
  const patientId = params.get("patientId")
  const { data, loading, error, refresh } = useAdminPortal()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  if (loading) return <PortalLayout role="admin"><PortalState loading /></PortalLayout>
  if (error || !data.stats) return <PortalLayout role="admin"><PortalState error={error} /></PortalLayout>

  async function pay(invoice: Invoice) {
    if (invoice.balance <= 0) return
    setBusyId(invoice.id)
    setFormError(null)
    try {
      await sendJson(`/api/billing/${invoice.id}`, "POST", {
        amount: invoice.balance,
        method: "CASH",
      })
      refresh()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Could not record payment")
    } finally {
      setBusyId(null)
    }
  }

  async function voidInvoice(id: string) {
    setBusyId(id)
    setFormError(null)
    try {
      await sendJson(`/api/billing/${id}`, "PATCH", { status: "VOID" })
      refresh()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Could not void the invoice")
    } finally {
      setBusyId(null)
    }
  }

  const columns: Column<Invoice>[] = [
    { key: "number", header: "Invoice", render: i => <span className="font-medium">{i.invoiceNumber}</span> },
    { key: "patient", header: "Patient", render: i => <span>{i.patientName}</span> },
    { key: "total", header: "Total", align: "right", render: i => <span>{formatCurrency(i.totalAmount)}</span> },
    { key: "balance", header: "Balance", align: "right", render: i => <span>{formatCurrency(i.balance)}</span> },
    { key: "due", header: "Due", render: i => <span>{i.dueAt ? formatDate(i.dueAt) : "—"}</span> },
    { key: "status", header: "Status", render: i => <StatusBadge status={i.status} /> },
    {
      key: "actions",
      header: "Actions",
      render: i => (
        <span className="flex flex-wrap gap-2">
          {i.balance > 0 && i.status !== "VOID" && i.status !== "PAID" && (
            <Button type="button" size="sm" disabled={busyId === i.id} onClick={() => void pay(i)}>
              Record payment
            </Button>
          )}
          {i.paidAmount === 0 && i.status !== "VOID" && i.status !== "PAID" && (
            <Button type="button" size="sm" variant="outline" disabled={busyId === i.id} onClick={() => void voidInvoice(i.id)}>
              Void
            </Button>
          )}
        </span>
      ),
    },
  ]

  return (
    <PortalLayout role="admin">
      <div className="space-y-6">
        <PageHeader title="Billing & Claims" description="Open invoices and outstanding balances" />
        <StatCard label="Outstanding" value={formatCurrency(data.stats.outstandingBalance)} accent="coral" />
        <Card>
          <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
          <CardContent>
            {formError && <p role="alert" className="text-sm text-red-700 mb-3">{formError}</p>}
            <DataTable
              columns={columns}
              rows={data.invoices.filter(invoice => {
                if (invoiceId) return invoice.id === invoiceId
                if (patientId) return invoice.patientId === patientId
                return true
              })}
              rowKey={i => i.id}
              empty="No invoices."
            />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}

export default function AdminBillingPage() {
  return (
    <Suspense fallback={<PortalLayout role="admin"><PortalState loading /></PortalLayout>}>
      <AdminBillingContent />
    </Suspense>
  )
}
