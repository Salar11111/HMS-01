"use client"

import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { DataTable, StatusBadge, type Column } from "@/components/portal/DataTable"
import { PageHeader, StatCard } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { usePatientPortal } from "@/lib/use-portal-data"
import type { PatientPortalData } from "@/server/queries/portal"
import { formatDate } from "@/lib/utils"

type Result = PatientPortalData["results"][number]

export default function PatientResultsPage() {
  const { data, loading, error } = usePatientPortal()

  if (loading) {
    return <PortalLayout role="patient"><PortalState loading /></PortalLayout>
  }
  if (error || !data.profile) {
    return <PortalLayout role="patient"><PortalState error={error} /></PortalLayout>
  }

  const rows = data.results
  const flagged = rows.filter(r => r.flag && r.flag !== "NORMAL").length

  const columns: Column<Result>[] = [
    { key: "test", header: "Test", render: r => <span className="font-medium text-clay-900">{r.testName}</span> },
    {
      key: "value",
      header: "Your result",
      render: r => <span>{[r.result, r.unit].filter(Boolean).join(" ")}</span>,
    },
    { key: "range", header: "Reference", render: r => <span className="text-clay-500">{r.referenceRange ?? "—"}</span> },
    { key: "flag", header: "Flag", render: r => <StatusBadge status={r.flag ?? "NORMAL"} /> },
    { key: "at", header: "Date", render: r => <span className="text-clay-600">{formatDate(r.performedAt ?? r.completedAt)}</span> },
  ]

  return (
    <PortalLayout role="patient">
      <div className="space-y-6">
        <PageHeader title="Test Results" description="Released results from completed lab orders" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard label="Results released" value={String(rows.length)} accent="sage" />
          <StatCard label="Flagged for review" value={String(flagged)} accent="coral" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>All released results</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} rows={rows} rowKey={r => r.id} empty="No released results yet." />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
