"use client"

import { forwardRef, ButtonHTMLAttributes, AnchorHTMLAttributes, Ref } from "react"
import { cn } from "@/lib/utils"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline"
  size?: "sm" | "md" | "lg"
  loading?: boolean
  href?: string
}

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, href, ...props }, ref) => {
    const variants = {
      primary: "clay-button-primary",
      secondary: "clay-button-secondary",
      ghost: "clay-button-ghost",
      outline: "clay-button border border-cream-300 hover:border-cream-400",
    }
    
    const sizes = {
      sm: "px-3 py-1.5 text-sm gap-1.5",
      md: "px-5 py-2.5 text-base gap-2",
      lg: "px-7 py-3.5 text-lg gap-2.5",
    }

    const baseClass = cn(
      "inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200",
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
      variants[variant],
      sizes[size],
      className
    )

    const isLink = !!href
    
    if (isLink) {
      const linkProps = { href, ...props } as AnchorHTMLAttributes<HTMLAnchorElement>
      return (
        <a
          ref={ref as Ref<HTMLAnchorElement>}
          className={baseClass}
          {...linkProps}
        >
          {loading && (
            <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {children}
        </a>
      )
    }
    
    return (
      <button
        ref={ref as Ref<HTMLButtonElement>}
        className={baseClass}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = "Button"