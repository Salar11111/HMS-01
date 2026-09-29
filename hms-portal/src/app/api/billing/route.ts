import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireRole, withErrorHandling } from "@/server/authz"

const listSchema = z.object({
  status: z
    .enum(["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE", "VOID"])
    .optional(),
  take: z.coerce.number().int().min(1).max(200).default(100),
})

export const GET = withErrorHandling(async (request: Request) => {
  const actor = await requireRole("PATIENT", "ADMIN")
  const url = new URL(request.url)
  const { status, take } = listSchema.parse(
    Object.fromEntries(url.searchParams.entries())
  )

  const invoices = await prisma.invoice.findMany({
    take,
    orderBy: { issuedAt: "desc" },
    where: {
      ...(status ? { status } : {}),
      ...(actor.role === "PATIENT" ? { patientId: actor.patientId ?? "" } : {}),
    },
    include: {
      items: true,
      payments: true,
      patient: { select: { user: { select: { name: true } } } },
    },
  })

  const serialized = invoices.map(i => ({
    ...i,
    balance: i.totalAmount - i.paidAmount,
  }))

  return Response.json({ invoices: serialized })
})
