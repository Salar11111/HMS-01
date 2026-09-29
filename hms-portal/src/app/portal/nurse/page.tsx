import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { NurseDashboardClient } from "./NurseDashboardClient"

export default function NurseDashboardPage() {
  return (
    <PortalLayout role="nurse">
      <NurseDashboardClient />
    </PortalLayout>
  )
}
