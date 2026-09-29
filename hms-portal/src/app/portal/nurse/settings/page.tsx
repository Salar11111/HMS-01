"use client"

import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { SettingsPanel } from "@/components/portal/SettingsPanel"

export default function NurseSettingsPage() {
  return (
    <PortalLayout role="nurse">
      <SettingsPanel role="nurse" />
    </PortalLayout>
  )
}
