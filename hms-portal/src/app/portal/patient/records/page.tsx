"use client"

import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { DataTable, type Column } from "@/components/portal/DataTable"
import { PageHeader } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { usePatientPortal } from "@/lib/use-portal-data"
import type { PatientPortalData } from "@/server/queries/portal"
import { formatDate } from "@/lib/utils"

type RecordRow = PatientPortalData["records"][number]

export default function PatientRecordsPage() {
  const { data, loading, error } = usePatientPortal()

  if (loading) return <PortalLayout role="patient"><PortalState loading /></PortalLayout>
  if (error || !data.profile) return <PortalLayout role="patient"><PortalState error={error} /></PortalLayout>

  const columns: Column<RecordRow>[] = [
    { key: "date", header: "Date", render: r => <span>{formatDate(r.recordedAt)}</span> },
    { key: "diagnosis", header: "Diagnosis", render: r => <span className="font-medium text-clay-900">{r.diagnosis ?? "—"}</span> },
    { key: "treatment", header: "Treatment", render: r => <span className="text-clay-600">{r.treatment ?? "—"}</span> },
    { key: "provider", header: "Provider", render: r => <span>{r.doctorName}</span> },
  ]

  return (
    <PortalLayout role="patient">
      <div className="space-y-6">
        <PageHeader
          title="Health Records"
          description={`${data.profile.medicalRecordNumber ?? "No MRN"} · ${data.profile.bloodGroup ?? "Blood group not recorded"}`}
        />
        <Card>
          <CardHeader><CardTitle>Clinical notes</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={columns} rows={data.records} rowKey={r => r.id} empty="No clinical notes yet." />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
