import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { AuthError, recordAudit, requireRole, withErrorHandling } from "@/server/authz"

const createSchema = z.object({
  type: z.string().trim().min(1).max(40),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().trim().max(500).optional(),
})

export const GET = withErrorHandling(async () => {
  const actor = await requireRole("DOCTOR", "NURSE", "ADMIN")
  const leaveRequests = await prisma.leaveRequest.findMany({
    where: { requesterId: actor.userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      type: true,
      startDate: true,
      endDate: true,
      reason: true,
      status: true,
      createdAt: true,
    },
  })
  return Response.json({ leaveRequests })
})

export const POST = withErrorHandling(async (request: Request) => {
  const actor = await requireRole("DOCTOR", "NURSE", "ADMIN")
  const body = createSchema.parse(await request.json())

  const start = new Date(body.startDate)
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(body.endDate)
  end.setUTCHours(23, 59, 59, 999)

  if (end.getTime() < start.getTime()) {
    throw new AuthError("End date must be on or after the start date", 400)
  }

  const leave = await prisma.leaveRequest.create({
    data: {
      requesterId: actor.userId,
      type: body.type,
      startDate: start,
      endDate: end,
      reason: body.reason || null,
      status: "PENDING",
    },
  })

  await recordAudit(
    actor,
    "CREATE",
    "LeaveRequest",
    leave.id,
    { type: body.type, startDate: start.toISOString(), endDate: end.toISOString() },
    request,
  )
  return Response.json({ leave }, { status: 201 })
})
