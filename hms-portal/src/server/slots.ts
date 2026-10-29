import { Prisma } from "@prisma/client"
import { hospitalClock } from "@/lib/time"
import { AuthError, ConflictError } from "@/server/authz"

export function rangesOverlap(
  startA: number,
  durationA: number,
  startB: number,
  durationB: number,
) {
  const endA = startA + durationA * 60_000
  const endB = startB + durationB * 60_000
  return startA < endB && startB < endA
}

const BLOCKING_STATUSES = ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"] as const

/** Serializes bookings for one physician, then rejects an overlapping active visit. */
export async function assertDoctorSlotAvailable(
  tx: Prisma.TransactionClient,
  doctorId: string,
  scheduledAt: Date,
  duration: number,
  ignoreAppointmentId?: string,
) {
  try {
    await tx.doctor.update({
      where: { id: doctorId },
      data: { updatedAt: new Date() },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new AuthError("That physician was not found", 404)
    }
    throw error
  }

  const existing = await tx.appointment.findMany({
    where: {
      doctorId,
      status: { in: [...BLOCKING_STATUSES] },
      ...(ignoreAppointmentId ? { id: { not: ignoreAppointmentId } } : {}),
    },
    select: { scheduledAt: true, duration: true },
  })

  const hours = await tx.schedule.findMany({
    where: { doctorId, isActive: true },
    select: { dayOfWeek: true, startTime: true, endTime: true },
  })
  if (!hours.length) {
    throw new ConflictError("This physician has no published clinic hours")
  }
  const clock = hospitalClock(scheduledAt)
  const endMinute = clock.minutes + duration
  const fits = hours.some(row => {
    const [startHour, startMinute] = row.startTime.split(":").map(Number)
    const [endHour, endMin] = row.endTime.split(":").map(Number)
    const open = startHour * 60 + startMinute
    const close = endHour * 60 + endMin
    return row.dayOfWeek === clock.weekday && clock.minutes >= open && endMinute <= close
  })
  if (!fits) {
    throw new ConflictError("That time is outside this physician's clinic hours")
  }

  const overlaps = existing.some(row =>
    rangesOverlap(
      scheduledAt.getTime(),
      duration,
      row.scheduledAt.getTime(),
      row.duration,
    )
  )
  if (overlaps) {
    throw new ConflictError("That time slot is no longer available")
  }
}
