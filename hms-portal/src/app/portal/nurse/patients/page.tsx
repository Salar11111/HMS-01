"use client"

import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { DataTable, type Column } from "@/components/portal/DataTable"
import { PageHeader } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { useNursePortal } from "@/lib/use-portal-data"
import type { NursePortalData } from "@/server/queries/portal"
import { formatTime } from "@/lib/utils"

type Patient = NursePortalData["patients"][number]

export default function NursePatientsPage() {
  const { data, loading, error } = useNursePortal()

  if (loading) return <PortalLayout role="nurse"><PortalState loading /></PortalLayout>
  if (error || !data.profile) return <PortalLayout role="nurse"><PortalState error={error} /></PortalLayout>

  const columns: Column<Patient>[] = [
    { key: "name", header: "Patient", render: p => <span className="font-medium">{p.name}</span> },
    { key: "mrn", header: "MRN", render: p => <span>{p.medicalRecordNumber ?? "—"}</span> },
    { key: "bed", header: "Bed", render: p => <span>{p.wardName} · {p.bedNumber}</span> },
    { key: "diagnosis", header: "Diagnosis", render: p => <span className="text-clay-600">{p.diagnosis ?? p.reason ?? "—"}</span> },
    { key: "doctor", header: "Attending", render: p => <span>{p.attendingDoctor ?? "—"}</span> },
    { key: "vitals", header: "Last vitals", render: p => <span>{p.lastVitalsAt ? formatTime(p.lastVitalsAt) : "—"}</span> },
  ]

  return (
    <PortalLayout role="nurse">
      <div className="space-y-6">
        <PageHeader title="My Patients" description={`${data.profile.departmentName ?? "Ward"} census`} />
        <Card>
          <CardHeader><CardTitle>Admitted patients</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={columns} rows={data.patients} rowKey={p => p.id} empty="No patients are currently admitted." />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
