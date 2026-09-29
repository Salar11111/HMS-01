"use client"

import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { DataTable, StatusBadge, type Column } from "@/components/portal/DataTable"
import { PageHeader } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { useDoctorPortal } from "@/lib/use-portal-data"
import { formatDate } from "@/lib/utils"

type Row = {
  id: string
  patientName: string
  drugName: string
  sig: string
  status: string
  issuedAt: Date | string
  refills: number
}

export default function DoctorPrescriptionsPage() {
  const { data, loading, error } = useDoctorPortal()

  if (loading) return <PortalLayout role="doctor"><PortalState loading /></PortalLayout>
  if (error || !data.profile) return <PortalLayout role="doctor"><PortalState error={error} /></PortalLayout>

  const rows: Row[] = data.prescriptions.flatMap(rx =>
    rx.items.map(item => ({
      id: item.id,
      patientName: rx.patientName ?? "Patient",
      drugName: item.drugName,
      sig: `${item.dosage} · ${item.frequency}`,
      status: rx.status,
      issuedAt: rx.issuedAt,
      refills: item.refillsLeft,
    }))
  )

  const columns: Column<Row>[] = [
    { key: "patient", header: "Patient", render: r => <span className="font-medium">{r.patientName}</span> },
    { key: "drug", header: "Drug", render: r => <span>{r.drugName}</span> },
    { key: "sig", header: "Sig", render: r => <span className="text-clay-600">{r.sig}</span> },
    { key: "refills", header: "Refills", render: r => <span>{r.refills}</span> },
    { key: "status", header: "Status", render: r => <StatusBadge status={r.status} /> },
    { key: "issued", header: "Issued", render: r => <span className="text-clay-500">{formatDate(r.issuedAt)}</span> },
  ]

  return (
    <PortalLayout role="doctor">
      <div className="space-y-6">
        <PageHeader title="Prescriptions" description="Orders you have written" />
        <Card>
          <CardHeader><CardTitle>Prescription items</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={columns} rows={rows} rowKey={r => r.id} empty="No prescriptions." />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
