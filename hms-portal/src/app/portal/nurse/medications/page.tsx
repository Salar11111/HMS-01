"use client"

import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { DataTable, StatusBadge, type Column } from "@/components/portal/DataTable"
import { PageHeader } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { useNursePortal } from "@/lib/use-portal-data"
import type { NursePortalData } from "@/server/queries/portal"
import { formatTime } from "@/lib/utils"

type Med = NursePortalData["medications"][number]

export default function NurseMedicationsPage() {
  const { data, loading, error } = useNursePortal()

  if (loading) return <PortalLayout role="nurse"><PortalState loading /></PortalLayout>
  if (error || !data.profile) return <PortalLayout role="nurse"><PortalState error={error} /></PortalLayout>

  const nameById = new Map(data.patients.map(p => [p.id, p.name]))
  const columns: Column<Med>[] = [
    { key: "time", header: "Time", render: m => <span>{formatTime(m.administeredAt)}</span> },
    { key: "patient", header: "Patient", render: m => <span className="font-medium">{nameById.get(m.patientId) ?? "Patient"}</span> },
    { key: "drug", header: "Drug", render: m => <span>{m.drugName} · {m.dosage}</span> },
    { key: "status", header: "Status", render: m => <StatusBadge status={m.status} /> },
    { key: "notes", header: "Notes", render: m => <span className="text-clay-500">{m.notes || "—"}</span> },
  ]

  return (
    <PortalLayout role="nurse">
      <div className="space-y-6">
        <PageHeader title="Medication Record" description="Administrations for the current census" />
        <Card>
          <CardHeader><CardTitle>MAR</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={columns} rows={data.medications} rowKey={m => m.id} empty="No medication administrations recorded." />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
