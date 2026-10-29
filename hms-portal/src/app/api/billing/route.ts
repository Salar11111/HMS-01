import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { centsToDollars } from "@/lib/money"
import { AuthError, requireRole, withErrorHandling } from "@/server/authz"

const listSchema = z.object({
  status: z
    .enum(["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE", "VOID"])
    .optional(),
  take: z.coerce.number().int().min(1).max(200).default(100),
})

export const GET = withErrorHandling(async (request: Request) => {
  const actor = await requireRole("PATIENT", "ADMIN")
  if (actor.role === "PATIENT" && !actor.patientId) {
    throw new AuthError("Your account is not linked to a patient record", 403)
  }
  const url = new URL(request.url)
  const { status, take } = listSchema.parse(
    Object.fromEntries(url.searchParams.entries())
  )

  const invoices = await prisma.invoice.findMany({
    take,
    orderBy: { issuedAt: "desc" },
    where: {
      ...(status ? { status } : {}),
      ...(actor.role === "PATIENT" ? { patientId: actor.patientId } : {}),
    },
    include: {
      items: true,
      payments: true,
      patient: { select: { user: { select: { name: true } } } },
    },
  })

  const serialized = invoices.map(i => ({
    ...i,
    totalAmount: centsToDollars(i.totalAmount),
    paidAmount: centsToDollars(i.paidAmount),
    balance: centsToDollars(i.totalAmount - i.paidAmount),
    items: i.items.map(item => ({
      ...item,
      unitPrice: centsToDollars(item.unitPrice),
      amount: centsToDollars(item.amount),
    })),
    payments: i.payments.map(payment => ({
      ...payment,
      amount: centsToDollars(payment.amount),
    })),
  }))

  return Response.json({ invoices: serialized })
})
