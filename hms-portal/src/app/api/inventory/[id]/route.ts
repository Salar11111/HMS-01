import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { assertObjectId, AuthError, recordAudit, requireRole, withErrorHandling } from "@/server/authz"

const restockSchema = z.object({
  addQuantity: z.number().int().positive().max(100_000),
})

type Context = { params: Promise<{ id: string }> }

export const PATCH = withErrorHandling(async (request: Request, ctx: Context) => {
  const actor = await requireRole("ADMIN")
  const { id } = await ctx.params
  assertObjectId(id, "inventory id")
  const body = restockSchema.parse(await request.json())

  const existing = await prisma.inventory.findUnique({
    where: { id },
    select: { id: true, name: true, quantity: true },
  })
  if (!existing) throw new AuthError("Inventory item not found", 404)

  const item = await prisma.inventory.update({
    where: { id },
    data: { quantity: { increment: body.addQuantity } },
  })

  await recordAudit(
    actor,
    "RESTOCK",
    "Inventory",
    id,
    { addQuantity: body.addQuantity, previousQuantity: existing.quantity, name: existing.name },
    request,
  )
  return Response.json({ item })
})
