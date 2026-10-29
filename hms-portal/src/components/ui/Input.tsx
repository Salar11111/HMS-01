"use client"

import { forwardRef, InputHTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: ReactNode
  endAdornment?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon, endAdornment, id, style, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-")
    
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-clay-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-clay-500">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "clay-input",
              icon && "pl-12",
              endAdornment && "pr-12",
              error && "border-red-300 focus:ring-red-400",
              className
            )}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            style={{
              ...style,
              ...(icon ? { paddingLeft: "3rem" } : {}),
              ...(endAdornment ? { paddingRight: "3rem" } : {}),
            }}
            {...props}
          />
          {endAdornment && (
            <div className="absolute inset-y-0 right-3 flex items-center">
              {endAdornment}
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-clay-500">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = "Input"