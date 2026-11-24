/** Shared clinical design tokens for Meridian Health.
 * Kept in sync with the CSS custom properties in src/app/globals.css.
 */
export const colors = {
  cream: {
    50: "#f5f8fa",
    100: "#edf3f7",
    200: "#dce7ee",
    300: "#c2d4e0",
    400: "#9bb6c8",
    500: "#6f91a8",
    600: "#4f7691",
    700: "#375b75",
    800: "#244058",
    900: "#16283a",
  },
  sage: {
    50: "#eef7fa",
    100: "#d9edf3",
    200: "#b9dde8",
    300: "#8bc5d7",
    400: "#4fa6c1",
    500: "#2689a8",
    600: "#1c6f8f",
    700: "#175a76",
    800: "#15455e",
    900: "#123749",
  },
  clay: {
    50: "#f7f9fa",
    100: "#eef2f5",
    200: "#dde6eb",
    300: "#c3d1da",
    400: "#94a9b7",
    500: "#6b8495",
    600: "#4f6a7c",
    700: "#375366",
    800: "#243d4f",
    900: "#16283a",
  },
  accent: {
    coral: "#b4473f",
    teal: "#1c7794",
    gold: "#95620f",
  },
  neutral: {
    white: "#ffffff",
    black: "#16283a",
  },
} as const

export const shadows = {
  clay: {
    sm: "0 1px 2px rgba(22, 40, 58, 0.05)",
    md: "0 2px 10px rgba(22, 40, 58, 0.07)",
    lg: "0 4px 14px rgba(22, 40, 58, 0.07)",
    inset: "none",
  },
  soft: {
    sm: "0 1px 2px rgba(22, 40, 58, 0.05)",
    md: "0 4px 14px rgba(22, 40, 58, 0.07)",
    lg: "0 8px 24px rgba(22, 40, 58, 0.09)",
  },
} as const

export const borderRadius = {
  sm: "6px",
  md: "12px",
  lg: "20px",
  xl: "20px",
  "2xl": "24px",
  btn: "8px",
  full: "9999px",
} as const

export const transitions = {
  fast: "160ms cubic-bezier(.2,.7,.3,1)",
  normal: "240ms cubic-bezier(.2,.7,.3,1)",
  slow: "320ms cubic-bezier(.2,.7,.3,1)",
  portal: "240ms cubic-bezier(.2,.7,.3,1)",
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
