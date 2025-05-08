import type { Metadata } from "next"
import { getServiceById } from "@/app/actions/admin-actions"
import ClientPage from "./ClientPage"
import { notFound } from "next/navigation"

interface EditServicePageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({ params }: EditServicePageProps): Promise<Metadata> {
  const serviceId = Number.parseInt(params.id, 10)

  if (isNaN(serviceId)) {
    return {
      title: "Invalid Service ID - StreamSignal Admin",
      description: "The service ID provided is invalid.",
    }
  }

  const service = await getServiceById(serviceId)

  if (!service) {
    return {
      title: "Service Not Found - StreamSignal Admin",
      description: "The streaming service you're looking for could not be found.",
    }
  }

  return {
    title: `Edit ${service.name} - StreamSignal Admin`,
    description: `Edit details for ${service.name} streaming service`,
  }
}

export default async function EditServicePage({ params }: EditServicePageProps) {
  // Pre-fetch the service data to check if it exists
  const serviceId = Number.parseInt(params.id, 10)

  if (isNaN(serviceId)) {
    notFound()
  }

  const service = await getServiceById(serviceId)

  // If the service doesn't exist, show the not-found page
  if (!service) {
    notFound()
  }

  // Pass the ID directly as a prop instead of the params object
  return <ClientPage id={params.id} />
}
