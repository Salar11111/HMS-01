import { requireActor, withErrorHandling } from "@/server/authz"
import { buildNursePortal } from "@/server/queries/portal"

export const GET = withErrorHandling(async () => {
  const actor = await requireActor()
  if (actor.role !== "NURSE" || !actor.nurseId) {
    return Response.json({ error: "Only nurse accounts can read this resource" }, { status: 403 })
  }

  return Response.json(await buildNursePortal(actor.nurseId))
})
