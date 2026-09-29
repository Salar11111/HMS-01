import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { DoctorDashboardClient } from "./DoctorDashboardClient"

export default function DoctorDashboardPage() {
  return (
    <PortalLayout role="doctor">
      <DoctorDashboardClient />
    </PortalLayout>
  )
}