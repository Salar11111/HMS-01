"use client"

import { FormEvent, useState } from "react"
import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { DataTable, type Column } from "@/components/portal/DataTable"
import { PageHeader } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { Input } from "@/components/ui/Input"
import { sendJson } from "@/lib/api-action"
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
  const { data, loading, error, refresh } = useAdminPortal()
  const [itemId, setItemId] = useState("")
  const [addQuantity, setAddQuantity] = useState("50")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  if (loading) return <PortalLayout role="admin"><PortalState loading /></PortalLayout>
  if (error || !data.stats) return <PortalLayout role="admin"><PortalState error={error} /></PortalLayout>

  const selected = itemId || data.inventory[0]?.id || ""

  async function restock(event: FormEvent) {
    event.preventDefault()
    if (!selected) return
    setSaving(true)
    setFormError(null)
    try {
      await sendJson(`/api/inventory/${selected}`, "PATCH", { addQuantity: Number(addQuantity) })
      setAddQuantity("50")
      refresh()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Could not restock")
    } finally {
      setSaving(false)
    }
  }

  return (
    <PortalLayout role="admin">
      <div className="space-y-6">
        <PageHeader title="Inventory" description={`Stock value ${formatCurrency(data.stats.inventoryValue)}`} />
        <Card>
          <CardHeader><CardTitle>Restock an item</CardTitle></CardHeader>
          <CardContent>
            {data.inventory.length === 0 ? (
              <p className="text-sm text-clay-500">No inventory rows to restock.</p>
            ) : (
              <form onSubmit={event => void restock(event)} className="grid sm:grid-cols-2 gap-4">
                <label className="text-sm font-medium text-clay-700 sm:col-span-2">
                  Item
                  <select className="clay-input mt-1.5" value={selected} onChange={event => setItemId(event.target.value)}>
                    {data.inventory.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {item.departmentName} ({item.quantity} {item.unit})
                      </option>
                    ))}
                  </select>
                </label>
                <Input label="Quantity to add" type="number" min={1} value={addQuantity} onChange={event => setAddQuantity(event.target.value)} required />
                <div className="flex items-end">
                  <Button type="submit" disabled={saving || !selected}>{saving ? "Restocking…" : "Restock"}</Button>
                </div>
                {formError && <p role="alert" className="sm:col-span-2 text-sm text-red-700">{formError}</p>}
              </form>
            )}
          </CardContent>
        </Card>
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
