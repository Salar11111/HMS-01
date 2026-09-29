import type { Metadata, Viewport } from "next"
import { Inter, Playfair_Display } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  fallback: ["Georgia", "serif"],
})

export const metadata: Metadata = {
  title: "Meridian Health — Compassionate Care, Advanced Medicine",
  description: "A premier multi-department hospital providing empathetic, patient-centered care. Schedule appointments, access health records, and connect with your care team.",
  keywords: ["hospital", "healthcare", "medical", "appointments", "patient portal", "EHR"],
  authors: [{ name: "Meridian Health" }],
  openGraph: {
    title: "Meridian Health — Compassionate Care, Advanced Medicine",
    description: "Experience healthcare designed around you. Premium facilities, expert physicians, and seamless digital access.",
    type: "website",
    locale: "en_US",
    siteName: "Meridian Health",
  },
  twitter: {
    card: "summary_large_image",
    title: "Meridian Health",
    description: "Compassionate care, advanced medicine.",
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: "#fdfbf7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col bg-cream-50 text-clay-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}