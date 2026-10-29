"use client"

import { FormEvent, useState } from "react"
import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { DataTable, StatusBadge, type Column } from "@/components/portal/DataTable"
import { PageHeader, StatCard } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { sendJson } from "@/lib/api-action"
import { usePatientPortal } from "@/lib/use-portal-data"
import type { PatientPortalData } from "@/server/queries/portal"
import { formatCurrency, formatDate } from "@/lib/utils"

type Invoice = PatientPortalData["invoices"][number]

const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)

export default function PatientBillingPage() {
  const { data, loading, error, refresh } = usePatientPortal()
  const [invoiceId, setInvoiceId] = useState("")
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<"CARD" | "CASH" | "BANK_TRANSFER" | "INSURANCE">("CARD")
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (loading) return <PortalLayout role="patient"><PortalState loading /></PortalLayout>
  if (error || !data.profile) return <PortalLayout role="patient"><PortalState error={error} /></PortalLayout>

  const payable = data.invoices.filter(invoice => invoice.balance > 0 && invoice.status !== "VOID" && invoice.status !== "PAID")
  const selected = payable.find(invoice => invoice.id === invoiceId) ?? payable[0]

  async function pay(event: FormEvent) {
    event.preventDefault()
    if (!selected) return
    setSaving(true)
    setFormError(null)
    try {
      await sendJson(`/api/billing/${selected.id}`, "POST", {
        amount: Number(amount),
        method,
      })
      setAmount("")
      refresh()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Could not record the payment")
    } finally {
      setSaving(false)
    }
  }

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
        {payable.length > 0 && (
          <Card padding="md">
            <CardHeader><CardTitle>Make a payment</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={event => void pay(event)} className="grid sm:grid-cols-2 gap-4">
                <label className="text-sm font-medium text-clay-700">
                  Invoice
                  <select
                    className="clay-input mt-1.5"
                    value={selected?.id ?? ""}
                    onChange={event => setInvoiceId(event.target.value)}
                  >
                    {payable.map(invoice => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoiceNumber} · {money(invoice.balance)} due
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  label="Amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={selected ? String(selected.balance) : undefined}
                  value={amount}
                  onChange={event => setAmount(event.target.value)}
                  required
                />
                <label className="text-sm font-medium text-clay-700">
                  Method
                  <select className="clay-input mt-1.5" value={method} onChange={event => setMethod(event.target.value as typeof method)}>
                    <option value="CARD">Card</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank transfer</option>
                    <option value="INSURANCE">Insurance</option>
                  </select>
                </label>
                {formError && <p role="alert" className="sm:col-span-2 text-sm text-red-700">{formError}</p>}
                <div>
                  <Button type="submit" disabled={saving || !amount}>{saving ? "Paying…" : "Pay invoice"}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
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
