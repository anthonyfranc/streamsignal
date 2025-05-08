import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { ChevronRight, Play, Plus } from "lucide-react"
import type { ContentCategory } from "@/types/streaming"

interface ContentCategoriesGridProps {
  categories: ContentCategory[]
}

export function ContentCategoriesGrid({ categories }: ContentCategoriesGridProps) {
  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="mb-4 rounded-full bg-gray-100 p-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 text-gray-400"
          >
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
          </svg>
        </div>
        <h3 className="mb-2 text-xl font-semibold">No Content Available</h3>
        <p className="max-w-md text-gray-500">
          This streaming service doesn't have any content categories available yet. Check back later for updates.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-12">
      {categories.map((category) => (
        <div key={category.id} className="relative">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold">{category.name}</h3>
            {category.items && category.items.length > 5 && (
              <Button variant="ghost" size="sm" className="group flex items-center gap-1 text-sm">
                See all
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            )}
          </div>
          {category.description && <p className="mb-4 text-sm text-gray-600">{category.description}</p>}

          <ScrollArea className="pb-4">
            <div className="flex space-x-4 pb-4">
              {category.items && category.items.length > 0 ? (
                category.items.map((item) => (
                  <div
                    key={item.id}
                    className="group relative flex-shrink-0 cursor-pointer overflow-hidden rounded-md bg-gray-100 transition-all hover:scale-105"
                    style={{ width: "280px", height: "158px" }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                    {item.image_url ? (
                      <img
                        src={item.image_url || "/placeholder.svg"}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
                        <span className="text-xl font-bold text-white">{item.title.substring(0, 2).toUpperCase()}</span>
                      </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 transition-opacity group-hover:opacity-100">
                      <h4 className="mb-1 text-base font-medium text-white">{item.title}</h4>
                      {item.content_type && (
                        <Badge variant="outline" className="bg-black/50 text-xs text-white backdrop-blur-sm">
                          {item.content_type}
                        </Badge>
                      )}
                      <div className="mt-3 flex gap-2">
                        <Button size="icon" className="h-8 w-8 rounded-full bg-white text-black hover:bg-white/90">
                          <Play className="h-4 w-4 fill-current" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 rounded-full border-white/30 bg-black/30 text-white backdrop-blur-sm hover:bg-black/50"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-40 w-full items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 px-6 py-5">
                  <p className="text-center text-sm text-gray-500">No content items available in this category.</p>
                </div>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      ))}
    </div>
  )
}
