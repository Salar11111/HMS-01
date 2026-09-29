"use client"

import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { DataTable, StatusBadge, type Column } from "@/components/portal/DataTable"
import { PageHeader } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { usePatientPortal } from "@/lib/use-portal-data"
import type { PatientPortalData } from "@/server/queries/portal"
import { formatDate } from "@/lib/utils"

type Row = {
  id: string
  name: string
  dosage: string
  frequency: string
  prescriber: string
  refills: number
  status: string
  issuedAt: Date | string
}

export default function PatientMedicationsPage() {
  const { data, loading, error } = usePatientPortal()

  if (loading) return <PortalLayout role="patient"><PortalState loading /></PortalLayout>
  if (error || !data.profile) return <PortalLayout role="patient"><PortalState error={error} /></PortalLayout>

  const rows: Row[] = data.prescriptions.flatMap(rx =>
    rx.items.map(item => ({
      id: item.id,
      name: item.drugName,
      dosage: item.dosage,
      frequency: item.frequency,
      prescriber: rx.prescriberName ?? "Clinician",
      refills: item.refillsLeft,
      status: rx.status,
      issuedAt: rx.issuedAt,
    }))
  )

  const columns: Column<Row>[] = [
    { key: "name", header: "Medication", render: r => <span className="font-medium text-clay-900">{r.name}</span> },
    { key: "sig", header: "Instructions", render: r => <span className="text-clay-600">{r.dosage} · {r.frequency}</span> },
    { key: "by", header: "Prescriber", render: r => <span>{r.prescriber}</span> },
    { key: "refills", header: "Refills", render: r => <span>{r.refills}</span> },
    { key: "status", header: "Status", render: r => <StatusBadge status={r.status} /> },
    { key: "issued", header: "Issued", render: r => <span className="text-clay-500">{formatDate(r.issuedAt)}</span> },
  ]

  return (
    <PortalLayout role="patient">
      <div className="space-y-6">
        <PageHeader title="Medications" description="Prescriptions on your record" />
        <Card>
          <CardHeader><CardTitle>Active and past prescriptions</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={columns} rows={rows} rowKey={r => r.id} empty="No prescriptions on file." />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
