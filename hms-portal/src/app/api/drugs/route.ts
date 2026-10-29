import { prisma } from "@/lib/prisma"
import { requireRole, withErrorHandling } from "@/server/authz"

export const GET = withErrorHandling(async () => {
  await requireRole("DOCTOR", "ADMIN")
  const drugs = await prisma.drug.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, strength: true, form: true },
  })
  return Response.json({ drugs })
})
