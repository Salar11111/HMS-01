"use client"

import { ReactNode } from "react"
import { Badge } from "@/components/ui/Badge"
import { formatStatus, statusVariant } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  className?: string
  align?: "left" | "right" | "center"
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  empty?: string
  className?: string
}

export function DataTable<T>({ columns, rows, rowKey, empty = "No records found", className }: DataTableProps<T>) {
  if (rows.length === 0) {
    return <p className="p-8 text-center text-clay-500 text-sm">{empty}</p>
  }

  const alignClass = { left: "text-left", right: "text-right", center: "text-center" } as const

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="border-b border-cream-200">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn("px-4 py-3 text-xs font-semibold uppercase tracking-wide text-clay-500", alignClass[col.align ?? "left"])}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-cream-200">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="transition-colors hover:bg-cream-50">
              {columns.map((col) => (
                <td key={col.key} className={cn("px-4 py-3 text-clay-700", alignClass[col.align ?? "left"], col.className)}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={statusVariant(status)} size="sm">
      {formatStatus(status)}
    </Badge>
  )
}
