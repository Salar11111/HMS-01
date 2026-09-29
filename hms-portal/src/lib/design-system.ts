export const colors = {
  cream: {
    50: "#fdfbf7",
    100: "#faf6ed",
    200: "#f4ead8",
    300: "#ebdcc3",
    400: "#e0c9a4",
    500: "#d4b482",
    600: "#c49a68",
    700: "#a87d52",
    800: "#8d6544",
    900: "#735239",
  },
  sage: {
    50: "#f3f6f3",
    100: "#e4ebe4",
    200: "#c9d8c9",
    300: "#a3bda3",
    400: "#7d9d7d",
    500: "#618461",
    600: "#4e6b4e",
    700: "#3f543f",
    800: "#354535",
    900: "#2e3a2e",
  },
  clay: {
    50: "#faf9f7",
    100: "#f3f1ed",
    200: "#e6e2d9",
    300: "#d4cfc1",
    400: "#bdb5a3",
    500: "#a39986",
    600: "#8a806e",
    700: "#716859",
    800: "#5e564d",
    900: "#4e4841",
  },
  accent: {
    coral: "#e88d6a",
    teal: "#4a9b8e",
    gold: "#d4a843",
  },
  neutral: {
    white: "#ffffff",
    black: "#1a1a1a",
  },
} as const

export const shadows = {
  clay: {
    sm: "4px 4px 8px rgba(139, 128, 112, 0.15), -4px -4px 8px rgba(255, 255, 255, 0.8)",
    md: "8px 8px 16px rgba(139, 128, 112, 0.15), -8px -8px 16px rgba(255, 255, 255, 0.8)",
    lg: "16px 16px 32px rgba(139, 128, 112, 0.15), -16px -16px 32px rgba(255, 255, 255, 0.8)",
    inset: "inset 4px 4px 8px rgba(139, 128, 112, 0.15), inset -4px -4px 8px rgba(255, 255, 255, 0.8)",
  },
  soft: {
    sm: "0 2px 8px rgba(0, 0, 0, 0.06)",
    md: "0 4px 16px rgba(0, 0, 0, 0.08)",
    lg: "0 8px 32px rgba(0, 0, 0, 0.1)",
  },
} as const

export const borderRadius = {
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.5rem",
  "2xl": "2rem",
  full: "9999px",
} as const

export const transitions = {
  fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
  normal: "250ms cubic-bezier(0.4, 0, 0.2, 1)",
  slow: "350ms cubic-bezier(0.4, 0, 0.2, 1)",
  portal: "800ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
} as const

export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const

export const zIndex = {
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modal: 400,
  popover: 500,
  tooltip: 600,
  portal: 700,
} as const

export type ColorScale = keyof typeof colors.cream
export type ShadowVariant = keyof typeof shadows.clay
export type RadiusVariant = keyof typeof borderRadius