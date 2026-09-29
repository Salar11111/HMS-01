export const accentSurface = {
  sage: "bg-sage-100 text-sage-700",
  coral: "bg-accent-coral/15 text-accent-coral",
  gold: "bg-accent-gold/15 text-accent-gold",
  clay: "bg-clay-100 text-clay-700",
} as const

export type AccentName = keyof typeof accentSurface

export function statusVariant(status: string): "sage" | "coral" | "gold" | "clay" {
  const s = status.toUpperCase()
  if (["COMPLETED", "PAID", "APPROVED", "GIVEN", "ACTIVE", "OPERATIONAL", "NORMAL", "CONFIRMED", "FINAL", "ADMITTED", "DISCHARGED"].includes(s)) return "sage"
  if (["CANCELLED", "VOID", "REJECTED", "RETIRED", "OVERDUE", "CRITICAL", "HIGH", "ABNORMAL", "CANCELLED"].includes(s)) return "coral"
  if (["PENDING", "SCHEDULED", "ORDERED", "COLLECTED", "IN_PROGRESS", "DRAFT", "ISSUED", "PARTIALLY_PAID", "HELD", "URGENT", "MAINTENANCE", "STAT"].includes(s)) return "gold"
  return "clay"
}

export function formatStatus(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ")
}
