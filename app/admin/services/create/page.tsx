import type { Metadata } from "next"
import CreateServicePageClient from "./CreateServicePageClient"

export const metadata: Metadata = {
  title: "Add Service - StreamSignal Admin",
  description: "Add a new streaming service to the StreamSignal platform",
}

export default function CreateServicePage() {
  return <CreateServicePageClient />
}
