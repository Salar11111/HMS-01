"use client"

import { useParams } from "next/navigation"
import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { PatientChart } from "@/components/portal/PatientChart"

export default function NursePatientChartPage() {
  const params = useParams<{ id: string }>()
  return (
    <PortalLayout role="nurse">
      <PatientChart role="nurse" patientId={params.id} />
    </PortalLayout>
  )
}
