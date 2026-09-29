"use client"

import { useEffect, useRef } from "react"
import { motion, AnimatePresence, HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

interface PortalTransitionProps {
  isOpen: boolean
  onComplete: () => void
  color?: "sage" | "coral" | "teal"
  size?: number
}

export function PortalTransition({ 
  isOpen, 
  onComplete, 
  color = "sage",
  size = 150 
}: PortalTransitionProps) {
  const circleRef = useRef<HTMLDivElement>(null)
  
  const colors = {
    sage: "bg-sage-500",
    coral: "bg-[var(--accent-coral)]",
    teal: "bg-[var(--accent-teal)]",
  }

  useEffect(() => {
    if (!isOpen) return

    const timer = setTimeout(() => {
      onComplete()
    }, 800)

    return () => clearTimeout(timer)
  }, [isOpen, onComplete])

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          <motion.div
            ref={circleRef}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: size, opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={cn(
              "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none z-[700]",
              colors[color]
            )}
            style={{ width: 0, height: 0 }}
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.6 }}
            className="fixed inset-0 z-[699] bg-cream-50 pointer-events-none"
            aria-hidden="true"
          />
        </>
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
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } },
      }}
    >
      {children}
    </motion.div>
  )
}