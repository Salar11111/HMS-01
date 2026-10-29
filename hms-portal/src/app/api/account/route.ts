import { compare, hash } from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { AuthError, requireActor, withErrorHandling } from "@/server/authz"
import { notificationPrefsSchema, readNotificationPrefs } from "@/server/preferences"

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    notifications: notificationPrefsSchema,
    currentPassword: z.string().min(1).optional(),
    newPassword: z.string().min(8).max(80).optional(),
  })
  .superRefine((value, ctx) => {
    if (Boolean(value.currentPassword) !== Boolean(value.newPassword)) {
      ctx.addIssue({
        code: "custom",
        message: "Provide both the current password and a new password",
        path: ["newPassword"],
      })
    }
  })

const profileSelect = {
  name: true,
  email: true,
  role: true,
  passwordHash: true,
  notificationPrefs: true,
  patient: { select: { medicalRecordNumber: true } },
  doctor: { select: { specialization: true, licenseNumber: true } },
  nurse: { select: { shift: true, licenseNumber: true } },
} as const

function accountPayload(user: {
  name: string | null
  email: string
  role: string
  notificationPrefs: unknown
  patient: { medicalRecordNumber: string | null } | null
  doctor: { specialization: string | null; licenseNumber: string } | null
  nurse: { shift: string | null; licenseNumber: string | null } | null
}) {
  const detail =
    user.role === "PATIENT"
      ? user.patient?.medicalRecordNumber ?? "Patient"
      : user.role === "DOCTOR"
        ? [user.doctor?.specialization, user.doctor?.licenseNumber].filter(Boolean).join(" · ")
        : user.role === "NURSE"
          ? [user.nurse?.shift, user.nurse?.licenseNumber].filter(Boolean).join(" · ")
          : "Administrator"

  return {
    name: user.name ?? "",
    email: user.email,
    role: user.role,
    detail: detail || user.role,
    notifications: readNotificationPrefs(user.notificationPrefs),
  }
}

export const GET = withErrorHandling(async () => {
  const actor = await requireActor()
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: actor.userId },
    select: profileSelect,
  })

  return Response.json(accountPayload(user))
})

export const PATCH = withErrorHandling(async (request: Request) => {
  const actor = await requireActor()
  const body = updateSchema.parse(await request.json())

  const existing = await prisma.user.findUniqueOrThrow({
    where: { id: actor.userId },
    select: profileSelect,
  })

  let passwordHash: string | undefined
  if (body.currentPassword && body.newPassword) {
    if (!existing.passwordHash || !(await compare(body.currentPassword, existing.passwordHash))) {
      throw new AuthError("Current password is incorrect", 400)
    }
    passwordHash = await hash(body.newPassword, 12)
  }

  const user = await prisma.user.update({
    where: { id: actor.userId },
    data: {
      name: body.name,
      notificationPrefs: body.notifications,
      ...(passwordHash ? { passwordHash } : {}),
    },
    select: profileSelect,
  })

  return Response.json(accountPayload(user))
})
