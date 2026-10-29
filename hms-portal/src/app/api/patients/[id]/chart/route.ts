import { assertObjectId, requireActor, withErrorHandling } from "@/server/authz"
import { buildPatientChart } from "@/server/chart"

type Context = { params: Promise<{ id: string }> }

export const GET = withErrorHandling(async (_request: Request, ctx: Context) => {
  const actor = await requireActor()
  const { id } = await ctx.params
  assertObjectId(id, "patient id")
  return Response.json(await buildPatientChart(actor, id))
})
