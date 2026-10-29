import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { assertObjectId, AuthError, recordAudit, requireRole, withErrorHandling } from "@/server/authz"

const schema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
})

type Context = { params: Promise<{ id: string }> }

export const PATCH = withErrorHandling(async (request: Request, ctx: Context) => {
  const actor = await requireRole("ADMIN")
  const { id } = await ctx.params
  assertObjectId(id, "leave request id")
  const body = schema.parse(await request.json())

  const existing = await prisma.leaveRequest.findUnique({
    where: { id },
    select: { id: true, status: true },
  })
  if (!existing) throw new AuthError("Leave request not found", 404)
  if (existing.status !== "PENDING") {
    throw new AuthError("This request has already been reviewed", 409)
  }

  const leave = await prisma.leaveRequest.update({
    where: { id },
    data: { status: body.status, reviewerId: actor.userId },
  })

  await recordAudit(actor, body.status, "LeaveRequest", id, null, request)
  return Response.json({ leave })
})
