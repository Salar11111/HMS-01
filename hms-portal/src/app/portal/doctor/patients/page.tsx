"use client"

import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { DataTable, type Column } from "@/components/portal/DataTable"
import { PageHeader } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { useDoctorPortal } from "@/lib/use-portal-data"
import type { DoctorPortalData } from "@/server/queries/portal"

type Patient = DoctorPortalData["patients"][number]

const ageFrom = (dob: string | Date | null) => {
  if (!dob) return "—"
  return String(Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)))
}

export default function DoctorPatientsPage() {
  const { data, loading, error } = useDoctorPortal()

  if (loading) return <PortalLayout role="doctor"><PortalState loading /></PortalLayout>
  if (error || !data.profile) return <PortalLayout role="doctor"><PortalState error={error} /></PortalLayout>

  const columns: Column<Patient>[] = [
    { key: "name", header: "Patient", render: p => <span className="font-medium text-clay-900">{p.name}</span> },
    { key: "mrn", header: "MRN", render: p => <span className="text-clay-600">{p.medicalRecordNumber ?? "—"}</span> },
    { key: "age", header: "Age", render: p => <span>{ageFrom(p.dateOfBirth)}</span> },
    { key: "blood", header: "Blood", render: p => <span>{p.bloodGroup ?? "—"}</span> },
    {
      key: "location",
      header: "Location",
      render: p => <span>{p.admitted ? `${p.wardName ?? "Ward"} · ${p.bedNumber ?? "bed"}` : "Outpatient"}</span>,
    },
  ]

  return (
    <PortalLayout role="doctor">
      <div className="space-y-6">
        <PageHeader title="My Patients" description={`${data.patients.length} records in the recent panel`} />
        <Card>
          <CardHeader><CardTitle>Panel</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={columns} rows={data.patients} rowKey={p => p.id} empty="No patients on the panel." />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
