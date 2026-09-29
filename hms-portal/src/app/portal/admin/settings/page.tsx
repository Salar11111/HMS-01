"use client"

import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { SettingsPanel } from "@/components/portal/SettingsPanel"

export default function AdminSettingsPage() {
  return (
    <PortalLayout role="admin">
      <SettingsPanel role="admin" />
    </PortalLayout>
  )
}
