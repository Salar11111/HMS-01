import { requireActor, withErrorHandling } from "@/server/authz"
import { buildAdminPortal } from "@/server/queries/portal"

export const GET = withErrorHandling(async () => {
  const actor = await requireActor()
  if (actor.role !== "ADMIN") {
    return Response.json({ error: "Only administrators can read this resource" }, { status: 403 })
  }

  return Response.json(await buildAdminPortal())
})
