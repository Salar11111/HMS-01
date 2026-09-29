import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, CheckCircle2, Clock, Phone, Stethoscope } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { departmentDetails } from "@/lib/departments"

export function generateStaticParams() {
  return Object.keys(departmentDetails).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const department = departmentDetails[slug]
  if (!department) return { title: "Department not found" }
  return {
    title: `${department.name} — Meridian Health`,
    description: department.description.slice(0, 155),
  }
}

export default async function DepartmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const department = departmentDetails[slug]

  if (!department) notFound()

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="border-b border-cream-200 bg-cream-50/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sage-500 to-sage-400 flex items-center justify-center shadow-lg shadow-sage-500/30">
              <Stethoscope className="w-5 h-5 text-white" />
            </span>
            <span className="font-semibold text-clay-900">Meridian Health</span>
          </Link>
          <Button href="/auth/signin" size="sm">Patient Portal</Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-8">
        <div>
          <Link href="/#departments" className="inline-flex items-center gap-2 text-sm text-clay-600 hover:text-clay-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            All specialties
          </Link>
          <h1 className="font-display text-4xl md:text-5xl font-semibold text-clay-900 mt-4">{department.name}</h1>
          <p className="text-lg text-clay-600 mt-2">{department.tagline}</p>
        </div>

        <Card padding="md">
          <CardContent>
            <p className="text-clay-700 leading-relaxed">{department.description}</p>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card padding="md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-sage-600" />
                Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {department.services.map(service => (
                  <li key={service} className="flex items-start gap-2 text-sm text-clay-700">
                    <CheckCircle2 className="w-4 h-4 text-sage-500 mt-0.5 flex-shrink-0" />
                    {service}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card padding="md">
              <CardHeader>
                <CardTitle>Clinical areas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {department.clinicalAreas.map(area => (
                    <Badge key={area} variant="sage" size="sm">{area}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card padding="md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-accent-gold" />
                  Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-clay-700">{department.typicalWait}</p>
                <div className="flex flex-wrap gap-2">
                  <Button href="/auth/signin">Book an appointment</Button>
                  <Button variant="secondary">
                    <Phone className="w-4 h-4" />
                    Call the clinic
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card padding="md" className="bg-sage-50 border border-sage-200">
          <p className="text-sm text-clay-700">
            This page is a portfolio demonstration of the Meridian Health site. Clinical content is
            illustrative and not a substitute for professional medical advice.
          </p>
        </Card>
      </main>
    </div>
  )
}
