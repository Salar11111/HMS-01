"use client"

import { FormEvent, useState } from "react"
import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { DataTable, StatusBadge, type Column } from "@/components/portal/DataTable"
import { PageHeader } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { sendJson } from "@/lib/api-action"
import { useAdminPortal } from "@/lib/use-portal-data"
import type { AdminPortalData } from "@/server/queries/portal"
import { formatDate } from "@/lib/utils"

type Order = AdminPortalData["labQueue"][number]

export default function AdminLaboratoryPage() {
  const { data, loading, error, refresh } = useAdminPortal()
  const [orderId, setOrderId] = useState("")
  const [values, setValues] = useState<Record<string, string>>({})
  const [flags, setFlags] = useState<Record<string, "NORMAL" | "LOW" | "HIGH" | "CRITICAL">>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (loading) return <PortalLayout role="admin"><PortalState loading /></PortalLayout>
  if (error || !data.stats) return <PortalLayout role="admin"><PortalState error={error} /></PortalLayout>

  const openOrders = data.labQueue.filter(order => order.items.some(item => !item.result))
  const selected = openOrders.find(order => order.id === orderId) ?? openOrders[0]

  async function saveResults(event: FormEvent) {
    event.preventDefault()
    if (!selected) return
    const items = selected.items
      .filter(item => !item.result && values[item.id]?.trim())
      .map(item => ({
        id: item.id,
        result: values[item.id].trim(),
        flag: flags[item.id] ?? "NORMAL",
      }))
    if (!items.length) {
      setFormError("Enter at least one result")
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      await sendJson("/api/lab-orders", "PUT", { items })
      setValues({})
      refresh()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Could not save results")
    } finally {
      setSaving(false)
    }
  }

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
        {selected && (
          <Card padding="md">
            <CardHeader><CardTitle>Enter results · {selected.patientName}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={event => void saveResults(event)} className="space-y-4">
                {openOrders.length > 1 && (
                  <label className="block text-sm font-medium text-clay-700">
                    Order
                    <select className="clay-input mt-1.5" value={selected.id} onChange={event => setOrderId(event.target.value)}>
                      {openOrders.map(order => (
                        <option key={order.id} value={order.id}>{order.patientName} · {order.tests.join(", ")}</option>
                      ))}
                    </select>
                  </label>
                )}
                {selected.items.filter(item => !item.result).map(item => (
                  <div key={item.id} className="grid sm:grid-cols-2 gap-4">
                    <Input
                      label={item.testName}
                      value={values[item.id] ?? ""}
                      onChange={event => setValues(current => ({ ...current, [item.id]: event.target.value }))}
                    />
                    <label className="text-sm font-medium text-clay-700">
                      Flag
                      <select
                        className="clay-input mt-1.5"
                        value={flags[item.id] ?? "NORMAL"}
                        onChange={event => setFlags(current => ({ ...current, [item.id]: event.target.value as "NORMAL" | "LOW" | "HIGH" | "CRITICAL" }))}
                      >
                        <option value="NORMAL">Normal</option>
                        <option value="LOW">Low</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                      </select>
                    </label>
                  </div>
                ))}
                {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save results"}</Button>
              </form>
            </CardContent>
          </Card>
        )}
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
