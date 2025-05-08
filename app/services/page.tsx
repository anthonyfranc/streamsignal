import { Suspense } from "react"
import { ServiceDirectory } from "@/components/services/service-directory"
import { searchServices, getSupportedDevices } from "@/app/actions/service-actions"
import Loading from "./loading"

export const metadata = {
  title: "Streaming Services | StreamSignal",
  description: "Compare streaming services and find the best one for your needs",
}

export default async function ServicesPage() {
  // Fetch all services with default parameters
  const services = await searchServices("", "all", [0, 100], "all")
  const devices = await getSupportedDevices()

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Streaming Services</h1>
        <p className="mt-2 text-gray-600">
          Compare streaming services and find the perfect platform for your entertainment needs.
        </p>
      </div>

      <Suspense fallback={<Loading />}>
        <ServiceDirectory services={services} devices={devices} />
      </Suspense>
    </main>
  )
}
