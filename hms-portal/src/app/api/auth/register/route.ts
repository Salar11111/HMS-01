import { hash } from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withErrorHandling } from "@/server/authz"

const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).max(80),
})

export const POST = withErrorHandling(async (request: Request) => {
  const body = registerSchema.parse(await request.json())
  const passwordHash = await hash(body.password, 12)

  const user = await prisma.user.create({
    data: {
      email: body.email.toLowerCase(),
      name: body.name,
      passwordHash,
      role: "PATIENT",
      patient: { create: {} },
    },
    select: { id: true, email: true },
  })

  return Response.json({ id: user.id, email: user.email }, { status: 201 })
})
