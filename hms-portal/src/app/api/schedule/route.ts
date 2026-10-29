import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { AuthError, ConflictError, recordAudit, requireRole, withErrorHandling } from "@/server/authz"

const TIME = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/

const createSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(TIME, "Use HH:MM (24-hour)"),
  endTime: z.string().regex(TIME, "Use HH:MM (24-hour)"),
})

function normalizeTime(value: string) {
  const [hours, minutes] = value.split(":")
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`
}

function toMinutes(value: string) {
  const [hours, minutes] = normalizeTime(value).split(":").map(Number)
  return hours * 60 + minutes
}

export const GET = withErrorHandling(async () => {
  const actor = await requireRole("DOCTOR")
  if (!actor.doctorId) throw new AuthError("Your account is not linked to a doctor profile", 403)

  const schedule = await prisma.schedule.findMany({
    where: { doctorId: actor.doctorId, isActive: true },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    select: { id: true, dayOfWeek: true, startTime: true, endTime: true },
  })
  return Response.json({ schedule })
})

export const POST = withErrorHandling(async (request: Request) => {
  const actor = await requireRole("DOCTOR")
  if (!actor.doctorId) throw new AuthError("Your account is not linked to a doctor profile", 403)
  const body = createSchema.parse(await request.json())

  const startTime = normalizeTime(body.startTime)
  const endTime = normalizeTime(body.endTime)
  if (toMinutes(endTime) <= toMinutes(startTime)) {
    throw new AuthError("End time must be after start time", 400)
  }

  const existing = await prisma.schedule.findMany({
    where: { doctorId: actor.doctorId, dayOfWeek: body.dayOfWeek, isActive: true },
    select: { startTime: true, endTime: true },
  })
  const open = toMinutes(startTime)
  const close = toMinutes(endTime)
  const overlaps = existing.some(row => {
    const rowOpen = toMinutes(row.startTime)
    const rowClose = toMinutes(row.endTime)
    return open < rowClose && rowOpen < close
  })
  if (overlaps) {
    throw new ConflictError("That block overlaps an existing clinic hour")
  }

  const slot = await prisma.schedule.create({
    data: {
      doctorId: actor.doctorId,
      dayOfWeek: body.dayOfWeek,
      startTime,
      endTime,
    },
  })

  await recordAudit(actor, "CREATE", "Schedule", slot.id, { dayOfWeek: body.dayOfWeek, startTime, endTime }, request)
  return Response.json({ schedule: slot }, { status: 201 })
})
