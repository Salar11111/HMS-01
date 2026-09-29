import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { PatientDashboardClient } from "./PatientDashboardClient"

export default function PatientDashboardPage() {
  return (
    <PortalLayout role="patient">
      <PatientDashboardClient />
    </PortalLayout>
  )
}