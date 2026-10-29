"use client"

import { useState } from "react"
import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { DataTable, StatusBadge, type Column } from "@/components/portal/DataTable"
import { PageHeader } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { sendJson } from "@/lib/api-action"
import { useAdminPortal } from "@/lib/use-portal-data"
import type { AdminPortalData } from "@/server/queries/portal"
import { formatDate } from "@/lib/utils"

type Asset = AdminPortalData["equipment"][number]

function defaultNextService() {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + 90)
  return date.toISOString().slice(0, 10)
}

export default function AdminEquipmentPage() {
  const { data, loading, error, refresh } = useAdminPortal()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [nextById, setNextById] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  if (loading) return <PortalLayout role="admin"><PortalState loading /></PortalLayout>
  if (error || !data.stats) return <PortalLayout role="admin"><PortalState error={error} /></PortalLayout>

  async function logService(asset: Asset) {
    setBusyId(asset.id)
    setFormError(null)
    try {
      await sendJson(`/api/equipment/${asset.id}`, "PATCH", {
        nextMaintenanceAt: nextById[asset.id] || defaultNextService(),
        status: "OPERATIONAL",
      })
      refresh()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Could not log service")
    } finally {
      setBusyId(null)
    }
  }

  const columns: Column<Asset>[] = [
    { key: "tag", header: "Tag", render: e => <span className="font-medium">{e.assetTag}</span> },
    { key: "name", header: "Asset", render: e => <span>{e.name}</span> },
    { key: "where", header: "Location", render: e => <span>{e.location ?? "—"}</span> },
    { key: "status", header: "Status", render: e => <StatusBadge status={e.status} /> },
    {
      key: "next",
      header: "Next service",
      render: e => (
        <span className={e.maintenanceOverdue ? "text-accent-coral" : ""}>
          {e.nextMaintenanceAt ? formatDate(e.nextMaintenanceAt) : "—"}
        </span>
      ),
    },
    {
      key: "service",
      header: "Service",
      render: e => (
        <span className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            className="clay-input py-1 text-sm"
            value={nextById[e.id] ?? defaultNextService()}
            onChange={event => setNextById(current => ({ ...current, [e.id]: event.target.value }))}
            aria-label={`Next service for ${e.assetTag}`}
          />
          <Button type="button" size="sm" disabled={busyId === e.id} onClick={() => void logService(e)}>
            {busyId === e.id ? "Saving…" : "Log service"}
          </Button>
        </span>
      ),
    },
  ]

  return (
    <PortalLayout role="admin">
      <div className="space-y-6">
        <PageHeader title="Equipment" description={`${data.stats.overdueMaintenanceCount} overdue for service`} />
        <Card>
          <CardHeader><CardTitle>Assets</CardTitle></CardHeader>
          <CardContent>
            {formError && <p role="alert" className="text-sm text-red-700 mb-3">{formError}</p>}
            <DataTable columns={columns} rows={data.equipment} rowKey={e => e.id} empty="No equipment." />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
