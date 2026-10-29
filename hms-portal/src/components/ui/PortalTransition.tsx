"use client"

import { useEffect } from "react"
import { motion, AnimatePresence, HTMLMotionProps } from "framer-motion"
import { HeartPulse } from "lucide-react"
import { cn } from "@/lib/utils"

interface PortalTransitionProps {
  isOpen: boolean
  onComplete: () => void
  /** Total hold before navigation; keep in sync with the bloom duration. */
  durationMs?: number
}

/**
 * Expanding-circle doorway used when leaving the marketing site for the portal.
 * Matches the Verdant/MedFlow pattern: sage bloom, white ring ripple, brand mark.
 */
export function PortalTransition({
  isOpen,
  onComplete,
  durationMs = 1500,
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
          className="fixed inset-0 z-[700] flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          aria-hidden="true"
        >
          <motion.div
            className="absolute rounded-full bg-gradient-to-br from-[#A8C4A0] to-[#7BA68C]"
            initial={{ scale: 0, width: 10, height: 10 }}
            animate={{ scale: 1, width: "300vmax", height: "300vmax" }}
            transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            className="absolute rounded-full border-[6px] border-white/40"
            initial={{ scale: 0, width: 80, height: 80, opacity: 0.9 }}
            animate={{ scale: 8, width: 80, height: 80, opacity: 0 }}
            transition={{ duration: 1.3, ease: "easeOut" }}
          />
          <motion.div
            className="relative z-10 text-white"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            <HeartPulse className="w-16 h-16" strokeWidth={1.5} />
          </motion.div>
        </motion.div>
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
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

export function StaggerContainer({ children, delay = 0, stagger = 0.1 }: StaggerContainerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: stagger,
            delayChildren: delay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

interface StaggerItemProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  className?: string
}

export function StaggerItem({ children, className = "", ...props }: StaggerItemProps) {
  return (
    <motion.div
      {...props}
      className={cn(className)}
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } },
      }}
    >
      {children}
    </motion.div>
  )
}
