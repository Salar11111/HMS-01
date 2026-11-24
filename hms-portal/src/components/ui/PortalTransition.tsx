"use client"

import { useEffect } from "react"
import { motion, AnimatePresence, HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

interface PortalTransitionProps {
  isOpen: boolean
  onComplete: () => void
  /** Short, calm hold before navigation. */
  durationMs?: number
}

/** A brief solid-surface transition when leaving the site for the portal. */
export function PortalTransition({
  isOpen,
  onComplete,
  durationMs = 260,
}: PortalTransitionProps) {
  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => onComplete(), durationMs)
    return () => clearTimeout(timer)
  }, [isOpen, onComplete, durationMs])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[700] bg-[var(--accent)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          aria-hidden="true"
        />
      )}
    </AnimatePresence>
  )
}

interface PageTransitionProps {
  children: React.ReactNode
  trigger: boolean
}

export function PageTransition({ children, trigger }: PageTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={trigger ? "enter" : "exit"}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16 }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

interface StaggerContainerProps {
  children: React.ReactNode
  delay?: number
  stagger?: number
}

export function StaggerContainer({ children }: StaggerContainerProps) {
  return <div>{children}</div>
}

interface StaggerItemProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  className?: string
}

export function StaggerItem({ children, className = "", ...props }: StaggerItemProps) {
  return (
    <motion.div {...props} className={cn(className)}>
      {children}
    </motion.div>
  )
}
