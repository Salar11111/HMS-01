import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { AdminDashboardClient } from "./AdminDashboardClient"

export default function AdminDashboardPage() {
  return (
    <PortalLayout role="admin">
      <AdminDashboardClient />
    </PortalLayout>
  )
}
