import {
  getMappings,
  getServices,
  getChannels,
  createMapping,
  deleteMapping,
  updateMappingTier,
  batchCreateMappings,
} from "@/app/actions/admin-actions"
import { ClientWrapper } from "./client-wrapper"

export default async function VisualMappingPage() {
  const [mappings, services, channels] = await Promise.all([getMappings(), getServices(), getChannels()])

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Visual Mapping Editor</h1>
      <ClientWrapper
        services={services}
        channels={channels}
        initialMappings={mappings}
        createMappingAction={createMapping}
        deleteMappingAction={deleteMapping}
        updateMappingAction={updateMappingTier}
        batchCreateMappingsAction={batchCreateMappings}
      />
    </div>
  )
}
