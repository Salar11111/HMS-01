"use client"

import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { DataTable, StatusBadge, type Column } from "@/components/portal/DataTable"
import { PageHeader } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { useDoctorPortal } from "@/lib/use-portal-data"
import type { DoctorPortalData } from "@/server/queries/portal"
import { formatDate } from "@/lib/utils"

type RecordRow = DoctorPortalData["records"][number]
type Flag = DoctorPortalData["abnormalResults"][number]

export default function DoctorEhrPage() {
  const { data, loading, error } = useDoctorPortal()

  if (loading) return <PortalLayout role="doctor"><PortalState loading /></PortalLayout>
  if (error || !data.profile) return <PortalLayout role="doctor"><PortalState error={error} /></PortalLayout>

  const noteColumns: Column<RecordRow>[] = [
    { key: "when", header: "Date", render: r => <span>{formatDate(r.recordedAt)}</span> },
    { key: "patient", header: "Patient", render: r => <span className="font-medium">{r.patientName}</span> },
    { key: "diagnosis", header: "Diagnosis", render: r => <span>{r.diagnosis ?? "—"}</span> },
    { key: "treatment", header: "Treatment", render: r => <span className="text-clay-600">{r.treatment ?? "—"}</span> },
  ]

  const flagColumns: Column<Flag>[] = [
    { key: "patient", header: "Patient", render: r => <span className="font-medium">{r.patientName}</span> },
    { key: "test", header: "Test", render: r => <span>{r.testName}</span> },
    { key: "value", header: "Result", render: r => <span>{[r.result, r.unit].filter(Boolean).join(" ")}</span> },
    { key: "flag", header: "Flag", render: r => <StatusBadge status={r.flag ?? "NORMAL"} /> },
  ]

  return (
    <PortalLayout role="doctor">
      <div className="space-y-6">
        <PageHeader title="EHR & Charting" description="Notes you filed and abnormal results on your orders" />
        <Card>
          <CardHeader><CardTitle>Abnormal results</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={flagColumns} rows={data.abnormalResults} rowKey={r => r.id} empty="No abnormal results." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent notes</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={noteColumns} rows={data.records} rowKey={r => r.id} empty="No notes filed." />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
