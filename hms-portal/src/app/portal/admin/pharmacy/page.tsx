"use client"

import { FormEvent, useEffect, useState } from "react"
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
import { formatDate } from "@/lib/utils"

type Item = AdminPortalData["inventory"][number]
type Rx = {
  id: string
  status: string
  issuedAt: string
  patientName: string
  items: Array<{ drugName: string; quantity: number; dosage: string }>
}
type Drug = { id: string; name: string; strength: string; form: string }

function defaultExpiry() {
  const date = new Date()
  date.setUTCFullYear(date.getUTCFullYear() + 1)
  return date.toISOString().slice(0, 10)
}

export default function AdminPharmacyPage() {
  const { data, loading, error, refresh } = useAdminPortal()
  const [queue, setQueue] = useState<Rx[]>([])
  const [drugs, setDrugs] = useState<Drug[]>([])
  const [queueError, setQueueError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [drugId, setDrugId] = useState("")
  const [batchNumber, setBatchNumber] = useState("")
  const [expiryDate, setExpiryDate] = useState(defaultExpiry)
  const [quantity, setQuantity] = useState("100")
  const [unitCost, setUnitCost] = useState("")
  const [savingBatch, setSavingBatch] = useState(false)
  const [batchError, setBatchError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    Promise.all([
      fetch("/api/prescriptions?status=ACTIVE").then(async response => {
        const body = (await response.json().catch(() => null)) as { prescriptions?: Rx[]; error?: string } | null
        if (!live) return
        if (!response.ok) {
          setQueueError(body?.error ?? "Could not load prescriptions")
          return
        }
        setQueue(body?.prescriptions ?? [])
        setQueueError(null)
      }),
      fetch("/api/drugs").then(async response => {
        const body = (await response.json().catch(() => null)) as { drugs?: Drug[] } | null
        if (!live || !response.ok) return
        setDrugs(body?.drugs ?? [])
      }),
    ]).catch(() => {
      if (live) setQueueError("Could not load pharmacy data")
    })
    return () => {
      live = false
    }
  }, [revision])

  if (loading) return <PortalLayout role="admin"><PortalState loading /></PortalLayout>
  if (error || !data.stats) return <PortalLayout role="admin"><PortalState error={error} /></PortalLayout>

  async function dispense(id: string) {
    setBusyId(id)
    setQueueError(null)
    try {
      await sendJson(`/api/prescriptions/${id}/dispense`, "POST")
      setRevision(value => value + 1)
      refresh()
    } catch (cause) {
      setQueueError(cause instanceof Error ? cause.message : "Could not dispense")
    } finally {
      setBusyId(null)
    }
  }

  async function receiveBatch(event: FormEvent) {
    event.preventDefault()
    const selected = drugId || drugs[0]?.id
    if (!selected) return
    setSavingBatch(true)
    setBatchError(null)
    try {
      await sendJson("/api/batches", "POST", {
        drugId: selected,
        batchNumber,
        expiryDate,
        quantity: Number(quantity),
        ...(unitCost ? { unitCost: Number(unitCost) } : {}),
      })
      setBatchNumber("")
      setQuantity("100")
      setUnitCost("")
      setRevision(value => value + 1)
      refresh()
    } catch (cause) {
      setBatchError(cause instanceof Error ? cause.message : "Could not receive the batch")
    } finally {
      setSavingBatch(false)
    }
  }

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
        <PageHeader title="Pharmacy" description="Active prescriptions and pharmacy stock" />
        <Card>
          <CardHeader><CardTitle>Ready to dispense</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {queueError && <p role="alert" className="text-sm text-red-700">{queueError}</p>}
            {queue.length === 0 ? <p className="text-sm text-clay-500">No active prescriptions.</p> : queue.map(rx => (
              <div key={rx.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-clay-900">{rx.patientName}</p>
                  <p className="text-sm text-clay-600">{rx.items.map(item => `${item.drugName} ×${item.quantity}`).join(", ")} · {formatDate(rx.issuedAt)}</p>
                </div>
                <Button type="button" size="sm" disabled={busyId === rx.id} onClick={() => void dispense(rx.id)}>
                  {busyId === rx.id ? "Dispensing…" : "Dispense"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Receive a batch</CardTitle></CardHeader>
          <CardContent>
            {drugs.length === 0 ? (
              <p className="text-sm text-clay-500">No drug catalogue rows.</p>
            ) : (
              <form onSubmit={event => void receiveBatch(event)} className="grid sm:grid-cols-2 gap-4">
                <label className="text-sm font-medium text-clay-700 sm:col-span-2">
                  Drug
                  <select className="clay-input mt-1.5" value={drugId || drugs[0]?.id || ""} onChange={event => setDrugId(event.target.value)} required>
                    {drugs.map(drug => (
                      <option key={drug.id} value={drug.id}>{drug.name} {drug.strength} {drug.form}</option>
                    ))}
                  </select>
                </label>
                <Input label="Batch number" value={batchNumber} onChange={event => setBatchNumber(event.target.value)} required />
                <Input label="Expiry" type="date" value={expiryDate} onChange={event => setExpiryDate(event.target.value)} required />
                <Input label="Quantity" type="number" min={1} value={quantity} onChange={event => setQuantity(event.target.value)} required />
                <Input label="Unit cost (optional)" type="number" min={0} step="0.01" value={unitCost} onChange={event => setUnitCost(event.target.value)} />
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={savingBatch || !batchNumber.trim()}>
                    {savingBatch ? "Receiving…" : "Receive batch"}
                  </Button>
                </div>
                {batchError && <p role="alert" className="sm:col-span-2 text-sm text-red-700">{batchError}</p>}
              </form>
            )}
          </CardContent>
        </Card>
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
