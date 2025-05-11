"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getStreamingServices, getChannels, getServiceChannels } from "@/app/actions/streaming-actions"
import type { StreamingService, Channel, ServiceChannel } from "@/types/streaming"
import { ChannelSelector } from "./channel-selector"
import { RecommendationResults } from "./recommendation-results"
import { BundleRecommendations } from "./bundle-recommendations"
import { PreferenceForm } from "./preference-form"

export function RecommendationTool() {
  const [services, setServices] = useState<StreamingService[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [serviceChannels, setServiceChannels] = useState<ServiceChannel[]>([])
  const [selectedChannels, setSelectedChannels] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("select")
  const [recommendations, setRecommendations] = useState<StreamingService[]>([])
  const [bundles, setBundles] = useState<any[]>([])
  const [priceImportance, setPriceImportance] = useState(5)
  const [channelCoverageImportance, setChannelCoverageImportance] = useState(8)
  const [additionalFeaturesImportance, setAdditionalFeaturesImportance] = useState(3)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [servicesData, channelsData, serviceChannelsData] = await Promise.all([
          getStreamingServices(),
          getChannels(),
          getServiceChannels(),
        ])

        setServices(servicesData)
        setChannels(channelsData)
        setServiceChannels(serviceChannelsData)
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const toggleChannel = (channelId: number) => {
    setSelectedChannels((prev) => {
      if (prev.includes(channelId)) {
        return prev.filter((id) => id !== channelId)
      } else {
        return [...prev, channelId]
      }
    })
  }

  const clearSelection = () => {
    setSelectedChannels([])
  }

  const generateRecommendations = () => {
    if (selectedChannels.length === 0) {
      return
    }

    // Calculate scores for each service
    const scoredServices = services.map((service) => {
      // Get channels this service offers
      const serviceChannelIds = serviceChannels.filter((sc) => sc.service_id === service.id).map((sc) => sc.channel_id)

      // Calculate channel coverage (percentage of selected channels covered)
      const matchCount = selectedChannels.filter((id) => serviceChannelIds.includes(id)).length
      const coveragePercentage = selectedChannels.length > 0 ? matchCount / selectedChannels.length : 0

      // Calculate price score (lower price = higher score)
      // Normalize price between 0-1 (assuming max price is $100)
      const maxPrice = 100
      const priceScore = 1 - Math.min(service.monthly_price / maxPrice, 1)

      // Calculate features score based on max_streams and has_ads
      const maxStreams = Math.min(service.max_streams, 10) / 10 // Normalize to 0-1
      const adsScore = service.has_ads ? 0 : 1
      const featuresScore = (maxStreams + adsScore) / 2

      // Calculate weighted score
      const weightedScore =
        coveragePercentage * (channelCoverageImportance / 10) +
        priceScore * (priceImportance / 10) +
        featuresScore * (additionalFeaturesImportance / 10)

      return {
        ...service,
        selected_channels_count: matchCount,
        coverage_percentage: coveragePercentage,
        service_channel_ids: serviceChannelIds,
        price_score: priceScore,
        features_score: featuresScore,
        weighted_score: weightedScore,
      }
    })

    // Sort by weighted score and take top results
    const sortedServices = [...scoredServices].sort((a, b) => b.weighted_score - a.weighted_score)

    // Only include services that have at least one of the selected channels
    const filteredServices = sortedServices.filter((service) => service.selected_channels_count > 0)

    setRecommendations(filteredServices.slice(0, 5))

    // Generate bundle recommendations
    generateBundleRecommendations(filteredServices)

    setActiveTab("results")
  }

  const generateBundleRecommendations = (scoredServices: any[]) => {
    // Skip if no services or less than 2 services available
    if (scoredServices.length < 2) {
      setBundles([])
      return
    }

    // Only consider top 8 services for bundle creation (for performance)
    const topServices = scoredServices.slice(0, 8)

    // Find all possible 2-service combinations
    const twoBundles = findServiceBundles(topServices, 2)
    // Find all possible 3-service combinations
    const threeBundles = findServiceBundles(topServices, 3)

    // Combine and sort all bundles by score
    const allBundles = [...twoBundles, ...threeBundles].sort((a, b) => {
      // If coverage is the same, prefer the lower price
      if (Math.abs(b.coveragePercentage - a.coveragePercentage) < 0.05) {
        return a.totalPrice - b.totalPrice
      }
      // Otherwise prefer better coverage
      return b.coveragePercentage - a.coveragePercentage
    })

    // Take the top 3 bundles
    setBundles(allBundles.slice(0, 3))
  }

  const findServiceBundles = (services: any[], bundleSize: number) => {
    const results: any[] = []
    const combinations = getCombinations(services, bundleSize)

    combinations.forEach((combo) => {
      // Get union of all channels covered by this combination
      const coveredChannelIds = new Set<number>()
      combo.forEach((service) => {
        service.service_channel_ids.forEach((channelId: number) => {
          if (selectedChannels.includes(channelId)) {
            coveredChannelIds.add(channelId)
          }
        })
      })

      // Calculate coverage percentage
      const coveragePercentage = selectedChannels.length > 0 ? coveredChannelIds.size / selectedChannels.length : 0

      // Calculate total price
      const totalPrice = combo.reduce((sum, service) => sum + service.monthly_price, 0)

      // Calculate value (coverage per dollar)
      const valueScore = coveragePercentage / totalPrice

      // Calculate unique channels (channels only available in one service of the bundle)
      const uniqueChannels = calculateUniqueChannels(combo, selectedChannels)

      // Only consider bundles that cover at least 80% of channels
      if (coveragePercentage >= 0.8) {
        results.push({
          services: combo,
          coveragePercentage,
          coveredChannelCount: coveredChannelIds.size,
          totalPrice,
          valueScore,
          uniqueChannels,
        })
      }
    })

    return results.sort((a, b) => b.valueScore - a.valueScore)
  }

  // Helper function to get all combinations of size k
  const getCombinations = (array: any[], k: number) => {
    const result: any[][] = []

    function backtrack(start: number, current: any[]) {
      if (current.length === k) {
        result.push([...current])
        return
      }
      for (let i = start; i < array.length; i++) {
        current.push(array[i])
        backtrack(i + 1, current)
        current.pop()
      }
    }

    backtrack(0, [])
    return result
  }

  // Helper function to calculate unique channels for each service in a bundle
  const calculateUniqueChannels = (services: any[], userSelectedChannels: number[]) => {
    const result: Record<number, number[]> = {}

    // Initialize with empty arrays for each service
    services.forEach((service) => {
      result[service.id] = []
    })

    // For each selected channel, check which services in the bundle have it
    userSelectedChannels.forEach((channelId) => {
      const servicesWithChannel = services.filter((service) => service.service_channel_ids.includes(channelId))

      // If only one service has this channel, it's unique to that service
      if (servicesWithChannel.length === 1) {
        result[servicesWithChannel[0].id].push(channelId)
      }
    })

    return result
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <Tabs defaultValue="select" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="select">Select Channels</TabsTrigger>
            <TabsTrigger value="results" disabled={recommendations.length === 0}>
              Single Services
            </TabsTrigger>
            <TabsTrigger value="bundles" disabled={bundles.length === 0}>
              Service Bundles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="select">
            <div className="space-y-6">
              <PreferenceForm
                priceImportance={priceImportance}
                setPriceImportance={setPriceImportance}
                channelCoverageImportance={channelCoverageImportance}
                setChannelCoverageImportance={setChannelCoverageImportance}
                additionalFeaturesImportance={additionalFeaturesImportance}
                setAdditionalFeaturesImportance={setAdditionalFeaturesImportance}
              />

              <ChannelSelector
                channels={channels}
                selectedChannels={selectedChannels}
                toggleChannel={toggleChannel}
                clearSelection={clearSelection}
              />

              <div className="flex justify-end mt-6">
                <Button onClick={generateRecommendations} size="lg" disabled={selectedChannels.length === 0}>
                  Get Recommendations
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="results">
            <RecommendationResults
              recommendations={recommendations}
              selectedChannels={selectedChannels}
              channels={channels}
              serviceChannels={serviceChannels}
              onBackToSelection={() => setActiveTab("select")}
              onViewBundles={() => setActiveTab("bundles")}
            />
          </TabsContent>

          <TabsContent value="bundles">
            <BundleRecommendations
              bundles={bundles}
              selectedChannels={selectedChannels}
              channels={channels}
              onBackToSelection={() => setActiveTab("select")}
              onViewSingleServices={() => setActiveTab("results")}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
