import { notFound } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Plus, Info, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { getChannelById, getSimilarChannels } from "@/app/actions/channel-actions"
import { ChannelServiceTable } from "@/components/channels/channel-service-table"
import { ChannelPrograms } from "@/components/channels/channel-programs"
import { ChannelReviews } from "@/components/channels/channel-reviews"
import { SimilarChannels } from "@/components/channels/similar-channels"
import { FallbackImage } from "@/components/ui/fallback-image"

interface ChannelPageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({ params }: ChannelPageProps): Promise<Metadata> {
  const channelId = Number.parseInt(params.id)
  const channel = await getChannelById(channelId)

  if (!channel) {
    return {
      title: "Channel Not Found - StreamSignal",
      description: "The channel you're looking for could not be found.",
    }
  }

  return {
    title: `${channel.name} - Channel Details - StreamSignal`,
    description: `Find out where to watch ${channel.name} and explore popular programs, pricing, and availability across streaming services.`,
  }
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const channelId = Number.parseInt(params.id)
  const channel = await getChannelById(channelId)

  if (!channel) {
    notFound()
  }

  const similarChannels = await getSimilarChannels(channelId)

  // Calculate ratings
  const ratings = {
    overall: 4.2,
    content: 4.5,
    value: 3.8,
    availability: 4.0,
  }

  // Get the best service (lowest price)
  const bestService =
    channel.services.length > 0
      ? channel.services.reduce((prev, current) => (prev.monthly_price < current.monthly_price ? prev : current))
      : null

  return (
    <div className="container px-4 py-8 md:px-6 md:py-12">
      <Link href="/channels" className="inline-flex items-center text-sm mb-8 hover:underline">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to channel directory
      </Link>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr] lg:gap-12">
        <div>
          <div className="flex items-start gap-4 mb-6">
            <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
              {channel.logo_url ? (
                <FallbackImage
                  src={channel.logo_url || "/placeholder.svg"}
                  alt={channel.name}
                  className="h-full w-full object-cover"
                  width={64}
                  height={64}
                  entityName={channel.name}
                />
              ) : (
                <span className="text-xl font-bold">{channel.name.substring(0, 2)}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">{channel.name}</h1>
                <Badge variant="outline" className="ml-2">
                  {channel.category}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${star <= Math.round(ratings.overall) ? "text-black fill-black" : "text-gray-300"}`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">{ratings.overall.toFixed(1)}</span>
                <span className="text-sm text-gray-500">(124 reviews)</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3">
                Popularity: {channel.popularity}/100
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3">
                {channel.services.length} Services Available
              </Badge>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-2">About {channel.name}</h2>
            <p className="text-gray-700">
              {channel.name} is a {channel.category.toLowerCase()} channel known for its quality programming and diverse
              content. With a popularity rating of {channel.popularity}/100, it's
              {channel.popularity > 75
                ? " one of the most popular channels"
                : channel.popularity > 50
                  ? " a well-regarded channel"
                  : " a niche channel"}{" "}
              in its category.
            </p>
            {bestService && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <p className="text-sm">
                  <span className="font-medium">Best Value:</span> Watch {channel.name} on {bestService.name} starting
                  at ${bestService.monthly_price.toFixed(2)}/month
                </p>
              </div>
            )}
          </div>

          <Tabs defaultValue="services" className="mb-12">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="services">Where to Watch</TabsTrigger>
              <TabsTrigger value="programs">Popular Programs</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="services" className="pt-6">
              {channel.services.length > 0 ? (
                <ChannelServiceTable services={channel.services} />
              ) : (
                <div className="text-center py-8 border rounded-lg">
                  <Info className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                  <h3 className="text-lg font-semibold mb-2">Not Available on Streaming Services</h3>
                  <p className="text-gray-600 max-w-md mx-auto mb-4">
                    This channel is currently not available on any of the streaming services we track. It may be
                    available through cable or satellite providers.
                  </p>
                  <Button variant="outline" asChild>
                    <Link href="/channels">Browse Available Channels</Link>
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="programs" className="pt-6">
              <ChannelPrograms channelId={channelId} channelName={channel.name} />
            </TabsContent>

            <TabsContent value="reviews" className="pt-6">
              <ChannelReviews channelId={channelId} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Channel Ratings</CardTitle>
              <CardDescription>How viewers rate this channel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Content Quality</span>
                    <span className="text-sm font-medium">{ratings.content.toFixed(1)}/5</span>
                  </div>
                  <Progress value={ratings.content * 20} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Value for Money</span>
                    <span className="text-sm font-medium">{ratings.value.toFixed(1)}/5</span>
                  </div>
                  <Progress value={ratings.value * 20} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Availability</span>
                    <span className="text-sm font-medium">{ratings.availability.toFixed(1)}/5</span>
                  </div>
                  <Progress value={ratings.availability * 20} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Channel Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Category</span>
                  <span className="text-sm">{channel.category}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Content Type</span>
                  <span className="text-sm">
                    {channel.category === "Sports"
                      ? "Live Sports & Analysis"
                      : channel.category === "News"
                        ? "News & Current Affairs"
                        : channel.category === "Entertainment"
                          ? "Shows & Movies"
                          : channel.category === "Kids"
                            ? "Children's Programming"
                            : "Mixed Content"}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Popularity Rank</span>
                  <span className="text-sm">{getPopularityRank(channel.popularity)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Best For</span>
                  <span className="text-sm">
                    {channel.category === "Sports"
                      ? "Sports Fans"
                      : channel.category === "News"
                        ? "News Followers"
                        : channel.category === "Entertainment"
                          ? "Entertainment Seekers"
                          : channel.category === "Kids"
                            ? "Families with Children"
                            : "General Audience"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add to Comparison</CardTitle>
              <CardDescription>Compare streaming services that offer this channel</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link href={`/#features?channel=${channelId}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add to Comparison
                </Link>
              </Button>
            </CardContent>
          </Card>

          <SimilarChannels channels={similarChannels} currentChannelId={channelId} />
        </div>
      </div>
    </div>
  )
}

function getPopularityRank(popularity: number): string {
  if (popularity >= 90) return "Top Tier"
  if (popularity >= 75) return "Very Popular"
  if (popularity >= 50) return "Popular"
  if (popularity >= 25) return "Moderate"
  return "Niche"
}
