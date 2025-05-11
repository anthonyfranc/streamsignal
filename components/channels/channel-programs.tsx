"use client"

import { useState, useEffect } from "react"
import { Calendar, Clock, Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getChannelPrograms } from "@/app/actions/channel-actions"
import type { Program } from "@/app/actions/channel-actions"

interface ChannelProgramsProps {
  channelId: number
  channelName: string
}

export function ChannelPrograms({ channelId, channelName }: ChannelProgramsProps) {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPrograms() {
      setLoading(true)
      try {
        const programsData = await getChannelPrograms(channelId)
        setPrograms(programsData)
      } catch (error) {
        console.error("Error loading programs:", error)
      } finally {
        setLoading(false)
      }
    }

    loadPrograms()
  }, [channelId])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    )
  }

  if (programs.length === 0) {
    return (
      <div className="text-center py-8 border rounded-lg">
        <h3 className="text-lg font-semibold mb-2">No Programs Available</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          We don't have program information for {channelName} at this time. Please check back later.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {programs.map((program) => (
          <Card key={program.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col sm:flex-row">
                <div className="w-full sm:w-1/3 h-[120px] bg-gray-100">
                  <img
                    src={program.image_url || "/placeholder.svg"}
                    alt={program.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold">{program.title}</h3>
                    <Badge variant={getProgramBadgeVariant(program.type)}>{program.type}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{program.description}</p>
                  <div className="flex flex-wrap gap-3 mt-3">
                    <div className="flex items-center text-xs text-gray-500">
                      <Star className="h-3.5 w-3.5 mr-1" />
                      <span>{program.rating.toFixed(1)}/5</span>
                    </div>
                    {program.air_time && (
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-3.5 w-3.5 mr-1" />
                        <span>{program.air_time}</span>
                      </div>
                    )}
                    {program.duration && (
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        <span>{program.duration}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="p-4 bg-gray-50 rounded-md">
        <p className="text-sm text-gray-600">
          Program schedules and availability may vary. Check your local listings for the most up-to-date information.
        </p>
      </div>
    </div>
  )
}

function getProgramBadgeVariant(type: string): "default" | "outline" | "secondary" {
  switch (type) {
    case "series":
      return "default"
    case "movie":
      return "secondary"
    case "live":
      return "outline"
    case "special":
      return "outline"
    default:
      return "outline"
  }
}
