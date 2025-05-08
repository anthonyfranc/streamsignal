import type { Metadata } from "next"
import CreateChannelPageClient from "./CreateChannelPageClient"
import { getChannelCategories } from "@/app/actions/admin-actions"

export const metadata: Metadata = {
  title: "Add Channel - StreamSignal Admin",
  description: "Add a new channel to the StreamSignal platform",
}

export default async function CreateChannelPage() {
  // Fetch categories on the server
  const categories = await getChannelCategories()

  // Pass categories as props to the client component
  return <CreateChannelPageClient categories={categories} />
}
