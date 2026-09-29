
import { Button } from "@/components/ui/Button"
import { Search } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-sage-100 flex items-center justify-center">
          <Search className="w-10 h-10 text-sage-600" />
        </div>
        <h1 className="font-display text-4xl font-semibold text-clay-900 mb-2">Page Not Found</h1>
        <p className="text-clay-600 mb-8">
          Sorry, we couldn&rsquo;t find the page you&rsquo;re looking for. It might have been moved or doesn&rsquo;t exist.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button href="/">Go Home</Button>
          <Button variant="secondary" href="/portal">Go to Portal</Button>
        </div>
      </div>
    </div>
  )
}