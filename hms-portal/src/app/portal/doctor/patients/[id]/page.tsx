"use client"

import { useParams } from "next/navigation"
import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { PatientChart } from "@/components/portal/PatientChart"

export default function DoctorPatientChartPage() {
  const params = useParams<{ id: string }>()
  return (
    <PortalLayout role="doctor">
      <PatientChart role="doctor" patientId={params.id} />
    </PortalLayout>
  )
}
