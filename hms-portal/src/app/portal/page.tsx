import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function PortalIndexPage() {
  const session = await auth()
  const role = (session?.user?.role ?? "PATIENT").toLowerCase()
  redirect(`/portal/${role}`)
}
