"use client"

import { useState, useEffect } from "react"
import { PlusCircle, X, Save, Filter, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { FilterConditionEditor } from "./filter-condition-editor"
import { FilterPresetManager } from "./filter-preset-manager"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import type { FilterGroup, FilterOption, FilterCondition, FilterPreset } from "@/types/filters"

interface FilterBuilderProps {
  entity: "services" | "channels" | "mappings"
  filterOptions: FilterOption[]
  onFiltersChange: (groups: FilterGroup[]) => void
  presets?: FilterPreset[]
  onSavePreset?: (preset: Omit<FilterPreset, "id" | "created_at" | "updated_at">) => Promise<void>
  onLoadPreset?: (preset: FilterPreset) => void
  className?: string
}

export function FilterBuilder({
  entity,
  filterOptions,
  onFiltersChange,
  presets = [],
  onSavePreset,
  onLoadPreset,
  className,
}: FilterBuilderProps) {
  const [groups, setGroups] = useState<FilterGroup[]>([{ id: "group-1", logic: "and", conditions: [] }])
  const [expanded, setExpanded] = useState(true)
  const [showPresetManager, setShowPresetManager] = useState(false)

  // Generate a unique ID for new conditions or groups
  const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Add a new empty condition to a group
  const addCondition = (groupId: string) => {
    setGroups((prevGroups) =>
      prevGroups.map((group) => {
        if (group.id === groupId) {
          return {
            ...group,
            conditions: [
              ...group.conditions,
              {
                id: generateId("condition"),
                field: filterOptions[0]?.field || "",
                operator: filterOptions[0]?.operators[0] || "equals",
                value: "",
              },
            ],
          }
        }
        return group
      }),
    )
  }

  // Update a condition in a group
  const updateCondition = (groupId: string, conditionId: string, updates: Partial<FilterCondition>) => {
    setGroups((prevGroups) =>
      prevGroups.map((group) => {
        if (group.id === groupId) {
          return {
            ...group,
            conditions: group.conditions.map((condition) => {
              if (condition.id === conditionId) {
                return { ...condition, ...updates }
              }
              return condition
            }),
          }
        }
        return group
      }),
    )
  }

  // Remove a condition from a group
  const removeCondition = (groupId: string, conditionId: string) => {
    setGroups((prevGroups) =>
      prevGroups.map((group) => {
        if (group.id === groupId) {
          return {
            ...group,
            conditions: group.conditions.filter((condition) => condition.id !== conditionId),
          }
        }
        return group
      }),
    )
  }

  // Add a new group
  const addGroup = () => {
    setGroups((prevGroups) => [
      ...prevGroups,
      {
        id: generateId("group"),
        logic: "and",
        conditions: [],
      },
    ])
  }

  // Remove a group
  const removeGroup = (groupId: string) => {
    setGroups((prevGroups) => prevGroups.filter((group) => group.id !== groupId))
  }

  // Toggle the logic of a group (AND/OR)
  const toggleGroupLogic = (groupId: string) => {
    setGroups((prevGroups) =>
      prevGroups.map((group) => {
        if (group.id === groupId) {
          return {
            ...group,
            logic: group.logic === "and" ? "or" : "and",
          }
        }
        return group
      }),
    )
  }

  // Clear all filters
  const clearFilters = () => {
    setGroups([{ id: "group-1", logic: "and", conditions: [] }])
  }

  // Handle saving a preset
  const handleSavePreset = async (name: string, description?: string) => {
    if (!onSavePreset) return

    try {
      await onSavePreset({
        name,
        description,
        entity,
        groups,
        is_default: false,
      })
      toast({
        title: "Filter preset saved",
        description: `The filter preset "${name}" has been saved successfully.`,
      })
      setShowPresetManager(false)
    } catch (error) {
      toast({
        title: "Error saving preset",
        description: "An error occurred while saving the filter preset.",
        variant: "destructive",
      })
    }
  }

  // Handle loading a preset
  const handleLoadPreset = (preset: FilterPreset) => {
    setGroups(preset.groups)
    if (onLoadPreset) {
      onLoadPreset(preset)
    }
  }

  // Notify parent component when filters change
  useEffect(() => {
    onFiltersChange(groups)
  }, [groups, onFiltersChange])

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => setExpanded(!expanded)}>
          <Filter className="h-4 w-4" />
          Filters
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        <div className="flex items-center gap-2">
          {presets.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Load Preset
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {presets.map((preset) => (
                  <DropdownMenuItem key={preset.id} onClick={() => handleLoadPreset(preset)}>
                    {preset.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {onSavePreset && (
            <Button variant="outline" size="sm" onClick={() => setShowPresetManager(true)}>
              <Save className="mr-2 h-4 w-4" />
              Save Preset
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-4">
          {groups.map((group, groupIndex) => (
            <Card key={group.id}>
              <CardContent className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleGroupLogic(group.id)}
                      className="text-xs font-medium uppercase"
                    >
                      {group.logic === "and" ? "AND" : "OR"}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {group.logic === "and"
                        ? "Match all conditions in this group"
                        : "Match any condition in this group"}
                    </span>
                  </div>
                  {groups.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeGroup(group.id)} className="h-8 w-8 p-0">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  {group.conditions.map((condition) => (
                    <div key={condition.id} className="flex items-start gap-2">
                      <FilterConditionEditor
                        condition={condition}
                        filterOptions={filterOptions}
                        onChange={(updates) => updateCondition(group.id, condition.id, updates)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCondition(group.id, condition.id)}
                        className="mt-1 h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addCondition(group.id)}
                    className="mt-2 flex items-center gap-1"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Add Condition
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" onClick={addGroup} className="flex items-center gap-1">
            <PlusCircle className="h-4 w-4" />
            Add Filter Group
          </Button>
        </div>
      )}

      {showPresetManager && (
        <FilterPresetManager open={showPresetManager} onOpenChange={setShowPresetManager} onSave={handleSavePreset} />
      )}
    </div>
  )
}
