"use client"

import { ReactNode } from "react"
import { LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/Card"
import { cn } from "@/lib/utils"
import { accentSurface, type AccentName } from "@/lib/format"

interface PageHeaderProps {
  title: string
  description: string
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-clay-900">{title}</h1>
        <p className="text-clay-600 mt-1">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2 sm:shrink-0">{actions}</div>}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string
  hint?: string
  icon?: LucideIcon
  accent?: AccentName
  progress?: number
}

export function StatCard({ label, value, hint, icon: Icon, accent = "sage", progress }: StatCardProps) {
  return (
    <Card padding="md" className="h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-clay-500">{label}</p>
          <p className="font-display text-2xl font-bold text-clay-900 mt-1">{value}</p>
          {hint && <p className="text-xs text-clay-500 mt-1">{hint}</p>}
        </div>
        {Icon && (
          <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", accentSurface[accent])}>
            <Icon className="w-5 h-5" aria-hidden="true" />
          </span>
        )}
      </div>
      {progress !== undefined && (
        <div className="mt-3">
          <div className="h-2 rounded-full bg-cream-200 overflow-hidden">
            <div
              className={cn("h-full rounded-full", accent === "coral" ? "bg-accent-coral" : accent === "gold" ? "bg-accent-gold" : "bg-sage-500")}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  )
}
